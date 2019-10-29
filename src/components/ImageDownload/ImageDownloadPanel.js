import React, { Component } from 'react';
import { connect } from 'react-redux';
import URI from 'urijs';
import Terraform from 'terraformer';
import WKT from 'terraformer-wkt-parser';
import cloneDeep from 'lodash/cloneDeep';
import values from 'lodash/values';

import Store from '../../store';
import { getPixelSize, getMapDOMSize, calcBboxFromXY } from '../../utils/coords';
import { downloadZipIt, downloadOne } from '../../utils/downloadZip';
import { evalSourcesMap } from '../../store/config';
import Button from '../Button';
import { IMAGE_FORMATS } from '../../store/config';
import { isScriptFromLayers, isCustomPreset, evalscriptoverridesToString } from '../../utils/utils';
import App from '../../App';
import { extractLegendDataFromPreset } from '../../utils/legendUtils';

import './ImageDownloadPanel.scss';
import AnalyticalForm from './AnalyticalForm';
import BasicForm from './BasicForm';
import PrintForm from './PrintForm';

export const RESOLUTION_DIVISORS = [
  { text: 'LOW', value: 4 },
  { text: 'MEDIUM', value: 2 },
  { text: 'HIGH', value: 1 },
];
export const AVAILABLE_CRS = [
  { text: 'Popular Web Mercator (EPSG:3857)', value: 'EPSG:3857' },
  { text: 'WGS 84 (EPSG:4326)', value: 'EPSG:4326' },
];

const TABS = {
  BASIC: 'basic',
  ANALYTICAL: 'analytical',
  PRINT: 'print',
};

const INITIAL_FORM_DATA = {
  showLogo: true,
  showCaptions: true,
  addMapOverlays: true,
  tabSelected: TABS.BASIC,
  imageFormat: IMAGE_FORMATS[0].value,
  resolutionDivisor: RESOLUTION_DIVISORS.find(r => r.text === 'MEDIUM').value,
  selectedCrs: AVAILABLE_CRS[0].value,
  userDescription: '',
  showLegend: false,
  imageWidthInches: 33.1,
  imageHeightInches: 46.8,
  resolutionDpi: 300,
};
// remember the state of form selections even when component is unmounted:
let suggestedFormData = INITIAL_FORM_DATA;

class ImageDownloadPanel extends Component {
  constructor(props) {
    super(props);
    const {
      channels,
      presets,
      selectedResult: { datasource, preset },
      instances,
    } = props;
    const mChannels = (channels[datasource] || []).map(obj => ({
      value: obj.name,
      text: obj.name,
    }));
    const mPresets = Object.keys(presets[datasource]).map(key => ({
      value: presets[datasource][key].id,
      text: presets[datasource][key].name,
    }));
    const activeInstance = instances.find(ins => ins.name === datasource);
    this.state = {
      isDownloading: false,
      layers: [...mChannels, ...mPresets],
      mChannels: mChannels,
      mPresets: mPresets,
      downloadLayers: { [preset !== 'CUSTOM' ? preset : 'custom']: true },
      isIPT: activeInstance.baseUrls.WMS.includes('eocloud'),
      formData: suggestedFormData,
      legendData: extractLegendDataFromPreset(activeInstance.id, datasource, preset),
    };
    if (preset === 'CUSTOM') {
      this.state.layers.push({ value: 'custom', text: 'Custom script' });
    }
  }

  componentWillUnmount() {
    suggestedFormData = this.state.formData;
  }

  getFirstPreset = () => {
    const {
      presets,
      selectedResult: { datasource },
    } = this.props;
    const first = presets[datasource][0];
    return first.id;
  };

  updateFormData = (key, value) => {
    this.setState(oldState => ({
      formData: {
        ...oldState.formData,
        [key]: value,
      },
    }));
  };

