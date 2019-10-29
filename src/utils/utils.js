import axios from 'axios';
import values from 'lodash/values';
import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import L from 'leaflet';
import '../components/ext/leaflet-clip-wms-layer';
import Store from '../store';
import { getTokenFromLocalStorage, isTokenExpired } from './auth';
import { getFisShadowLayer } from '../components/FIS';

import '../components/ext/leaflet-tilelayer-wmts-src';

export function getMultipliedLayers(layers) {
  let result = [];
  for (let layer in layers) {
    if (layers.hasOwnProperty(layer)) {
      result.push(`${layers[layer]}*2.5`);
    }
  }
  return result.join(',');
}

export function isScriptFromLayers(script, layers) {
  return b64EncodeUnicode('return [' + getMultipliedLayers(layers) + '];') === script;
}

export function getCrsLabel(tile) {
  const { dataGeometry, tileGeometry, dataUri } = tile;
  const crs = 'EPSG:' + (dataGeometry || tileGeometry).crs.properties.name.split('::')[1];
  const mgrsPath = dataUri.split('/');
  const mgrs = mgrsPath[4] + mgrsPath[5] + mgrsPath[6];
  return { crs, mgrs };
}

export function isCustomPreset(preset) {
  return preset === 'CUSTOM';
}

export function getLayersString(layers) {
  return values(layers).join(',');
}

export function hasPinSaved(currPin) {
  const { userPins } = Store.current;
  return userPins.find(pin => {
    return isEqual(pin, currPin);
  });
}

export function getZoomLimitsForSelectedLayer() {
  const defaultMinZoom = 5;
  const defaultMaxZoom = 16;
  //const defaultAllowOverZoomBy = 0

  let minZoomFromGetCapabilities = undefined;
  let maxZoomFromGetCapabilities = undefined;

  if (Store.current.selectedResult) {
    const selectedDatasourceLayers = Store.current.presets[Store.current.selectedResult.name];
    const selectedLayer = selectedDatasourceLayers
      ? selectedDatasourceLayers.find(l => l.id === Store.current.selectedResult.preset)
      : undefined;
    if (selectedLayer) {
      minZoomFromGetCapabilities = selectedLayer.minZoom;
      maxZoomFromGetCapabilities = selectedLayer.maxZoom;
    }
  }
  // no allowOverZoomBy (or similar) from getCapabilities

  let minZoomFromConfig = undefined;
  let maxZoomFromConfig = undefined;
  //let allowOverZoomByFromConfig = undefined;
  if (Store.current.selectedResult) {
    const selectedDatasourceFromConfig = Store.current.instances.find(
      d => d.name === Store.current.selectedResult.name,
    );
    minZoomFromConfig = selectedDatasourceFromConfig.minZoom;
    maxZoomFromConfig = selectedDatasourceFromConfig.maxZoom;
    //allowOverZoomByFromConfig = selectedDatasourceFromConfig.allowOverZoomBy;
  }

  const minZoom =
    minZoomFromGetCapabilities !== undefined
      ? minZoomFromGetCapabilities
      : minZoomFromConfig !== undefined
        ? minZoomFromConfig
        : defaultMinZoom;
  const maxZoom =
    maxZoomFromGetCapabilities !== undefined
      ? maxZoomFromGetCapabilities
      : maxZoomFromConfig !== undefined
        ? maxZoomFromConfig
        : defaultMaxZoom;

  // const allowOverZoomBy =
  //   allowOverZoomByFromConfig !== undefined ? allowOverZoomByFromConfig : defaultAllowOverZoomBy;
  const allowOverZoomBy = 2;

  return { minZoom, maxZoom, allowOverZoomBy };
}

