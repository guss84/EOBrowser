import axios from 'axios';
import { cacheAdapterEnhancer } from 'axios-extensions';
import moment from 'moment';
import Store from '../../store';
import { evalscriptoverridesToString } from '../../utils/utils';
import { calcBboxFromXY, bboxToPolygon, getRecommendedResolution, getMapDOMSize } from '../../utils/coords';
import { distance } from '../../utils/distance';
import { scalebarPixelWidthAndDistance } from './scalebarUtils';
import { fetchAvailableDates } from '../../utils/datesHelper';
import copernicus from '../../assets/copernicus.png';
import SHlogo from '../../assets/shLogo.png';

const cachingAxios = axios.create({
  responseType: 'blob',
  adapter: cacheAdapterEnhancer(axios.defaults.adapter, true),
});

const PADDING = 80;
const REQUEST_RETRY_LIMIT = 2;
let imageWidthMeters;

export function createTimelapseBbox() {
  const { lat, lng, zoom } = Store.current;
  const size = getMapDOMSize();
  const widthOrHeight = Math.min(size.width, size.height);
  return calcBboxFromXY({
    lat,
    lng,
    zoom,
    width: widthOrHeight,
    height: widthOrHeight,
    wgs84: true,
  });
}

export async function fetchDates({ from, to }, maxCount) {
  const bbox = createTimelapseBbox();
  const boundsGeojson = bboxToPolygon(bbox);
  imageWidthMeters = distance(boundsGeojson.coordinates[0][3], boundsGeojson.coordinates[0][4]);
  let fromDate = moment(from).startOf('day');
  let toDate = moment(to).endOf('day');

  return fetchAvailableDates(fromDate, toDate, null, boundsGeojson).then(res => res);
}

const getCloudCoverageLayer = (instanceName, originalLayerId) => {
  const { cloudCoverageLayers } = Store.current;
  if (!cloudCoverageLayers[instanceName]) {
    return null;
  }
  return cloudCoverageLayers[instanceName];
};

export async function getCC({ from, to }, cancelToken) {
  const { lat, lng, zoom, selectedResult, presets } = Store.current;
  const url = selectedResult.baseUrls.FIS;
  let layerInfo;
  const size = getMapDOMSize();
  const widthOrHeight = Math.min(size.width, size.height) + PADDING;
  const originalLayerId = selectedResult.preset;
  const originalLayerInfo = presets[selectedResult.name].find(layer => layer.id === originalLayerId);

  const cloudCoverageLayerinfo = getCloudCoverageLayer(selectedResult.name, originalLayerId);
  if (cloudCoverageLayerinfo) {
    layerInfo = {
      ...cloudCoverageLayerinfo,
      image: originalLayerInfo ? originalLayerInfo.image : cloudCoverageLayerinfo.image,
    };
  } else {
    layerInfo = originalLayerInfo;
  }

  const bbox = calcBboxFromXY({
    lat,
    lng,
    zoom,
    width: widthOrHeight,
    height: widthOrHeight,
    wgs84: true,
  });
  const resolution = getRecommendedResolution(bboxToPolygon(bbox));
  const requestUrl = `${url}?LAYER=${
    layerInfo.id
  }&CRS=CRS:84&TIME=${from}/${to}&RESOLUTION=${resolution}m&BBOX=${bbox}&MAXCC=100`;
  try {
    const { data } = await axios.get(requestUrl, { cancelToken });
    return data['C0'].reverse();
  } catch (err) {
    if (axios.isCancel(err)) {
      console.log('Request canceled', err.message);
    } else {
      console.error(err);
      throw err;
    }
  }
}

function getActiveInstance(name) {
  return Store.current.instances.find(inst => inst.name === name) || {};
}