  generateImageLink = (
    showLogo,
    tabSelected,
    imageFormat,
    resolutionDivisor,
    selectedCrs,
    printImageW,
    printImageH,
  ) => {
    const {
      selectedResult: {
        datasource,
        preset,
        evalscript,
        evalscripturl,
        gainOverride,
        gammaOverride,
        redRangeOverride,
        greenRangeOverride,
        blueRangeOverride,
        valueRangeOverride,
        atmFilter,
        layers,
        time,
      },
      instances,
      isEvalUrl,
      aoiBounds,
    } = Store.current;
    const imageExt = IMAGE_FORMATS.find(f => f.value === imageFormat).ext;
    const isJp2 = imageFormat.includes('jp2');
    const isKMZ = imageFormat.includes('application');
    const activeLayer = instances.find(inst => inst.name === datasource);
    const isPngJpg = this.isPngOrJpg(imageFormat);
    const { width: imagePartW, height: imagePartH } = getPixelSize();
    const isScript = !isScriptFromLayers(evalscript, layers);
    const isAnalytical = tabSelected === TABS.ANALYTICAL;
    const url = new URI(`${activeLayer.baseUrls.WMS}?SERVICE=WMS&REQUEST=GetMap`);

    // build url
    url.addQuery('SHOWLOGO', showLogo && isAnalytical);
    url.addQuery('MAXCC', 100);
    url.addQuery('TIME', `${time}/${time}`);
    url.addQuery('CRS', selectedCrs);
    url.addQuery('FORMAT', imageFormat);

    if (isAnalytical && aoiBounds) {
      if (selectedCrs === 'EPSG:4326') {
        const wgsCoords = {
          geometry: {
            type: 'Polygon',
            coordinates: [aoiBounds.geometry.coordinates[0].map(coord => [coord[1], coord[0]])],
          },
        };
        const wgsGeom = new Terraform.Primitive(cloneDeep(wgsCoords.geometry));
        url.addQuery('GEOMETRY', WKT.convert(wgsGeom));
      } else {
        const mercGeom = new Terraform.Primitive(cloneDeep(aoiBounds.geometry)).toMercator();
        url.addQuery('GEOMETRY', WKT.convert(mercGeom));
      }
      const mercGeom = new Terraform.Primitive(cloneDeep(aoiBounds.geometry)).toMercator();
      url.addQuery('GEOMETRY', WKT.convert(mercGeom));
    } else {
      url.addQuery('BBOX', this.getBbox(resolutionDivisor, selectedCrs));
    }

    atmFilter && atmFilter !== 'null' && url.addQuery('ATMFILTER', atmFilter);

    const evalscriptoverridesObj = {
      gainOverride,
      gammaOverride,
      redRangeOverride,
      greenRangeOverride,
      blueRangeOverride,
      valueRangeOverride,
    };
    url.addQuery('evalscriptoverrides', btoa(evalscriptoverridesToString(evalscriptoverridesObj)));

    if (isCustomPreset(preset)) {
      url.addQuery('EVALSCRIPT', evalscript);
      evalscripturl !== '' && isEvalUrl && url.addQuery('EVALSCRIPTURL', evalscripturl);

      isScript && url.addQuery('EVALSCRIPT', evalscript);
      evalscripturl !== '' && isEvalUrl && url.addQuery('EVALSCRIPT', evalscript);
      url.addQuery('EVALSOURCE', evalSourcesMap[datasource]);
    }
    url.addQuery('LAYERS', preset === 'CUSTOM' ? Store.current.presets[datasource][0].id : preset);

    if (datasource.includes('EW') && preset.includes('NON_ORTHO')) {
      url.addQuery('ORTHORECTIFY', false);
    }
    const mapDOMSize = getMapDOMSize();

    let imageSizeW;
    let imageSizeH;
    switch (tabSelected) {
      case TABS.ANALYTICAL:
        imageSizeW = Math.round(imagePartW / resolutionDivisor);
        imageSizeH = Math.round(imagePartH / resolutionDivisor);
        break;
      case TABS.PRINT:
        imageSizeW = printImageW;
        imageSizeH = printImageH;
        break;
      case TABS.BASIC:
      default:
        imageSizeW = mapDOMSize.width;
        imageSizeH = mapDOMSize.height;
        break;
    }

    url.addQuery('WIDTH', imageSizeW);
    url.addQuery('HEIGHT', imageSizeH);
    if (isPngJpg || isKMZ) {
      url.addQuery('NICENAME', `${datasource} from ${time}.${isKMZ ? 'kmz' : imageExt}`);
      url.addQuery('TRANSPARENT', imageFormat.includes('png') ? 0 : 1);
      url.addQuery('BGCOLOR', '00000000');
    } else {
      url.addQuery('NICENAME', `${datasource} from ${time}.${isJp2 ? 'jp2' : 'tiff'}`);
      url.addQuery(
        'COVERAGE',
        preset[datasource] === 'CUSTOM' ? values(layers[datasource]).join(',') : preset[datasource],
      );
    }
    const finalUrl = url
      .toString()
      .replace(/%2f/gi, '/')
      .replace(/%2c/gi, ',');
    return {
      imgWmsUrl: finalUrl,
      imageW: imageSizeW,
      imageH: imageSizeH,
    };
  };

  getBbox = (factor, selectedCrs) => {
    const { mapBounds, lat, lng, zoom } = Store.current;
    const bbox =
      selectedCrs === 'EPSG:4326'
        ? mapBounds
            .toBBoxString()
            .split(',')
            .reverse()
            .join(',')
        : calcBboxFromXY({ lat, lng, zoom, factor }).join(',');
    return bbox;
  };