export function createMapLayer(instanceObj, pane, progress) {
  if (instanceObj === undefined) return;

  let selectedLayerTileSize = 512;

  if (Store.current.selectedResult) {
    const selectedDatasourceLayers = Store.current.presets[instanceObj.name];
    let selectedLayer = selectedDatasourceLayers
      ? selectedDatasourceLayers.find(l => l.id === Store.current.selectedResult.preset)
      : undefined;
    selectedLayerTileSize = selectedLayer && selectedLayer.tileSize ? selectedLayer.tileSize : 512;
  }

  const {
    name,
    baseUrls,
    tileSize = selectedLayerTileSize,
    tilematrixSet = 'PopularWebMercator512',
  } = instanceObj;

  const { minZoom, maxZoom: maxNativeZoom, allowOverZoomBy } = getZoomLimitsForSelectedLayer();
  // const maxNativeZoom = maxZoom;

  // when we create compare layer, we will create CLIP layer, otherwise normal wms layer
  let layer =
    pane === 'compareLayer'
      ? L.tileLayer.clip(baseUrls.WMS, {
          showlogo: false,
          tileSize,
          minZoom,
          maxZoom: maxNativeZoom + allowOverZoomBy,
          maxNativeZoom: maxNativeZoom,
          pane,
          name,
        })
      : baseUrls.WMTS
        ? L.tileLayer.wmts(baseUrls.WMTS, {
            showlogo: false,
            style: 'default',
            tileSize,
            minZoom,
            maxZoom: maxNativeZoom + allowOverZoomBy,
            maxNativeZoom: maxNativeZoom,
            pane,
            name,
            tilematrixSet,
          })
        : L.tileLayer.wms(baseUrls.WMS, {
            showlogo: false,
            tileSize,
            maxZoom: maxNativeZoom + allowOverZoomBy,
            maxNativeZoom: maxNativeZoom,
            minZoom,
            pane,
            name,
          });

  layer.on('loading', function() {
    progress.start();
    progress.inc(0.1);
  });

  layer.on('load', function() {
    progress.done();
  });

  layer.createTile = function(coords, done) {
    const tile = document.createElement('img');
    tile.width = tile.height = this.options.tileSize;
    tile.setAttribute('data', 'retries');
    tile.dataset.retries = 0;
    tile.onload = function() {
      done(null, tile); // Syntax is 'done(error, tile)'
    };

    tile.onerror = function(error) {
      const src = tile.src;
      setTimeout(() => {
        if (tile.dataset.retries < 5) {
          // retry img download if retries below 5
          tile.src = '';
          tile.dataset.retries++;
          tile.src = src;
        }
      }, 1000);

      done(error, tile); // Syntax is 'done(error, tile)'
    };

    tile.src = `${this.getTileUrl(coords)}`;
    return tile;
  };

  return layer;
}

const PINS_LC_NAME = 'react-app-pins';

function isValidPinId(id) {
  const idRegex = /^[0-9].*-pin$/i;
  return idRegex.test(id);
}

export function uniquePinId() {
  const token = getTokenFromLocalStorage();
  const userPart = Store.current.user.sub
    .split('-')
    .reverse()
    .join('')
    .substring(0, 16);
  const tokenPart = token.id_token.substring(token.id_token.length - 16, token.id_token.length);
  return `${Math.floor(Math.random() * 1000 + 100)}-${userPart + tokenPart}-${new Date().valueOf()}-pin`;
}

export function fetchPinsFromServer() {
  getPinsFromServer()
    .then(serverPins => {
      let shouldUpdateOnServer = false;
      // at the same time, merge local pins: (if there are any)
      const localPins = getPinsFromLocalStorage();
      if (localPins.length === 0) {
        return [serverPins, shouldUpdateOnServer];
      }

      shouldUpdateOnServer = true;
      let mergedPins = [...serverPins];
      localPins.forEach(lPin => {
        if (!serverPins.find(sPin => sPin._id === lPin._id)) {
          mergedPins.push(lPin);
        }
      });
      return [mergedPins, shouldUpdateOnServer];
    })
    .then(([mergedPins, shouldUpdateOnServer]) => {
      Store.setPins(mergedPins);
      if (shouldUpdateOnServer) {
        updatePinsOnServer(mergedPins)
          .then(() => {
            removePinsFromLocalStorage();
          })
          .catch(e => {
            console.error(e);
          });
      }
    })
    .catch(e => {
      if (e) {
        console.error(e);
      }
    });
}

function getPinsFromServer() {
  return new Promise((resolve, reject) => {
    const token = getTokenFromLocalStorage();
    if (!token || isTokenExpired(token)) {
      reject();
      return;
    }
    const url = `${process.env.REACT_APP_BASEURL}userdata/`;
    const requestParams = {
      responseType: 'json',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
    };
    axios
      .get(url, requestParams)
      .then(res => {
        try {
          const serverPins = res.data.pins;
          resolve(serverPins ? serverPins : []);
        } catch (e) {
          resolve([]);
        }
      })
      .catch(e => {
        if (e && e.response && e.response.status === 404) {
          resolve([]);
          return;
        }
        reject(e);
      });
  });
}