export function getCurrentBboxUrl() {
  const {
    lat,
    lng,
    zoom,
    isEvalUrl,
    selectedResult: {
      name,
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
      evalsource,
    },
  } = Store.current;

  const datasetLayers = Store.current.presets[name];
  const size = getMapDOMSize();
  const widthOrHeight = Math.min(size.width, size.height) + PADDING;
  const { baseUrls } = getActiveInstance(name);
  const evalscriptoverridesObj = {
    gainOverride,
    gammaOverride,
    redRangeOverride,
    greenRangeOverride,
    blueRangeOverride,
    valueRangeOverride,
  };

  return `${baseUrls.WMS}?SERVICE=WMS&REQUEST=GetMap&width=512&height=512&layers=${
    preset === 'CUSTOM' ? datasetLayers[0].id : preset
  }&evalscript=${
    preset !== 'CUSTOM' ? '' : isEvalUrl ? '' : window.encodeURIComponent(evalscript)
  }&evalscripturl=${isEvalUrl ? evalscripturl : ''}&evalscriptoverrides=${btoa(
    evalscriptoverridesToString(evalscriptoverridesObj),
  )}
  &evalsource=${evalsource}
  &atmfilter=${atmFilter ? atmFilter : ''}&bbox=${calcBboxFromXY({
    lat,
    lng,
    zoom,
    width: widthOrHeight,
    height: widthOrHeight,
  })}&CRS=EPSG%3A3857&MAXCC=100&FORMAT=image/jpeg`;
}

export async function fetchBlobObj(request, cancelToken) {
  try {
    const response = await cachingAxios.get(request.url, { date: request.date, cancelToken });
    return decorateBlob(response.config.date, response.data);
  } catch (err) {
    if (axios.isCancel(err)) {
      throw err;
    } else {
      if (request.try < REQUEST_RETRY_LIMIT) {
        request.try++;
        fetchBlobObj(request);
        throw err;
      }
    }
  }
}

function decorateBlob(date, blob) {
  const canvas = document.createElement('canvas');
  const height = 512;
  const width = 512;
  const { widthPx, label } = scalebarPixelWidthAndDistance(imageWidthMeters / width);
  return new Promise((resolve, reject) => {
    const mainImg = new Image();
    const sh = new Image();
    sh.crossOrigin = '';
    const cpImg = new Image();
    cpImg.crossOrigin = '';
    mainImg.crossOrigin = '';
    canvas.width = width;
    canvas.height = height;
    mainImg.onload = () => {
      try {
        const ctx = canvas.getContext('2d');
        ctx.drawImage(mainImg, 0, 0);
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';

        const dateSize = ctx.measureText(date);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        const rightLeftPadding = 5;
        ctx.fillRect(
          canvas.width - dateSize.width - rightLeftPadding * 2,
          0,
          dateSize.width + rightLeftPadding * 4,
          parseInt(ctx.font, 10) + 10,
        );
        ctx.textAlign = 'left';
        ctx.fillStyle = '#eee';

        ctx.fillText(date, canvas.width - dateSize.width - rightLeftPadding, 16);
        //scale
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.strokeStyle = '#fff';
        ctx.fillStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.textAlign = 'center';
        ctx.beginPath();
        ctx.moveTo(10, canvas.height - 25);
        ctx.lineTo(10, canvas.height - 15);
        ctx.font = '11px Arial';
        ctx.lineTo(widthPx + 10, canvas.height - 15);
        ctx.lineTo(widthPx + 10, canvas.height - 25);
        ctx.stroke();
        ctx.textAlign = 'center';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.strokeStyle = '#767777';
        ctx.strokeText(label, widthPx / 2 + 10, canvas.height - 20);
        ctx.fillText(label, widthPx / 2 + 10, canvas.height - 20);

        //sentinel hub logo
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 2;

        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.drawImage(sh, canvas.width - 120, canvas.height - 30, sh.width * 0.8, sh.height * 0.8);

        //copernicus logo

        ctx.drawImage(cpImg, canvas.width - 220, canvas.height - 35, cpImg.width * 0.8, cpImg.height * 0.8);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        URL.revokeObjectURL(mainImg.src);
        resolve({
          objectUrl: dataUrl,
          date: date,
          success: true,
        });
      } catch (e) {
        reject('Error generating image');
      }
    };

    mainImg.onerror = err => {
      reject(err);
    };
    mainImg.src = URL.createObjectURL(blob);
    sh.src = SHlogo;
    cpImg.src = copernicus;
  });
}