  downloadImage = () => {
    const {
      selectedResult: { datasource },
    } = Store.current;
    const {
      formData: {
        showLogo,
        tabSelected,
        showCaptions,
        userDescription,
        addMapOverlays,
        showLegend,
        imageWidthInches,
        imageHeightInches,
        resolutionDpi,
      },
    } = this.state;
    const addAnotations = tabSelected !== TABS.ANALYTICAL && showCaptions;
    const { resolutionDivisor, selectedCrs } =
      tabSelected === TABS.ANALYTICAL ? this.state.formData : INITIAL_FORM_DATA;
    const { imageFormat } =
      tabSelected === TABS.ANALYTICAL || tabSelected === TABS.PRINT ? this.state.formData : INITIAL_FORM_DATA;

    const standardRegexp = /^B[0-9][0-9A]/i;
    // with print mode, the size of the image is already determined via form inputs, so we must pass that information on:
    const printImageW = tabSelected === TABS.PRINT ? Math.round(imageWidthInches * resolutionDpi) : 0;
    const printImageH = tabSelected === TABS.PRINT ? Math.round(imageHeightInches * resolutionDpi) : 0;
    const { imgWmsUrl, imageW, imageH } = this.generateImageLink(
      showLogo,
      tabSelected,
      imageFormat,
      resolutionDivisor,
      selectedCrs,
      printImageW,
      printImageH,
    );
    this.setState({ isDownloading: true });
    const layerArr = Object.keys(this.state.downloadLayers).filter(key => this.state.downloadLayers[key]);

    const layerUrls = layerArr.filter(l => l).map(layer => {
      const fullLayer = this.state.layers.find(l => l.value === layer);
      const oldImgUrl = new URI(imgWmsUrl);
      if (standardRegexp.test(layer)) {
        oldImgUrl
          .setQuery('LAYERS', this.getFirstPreset())
          .setQuery('EVALSOURCE', evalSourcesMap[datasource])
          .setQuery('EVALSCRIPT', btoa(`return [${layer} * 2.5];`));
      } else if (layer !== 'custom') {
        oldImgUrl.setQuery('LAYERS', layer);
        oldImgUrl.removeQuery('EVALSCRIPT');
      }

      return {
        src: oldImgUrl.toString(),
        preset: fullLayer.text,
        legendData: this.state.legendData,
      };
    });

    if (tabSelected === TABS.ANALYTICAL) {
      if (layerUrls.length === 1) {
        window.open(layerUrls[0].src, '_blank');
        this.setState({ isDownloading: false });
      } else {
        this.setState({ isDownloading: true });
        downloadZipIt(layerUrls, imageFormat, imgWmsUrl, imageW, imageH, userDescription, addAnotations)
          .then(() => this.setState({ isDownloading: false }))
          .catch(msg => this.setState({ error: msg, isDownloading: false }));
      }
    } else {
      if (
        showCaptions ||
        addMapOverlays ||
        (this.state.legendData && showLegend) ||
        tabSelected === TABS.PRINT
      ) {
        downloadOne(
          layerUrls[0],
          imageFormat,
          imgWmsUrl,
          imageW,
          imageH,
          userDescription,
          this.props.originalMap,
          showCaptions,
          addMapOverlays && tabSelected !== TABS.PRINT, // disable map overlays with 'print mode' because it is too slow
          this.state.legendData && showLegend,
        )
          .then(() => {
            this.setState({ isDownloading: false });
          })
          .catch(err => {
            this.setState({ isDownloading: false });
          });
      } else {
        window.open(layerUrls[0].src, '_blank');
        this.setState({ isDownloading: false });
      }
    }
  };

  isPngOrJpg = imageFormat => {
    return ['image/png', 'image/jpeg'].includes(imageFormat);
  };

  isAllFalse = () => {
    const { downloadLayers } = this.state;
    return Object.keys(downloadLayers).find(key => this.state.downloadLayers[key]);
  };

  updateLayer = (key, checked) => {
    this.setState({
      downloadLayers: { ...this.state.downloadLayers, [key]: checked },
    });
  };

  renderImageSize = resolutionDivisor => {
    const { height, width } = getPixelSize();
    return `${Math.floor(width / resolutionDivisor)} x ${Math.floor(height / resolutionDivisor)} px`;
  };

