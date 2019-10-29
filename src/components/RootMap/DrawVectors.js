import React from 'react';
import geo_area from '@mapbox/geojson-area';
import moment from 'moment';
import Rodal from 'rodal';
import Store from '../../store';
import App from '../../App';
import MeasureIcon from './MeasureIcon';
import { isCustomPreset } from '../../utils/utils';
import { getFisShadowLayer } from '../FIS';
import ImageDownloadPanel from '../ImageDownload/ImageDownloadPanel';
import Timelapse from '../Timelapse';

import Tutorial from '../Tutorial/Tutorial';

const NOT_LOGGED_IN_ERROR_MESSAGE = 'you need to log in to use this function';
const LAYER_NOT_SELECTED_ERROR_MESSAGE = 'please select a layer';
const COMPARE_MODE_ERROR_MESSAGE = 'downloading image in compare mode is not possible';
const DATASOURCE_NOT_SUPPORTED_ERROR_MESSAGE = 'this datasource is not supported';

const PrettyDistance = ({ distance }) => {
  const divided = distance / 1000;
  if (divided >= 1) {
    return <span>{divided.toFixed(2)} km</span>;
  } else {
    return <span>{distance.toFixed()} m</span>;
  }
};

const PrettyArea = ({ area }) => {
  const areaKM = area / 1000000;
  return (
    <span>
      {areaKM.toFixed(3)} km<sup>2</sup>
    </span>
  );
};
export class MeasurePanelButton extends React.Component {
  showMeasureInfo = () => (
    <span className="aoiCords">
      {this.props.distance && (
        <div className="measure-text">
          <PrettyDistance distance={this.props.distance} />
        </div>
      )}
      {this.props.area !== 0 && this.props.area ? (
        <div className="measure-text">
          <PrettyArea area={this.props.area} />
        </div>
      ) : null}
      <span>
        <a onClick={this.props.removeMeasurement} title="Remove measurement">
          <i className={`fa fa-close`} />
        </a>
      </span>
    </span>
  );

  renderMeasureIcon = () => {
    const errMsg = this.props.isLoggedIn ? null : NOT_LOGGED_IN_ERROR_MESSAGE;
    const isEnabled = errMsg === null;
    const title = `Measure distances ${errMsg ? ` (${errMsg})` : ''}`;
    return (
      <a
        className={`drawGeometry ${this.props.isLoggedIn ? '' : 'disabled'}`}
        onClick={ev => {
          if (!isEnabled) {
            App.displayErrorMessage(title);
            return;
          }
          this.props.toggleMeasure();
        }}
        title={title}
      >
        <i>
          <MeasureIcon />
        </i>
      </a>
    );
  };

  render() {
    return (
      <div className="measurePanel panelButton floatItem">
        {this.props.hasMeasurement && this.showMeasureInfo()}
        {this.renderMeasureIcon()}
      </div>
    );
  }
}

export class POIPanelButton extends React.Component {
  state = {
    showOptions: false,
  };

  renderMarkerIcon = () => {
    const errMsg = this.props.disabled ? NOT_LOGGED_IN_ERROR_MESSAGE : null;
    const isEnabled = errMsg === null;
    const title = `Mark point of interest${errMsg ? ` (${errMsg})` : ''}`;
    return (
      <span
        onClick={ev => {
          if (!isEnabled) {
            App.displayErrorMessage(title);
            return;
          }
          this.props.drawMarker();
        }}
        title={title}
      >
        <a className={`drawGeometry ${this.props.disabled ? 'disabled' : ''}`}>
          <i className="fa fa-map-marker" />
        </a>
      </span>
    );
  };

  renderMarkerInfo = () => (
    <span>
      <a onClick={() => this.props.centerOnFeature('poiLayer')} title="Center map on feature">
        <i className={`fa fa-crosshairs`} />
      </a>
      {this.props.poi && (
        <FisChartLink
          aoiOrPoi={'poi'}
          selectedResult={this.props.selectedResult}
          openFisPopup={this.props.openFisPopup}
        />
      )}
      <a onClick={this.props.deleteMarker} title={'Remove geometry'}>
        <i className={`fa fa-close`} />
      </a>
    </span>
  );

  render() {
    const { poi } = this.props;
    return (
      <div className="poiPanel panelButton floatItem" title="Area of interest">
        {poi && !this.props.disabled && this.renderMarkerInfo()}
        {this.renderMarkerIcon()}
      </div>
    );
  }
}

