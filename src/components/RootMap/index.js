import React from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import NProgress from 'nprogress';
import { roundDegrees, calcBboxFromXY, bboxToPolygon, getMapDOMSize } from '../../utils/coords';
import { createMapLayer, isCustomPreset, evalscriptoverridesToString } from '../../utils/utils';
import { evalSourcesMap } from '../../store/config';
import '../ext/leaflet-clip-wms-layer';
import '../ext/leaflet-mapbox-gl';
import '../ext/leaflet-ruler';
import Store from '../../store';
import get from 'dlv';
import { connect } from 'react-redux';
import 'nprogress/nprogress.css';
import 'leaflet.pm';
import 'leaflet.pm/dist/leaflet.pm.css';
import gju from 'geojson-utils';
import UploadGeoFile from '../UploadGeoFile';
import FIS from '../FIS';
import '../ext/leaflet-ruler';
import '../ext/color-labels';

import {
  AOIPanelButton,
  POIPanelButton,
  DownloadPanelButton,
  TimelapsePanelButton,
  MeasurePanelButton,
  InfoPanelButton,
} from './DrawVectors';
import './RootMap.scss';
import pin from './pin.png';
import { DEFAULT_POLY_STYLE, HIGHLIGHT_POLY_STYLE } from '../../store/config';
import roadStyle from './roadStyle.json';
import boundariesStyle from './boundariesStyle.json';
import 'mapbox-gl/dist/mapbox-gl.css';

let DefaultIcon = L.icon({
  iconUrl: pin,
  iconAnchor: [13, 40],
});

L.Marker.prototype.options.icon = DefaultIcon;

export const DEFAULT_RESULTS_GROUP = 'default';