export async function updatePinsOnServer(pins) {
  return new Promise((resolve, reject) => {
    // get the original userData, fix it and upload again:
    const token = getTokenFromLocalStorage();
    if (!token) {
      console.log('Unable to save pins, auth token not available');
      reject();
      return;
    }
    const url = `${process.env.REACT_APP_BASEURL}userdata/`;
    const requestParams = {
      responseType: 'json',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
    };
    axios
      .get(url, requestParams)
      .then(res => res.data)
      .catch(e => {
        // if no user data is found, ignore the error:
        if (e && e.response && e.response.status === 404) {
          return {};
        }
        throw e;
      })
      .then(userData => {
        const newData = cloneDeep(userData);
        newData.pins = pins;
        axios
          .put(url, newData, requestParams)
          .then(() => {
            resolve(pins);
          })
          .catch(e => {
            console.error('Unable to save pins!', e);
            reject(e);
          });
      })
      .catch(e => {
        console.error('Unable to retrieve user data!', e);
        reject(e);
      });
  });
}

export function getPinsFromLocalStorage() {
  let pinsString = window.localStorage.getItem(PINS_LC_NAME);
  if (!pinsString) {
    return [];
  }

  const localPins = JSON.parse(pinsString)
    .filter(pin => pin.name || pin.datasource)
    .map((pin, index) => {
      if (pin.properties) {
        // legacy format
        const {
          name,
          properties: {
            rawData: { time },
          },
          map: { latitude, longitude, zoom },
          ...rest
        } = pin;
        return {
          ...rest,
          _id: isValidPinId(pin._id) ? pin._id : uniquePinId(),
          datasource: name,
          lat: latitude,
          lng: longitude,
          zoom,
          time,
        };
      }
      return {
        ...pin,
        opacity: [0, 1],
        _id: isValidPinId(pin._id) ? pin._id : uniquePinId(),
      };
    });
  return localPins;
}

export function removePinsFromLocalStorage() {
  window.localStorage.removeItem(PINS_LC_NAME);
}

export function b64DecodeUnicode(str) {
  try {
    atob(str);
  } catch (e) {
    return '';
  }
  return atob(str);
}
export function b64EncodeUnicode(str) {
  return btoa(str);
}

export function evalscriptoverridesToString(overridesObj) {
  let encodedOverrides = '';
  if (overridesObj.gainOverride) {
    encodedOverrides += `gainOverride=${overridesObj.gainOverride};`;
  }
  if (overridesObj.gammaOverride) {
    encodedOverrides += `gammaOverride=${overridesObj.gammaOverride};`;
  }

  if (checkIfFisLayer()) {
    if (overridesObj.valueRangeOverride) {
      encodedOverrides += `rangeOverrides=${JSON.stringify([overridesObj.valueRangeOverride])};`;
    }
  } else if (
    overridesObj.redRangeOverride ||
    overridesObj.greenRangeOverride ||
    overridesObj.blueRangeOverride
  ) {
    let rgbRangeOverrides = [[0, 1], [0, 1], [0, 1]];
    if (overridesObj.redRangeOverride) {
      rgbRangeOverrides[0] = overridesObj.redRangeOverride;
    }
    if (overridesObj.greenRangeOverride) {
      rgbRangeOverrides[1] = overridesObj.greenRangeOverride;
    }
    if (overridesObj.blueRangeOverride) {
      rgbRangeOverrides[2] = overridesObj.blueRangeOverride;
    }
    encodedOverrides += `rangeOverrides=${JSON.stringify(rgbRangeOverrides)};`;
  }

  return encodedOverrides;
}

// JUST FOR SENTINEL-2
export function checkIfFisLayer() {
  const isSelectedResult = !!Store.current.selectedResult;
  const isCustomLayer = Store.current.selectedResult && isCustomPreset(Store.current.selectedResult.preset);
  const isShadowLayerAvailable =
    Store.current.selectedResult &&
    !!getFisShadowLayer(Store.current.selectedResult.name, Store.current.selectedResult.preset);
  const isFisAvailableOnDatasource = !!(
    Store.current.selectedResult && Store.current.selectedResult.baseUrls.FIS
  );

  return isSelectedResult && isFisAvailableOnDatasource && (isShadowLayerAvailable || isCustomLayer);
}

export function checkIfKnownValueLayer() {
  // NDVI
  // moisture index
  // NDWI
  //

  return null;
}