export class AOIPanelButton extends React.Component {
  state = {
    showOptions: false,
  };

  showOptions = () => {
    if (this.hideOptionsTimeout) {
      clearTimeout(this.hideOptionsTimeout);
      this.hideOptionsTimeout = null;
    }
    this.setState({ showOptions: true });
  };

  hideOptions = () => {
    this.hideOptionsTimeout = setTimeout(() => {
      this.setState({ showOptions: false });
    }, 400);
  };

  renderOptionButtons = () => (
    <div className="aoiCords">
      <OpenUploadDataDialogButton handleClick={this.props.openUploadGeoFileDialog} />
      <DrawButton geomType={'polygon'} />
    </div>
  );

  renderAioInfo = () => (
    <span className="aoiCords">
      <span className="area-text">
        {(
          parseFloat(
            geo_area.geometry(
              this.props.aoiBounds ? this.props.aoiBounds.geometry : this.props.mapGeometry.geometry,
            ),
          ) / 1000000
        ).toFixed(2)}{' '}
        km<sup>2</sup>
      </span>
      <span>
        <a onClick={() => this.props.centerOnFeature('aoiLayer')} title="Center map on feature">
          <i className={`fa fa-crosshairs`} />
        </a>
        {this.props.aoiBounds && (
          <FisChartLink
            selectedResult={this.props.selectedResult}
            openFisPopup={this.props.openFisPopup}
            aoiOrPoi={'aoi'}
          />
        )}
        <a onClick={this.props.resetAoi} title={this.props.isAoiClip ? 'Cancel edit.' : 'Remove geometry'}>
          <i className={`fa fa-close`} />
        </a>
      </span>
    </span>
  );

  render() {
    const { aoiBounds, isAoiClip } = this.props;
    const { showOptions } = this.state;
    const doWeHaveAOI = aoiBounds || isAoiClip;
    const showOptionsMenu = !doWeHaveAOI && showOptions;
    const errMsg = this.props.disabled ? NOT_LOGGED_IN_ERROR_MESSAGE : null;
    const isEnabled = errMsg === null;
    const title = `Draw area of interest${errMsg ? ` (${errMsg})` : ''}`;
    return (
      <div
        className="aoiPanel panelButton floatItem"
        onMouseEnter={!this.props.disabled ? this.showOptions : null}
        onMouseLeave={!this.props.disabled ? this.hideOptions : null}
        onClick={ev => {
          if (!isEnabled) {
            App.displayErrorMessage(title);
          }
        }}
        title={title}
      >
        {showOptionsMenu && this.renderOptionButtons()}
        {doWeHaveAOI && !this.props.disabled && this.renderAioInfo()}
        <a className={`drawGeometry ${this.props.disabled ? 'disabled' : ''}`}>
          <i>
            <PolygonSvgIcon />
          </i>
        </a>
      </div>
    );
  }
}

const DrawButton = ({ geomType }) => (
  <a
    onClick={geomType === 'polygon' ? () => Store.setIsClipping(true) : null}
    title="Draw area of interest for image downloads"
  >
    <i className={`fa fa-pencil`} />
  </a>
);

const OpenUploadDataDialogButton = ({ handleClick }) => (
  <a title="Upload data" onClick={handleClick}>
    <i className="fa fa-upload" />
  </a>
);

const PolygonSvgIcon = ({ fillColor }) => (
  <svg height="16px" version="1.1" viewBox="0 0 16 16" width="16px" xmlns="http://www.w3.org/2000/svg">
    <defs id="defs4" />
    <g id="layer1" transform="translate(0,-1036.3622)">
      <path
        d="M 8,0.75 0.75,6.5 4,15.25 l 8,0 3.25,-8.75 z"
        id="path2985"
        fill={fillColor || '#b6bf00'}
        transform="translate(0,1036.3622)"
      />
    </g>
  </svg>
);