const COMPARE_LAYER_PANE = 'compareLayer';
const ACTIVE_LAYER_PANE = 'activeLayer';
const EDIT_LAYER_PANE = 'editingLayerPane';
const LABEL_LAYER_PANE = 'labelLayer';
const MARKER_LAYER_PANE = 'markerPane';
const ROAD_LAYER_PANE = 'roadLayerPane';
const ADMIN_LAYER_PANE = 'adminLayerPane';
const MAPBOX_TOKEN = `pk.eyJ1IjoiZ2FleHRyYSIsImEiOiJjajE3cHNrMnMwMDJtMnFuNXoydjI2ODQxIn0.05mV754pUS0SjiThIUx96A`;
class RootMap extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      activeLayers: [],
      isLoaded: false,
      query: this.props.formQuery,
      showClip: false,
      location: [],
      instances: {},
      uploadDialog: false,
      hasMeasurement: false,
      measureDistance: null,
      measureArea: null,
    };
    this.aoiLayer = null;
    this.mainMap = null;
    this.activeLayer = L.tileLayer('');
    this.allResults = [];
    this.compareLayers = [];
    this.progress = null;
  }

  componentDidMount() {
    const { mapId, lat, lng, zoom, mapMaxBounds } = this.props;
    this.progress = NProgress.configure({
      showSpinner: false,
      parent: `#${mapId}`,
    });

    //construct baselayers object for control
    //	http://a.tile.openstreetmap.org/${z}/${x}/${y}.png
    const cartoLightNoLabels = L.tileLayer(
      'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_nolabels/{z}/{x}/{y}.png',
      {
        // http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
        attribution: 'Carto © CC BY 3.0, OpenStreetMap © ODbL',
        name: 'Carto Light',
        print: false,
      },
    );
    const cartoVoyagerNoLabels = L.tileLayer(
      'https://cartodb-basemaps-{s}.global.ssl.fastly.net/rastertiles/voyager_nolabels/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution: 'Carto © CC BY 3.0, OpenStreetMap © ODbL',
        print: false,
      },
    );

    const cartoLabels = L.tileLayer.makeLabelsReadable(
      'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_only_labels/{z}/{x}/{y}.png',
      {
        maxZoom: 18,
        attribution: 'Carto © CC BY 3.0, OpenStreetMap © ODbL',
        print: true,
      },
    );

    const satelliteStreets = L.mapboxGL({
      attribution:
        '<a href="https://www.maptiler.com/license/maps/" target="_blank">© MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap contributors</a>',
      accessToken: MAPBOX_TOKEN,
      style: roadStyle,
      print: false,
      preserveDrawingBuffer: true,
    });

    const satelliteAdmin = L.mapboxGL({
      attribution:
        '<a href="https://www.maptiler.com/license/maps/" target="_blank">© MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap contributors</a>',
      accessToken: MAPBOX_TOKEN,
      style: boundariesStyle,
      print: false,
      preserveDrawingBuffer: true,
    });

    this.mainMap = L.map(mapId, {
      center: [lat, lng],
      zoom: zoom,
      minZoom: 3,
      layers: [cartoVoyagerNoLabels],
      maxBounds: L.latLngBounds(mapMaxBounds),
      maxBoundsViscosity: 0.9, //bounce back effect
      attributionControl: false,
    });
    this.mainMap.createPane(COMPARE_LAYER_PANE);
    this.mainMap.createPane(ACTIVE_LAYER_PANE);
    this.mainMap.createPane(EDIT_LAYER_PANE);
    this.mainMap.createPane(LABEL_LAYER_PANE);
    this.mainMap.createPane(ADMIN_LAYER_PANE);
    this.mainMap.createPane(ROAD_LAYER_PANE);
    this.mainMap.getPane(MARKER_LAYER_PANE).style.zIndex = 63;
    this.mainMap.getPane(EDIT_LAYER_PANE).style.zIndex = 62;
    this.mainMap.getPane(LABEL_LAYER_PANE).style.zIndex = 61;
    this.mainMap.getPane(ROAD_LAYER_PANE).style.zIndex = 60;
    this.mainMap.getPane(ADMIN_LAYER_PANE).style.zIndex = 60;
    this.mainMap.getPane(COMPARE_LAYER_PANE).style.zIndex = 50;
    this.mainMap.getPane(ACTIVE_LAYER_PANE).style.zIndex = 40;
    this.mainMap.getPane(ACTIVE_LAYER_PANE).style.pointerEvents = 'none';
    this.mainMap.getPane(COMPARE_LAYER_PANE).style.pointerEvents = 'none';

    cartoLabels.options.pane = LABEL_LAYER_PANE;
    cartoLabels.addTo(this.mainMap);
    satelliteStreets.options.pane = ROAD_LAYER_PANE;
    satelliteAdmin.options.pane = ADMIN_LAYER_PANE;

    const baseMaps = {
      'Carto Voyager': cartoVoyagerNoLabels,
      'Carto Light': cartoLightNoLabels,
    };
    const overlays = {
      Roads: satelliteStreets,
      Borders: satelliteAdmin,
      Labels: cartoLabels,
    };
    this.ruler = L.ruler().addTo(this.mainMap);
    L.control.scale({ imperial: false, position: 'bottomright' }).addTo(this.mainMap);
    L.control.attribution({ position: 'bottomleft' }).addTo(this.mainMap);
    this.poiLayer = L.geoJson().addTo(this.mainMap);
    this.poiLayer.pm.enable();

    this.layerControl = L.control
      .layers(baseMaps, overlays, {
        sortLayers: true,
        autoZIndex: false,
        sortFunction: (a, b) => {
          return (
            this.mainMap.getPane(a.options.pane).style.zIndex -
            this.mainMap.getPane(b.options.pane).style.zIndex
          );
        },
      })
      .addTo(this.mainMap);

    this.mainMap.zoomControl.setPosition('bottomright');

    this.mainMap.on('layeradd', addedLayer => {
      if (addedLayer.layer instanceof L.MapboxGL) {
        addedLayer.layer._update();
      }
    });

    this.mainMap.on('moveend', () => {
      Store.setMapView({
        lat: this.mainMap.getCenter().lat,
        lng: this.mainMap.getCenter().wrap().lng,
        zoom: this.mainMap.getZoom(),
      });
      Store.setMapBounds(this.mainMap.getBounds(), this.mainMap.getPixelBounds());
    });
    this.mainMap.on('mousemove', e => {
      const coords = e.latlng.wrap();
      const zoom = this.mainMap.getZoom();
      const lng = roundDegrees(coords.lng, zoom);
      const lat = roundDegrees(coords.lat, zoom);
      const value = `Lat: ${lat}, Lng: ${lng}`;
      document.getElementById('mapCoords').innerHTML = value;
    });
    this.mainMap.attributionControl.setPrefix(''); //<a href="https://leafletjs.com" target="_blank" title="A JS library for interactive maps">Leaflet</a>')
    this.mainMap.on('resize', () => {
      this.resetAllLayers();
      if (Store.current.compareModeType === 'split') {
        this.props.pins.forEach((pin, index) => {
          this.setOverlayParams(pin.opacity, index);
        });
      }
    });

    this.mainMap.on('measure:startMeasure', e => {
      this.setState({ hasMeasurement: true, measureDistance: null, measureArea: null });
    });
    //measure events
    this.mainMap.on('measure:move', e => {
      this.setState({ measureDistance: e.distance, measureArea: e.area });
    });
    this.mainMap.on('measure:pointAdded', e => {
      this.setState({ measureDistance: e.distance, measureArea: e.area });
    });
    this.mainMap.on('measure:finish', e => {
      this.setState({ measureDistance: e.distance, measureArea: e.area });
    });
    this.mainMap.on('measure:removed', e => {
      this.setState({ hasMeasurement: false, measureDistance: null, measureArea: null });
    });

    // add leaflet.pm controls to the map
    // this.mainMap.pm.addControls(options)

    this.mainMap.on('pm:create', e => {
      const layer = e.layer;
      if (layer instanceof L.Polygon) {
        this.addAoiLayer(layer);
        Store.setIsClipping(false);
        e.layer.pm.toggleEdit();
        e.layer.on('pm:edit', f => {
          this.updateAOIGeometryInStore(f.target);
        });
      }
      if (layer instanceof L.Marker) {
        this.mainMap.pm.disableDraw('Marker');
        this.updateMarkers(layer);
        this.poiLayer.pm.toggleEdit();
        e.layer.on('pm:edit', f => {
          this.updateMarkers(f.target);
        });
      }
    });

    this.mainMap.on('pm:remove', e => {
      this.removeAoiLayer(e.layer, true);
    });

    this.mainMap.on('overlayadd', addedLayer => {
      if (addedLayer.layer.options.pane === 'activeLayer') {
        Store.toggleActiveLayer(true);
      }
    });
    this.mainMap.on('overlayremove', removedLayer => {
      if (removedLayer.layer.options.pane === 'activeLayer') {
        Store.toggleActiveLayer(false);
      }
    });

    this.aoiLayer = L.geoJSON();
    this.aoiLayer.options.pane = EDIT_LAYER_PANE;
    this.aoiLayer.addTo(this.mainMap);

    this.mainMap.setView([Store.current.lat, Store.current.lng], Store.current.zoom);
    this.mainMap.trackResize = true;
    Store.setMapBounds(this.mainMap.getBounds(), this.mainMap.getPixelBounds());
    this.setState({ isLoaded: true });
    this.visualizeLayer();
  }

  toggleMapEdit = () => {
    const { isAoiClip } = Store.current;
    isAoiClip
      ? this.mainMap.pm.enableDraw('Poly', {
          finishOn: 'contextmenu',
          allowSelfIntersection: true,
        })
      : this.mainMap.pm.disableDraw('Poly');
  };

  toggleMeasure = () => {
    this.ruler.toggle();
  };

  removeMeasurement = () => {
    this.ruler.removeMeasurement();
  };

  removeAOILayers = () => {
    this.aoiLayer.eachLayer(layer => {
      this.mainMap.removeLayer(layer);
    });
  };

  updateAOIGeometryInStore = () => {
    if (this.aoiLayer.getLayers().length === 0) {
      Store.setAOIBounds(null);
    } else {
      Store.setAOIBounds({
        geometry: this.aoiLayer.toGeoJSON().features[0].geometry,
        bounds: this.aoiLayer.getBounds(),
      });
    }
  };

  addAoiLayer = childLayer => {
    this.aoiLayer.addLayer(childLayer);
    this.updateAOIGeometryInStore();
  };

  removeAoiLayer = childLayer => {
    this.aoiLayer.removeLayer(childLayer);
    this.updateAOIGeometryInStore();
  };

  addRemoveActiveLayer(show) {
    this.activeLayer &&
      (!show ? this.mainMap.removeLayer(this.activeLayer) : this.activeLayer.addTo(this.mainMap));
  }
  updateMarkers = childLayer => {
    const layerToGeojson = childLayer.toGeoJSON();
    const markerToBBox = calcBboxFromXY({
      lat: layerToGeojson.geometry.coordinates[1],
      lng: layerToGeojson.geometry.coordinates[0],
      zoom: 12,
      width: 1,
      height: 1,
      wgs84: true,
    });

    Store.setPOI({
      geometry: layerToGeojson.geometry,
      polygon: { geometry: bboxToPolygon(markerToBBox) },
    });
    this.poiLayer.addLayer(childLayer);
  };
  deleteMarker = () => {
    this.poiLayer.clearLayers();
    Store.setPOI(null);
  };
  componentDidUpdate(prevProps, prevState) {
    const {
      mainTabIndex,
      isAoiClip: sIsAoiClip,
      aoiBounds: sAoiBounds,
      compareMode: sCompareMode,
    } = Store.current;
    const { compareModeType, isAoiClip } = prevProps;
    if (get(this, 'props.action.type') === 'CHANGE_PIN_ORDER') {
      this.changeCompareOrder();
    }
    if (get(this, 'props.action.type') === 'REFRESH') {
      this.visualizeLayer();
    }
    // check tab switching
    if (prevProps.mainTabIndex !== mainTabIndex) {
      this.addRemoveActiveLayer(mainTabIndex === 2);
      this.togglePolygons(mainTabIndex === 1);
      this.addPinLayers();
    }
    if (get(this, 'props.action.type') === 'TOGGLE_ACTIVE_LAYER') {
      this.addRemoveActiveLayer(Store.current.isActiveLayerVisible);
    }
    if (sIsAoiClip !== isAoiClip) {
      this.toggleMapEdit();
    }
    if (this.props.action.type === 'SET_MAP_VIEW' && this.props.updatePosition === true) {
      this.updatePosition();
    }
    if (sAoiBounds === null && !sIsAoiClip) {
      this.removeAOILayers();
    }
    if (sCompareMode !== prevProps.compareMode) {
      this.addPinLayers();
    }
    if (Store.current.compareMode && compareModeType !== Store.current.compareModeType) {
      this.compareLayers.forEach(this.resetLayerParams);
    }
    if (this.props.mapMaxBounds !== prevProps.mapMaxBounds) {
      this.mainMap.setMaxBounds(L.latLngBounds(this.props.mapMaxBounds));
    }
  }

  componentWillUpdate(nextProps, nextState) {
    if (isEqual(this.state.location, nextProps.location) && this.mainMap && nextProps.location) {
      this.setState({ location: nextProps.location }, () => this.mainMap.panTo(nextProps.location));
    }
  }

  componentWillUnmount() {
    if (this.mainMap) {
      this.mainMap.remove();
    }
  }

  resetLayerParams(layer) {
    layer.setClip(L.bounds([0, 0], [window.innerWidth, window.innerHeight]));
    layer.setOpacity(1);
  }

  resetAllLayers() {
    if (!this.mainMap.hasLayer(this.activeLayer)) {
      this.layerControl.removeLayer(this.activeLayer);
    }

    this.mainMap.eachLayer(layer => {
      if (layer.options.clip && !Store.current.compareMode) {
        this.resetLayerParams(layer);
      }
    });
  }

  updatePosition() {
    this.mainMap.setView([Store.current.lat, Store.current.lng], Store.current.zoom);
  }

  showPolygons(data) {
    this.clearPolygons();
    this.allResults = [...Store.current.searchResults[DEFAULT_RESULTS_GROUP]];
    // see https://leafletjs.com/examples/geojson/ for GeoJSON format
    const geoJsonList = this.allResults.filter(r => r.tileData.dataGeometry).map((r, resultIndex) => ({
      type: 'Feature',
      properties: {
        sensingTime: r.tileData.sensingTime,
        resultIndex: r.resultIndex,
      },
      geometry: r.tileData.dataGeometry,
    }));

    this.polyHighlight = L.geoJSON(geoJsonList, {
      style: DEFAULT_POLY_STYLE,
      onEachFeature: (feature, layer) => {
        layer.on({
          mouseover: this.setHighlight,
          mouseout: this.resetHighlight,
          click: this.selectFeature,
        });
      },
    });
    this.polyHighlight.addTo(this.mainMap);
  }

  resetHighlight = () => {
    this.polyHighlight.setStyle(DEFAULT_POLY_STYLE);
  };

  setHighlight = e => {
    const layer = e.target;
    layer.setStyle(HIGHLIGHT_POLY_STYLE);
  };

  selectFeature = e => {
    const clickCoords = {
      type: 'Point',
      coordinates: [e.latlng.lng, e.latlng.lat],
    };
    const intersectingResults = this.allResults.filter(
      r => r.tileData.dataGeometry && gju.pointInPolygon(clickCoords, r.tileData.dataGeometry),
    );

    if (intersectingResults.length > 0) {
      Store.setFilterResults({ DEFAULT_RESULTS_GROUP: intersectingResults });
    }
  };

  clearPolygons = () => {
    if (this.polyHighlight !== undefined)
      try {
        this.polyHighlight.clearLayers();
      } catch (e) {
        console.warn('failed clearing polygons');
      }
    this.boundPoly && this.mainMap.removeLayer(this.boundPoly);
    this.allResults = [];
  };

  togglePolygons = isVisible => {
    let showClip = !isVisible;
    if (this.state.showClip !== showClip) {
      this.setState({ showClip: showClip }, () => {
        this.activeLayer && !this.state.showClip && this.mainMap.removeLayer(this.activeLayer);
      });
    }
    if (this.polyHighlight !== undefined) {
      if (!isVisible) {
        this.mainMap.removeLayer(this.polyHighlight);
        if (this.mainMap.hasLayer(this.activeLayer)) {
          this.mainMap.removeLayer(this.activeLayer);
        }
      } else {
        this.mainMap.addLayer(this.polyHighlight);
      }
    }
    this.boundPoly && this.mainMap.removeLayer(this.boundPoly);
  };

  zoomToActivePolygon = () => {
    let {
      selectedResult: { lat, lng },
      zoom,
    } = Store.current;
    let activeLayerZoom = this.activeLayer.options.minZoom;
    if (Number(zoom) < Number(activeLayerZoom)) {
      Store.setZoom(activeLayerZoom);
    }
    // let center = new L.LatLngBounds(result.geometry.coordinates[0]).getCenter()
    this.mainMap.setView([lat, lng]);
  };

  highlightTile = resultIndex => {
    // There is sometimes a problem with highlights (there aren't any)
    // when Object.values(this.polyHighlight._layers).length is 0 (zero).
    // Some of our datasources apparently don't have this feature (Envisat Meris),
    // or there is a problem with getting data from backend.
    // So checking [if length of (object converted to array) is zero] is added.
    if (
      !this.polyHighlight ||
      !this.polyHighlight._layers ||
      Object.values(this.polyHighlight._layers).length === 0
    ) {
      return;
    }
    this.resetHighlight();

    const layerFeature = Object.values(this.polyHighlight._layers).find(
      l => l.feature.properties.resultIndex === resultIndex,
    );
    layerFeature.setStyle(HIGHLIGHT_POLY_STYLE);
  };

  onZoomToPin(item) {
    if (item && item.map)
      this.mainMap.setView(L.latLng(item.map.latitude, item.map.longitude), item.map.zoom, {
        animation: true,
      });
  }

  visualizeLayer() {
    this.addPinLayers(false);
    const { selectedResult, instances, mainTabIndex } = this.props;
    if (!selectedResult) {
      return;
    }
    if (this.activeLayer !== null) {
      this.layerControl.removeLayer(this.activeLayer);
      this.mainMap.removeLayer(this.activeLayer);
    }
    const layerFromInstance = instances.find(inst => inst.name === selectedResult.datasource);
    if (!layerFromInstance) {
      Store.setSelectedResult(null);
      Store.setSearchResults({});
      this.clearPolygons();
      return; // selected layer was not found in user instances
    }
    let layer = createMapLayer(layerFromInstance, ACTIVE_LAYER_PANE, this.progress);
    this.activeLayer = layer;
    if (mainTabIndex === 2) {
      this.activeLayer.setParams(this.getUpdateParams(this.props.selectedResult));
      if (!this.mainMap.hasLayer(this.activeLayer)) {
        this.activeLayer.options.pane = ACTIVE_LAYER_PANE;
        this.activeLayer.addTo(this.mainMap);
        this.resetAllLayers();
        this.layerControl.addOverlay(this.activeLayer, layerFromInstance.name);
      }
    }
  }
  removeCompareLayers = () => {
    this.compareLayers.forEach(l => this.mainMap.removeLayer(l));
    this.compareLayers = [];
  };
  drawCompareLayers = () => {
    let pins = [...this.props.pins];
    let { instances, compareMode: isCompare } = Store.current;
    if (!isCompare) {
      return;
    }
    pins.reverse().forEach(item => {
      let layer = createMapLayer(
        instances.find(inst => inst.name === item.datasource),
        COMPARE_LAYER_PANE,
        this.progress,
      );

      if (layer === undefined) return;
      layer.setParams(this.getUpdateParams(item));
      if (Store.current.compareModeType === 'opacity') {
        layer.setOpacity(item.opacity[1]);
      } else {
        const mapDOMSize = getMapDOMSize();
        layer.setClip(
          L.bounds(
            [mapDOMSize.width * item.opacity[0], 0],
            [mapDOMSize.width * item.opacity[1], mapDOMSize.height],
          ),
        );
      }
      layer.options.pane = COMPARE_LAYER_PANE;
      layer.addTo(this.mainMap);
      this.compareLayers.push(layer);
    });
  };
  changeCompareOrder = (oldIndex, newIndex) => {
    this.removeCompareLayers();
    this.drawCompareLayers();
  };

  addPinLayers = () => {
    const { mainTabIndex: tabIndex, compareMode: isCompare } = Store.current;

    if (isCompare) {
      if (this.activeLayer !== null) {
        this.mainMap.removeLayer(this.activeLayer);
      }
      let pins = [...this.props.pins];
      pins.reverse().forEach(item => {
        let { instances } = Store.current;
        let layer = createMapLayer(
          instances.find(inst => inst.name === item.datasource),
          COMPARE_LAYER_PANE,
          this.progress,
        );
        if (layer === undefined) return;
        layer.setParams(this.getUpdateParams(item));
        layer.options.pane = COMPARE_LAYER_PANE;
        layer.addTo(this.mainMap);
        this.compareLayers.push(layer);
      });
    } else {
      this.compareLayers.forEach(l => this.mainMap.removeLayer(l));
      this.compareLayers = [];
      if (this.activeLayer && tabIndex === 2) {
        this.activeLayer.options.pane = ACTIVE_LAYER_PANE;
        this.activeLayer.addTo(this.mainMap);
        this.resetAllLayers();
      }
      Store.setCompareMode(false);
    }
  };

  setOverlayParams = (arr, index) => {
    //if not in compare mode, don't do anything
    if (!Store.current.compareMode) return;
    let mapIndex = this.props.pins.length - (index + 1);
    if (Store.current.compareModeType === 'opacity') {
      this.compareLayers[mapIndex].setOpacity(arr[1]);
    } else {
      const mapSize = this.mainMap.getSize();
      this.compareLayers[mapIndex].setClip(
        L.bounds([mapSize.x * arr[0], 0], [mapSize.x * arr[1], mapSize.y]),
      );
    }
  };

  resetAoi = () => {
    Store.setAOIBounds(null);
    Store.setIsClipping(false);
  };

  getUpdateParams(item) {
    let { selectedResult, presets, compareMode, isEvalUrl } = Store.current;
    let {
      datasource: datasourceName,
      gainOverride,
      gammaOverride,
      redRangeOverride,
      greenRangeOverride,
      blueRangeOverride,
      valueRangeOverride,
      time,
      evalscript,
      evalscripturl,
      atmFilter,
      preset: layerId,
    } =
      item || selectedResult || {};

    // datasource is just a string (name of selected datasource/satellite)
    // we need data of the selected datasource from the presets in Store
    let datasourceLayers = presets[datasourceName];

    // preset is just a string (name of selected layer)
    // item is usually data of the selected layer from config.js (but apparently not always - not when Pins made from Results are being compared)
    // selectedResult is just data of the selected layer from config.js
    // item and selectedResult are basically the same if it's not a custom layer
    // we need data of the selected layer from the presets in Store
    let selectedLayer = datasourceLayers.find(l => l.id === layerId);

    if (!datasourceName) return;
    let obj = {};
    obj.format = selectedLayer && selectedLayer.format ? selectedLayer.format : 'image/png';
    obj.pane = compareMode ? COMPARE_LAYER_PANE : ACTIVE_LAYER_PANE;
    obj.transparent = true;
    obj.maxcc = 100;
    if (datasourceName.includes('EW') && layerId.includes('NON_ORTHO')) {
      obj.orthorectify = false;
    }

    if (isCustomPreset(layerId)) {
      selectedResult && selectedResult.baseUrls.WMTS
        ? (obj.layer = presets[datasourceName][0].id)
        : (obj.layers = presets[datasourceName][0].id);

      evalscripturl && isEvalUrl && (obj.evalscripturl = evalscripturl);
      !isEvalUrl && (obj.evalscript = evalscript);
      obj.evalsource = evalSourcesMap[datasourceName];
      obj.PREVIEW = 3;
    } else {
      selectedResult && selectedResult.baseUrls.WMTS ? (obj.layer = layerId) : (obj.layers = layerId);
    }

    const evalscriptoverridesObj = {
      gainOverride,
      gammaOverride,
      redRangeOverride,
      greenRangeOverride,
      blueRangeOverride,
      valueRangeOverride,
    };
    obj.evalscriptoverrides = btoa(evalscriptoverridesToString(evalscriptoverridesObj));

    atmFilter && (obj.ATMFILTER = atmFilter === 'null' ? null : atmFilter);

    if (item.baseUrls && item.baseUrls.WMTS) {
      obj.time = `${time}`;
      obj.tilematrixSet = selectedLayer.tilematrixSetName;
      obj.minZoom = selectedLayer.minZoom;
      obj.maxZoom = selectedLayer.maxZoom;
    } else {
      obj.time = `${time}/${time}`;
    }
    if (selectedResult && typeof selectedResult.defaultStyle === 'function') {
      obj.styles = selectedResult.defaultStyle(layerId);
    }
    return cloneDeep(obj);
  }

  onUpload = area => {
    this.aoiLayer.clearLayers();
    Store.setIsClipping(false);
    this.aoiLayer.addData(area);
    Store.setAOIBounds({
      geometry: this.aoiLayer.toGeoJSON().features[0].geometry,
      bounds: this.aoiLayer.getBounds(),
    });
    this.mainMap.fitBounds(this.aoiLayer.getBounds());
    this.setState({ uploadDialog: false });
  };
  openUploadGeoFileDialog = () => {
    this.setState({ uploadDialog: true });
  };
  drawMarker = () => {
    if (Store.current.poi) {
      return;
    }
    this.mainMap.pm.enableDraw('Marker', {
      markerStyle: {
        draggable: true,
      },
    });
  };

  centerOnFeature = layerName => {
    if (layerName === 'poiLayer') {
      const featureBounds = this[layerName].getBounds();
      this.mainMap.fitBounds(featureBounds, { maxZoom: Store.current.zoom });
    } else {
      const featureBounds = this[layerName].getBounds();
      this.mainMap.fitBounds(featureBounds, { maxZoom: 15 });
    }
  };
  openFisPopup = aoiOrPoi => {
    this.setState({ fisDialog: true, fisDialogAoiOrPoi: aoiOrPoi });
  };
  render() {
    const {
      uploadDialog,
      fisDialog,
      fisDialogAoiOrPoi,
      hasMeasurement,
      measureDistance,
      measureArea,
    } = this.state;
    const { aoiBounds, poi, mapGeometry, isAoiClip, user, selectedResult } = this.props;
    return (
      <div className="map-wrapper">
        <div className="mainMap" id={this.props.mapId} />
        {uploadDialog && (
          <UploadGeoFile onUpload={this.onUpload} onClose={() => this.setState({ uploadDialog: false })} />
        )}
        <div id="aboutSentinel">
          <a href="https://www.sentinel-hub.com/apps/eo_browser" target="_blank" rel="noopener noreferrer">
            About EO Browser
          </a>
          <a href="https://forum.sentinel-hub.com/" target="_blank" rel="noopener noreferrer">
            Contact us
          </a>
          <a href="https://www.sentinel-hub.com/apps/wms" target="_blank" rel="noopener noreferrer">
            Get data
          </a>
        </div>
        <div id="mapCoords" />
        <div>
          <InfoPanelButton />
          <AOIPanelButton
            fisDialog={fisDialog}
            aoiBounds={aoiBounds}
            isAoiClip={isAoiClip}
            mapGeometry={mapGeometry}
            selectedResult={selectedResult}
            openFisPopup={this.openFisPopup}
            resetAoi={this.resetAoi}
            openUploadGeoFileDialog={this.openUploadGeoFileDialog}
            centerOnFeature={this.centerOnFeature}
            disabled={!user}
          />
          <POIPanelButton
            openFisPopup={this.openFisPopup}
            drawMarker={this.drawMarker}
            poi={poi}
            deleteMarker={this.deleteMarker}
            selectedResult={selectedResult}
            fisDialog={fisDialog}
            centerOnFeature={this.centerOnFeature}
            disabled={!user}
          />
          <DownloadPanelButton originalMap={this.mainMap} />
          <TimelapsePanelButton />

          {fisDialog && (
            <FIS
              aoiOrPoi={fisDialogAoiOrPoi}
              drawDistribution={fisDialogAoiOrPoi === 'aoi'}
              onClose={() => this.setState({ fisDialog: false })}
            />
          )}
          <MeasurePanelButton
            toggleMeasure={this.toggleMeasure}
            hasMeasurement={hasMeasurement}
            distance={measureDistance}
            area={measureArea}
            removeMeasurement={this.removeMeasurement}
            isLoggedIn={user}
          />
        </div>
      </div>
    );
  }
}

const mapStoreToProps = store => ({
  action: store.action,
  aoiBounds: store.aoiBounds,
  compareMode: store.compareMode,
  compareModeType: store.compareModeType,
  formQuery: store.formQuery,
  instances: store.instances,
  isAoiClip: store.isAoiClip,
  lat: store.lat,
  lng: store.lng,
  location: store.location,
  mainTabIndex: store.mainTabIndex,
  mapGeometry: store.mapGeometry,
  pins: store.themePins || store.userPins,
  poi: store.poi,
  selectedResult: store.selectedResult,
  updatePosition: store.updatePosition,
  user: store.user,
  zoom: store.zoom,
  mapMaxBounds: store.mapMaxBounds,
});
export default connect(mapStoreToProps, null, null, { withRef: true })(RootMap);