  renderCRSResolution = (resolutionDivisor, crs) => {
    const { width, height, res } = getPixelSize();

    // mercator - display projected resolution in m/px:
    if (crs === 'EPSG:3857') {
      return `Projected resolution: ${res * resolutionDivisor} m/px`;
    }

    // wgs84 - display degrees / px:
    const { mapBounds, aoiBounds } = Store.current;
    const bounds = aoiBounds ? aoiBounds.bounds : mapBounds;
    const resLat = (bounds._northEast.lat - bounds._southWest.lat) * resolutionDivisor / height;
    const resLng = (bounds._northEast.lng - bounds._southWest.lng) * resolutionDivisor / width;
    const prettyResLat =
      resLat * 60.0 > 1.0 ? `${(resLat * 60.0).toFixed(1)} min/px` : `${(resLat * 3600.0).toFixed(1)} sec/px`;
    const prettyResLng =
      resLng * 60.0 > 1.0 ? `${(resLng * 60.0).toFixed(1)} min/px` : `${(resLng * 3600.0).toFixed(1)} sec/px`;
    return (
      <div className="wgs84-resolution">
        <div>Resolution:</div>
        <div className="latlng">
          lat.: {resLat.toFixed(7)} deg/px ({prettyResLat})
        </div>
        <div className="latlng">
          long.: {resLng.toFixed(7)} deg/px ({prettyResLng})
        </div>
      </div>
    );
  };

  render() {
    const { user } = Store.current;
    const isLoggedIn = !!user;
    const {
      isIPT,
      mChannels,
      mPresets,
      downloadLayers,
      error,
      isDownloading,
      formData: {
        showLogo,
        showCaptions,
        addMapOverlays,
        tabSelected,
        imageFormat,
        resolutionDivisor,
        selectedCrs,
        userDescription,
        showLegend,
        imageWidthInches,
        imageHeightInches,
        resolutionDpi,
      },
      legendData,
    } = this.state;

    return (
      <div className="image-download-panel">
        <div className="modeSelection">
          <Button
            text="Basic"
            className={tabSelected === TABS.BASIC ? 'selected' : ''}
            onClick={() => this.updateFormData('tabSelected', TABS.BASIC)}
          />

          <Button
            text="Analytical"
            className={tabSelected === TABS.ANALYTICAL ? 'selected' : ''}
            onClick={() => {
              if (!isLoggedIn) {
                App.displayErrorMessage('Please log in to use this feature');
                return;
              }
              this.updateFormData('tabSelected', TABS.ANALYTICAL);
            }}
          />

          <Button
            text="High-res print"
            className={tabSelected === TABS.PRINT ? 'selected' : ''}
            onClick={() => {
              if (!isLoggedIn) {
                App.displayErrorMessage('Please log in to use this feature');
                return;
              }
              this.updateFormData('tabSelected', TABS.PRINT);
            }}
          />
        </div>
        <h3>Image download</h3>
        <div style={{ clear: 'both', height: 10 }} />
        {tabSelected === TABS.ANALYTICAL ? (
          <AnalyticalForm
            imageFormat={imageFormat}
            downloadLayers={downloadLayers}
            isIPT={isIPT}
            resolutionDivisor={resolutionDivisor}
            selectedCrs={selectedCrs}
            mPresets={mPresets}
            mChannels={mChannels}
            willGeneratePngOrJpg={this.isPngOrJpg(imageFormat)}
            showLogo={showLogo}
            renderImageSize={this.renderImageSize}
            updateFormData={this.updateFormData}
            renderCRSResolution={this.renderCRSResolution}
            updateLayer={this.updateLayer}
            resolutions={RESOLUTION_DIVISORS}
            availableCrs={AVAILABLE_CRS}
          />
        ) : tabSelected === TABS.PRINT ? (
          <PrintForm
            addMapOverlays={addMapOverlays}
            updateFormData={this.updateFormData}
            hasLegendData={Boolean(legendData)}
            showCaptions={showCaptions}
            showLegend={showLegend}
            userDescription={userDescription}
            imageWidthInches={imageWidthInches}
            imageHeightInches={imageHeightInches}
            resolutionDpi={resolutionDpi}
            imageFormat={imageFormat}
          />
        ) : (
          <BasicForm
            addingMapOverlaysPossible={true}
            addMapOverlays={addMapOverlays}
            updateFormData={this.updateFormData}
            hasLegendData={Boolean(legendData)}
            showCaptions={showCaptions}
            showLegend={showLegend}
            userDescription={userDescription}
          />
        )}
        <div className="submit-btn">
          <Button
            fluid
            loading={isDownloading}
            disabled={isDownloading || !this.isAllFalse()}
            onClick={this.downloadImage}
            icon="download"
            text="Download"
          />
        </div>

        {error ? <p style={{ color: '#b72c2c' }}>{error.toString()}</p> : null}
      </div>
    );
  }
}

export default connect(s => s)(ImageDownloadPanel);