const FisChartLink = props => {
  const isSelectedResult = !!props.selectedResult;
  const isCustomLayer = props.selectedResult && isCustomPreset(props.selectedResult.preset);
  const isShadowLayerAvailable =
    props.selectedResult && !!getFisShadowLayer(props.selectedResult.name, props.selectedResult.preset);
  const isFisAvailableOnDatasource = !!(props.selectedResult && props.selectedResult.baseUrls.FIS);
  if (isSelectedResult && isFisAvailableOnDatasource && (isShadowLayerAvailable || isCustomLayer)) {
    return (
      <a
        onClick={() => props.openFisPopup(props.aoiOrPoi)}
        title="Statistical Info / Feature Info Service chart"
      >
        <i className={`fa fa-bar-chart`} />
      </a>
    );
  } else {
    const errorMessage = `Statistical Info / Feature Info Service chart - ${
      !isSelectedResult
        ? 'please select a layer'
        : !isFisAvailableOnDatasource
          ? 'not available for ' + props.selectedResult.name
          : `not available for "${
              Store.current.presets[props.selectedResult.name].find(l => l.id === props.selectedResult.preset)
                .name
            }" (layer with value is not set up)`
    }`;
    return (
      <a
        onClick={e => {
          e.preventDefault();
          App.displayErrorMessage(errorMessage);
        }}
        title={errorMessage}
        className="disabled"
      >
        <i className={`fa fa-bar-chart`} />
      </a>
    );
  }
};

export class DownloadPanelButton extends React.Component {
  triggerImageDownload = () => {
    const modalDialogId = 'analytical-download';
    Store.addModalDialog(
      modalDialogId,
      <Rodal
        animation="slideUp"
        customStyles={{
          height: 'auto',
          maxHeight: '80vh',
          bottom: 'auto',
          width: '750px',
          top: '5vh',
          overflow: 'auto',
        }}
        visible
        onClose={() => Store.removeModalDialog(modalDialogId)}
        closeOnEsc={true}
      >
        <ImageDownloadPanel originalMap={this.props.originalMap} />
      </Rodal>,
    );
  };

  render() {
    const isLayerSelected = !!Store.current.selectedResult;
    const isCompareMode = Store.current.compareMode;

    const errMsg = isCompareMode
      ? COMPARE_MODE_ERROR_MESSAGE
      : !isLayerSelected
        ? LAYER_NOT_SELECTED_ERROR_MESSAGE
        : !Store.current.selectedResult.baseUrls.WMS
          ? DATASOURCE_NOT_SUPPORTED_ERROR_MESSAGE
          : null;
    const isEnabled = errMsg === null;
    const title = `Download image${errMsg ? ` (${errMsg})` : ''}`;
    return (
      <div
        className="screenshotPanelButton panelButton floatItem"
        title={title}
        onClick={ev => {
          if (!isEnabled) {
            App.displayErrorMessage(title);
            return;
          }
          this.triggerImageDownload();
        }}
      >
        <a className={`drawGeometry ${isEnabled ? '' : 'disabled'}`}>
          <i className="fa fa-file-image-o" />
        </a>
      </div>
    );
  }
}

export class TimelapsePanelButton extends React.Component {
  showTimelapse = () => {
    const modalDialogId = 'timelapse';
    const datasourceName = Store.current.selectedResult.datasource;
    Store.addModalDialog(
      modalDialogId,
      <Timelapse
        datasource={datasourceName}
        startDate={moment(Store.current.selectedResult.time)}
        captionPrefix={datasourceName || 'Sentinel-2'}
        onClose={() => Store.removeModalDialog(modalDialogId)}
      />,
    );
  };

  render() {
    const isLayerSelected = !!Store.current.selectedResult;
    const isCompareMode = Store.current.compareMode;
    const isLoggedIn = !!Store.current.user;
    const isTimelapseSupported =
      isLayerSelected && Store.current.selectedResult.getDates && Store.current.selectedResult.baseUrls.WMS;

    const errMsg = isCompareMode
      ? COMPARE_MODE_ERROR_MESSAGE
      : !isLoggedIn
        ? NOT_LOGGED_IN_ERROR_MESSAGE
        : !isLayerSelected
          ? LAYER_NOT_SELECTED_ERROR_MESSAGE
          : !isTimelapseSupported
            ? DATASOURCE_NOT_SUPPORTED_ERROR_MESSAGE
            : null;
    const isEnabled = errMsg === null;
    const title = `Create timelapse animation${errMsg ? ` (${errMsg})` : ''}`;
    return (
      <div
        className="timelapsePanelButton panelButton floatItem"
        title={title}
        onClick={ev => {
          if (!isEnabled) {
            App.displayErrorMessage(title);
            return;
          }
          this.showTimelapse();
        }}
      >
        <a className={`drawGeometry ${isEnabled ? '' : 'disabled'}`}>
          <i className="fa fa-film" />
        </a>
      </div>
    );
  }
}

export class InfoPanelButton extends React.Component {
  render() {
    return <Tutorial />;
  }
}
