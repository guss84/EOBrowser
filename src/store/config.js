import React from 'react';
import moment from 'moment';
import { getPinsFromLocalStorage, getCrsLabel } from '../utils/utils';
import {
  fetchProbaVSearchResults,
  getDatesFromProbaV,
  fetchGIBSSearchResults,
  getDatesFromGIBS,
  getDatesFromSHServiceV3,
  getDatesFromSHServiceV1Or2,
  getTilesFromSHServiceV3,
  getTilesFromSHServiceV1Or2,
} from '../utils/ajax';
import { constructSpacecraftInfoSentinel2, constructSpacecraftInfoSentinel1 } from '../utils/spacecrafts';
import Sentinel5PDataSourceHandler, { S5PDATASETS } from '../datasources/Sentinel5PDataSourceHandler';
import Sentinel3DataSourceHandler from '../datasources/Sentinel3DataSourceHandler';
const views = {
  PRESETS: '1',
  BANDS: '2',
  SCRIPT: '3',
};
export const IMAGE_FORMATS = [
  { text: 'JPG (no georeference)', value: 'image/jpeg', ext: 'jpg' },
  { text: 'PNG (no georeference)', value: 'image/png', ext: 'png' },
  {
    text: 'KMZ/JPG',
    value: 'application/vnd.google-earth.kmz+xml;image_type=image/jpeg',
    ext: 'kmz',
  },
  {
    text: 'KMZ/PNG',
    value: 'application/vnd.google-earth.kmz+xml;image_type=image/png',
    ext: 'kmz',
  },
  { text: 'TIFF (8-bit)', value: 'image/tiff;depth=8', ext: 'tiff' },
  { text: 'TIFF (16-bit)', value: 'image/tiff;depth=16', ext: 'tiff' },
  { text: 'TIFF (32-bit float)', value: 'image/tiff;depth=32f', ext: 'tiff' },
  // { text: 'JPEG 2000 (JP2)', value: 'image/jp2', ext: 'jp2' } //jp2 removed till supported
];

export const FILTER_CLOUD_COVERAGE_PERCENT = 'cloudCoverPercentage';

const S1_CHANNELS_REGEX = /^(VV|VH|HH|HV)$/i;
const bandsRegex = /^B[0-9][0-9A]/i;

export const CREDITS_SOURCES = {
  creodias: {
    name: 'Creodias',
    link: 'https://creodias.eu/',
    logo: 'images/logo-tooltips-creodias.png',
  },
  copernicus: {
    name: 'Copernicus',
    link: 'http://copernicus.eu/main/sentinels',
    logo: 'images/logo-tooltips-copernicus.png',
  },
  USGS: {
    name: 'USGS',
    link: 'https://landsat.usgs.gov/landsat-project-description',
  },
  NASA: {
    name: 'NASA',
    link:
      'https://earthdata.nasa.gov/about/science-system-description/eosdis-components/global-imagery-browse-services-gibs',
  },
  meris: {
    name: 'ESA',
    link: 'https://earth.esa.int/web/guest/missions/esa-operational-eo-missions/envisat/instruments/meris',
  },

  modis: {
    name: 'ESA',
    link: 'https://earth.esa.int/web/guest/missions/3rd-party-missions/current-missions/terraaqua-modis',
  },

  probaV: {
    name: 'ESA',
    link: 'https://www.esa.int/Our_Activities/Observing_the_Earth/Proba-V',
  },
};

export const MISSION_DESCRIPTIONS = {
  'SENTINEL-1': {
    label: 'Sentinel-1',
    id: 'SENTINEL-1',
    description: (
      <div>
        <b>Sentinel-1</b> provides all-weather, day and night radar imagery for land and ocean services. EO
        Browser provides data acquired in Interferometric Wide Swath (IW) and Extra Wide Swath (EW) modes
        processed to Level-1 Ground Range Detected (GRD).
        <p>
          <b>Pixel spacing:</b> 10m (IW), 40m (EW).
        </p>
        <p>
          <b>Revisit time</b> (for asc/desc and overlap using both satellites): {'<='} 3 days, see{' '}
          <a
            href="https://sentinel.esa.int/web/sentinel/missions/sentinel-1/observation-scenario"
            target="_blank"
            rel="noopener noreferrer"
          >
            observation scenario
          </a>.
        </p>
        <p>
          <b>Data availability:</b> Since October 2014.
        </p>
        <p>
          <b>Common usage:</b> Maritime and land monitoring, emergency response, climate change.
        </p>
      </div>
    ),
    credits: ['creodias', 'copernicus'],
  },
  'SENTINEL-2': {
    label: 'Sentinel-2',
    id: 'SENTINEL-2',
    description: (
      <div>
        <b>Sentinel-2</b> provides high-resolution imagery in the visible and infrared part of the spectrum
        aiming to support the monitoring of vegetation, soil and water cover, inland waterways and coastal
        areas. EO Browser provides data processed to two levels: L1C (orthorectified Top-Of-Atmosphere
        reflectance) and L2A (orthorectified Bottom-Of-Atmosphere reflectance).
        <p>
          <b>Spatial resolution:</b> 10m, 20m, and 60m, depending on the wavelength.
        </p>
        <p>
          <b>Revisit time:</b> {'<='} 5 days using both satellites.
        </p>
        <p>
          <b>Data availability:</b> Since June 2015.
        </p>
        <p>
          <b>Common usage:</b> Land-cover maps, land-change detection maps, vegetation monitoring, monitoring
          of burnt areas.
        </p>
      </div>
    ),
    credits: ['copernicus'],
  },
  'SENTINEL-3': {
    label: 'Sentinel-3',
    id: 'SENTINEL-3',
    description: (
      <div>
        The main objective of the Sentinel-3 mission is to measure sea surface topography, sea and land
        surface temperature, and ocean and land surface colour with high accuracy and reliability (source:
        ESA). Both Sentinel-3 satellites have four different sensors on board. Data acquired by OLCI and SLSTR
        sensors are available in EO Browser.
      </div>
    ),
    credits: ['creodias', 'copernicus'],
  },
  'SENTINEL-5P': {
    label: 'Sentinel-5P',
    id: 'SENTINEL-5P',
    description: (
      <div>
        <b>Sentinel-5P</b> provides atmospheric measurements, relating to air quality, climate forcing, ozone
        and UV radiation with high spatio-temporal resolution. EO Browser serves level 2 geophysical products.
        <p>
          <b>Spatial resolution:</b> 7 x 3.5km.
        </p>
        <p>
          <b>Revisit time:</b> {'<='} 1 day.
        </p>
        <p>
          <b>Data availability:</b> Since April 2018.
        </p>
        <p>
          <b>Common usage:</b> Monitoring the concentration of carbon monoxide (CO), nitrogen dioxide (NO2)
          and ozone (O3) in the air. Monitoring the UV aerosol index (AER_AI) and various geophysical
          parameters of clouds (CLOUD).
        </p>
      </div>
    ),
    credits: ['creodias', 'copernicus'],
  },
  LANDSAT: {
    label: 'Landsat',
    id: 'LANDSAT',
    description: (
      <div>
        <b>Landsat</b> – NASA's Landsat satellites are similar to Sentinel-2, capturing visible and infrared
        wavelengths and additionally thermal in Landsat 8. It also has a long history spanning nearly five
        decades of imagery from the first Landsat mission, making it a unique resource for those who work in
        agriculture, geology, forestry, regional planning, education, mapping, and global change research. EO
        Browser provides imagery acquired from satellites Landsat 5, 7 and 8 processed at Level-1 reflectance.
        <p>
          <b>Spatial resolution:</b> 30m, thermal (100m resampled to 30m) and panchromatic (15m) bands.
        </p>
        <p>
          <b>Revisit time:</b> {'<='} 8 days with the two operational satellites Landsat 7 and Landsat 8.
        </p>
        <p>
          <b>Data availability:</b> Europe and North Africa from 1984 - 2013 (Landsat 5), since 1999 (Landsat
          7), 2013 (Landsat 8) from the ESA archive. The global USGS archive since February 2013 (Landsat 8
          only).
        </p>
        <p>
          <b>Common usage:</b> Vegetation monitoring, land use, land cover maps, change monitoring, etc.
        </p>
      </div>
    ),
    credits: ['USGS'],
  },
  ENVISAT: {
    label: 'Envisat Meris',
    id: 'ENVISAT',
    description: (
      <div>
        <b>MERIS</b> (Medium-resolution spectrometer) was a sensor on board the ENVISAT satellite with the
        primary mission to observe land and ocean colour and the atmosphere. It is no longer active and has
        been succeeded by Sentinel-3. EO Browser provides data processed at level 1B (the Top Of Atmosphere
        (TOA) reflectance).
        <p>
          <b>Spatial resolution:</b> Full Resolution 260m across track 290m along track.
        </p>
        <p>
          <b>Revisit time:</b> {'<='} 3 days.
        </p>
        <p>
          <b>Data availability:</b> June 2002 – April 2012.
        </p>
        <p>
          <b>Common usage:</b> Ocean monitoring (phytoplankton, yellow substance, suspended matter),
          atmosphere (water vapour, CO2, clouds, aerosols), and land (vegetation index, global coverage,
          moisture).
        </p>
      </div>
    ),
    credits: ['creodias', 'meris'],
  },
  MODIS: {
    label: 'MODIS',
    id: 'MODIS',
    description: (
      <div>
        NASA's <b>MODIS</b> (Moderate Resolution Imaging Spectroradiometer) acquires data with the objective
        to improve our understanding of global processes occurring on land. EO browser provides data for
        observation of land (bands 1-7).
        <p>
          <b>Spatial resolution:</b> 250m (bands 1-2), 500m (bands 3-7), 1000m (bands 8-36).
        </p>
        <p>
          <b>Revisit time:</b> Global coverage in 1 – 2 days with both Aqua and Terra satellites.
        </p>
        <p>
          <b>Data availability:</b> Since January 2013.
        </p>
        <p>
          <b>Common usage:</b> Monitoring of land, clouds, ocean colour at a global scale.
        </p>
      </div>
    ),
    credits: ['modis'],
  },
  PROBAV: {
    label: 'Proba-V',
    id: 'PROBAV',
    description: (
      <div>
        The <b>Proba-V</b> satellite is a small satellite designed to map land cover and vegetation growth
        across the entire globe every two days. EO Browser provides derived products which minimize cloud
        cover by combining cloud-free measurement within a 1 day (S1), 5 day (S5) and 10 day (S10) period.
        <p>
          <b>Spatial resolution:</b> 100m for S1 and S5, 333m for S1 and S10, 1000m for S1 and S10.
        </p>
        <p>
          <b>Revisit time:</b> 1 day for latitudes 35-75°N and 35-56°S, 2 days for latitudes between 35°N and
          35°S.
        </p>
        <p>
          <b>Data availability:</b> Since October 2013.
        </p>
        <p>
          <b>Common usage:</b> The observation of land cover, vegetation growth, climate impact assessment,
          water resource management, agricultural monitoring and food security estimates, inland water
          resource monitoring and tracking the steady spread of deserts and deforestation.
        </p>
      </div>
    ),
    credits: ['probaV'],
  },
  GIBS: {
    label: 'GIBS',
    id: 'GIBS',
    description: (
      <div>
        <b>GIBS</b> (Global Imagery Browse Services) provides quick access to over 600 satellite imagery
        products, covering every part of the world. Most imagery is available within a few hours after
        satellite overpass, some products span almost 30 years.
      </div>
    ),
    credits: ['NASA'],
  },
};

function getS5Datasources() {
  return S5PDATASETS.map(productType => ({
    name: `Sentinel-5P ${productType}`,
    id: `S5P${productType}`,
    group: 'SENTINEL-5P',
    evalsource: 'S5P_L2',
    baseUrls: {
      WMS: 'https://creodias.sentinel-hub.com/ogc/wms/680f26dd-bbde-4ff3-af19-aed31531d930',
    },
    search: {
      tooltip: 'Global archive from 2017/10/13 onward',
      label: productType,
      preselected: false,
      searchableByArea: true,
      useLayer: layer => {
        return Sentinel5PDataSourceHandler.isVisualizationLayerForDataset(productType, layer.id);
      },
    },
    useLayerAsChannel: layerId => Sentinel5PDataSourceHandler.isChannelLayerForDataset(productType, layerId),
    minZoom: 1,
    wrapCrs: true,
    minDate: '2017-10-13',
    getCreoDIASPath: tile => {
      const { originalId } = tile;
      const lowerCasePath = originalId.replace(`EODATA`, 'eodata');
      return `/${lowerCasePath}`;
    },
    getDates: (from, to, area) =>
      getDatesFromSHServiceV3(
        'https://creodias.sentinel-hub.com/index/v3/collections/S5PL2/findAvailableData',
        from,
        to,
        area,
        {
          datasetParameters: {
            productType: productType,
            type: 'S5PL2',
          },
        },
      ),
    indexService: `https://creodias.sentinel-hub.com/index/v3/collections/S5PL2/searchIndex`,
    indexServiceAdditionalParams: {
      datasetParameters: {
        productType: productType,
        type: 'S5PL2',
      },
    },
    resolution: 3500,
  }));
}

function getS1AWSDatasources() {
  const AWS_S1_INSTANCE_IDS = {
    'S1-AWS-EW-HH': 'a38734fb-b3fd-402a-9e2e-fb48a636a783',
    'S1-AWS-EW-HHHV': '5887863d-3c49-4c96-8c62-afc13dd8a04a',
    'S1-AWS-IW-VV': '4e60d029-b67b-4cd1-b624-063bea1f52af',
    'S1-AWS-IW-VVVH': 'bfbfc449-320a-4a56-b493-61c9d4fc67e8',
  };
  return Object.keys(AWS_S1_INSTANCE_IDS).map(datasourceId => ({
    name: `Sentinel-1 AWS (${datasourceId})`,
    id: datasourceId,
    baseUrls: {
      WMS: `https://services.sentinel-hub.com/ogc/wms/${AWS_S1_INSTANCE_IDS[datasourceId]}`,
    },
    minZoom: 1,
    wrapCrs: true,
    minDate: '2017-01-01',
    getAwsPath: function(tile) {
      return tile.dataUri;
    },
    getTileUrl: function(tile) {
      return `https://services.sentinel-hub.com/index/s2/v3/tiles/${tile.id}`;
    },
    getSciHubLink: function(product) {
      return `https://scihub.copernicus.eu/dhus/odata/v1/Products('${
        product.split('/').splice(-1)[0]
      }')/$value`;
    },
    getCrsLabel: function(tile) {
      return getCrsLabel(tile);
    },
    getDates: (from, to, area) =>
      getDatesFromSHServiceV3(
        'https://services.sentinel-hub.com/index/v3/collections/S1GRD/findAvailableData',
        from,
        to,
        area,
      ),
  }));
}

const defaultDatasources = [
  {
    name: 'Landsat 5 ESA',
    id: 'L5',
    group: 'LANDSAT',
    evalsource: 'L5',
    baseUrls: {
      WMS: 'https://eocloud.sentinel-hub.com/v1/wms/e3e5e6c2-d1eb-419a-841c-5167a1de5441',
    },
    search: {
      tooltip: 'Europe and North Africa from 1984 to 2013',
      label: 'Landsat 5 (ESA archive)',
      preselected: false,
      searchableByArea: true,
      useLayer: layer => !bandsRegex.test(layer.id),
    },
    minDate: '1984-01-01',
    maxDate: '2013-05-01',
    typename: '',
    getEOPath: function(tile) {
      const { pathFragment } = tile;
      return pathFragment.substring(0, pathFragment.lastIndexOf('/') + 1);
    },
    getPreviewImage: function(tile) {
      return `${tile.previewUrl}.JPG`;
    },
    getDates: (from, to, area) =>
      getDatesFromSHServiceV1Or2('https://eocloud.sentinel-hub.com/index/landsat5/v2/dates', from, to, area),
    indexService: `https://eocloud.sentinel-hub.com/index/landsat5/v2`,
    previewPrefix: 'https://finder.creodias.eu/files',
    resolution: 30,
    maxZoom: 16,
    allowOverZoomBy: 0,
    minZoom: 10,
  },
  {
    name: 'Landsat 7 ESA',
    id: 'L7',
    group: 'LANDSAT',
    evalsource: 'L7',
    baseUrls: {
      WMS: 'https://eocloud.sentinel-hub.com/v1/wms/65e58cf7-96c2-429e-89b5-5dcb15983c47',
    },
    search: {
      tooltip: 'Europe and North Africa from 1999 to 2003',
      label: 'Landsat 7 (ESA archive)',
      preselected: false,
      searchableByArea: true,
      useLayer: layer => !bandsRegex.test(layer.id),
    },
    indexService: `https://eocloud.sentinel-hub.com/index/landsat7/v2`,

    typename: '',
    getDates: (from, to, area) =>
      getDatesFromSHServiceV1Or2('https://eocloud.sentinel-hub.com/index/landsat7/v2/dates', from, to, area),
    getEOPath: function(tile) {
      const { pathFragment } = tile;
      return pathFragment.substring(0, pathFragment.lastIndexOf('/') + 1);
    },
    getPreviewImage: function(tile) {
      return `${tile.previewUrl}.JPG`;
    },
    minDate: '1999-01-01',
    maxDate: '2003-12-01',
    previewPrefix: 'https://finder.creodias.eu/files',
    resolution: 30,
    maxZoom: 16,
    allowOverZoomBy: 0,
    minZoom: 10,
  },
  {
    name: 'Landsat 8 ESA',
    id: 'L8',
    group: 'LANDSAT',
    evalsource: 'L8',
    baseUrls: {
      WMS: 'https://eocloud.sentinel-hub.com/v1/wms/2d8dbfcb-5fa0-4198-ba57-8ad594c3757e',
    },
    search: {
      tooltip: 'Europe and North Africa from 2013/02 onward',
      label: 'Landsat 8 (ESA archive)',
      preselected: false,
      searchableByArea: true,
      useLayer: layer => !bandsRegex.test(layer.id),
    },
    typename: 'L8.TILE',
    minDate: '2013-01-01',
    minZoom: 10,
    maxZoom: 16,
    allowOverZoomBy: 0,
    getEOPath: function(tile) {
      const { pathFragment } = tile;
      return pathFragment.substring(0, pathFragment.lastIndexOf('/') + 1);
    },
    getPreviewImage: function(tile) {
      return `${this.previewPrefix}${tile.pathFragment.replace('/eodata', '')}.png`;
    },
    getDates: (from, to, area) =>
      getDatesFromSHServiceV1Or2(`https://eocloud.sentinel-hub.com/index/landsat8/v2/dates`, from, to, area),
    indexService: `https://eocloud.sentinel-hub.com/index/landsat8/v2`,
    previewPrefix: 'https://finder.creodias.eu/files',
    resolution: 30,
  },

  ...getS1AWSDatasources(),

  {
    name: 'Sentinel-1 GRD IW',
    id: 'S1',
    group: 'SENTINEL-1',
    evalsource: 'S1',
    baseUrls: {
      WMS: 'https://eocloud.sentinel-hub.com/v1/wms/6a6b787f-0dda-4153-8ae9-a1729dd0c890',
    },
    search: {
      tooltip: 'Worldwide from 2014/04/03 onward',
      label: 'GRD IW',
      preselected: true,
      searchableByArea: true,
      useLayer: layer => !S1_CHANNELS_REGEX.test(layer.id),
    },
    useLayerAsChannel: layerId => S1_CHANNELS_REGEX.test(layerId),
    typename: 'DSS3.TILE',
    minDate: '2014-04-03',
    getEOPath: function(tile) {
      const { pathFragment } = tile;
      return pathFragment;
    },
    previewPrefix: 'https://finder.creodias.eu/files',
    getPreviewImage: function(tile) {
      return `${this.previewPrefix}/${tile.pathFragment.split('eodata')[1]}/preview/quick-look.png`;
    },
    getDates: (from, to, area) =>
      getDatesFromSHServiceV1Or2(`https://eocloud.sentinel-hub.com/index/s1/v1/finddates`, from, to, area),
    getTilesFromIndexService: function(mapBounds, fromMoment, toMoment, maxCount, maxCc, offset) {
      return getTilesFromSHServiceV1Or2(
        `${this.indexService}/search`,
        this.indexSuffix,
        mapBounds,
        fromMoment,
        toMoment,
        maxCount,
        maxCc,
        offset,
      );
    },
    constructSpacecraftInfo: function(tiles) {
      return constructSpacecraftInfoSentinel1(this.name, tiles);
    },
    indexService: 'https://eocloud.sentinel-hub.com/index/s1/v1',
    resolution: 10,
    maxZoom: 16,
    allowOverZoomBy: 0,
    minZoom: 5,
  },
  {
    name: 'Sentinel-1 GRD EW',
    id: 'S1_EW',
    group: 'SENTINEL-1',
    evalsource: 'S1_EW',
    baseUrls: {
      WMS: 'https://eocloud.sentinel-hub.com/v1/wms/52803c64-23ae-4c61-88e1-1859aa98a8c8',
    },
    search: {
      tooltip: 'Worldwide (near the poles) from 2014/04/03 onward',
      label: 'GRD EW',
      preselected: true,
      searchableByArea: true,
      useLayer: layer => !S1_CHANNELS_REGEX.test(layer.id),
    },
    useLayerAsChannel: layerId => S1_CHANNELS_REGEX.test(layerId),
    indexService: 'https://eocloud.sentinel-hub.com/index/s1/v1',
    typename: 'DSS3.TILE',
    minDate: '2014-04-03',
    getEOPath: function(tile) {
      const { pathFragment } = tile;
      return pathFragment;
    },
    previewPrefix: 'https://finder.creodias.eu/files',
    getPreviewImage: function(tile) {
      return `${this.previewPrefix}/${tile.pathFragment.split('eodata')[1]}/preview/quick-look.png`;
    },
    getDates: (from, to, area) =>
      getDatesFromSHServiceV1Or2(
        `https://eocloud.sentinel-hub.com/index/s1/v1/finddates`,
        from,
        to,
        area,
        '&acquisitionMode=EW&polarization=DH&productType=GRD&resolution=MEDIUM',
      ),
    getTilesFromIndexService: function(mapBounds, fromMoment, toMoment, maxCount, maxCc, offset) {
      return getTilesFromSHServiceV1Or2(
        `${this.indexService}/search`,
        this.indexSuffix,
        mapBounds,
        fromMoment,
        toMoment,
        maxCount,
        maxCc,
        offset,
      );
    },
    constructSpacecraftInfo: function(tiles) {
      return constructSpacecraftInfoSentinel1(this.name, tiles);
    },
    indexSuffix: `&acquisitionMode=EW&polarization=DH&productType=GRD&resolution=MEDIUM`,
    resolution: 40,
    maxZoom: 16,
    allowOverZoomBy: 0,
    minZoom: 5,
  },
  {
    name: 'Sentinel-1 GRD EW SH',
    id: 'S1_EW_SH',
    group: 'SENTINEL-1',
    evalsource: 'S1_EW_SH',
    baseUrls: {
      WMS: 'https://eocloud.sentinel-hub.com/v1/wms/3f532158-bdf9-461a-8bb0-dbdd3a810b3f',
    },
    search: {
      tooltip: 'Worldwide (near the poles) from 2014/04/03 onward',
      label: 'GRD EW SH',
      preselected: true,
      searchableByArea: true,
      useLayer: layer => !S1_CHANNELS_REGEX.test(layer.id),
    },
    useLayerAsChannel: layerId => S1_CHANNELS_REGEX.test(layerId),
    indexService: 'https://eocloud.sentinel-hub.com/index/s1/v1',
    typename: 'DSS3.TILE',
    minDate: '2014-04-03',
    getEOPath: function(tile) {
      const { pathFragment } = tile;
      return pathFragment;
    },
    previewPrefix: 'https://finder.creodias.eu/files',
    getPreviewImage: function(tile) {
      return `${this.previewPrefix}/${tile.pathFragment.split('eodata')[1]}/preview/quick-look.png`;
    },
    getDates: (from, to, area) =>
      getDatesFromSHServiceV1Or2(
        `https://eocloud.sentinel-hub.com/index/s1/v1/finddates`,
        from,
        to,
        area,
        `&acquisitionMode=EW&polarization=SH&productType=GRD&resolution=MEDIUM`,
      ),
    getTilesFromIndexService: function(mapBounds, fromMoment, toMoment, maxCount, maxCc, offset) {
      return getTilesFromSHServiceV1Or2(
        `${this.indexService}/search`,
        this.indexSuffix,
        mapBounds,
        fromMoment,
        toMoment,
        maxCount,
        maxCc,
        offset,
      );
    },
    constructSpacecraftInfo: function(tiles) {
      return constructSpacecraftInfoSentinel1(this.name, tiles);
    },
    indexSuffix: `&acquisitionMode=EW&polarization=SH&productType=GRD&resolution=MEDIUM`,
    resolution: 40,
    maxZoom: 16,
    allowOverZoomBy: 0,
    minZoom: 5,
  },
  {
    name: 'Sentinel-2 L1C',
    id: 'S2L1C',
    group: 'SENTINEL-2',
    evalsource: 'S2',
    baseUrls: {
      WMS: 'https://services.sentinel-hub.com/ogc/wms/cd280189-7c51-45a6-ab05-f96a76067710',
      FIS: 'https://services.sentinel-hub.com/ogc/fis/cd280189-7c51-45a6-ab05-f96a76067710',
    },
    search: {
      tooltip: 'Global archive from 2016/07 onward',
      label: 'L1C',
      preselected: true,
      searchableByArea: true,
    },
    typename: 'S2.TILE',
    minDate: '2015-01-01',

    shortName: 'L1C',
    siblingDatasourceId: 'S2L2A',

    getPreviewImage: function(tile) {
      return `${this.previewPrefix}/tiles${tile.dataUri.split('tiles')[1]}/preview.jpg`;
    },
    getAwsPath: function(tile) {
      return tile.dataUri;
    },
    getTileUrl: function(tile) {
      return `https://services.sentinel-hub.com/index/s2/v3/tiles/${tile.id}`;
    },
    getSciHubLink: function(product) {
      return `https://scihub.copernicus.eu/dhus/odata/v1/Products('${
        product.split('/').splice(-1)[0]
      }')/$value`;
    },
    getCrsLabel: function(tile) {
      return getCrsLabel(tile);
    },
    getDates: (from, to, area) =>
      getDatesFromSHServiceV3(
        'https://services.sentinel-hub.com/index/v3/collections/S2L1C/findAvailableData',
        from,
        to,
        area,
      ),
    constructSpacecraftInfo: function(tiles) {
      return constructSpacecraftInfoSentinel2(this.name, tiles);
    },
    getTilesFromIndexService: function(mapBounds, fromMoment, toMoment, maxCount, maxCc, offset) {
      return getTilesFromSHServiceV3(
        this.indexService,
        mapBounds,
        fromMoment,
        toMoment,
        maxCount,
        maxCc,
        offset,
      );
    },
    previewPrefix: 'https://roda.sentinel-hub.com/sentinel-s2-l1c',
    awsLink: 'http://sentinel-s2-l1c.s3-website.eu-central-1.amazonaws.com/',
    indexService: `https://services.sentinel-hub.com/index/v3/collections/S2L1C/searchIndex`,
    resolution: 10,
    minZoom: 5,
    maxZoom: 16,
    allowOverZoomBy: 2,
  },
  {
    name: 'Sentinel-2 L2A',
    id: 'S2L2A',
    group: 'SENTINEL-2',
    evalsource: 'S2L2A',
    baseUrls: {
      WMS: 'https://services.sentinel-hub.com/ogc/wms/ed64bf38-72da-4723-9c06-568b76b8add0',
      FIS: 'https://services.sentinel-hub.com/ogc/fis/ed64bf38-72da-4723-9c06-568b76b8add0',
    },
    search: {
      tooltip: 'Wider Europe from 2017/03/28 onward',
      label: 'L2A',
      preselected: false,
      searchableByArea: true,
    },
    typename: 'DSS2',
    minDate: '2017-03-28',

    shortName: 'L2A',
    siblingDatasourceId: 'S2L1C',

    getTileUrl: function(tile) {
      return `https://services.sentinel-hub.com/index/s2/v3/tiles/${tile.id}`;
    },
    // getPreviewImage: function(tile) {
    //   return `${this.previewPrefix}/tiles${tile.dataUri.split('tiles')[1]}/preview.jpg`
    // },
    getAwsPath: function(tile) {
      return tile.dataUri;
    },
    getCrsLabel: function(tile) {
      return getCrsLabel(tile);
    },
    getDates: (from, to, area) =>
      getDatesFromSHServiceV3(
        'https://services.sentinel-hub.com/index/v3/collections/S2L2A/findAvailableData',
        from,
        to,
        area,
      ),
    constructSpacecraftInfo: function(tiles) {
      return constructSpacecraftInfoSentinel2(this.name, tiles);
    },
    getTilesFromIndexService: function(mapBounds, fromMoment, toMoment, maxCount, maxCc, offset) {
      return getTilesFromSHServiceV3(
        this.indexService,
        mapBounds,
        fromMoment,
        toMoment,
        maxCount,
        maxCc,
        offset,
      );
    },
    awsLink: 'http://sentinel-s2-l1c.s3-website.eu-central-1.amazonaws.com/',
    indexService: `https://services.sentinel-hub.com/index/v3/collections/S2L2A/searchIndex`,

    resolution: 10,
    fisResolutionCeiling: 1400,
    maxZoom: 16,
    allowOverZoomBy: 2,
    minZoom: 7,
  },
  {
    name: 'Sentinel-3 OLCI',
    id: 'S3OLCI',
    group: 'SENTINEL-3',
    evalsource: 'S3OLCI',
    baseUrls: {
      WMS: 'https://creodias.sentinel-hub.com/ogc/wms/f74cbfcc-57ef-4159-a3db-43fca35c08a4',
    },
    search: {
      tooltip: 'Global archive from 2016 onward',
      label: '',
      preselected: false,
      searchableByArea: true,
      useLayer: layer => !bandsRegex.test(layer.id),
    },

    useLayerAsChannel: layerId => bandsRegex.test(layerId),
    typename: 'DSS3.TILE',
    minDate: '2016-02-01',
    previewPrefix: 'https://finder.creodias.eu/files',
    getCreoDIASPath: tile => {
      const { originalId } = tile;
      const lowerCasePath = originalId.replace(`EODATA`, 'eodata');
      return `/${lowerCasePath}`;
    },
    getPreviewImage: function(tile) {
      const { originalId } = tile;
      let pattern = /^.*Sentinel-3\/(.*)\/(.*)\.SEN3$/i;
      let matches = pattern.exec(originalId);

      if (matches !== null) {
        return `${this.previewPrefix}/Sentinel-3/${matches[1]}/${matches[2]}.SEN3/${matches[2]}-ql.jpg`;
      }
      return null;
    },
    getDates: (from, to, area) =>
      getDatesFromSHServiceV3(
        'https://creodias.sentinel-hub.com/index/v3/collections/S3OLCI/findAvailableData',
        from,
        to,
        area,
      ),
    indexService: 'https://creodias.sentinel-hub.com/index/v3/collections/S3OLCI/searchIndex',
    resolution: 300,
    maxZoom: 16,
    allowOverZoomBy: 0,
    minZoom: 6,
  },

  {
    name: 'Sentinel-3 SLSTR',
    id: 'S3SLSTR',
    group: 'SENTINEL-3',
    evalsource: 'S3SLSTR',
    baseUrls: {
      WMS: 'https://creodias.sentinel-hub.com/ogc/wms/cf195685-ed7e-43d0-b476-9b43c75a5f90',
    },
    search: {
      tooltip: '',
      label: '',
      preselected: false,
      searchableByArea: true,
      useLayer: layer => true,
    },
    useLayerAsChannel: layerId => Sentinel3DataSourceHandler.isSLSTRBand(layerId),
    groupChannels: channels => Sentinel3DataSourceHandler.groupChannels(channels),
    getDates: (from, to, area) =>
      getDatesFromSHServiceV3(
        'https://creodias.sentinel-hub.com/index/v3/collections/S3SLSTR/findAvailableData',
        from,
        to,
        area,
      ),
    indexService: 'https://creodias.sentinel-hub.com/index/v3/collections/S3SLSTR/searchIndex',
    resolution: 300,
    maxZoom: 16,
    allowOverZoomBy: 0,
    minZoom: 6,
    previewPrefix: 'https://finder.creodias.eu/files',
    getCreoDIASPath: tile => {
      const { originalId } = tile;
      const lowerCasePath = originalId.replace(`EODATA`, 'eodata');
      return `/${lowerCasePath}`;
    },
    getPreviewImage: function(tile) {
      const { originalId } = tile;
      let pattern = /^.*Sentinel-3\/(.*)\/(.*)\.SEN3$/i;
      let matches = pattern.exec(originalId);

      if (matches !== null) {
        return `${this.previewPrefix}/Sentinel-3/${matches[1]}/${matches[2]}.SEN3/${matches[2]}-ql.jpg`;
      }
      return null;
    },
  },

  ...getS5Datasources(),

  {
    name: 'MODIS',
    id: 'MODIS',
    group: 'MODIS',
    evalsource: 'Modis',
    baseUrls: {
      WMS: 'https://services-uswest2.sentinel-hub.com/ogc/wms/f268e8d2-4f6e-4641-b45a-9f6d493321f2',
      FIS: 'https://services-uswest2.sentinel-hub.com/ogc/fis/f268e8d2-4f6e-4641-b45a-9f6d493321f2',
    },
    zoomToTile: false,
    search: {
      tooltip: 'Global archive from 2013 onward (daily 16 day NBAR)',
      label: '',
      preselected: false,
      searchableByArea: false,
    },
    typename: 'MODIS',
    minDate: '2013-01-01',
    indexService: `https://services-uswest2.sentinel-hub.com/index/v3/collections/MODIS/searchIndex`,
    resolution: 500,
    maxZoom: 16,
    allowOverZoomBy: 0,
    minZoom: 6,
    getDates: (from, to, area) =>
      getDatesFromSHServiceV3(
        'https://services-uswest2.sentinel-hub.com/index/v3/collections/MODIS/findAvailableData',
        from,
        to,
        area,
      ),
  },
  {
    name: 'Landsat 8 USGS',
    id: 'L8U',
    group: 'LANDSAT',
    evalsource: 'L8',
    baseUrls: {
      WMS: 'https://services-uswest2.sentinel-hub.com/ogc/wms/5a32b8f5-a7fd-4dfd-9b76-f9b1b9d650b2',
      FIS: 'https://services-uswest2.sentinel-hub.com/ogc/fis/5a32b8f5-a7fd-4dfd-9b76-f9b1b9d650b2',
    },
    search: {
      tooltip: 'Global archive from 2013/02 onward',
      label: 'Landsat 8 (USGS archive)',
      preselected: true,
      searchableByArea: true,
    },
    typename: 'L8.TILE',
    minDate: '2013-02-01',
    getPreviewImage: function(tile) {
      return `${tile.dataUri}_thumb_small.jpg`;
    },
    getAwsPath: function(tile) {
      const { dataUri } = tile;
      const splittedUri = dataUri.substring(0, [dataUri.lastIndexOf('/')]);
      return `${splittedUri}/index.html`;
    },
    getDates: (from, to, area) =>
      getDatesFromSHServiceV3(
        'https://services-uswest2.sentinel-hub.com/index/v3/collections/L8L1C/findAvailableData',
        from,
        to,
        area,
      ),

    previewPrefix: 'https://landsat-pds.s3.amazonaws.com',
    indexService: `https://services-uswest2.sentinel-hub.com/index/v3/collections/L8L1C/searchIndex`,
    resolution: 30,
    fisResolutionCeiling: 1490, // it should be 1500 - but in practice the limit is 1498 sometimes
    maxZoom: 16,
    allowOverZoomBy: 0,
    minZoom: 9,
  },
  {
    name: 'Envisat Meris',
    id: 'ENV',
    group: 'ENVISAT',
    evalsource: 'ENV',
    baseUrls: {
      WMS: 'https://eocloud.sentinel-hub.com/v1/wms/65a188c4-b50b-4e4c-9059-b208389e51ff',
    },
    search: {
      tooltip: 'Global archive from 2002 to 2012',
      label: '',
      preselected: false,
      searchableByArea: true,
      useLayer: layer => !bandsRegex.test(layer.id),
    },
    typename: 'ENV',

    minDate: '2002-01-01',
    maxDate: '2012-05-01',
    getEOPath: function(tile) {
      return tile.pathFragment;
    },
    getDates: (from, to, area) =>
      getDatesFromSHServiceV1Or2(
        `https://eocloud.sentinel-hub.com/index/envisat/v1/finddates`,
        from,
        to,
        area,
      ),
    indexService: 'https://eocloud.sentinel-hub.com/index/envisat/v1',
    resolution: 300,
    maxZoom: 16,
    allowOverZoomBy: 0,
    minZoom: 6,
  },
  {
    name: 'Proba-V 1-day (S1)',
    id: 'PROBAV_S1',
    group: 'PROBAV',
    baseUrls: {
      WMS: 'https://proba-v-mep.esa.int/applications/geo-viewer/app/geoserver/ows',
    },
    customLayer: false,
    zoomToTile: false,
    effects: false,
    search: {
      tooltip: 'Global archive from 2013/10 onward',
      label: '1-day (S1)',
      preselected: true,
      searchableByArea: false,
      customGetResults: (datasource, queryParams) => {
        return fetchProbaVSearchResults(datasource, queryParams);
      },
      useLayer: layer => layer.name.startsWith('PROBAV_S1_') && !layer.name.endsWith('_1KM'),
    },
    getDates: (from, to) => getDatesFromProbaV(from, to, 'PROBAV_S1'),
    minZoom: 1,
    maxZoom: 16,
    allowOverZoomBy: 0,
    showPrevNextDate: false,
  },
  {
    name: 'Proba-V 5-day (S5)',
    id: 'PROBAV_S5',
    group: 'PROBAV',
    baseUrls: {
      WMS: 'https://proba-v-mep.esa.int/applications/geo-viewer/app/geoserver/ows',
    },
    customLayer: false,
    zoomToTile: false,
    effects: false,
    search: {
      tooltip: 'Global archive from 2013/10 onward',
      label: '5-day (S5)',
      preselected: false,
      searchableByArea: false,
      customGetResults: (datasource, queryParams) => {
        return fetchProbaVSearchResults(datasource, queryParams);
      },
      useLayer: layer => layer.name.startsWith('PROBAV_S5_'),
    },
    getDates: (from, to) => getDatesFromProbaV(from, to, 'PROBAV_S5'),
    minZoom: 1,
    maxZoom: 16,
    allowOverZoomBy: 0,
    showPrevNextDate: false,
  },
  {
    name: 'Proba-V 10-day (S10)',
    id: 'PROBAV_S10',
    group: 'PROBAV',
    baseUrls: {
      WMS: 'https://proba-v-mep.esa.int/applications/geo-viewer/app/geoserver/ows',
    },
    customLayer: false,
    zoomToTile: false,
    effects: false,
    search: {
      tooltip: 'Global archive from 2013/10 onward',
      label: '10-day (S10)',
      preselected: false,
      searchableByArea: false,
      customGetResults: (datasource, queryParams) => {
        return fetchProbaVSearchResults(datasource, queryParams);
      },
      useLayer: layer => layer.name.startsWith('PROBAV_S10_') && !layer.name.endsWith('_1KM'),
    },
    getDates: (from, to) => getDatesFromProbaV(from, to, 'PROBAV_S10'),
    minZoom: 1,
    maxZoom: 16,
    allowOverZoomBy: 0,
    showPrevNextDate: false,
  },
  {
    name: 'GIBS MODIS Terra',
    id: 'GIBS_MODIS_Terra_SurfaceReflectance',
    group: 'GIBS',
    baseUrls: {
      WMTS: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi',
    },
    customLayer: false,
    zoomToTile: false,
    effects: false,
    search: {
      tooltip: 'Global archive from 2000 onward',
      label: 'MODIS Terra',
      preselected: true,
      searchableByArea: false,
      customGetResults: (datasource, queryParams) => {
        return fetchGIBSSearchResults(datasource, queryParams);
      },
      useLayer: layer => layer.id.startsWith('MODIS_Terra_SurfaceReflectance'),
      // could be just MODIS Terra (all MODIS Terra layers have same dates)
    },
    getDates: (from, to) => getDatesFromGIBS(from, to, 'GIBS_MODIS_Terra_SurfaceReflectance'),
    minZoom: 0,
    maxZoom: 8,
    allowOverZoomBy: 0,
  },
  {
    name: 'GIBS MODIS Aqua',
    id: 'GIBS_MODIS_Aqua_SurfaceReflectance',
    group: 'GIBS',
    baseUrls: {
      WMTS: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi',
    },
    customLayer: false,
    zoomToTile: false,
    effects: false,
    search: {
      tooltip: 'Global archive from 2002 onward',
      label: 'MODIS Aqua',
      preselected: false,
      searchableByArea: false,
      customGetResults: (datasource, queryParams) => {
        return fetchGIBSSearchResults(datasource, queryParams);
      },
      useLayer: layer => layer.id.startsWith('MODIS_Aqua_SurfaceReflectance'),
      // could be just MODIS Aqua (all MODIS Aqua layers have same dates)
    },
    getDates: (from, to) => getDatesFromGIBS(from, to, 'GIBS_MODIS_Aqua_SurfaceReflectance'),
    minZoom: 0,
    maxZoom: 8,
    allowOverZoomBy: 0,
  },
  {
    name: 'GIBS VIIRS SNPP Corrected Reflectance',
    id: 'GIBS_VIIRS_SNPP_CorrectedReflectance',
    group: 'GIBS',
    baseUrls: {
      WMTS: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi',
    },
    customLayer: false,
    zoomToTile: false,
    effects: false,
    search: {
      tooltip: 'Global archive from 2015 onward',
      label: 'VIIRS SNPP Corrected reflectance',
      preselected: false,
      searchableByArea: false,
      customGetResults: (datasource, queryParams) => {
        return fetchGIBSSearchResults(datasource, queryParams);
      },
      useLayer: layer => layer.id.startsWith('VIIRS_SNPP_CorrectedReflectance'),
    },
    getDates: (from, to) => getDatesFromGIBS(from, to, 'GIBS_VIIRS_SNPP_CorrectedReflectance'),
    minZoom: 0,
    maxZoom: 9,
    allowOverZoomBy: 0,
  },
  {
    name: 'GIBS VIIRS SNPP DayNightBand ENCC',
    id: 'GIBS_VIIRS_SNPP_DayNightBand_ENCC',
    group: 'GIBS',
    baseUrls: {
      WMTS: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi',
    },
    customLayer: false,
    zoomToTile: false,
    effects: false,
    search: {
      tooltip: 'Global archive from 2016 onward',
      label: 'VIIRS SNPP Nighttime Imagery',
      preselected: false,
      searchableByArea: false,
      customGetResults: (datasource, queryParams) => {
        return fetchGIBSSearchResults(datasource, queryParams);
      },
      useLayer: layer => layer.id.startsWith('VIIRS_SNPP_DayNightBand_ENCC'),
    },
    getDates: (from, to) => getDatesFromGIBS(from, to, 'GIBS_VIIRS_SNPP_DayNightBand_ENCC'),
    minZoom: 0,
    maxZoom: 8,
    allowOverZoomBy: 0,
  },
  {
    name: 'GIBS CALIPSO Wide Field Camera Radiance v3-01',
    id: 'GIBS_CALIPSO_Wide_Field_Camera_Radiance_v3-01',
    group: 'GIBS',
    baseUrls: {
      WMTS: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi',
    },
    customLayer: false,
    zoomToTile: false,
    effects: false,
    search: {
      tooltip: 'Global archive from 2006 to 2011',
      label: 'CALIPSO Radiance v3-01',
      preselected: false,
      searchableByArea: false,
      customGetResults: (datasource, queryParams) => {
        return fetchGIBSSearchResults(datasource, queryParams);
      },
      useLayer: layer => layer.id.startsWith('CALIPSO_Wide_Field_Camera_Radiance_v3-01'),
    },
    getDates: (from, to) => getDatesFromGIBS(from, to, 'GIBS_CALIPSO_Wide_Field_Camera_Radiance_v3-01'),
    minZoom: 0,
    maxZoom: 7,
    allowOverZoomBy: 0,
  },
  {
    name: 'GIBS CALIPSO Wide Field Camera Radiance v3-02',
    id: 'GIBS_CALIPSO_Wide_Field_Camera_Radiance_v3-02',
    group: 'GIBS',
    baseUrls: {
      WMTS: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi',
    },
    customLayer: false,
    zoomToTile: false,
    effects: false,
    search: {
      tooltip: 'Global archive from 2007 onward',
      label: 'CALIPSO Radiance v3-02',
      preselected: false,
      searchableByArea: false,
      customGetResults: (datasource, queryParams) => {
        return fetchGIBSSearchResults(datasource, queryParams);
      },
      useLayer: layer => layer.id.startsWith('CALIPSO_Wide_Field_Camera_Radiance_v3-02'),
    },
    getDates: (from, to) => getDatesFromGIBS(from, to, 'GIBS_CALIPSO_Wide_Field_Camera_Radiance_v3-02'),
    minZoom: 0,
    maxZoom: 7,
    allowOverZoomBy: 0,
  },
  {
    name: 'GIBS BlueMarble',
    id: 'GIBS_BlueMarble',
    group: 'GIBS',
    baseUrls: {
      WMTS: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi',
    },
    customLayer: false,
    zoomToTile: false,
    effects: false,
    search: {
      tooltip: 'Global archive',
      label: 'Blue Marble',
      preselected: false,
      searchableByArea: false,
      customGetResults: (datasource, queryParams) => {
        return fetchGIBSSearchResults(datasource, queryParams);
      },
      useLayer: layer => layer.id.startsWith('BlueMarble'),
    },
    getDates: (from, to) => getDatesFromGIBS(from, to, 'GIBS_BlueMarble'),
    minZoom: 0,
    maxZoom: 8,
    allowOverZoomBy: 0,
  },
  {
    name: 'GIBS Landsat WELD',
    id: 'GIBS_Landsat_WELD_CorrectedReflectance_TrueColor_Global_Annual',
    group: 'GIBS',
    baseUrls: {
      WMTS: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi',
    },
    customLayer: false,
    zoomToTile: false,
    effects: false,
    search: {
      tooltip: 'Annual global archive from 2008 to 2010',
      label: 'Landsat WELD Annual',
      preselected: false,
      searchableByArea: false,
      customGetResults: (datasource, queryParams) => {
        return fetchGIBSSearchResults(datasource, queryParams);
      },
      useLayer: layer => layer.id.startsWith('Landsat_WELD_CorrectedReflectance_TrueColor_Global_Annual'),
    },
    getDates: (from, to) =>
      getDatesFromGIBS(from, to, 'GIBS_Landsat_WELD_CorrectedReflectance_TrueColor_Global_Annual'),
    minZoom: 0,
    maxZoom: 12,
    allowOverZoomBy: 0,
  },
  {
    name: 'GIBS MISR',
    id: 'GIBS_MISR_AM1_Ellipsoid_Radiance_RGB_AA',
    group: 'GIBS',
    baseUrls: {
      WMTS: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi',
    },
    customLayer: false,
    zoomToTile: false,
    effects: false,
    search: {
      tooltip: 'Global archive from 2017 onward',
      label: 'MISR',
      preselected: false,
      searchableByArea: false,
      customGetResults: (datasource, queryParams) => {
        return fetchGIBSSearchResults(datasource, queryParams);
      },
      useLayer: layer => layer.id.startsWith('MISR_AM1_Ellipsoid_Radiance_RGB_AA'),
    },
    getDates: (from, to) => getDatesFromGIBS(from, to, 'GIBS_MISR_AM1_Ellipsoid_Radiance_RGB_AA'),
    minZoom: 0,
    maxZoom: 9,
    allowOverZoomBy: 0,
  },
  {
    name: 'GIBS ASTER GDEM',
    id: 'GIBS_ASTER_GDEM',
    group: 'GIBS',
    baseUrls: {
      WMTS: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi',
    },
    customLayer: false,
    zoomToTile: false,
    effects: false,
    search: {
      tooltip: 'Global archive',
      label: 'ASTER GDEM',
      preselected: false,
      searchableByArea: false,
      customGetResults: (datasource, queryParams) => {
        return fetchGIBSSearchResults(datasource, queryParams);
      },
      useLayer: layer => layer.id.startsWith('ASTER_GDEM'),
    },
    getDates: (from, to) => getDatesFromGIBS(from, to, 'GIBS_ASTER_GDEM'),
    minZoom: 0,
    maxZoom: 12,
    allowOverZoomBy: 0,
  },
];

const wildfireDatasources = [
  {
    name: 'Sentinel-2 L1C - wildfires',
    id: 'S2L1C-WILDFIRES',
    baseUrls: {
      WMS: 'https://services.sentinel-hub.com/ogc/wms/b41679d2-fe35-4e9e-b736-a03bb1cf1309',
    },
    search: {
      useLayer: layer => true,
    },
    minDate: '2015-01-01',
    shortName: 'L1C',
    getPreviewImage: function(tile) {
      return `${this.previewPrefix}/tiles${tile.dataUri.split('tiles')[1]}/preview.jpg`;
    },
    getAwsPath: function(tile) {
      return tile.dataUri;
    },
    getTileUrl: function(tile) {
      return `https://services.sentinel-hub.com/index/s2/v3/tiles/${tile.id}`;
    },
    getSciHubLink: function(product) {
      return `https://scihub.copernicus.eu/dhus/odata/v1/Products('${
        product.split('/').splice(-1)[0]
      }')/$value`;
    },
    getCrsLabel: function(tile) {
      return getCrsLabel(tile);
    },
    getDates: (from, to, area) =>
      getDatesFromSHServiceV3(
        'https://services.sentinel-hub.com/index/v3/collections/S2L1C/findAvailableData',
        from,
        to,
        area,
      ),
    constructSpacecraftInfo: function(tiles) {
      return constructSpacecraftInfoSentinel2(this.name, tiles);
    },
    getTilesFromIndexService: function(mapBounds, fromMoment, toMoment, maxCount, maxCc, offset) {
      return getTilesFromSHServiceV3(
        this.indexService,
        mapBounds,
        fromMoment,
        toMoment,
        maxCount,
        maxCc,
        offset,
      );
    },
    previewPrefix: 'https://roda.sentinel-hub.com/sentinel-s2-l1c',
    awsLink: 'http://sentinel-s2-l1c.s3-website.eu-central-1.amazonaws.com/',
    indexService: `https://services.sentinel-hub.com/index/v3/collections/S2L1C/searchIndex`,
    resolution: 10,
    minZoom: 5,
    maxZoom: 16,
    allowOverZoomBy: 2,
  },

  {
    name: 'Sentinel-2 L2A - wildfires',
    id: 'S2L2A-WILDFIRES',
    baseUrls: {
      WMS: 'https://services.sentinel-hub.com/ogc/wms/bd278536-3eeb-4706-b279-042d4584b319',
    },
    search: {
      useLayer: layer => true,
    },
    minDate: '2017-03-28',
    shortName: 'L2A',

    getTileUrl: function(tile) {
      return `https://services.sentinel-hub.com/index/s2/v3/tiles/${tile.id}`;
    },
    // getPreviewImage: function(tile) {
    //   return `${this.previewPrefix}/tiles${tile.dataUri.split('tiles')[1]}/preview.jpg`
    // },
    getAwsPath: function(tile) {
      return tile.dataUri;
    },
    getCrsLabel: function(tile) {
      return getCrsLabel(tile);
    },
    getDates: (from, to, area) =>
      getDatesFromSHServiceV3(
        'https://services.sentinel-hub.com/index/v3/collections/S2L2A/findAvailableData',
        from,
        to,
        area,
      ),
    constructSpacecraftInfo: function(tiles) {
      return constructSpacecraftInfoSentinel2(this.name, tiles);
    },
    getTilesFromIndexService: function(mapBounds, fromMoment, toMoment, maxCount, maxCc, offset) {
      return getTilesFromSHServiceV3(
        this.indexService,
        mapBounds,
        fromMoment,
        toMoment,
        maxCount,
        maxCc,
        offset,
      );
    },
    awsLink: 'http://sentinel-s2-l1c.s3-website.eu-central-1.amazonaws.com/',
    indexService: `https://services.sentinel-hub.com/index/v3/collections/S2L2A/searchIndex`,

    resolution: 10,
    fisResolutionCeiling: 1400,
    maxZoom: 16,
    allowOverZoomBy: 2,
    minZoom: 7,
  },
];

const volcanoesDatasources = [
  {
    name: 'Sentinel-2 L1C - volcanoes',
    id: 'S2L1C-volcanoes',
    baseUrls: {
      WMS: 'https://services.sentinel-hub.com/ogc/wms/3c739a78-573b-425c-82eb-78b617d39d25',
    },
    search: {
      useLayer: layer => true,
    },
    minDate: '2015-01-01',
    shortName: 'L1C',
    getPreviewImage: function(tile) {
      return `${this.previewPrefix}/tiles${tile.dataUri.split('tiles')[1]}/preview.jpg`;
    },
    getAwsPath: function(tile) {
      return tile.dataUri;
    },
    getTileUrl: function(tile) {
      return `https://services.sentinel-hub.com/index/s2/v3/tiles/${tile.id}`;
    },
    getSciHubLink: function(product) {
      return `https://scihub.copernicus.eu/dhus/odata/v1/Products('${
        product.split('/').splice(-1)[0]
      }')/$value`;
    },
    getCrsLabel: function(tile) {
      return getCrsLabel(tile);
    },
    getDates: (from, to, area) =>
      getDatesFromSHServiceV3(
        'https://services.sentinel-hub.com/index/v3/collections/S2L1C/findAvailableData',
        from,
        to,
        area,
      ),
    constructSpacecraftInfo: function(tiles) {
      return constructSpacecraftInfoSentinel2(this.name, tiles);
    },
    getTilesFromIndexService: function(mapBounds, fromMoment, toMoment, maxCount, maxCc, offset) {
      return getTilesFromSHServiceV3(
        this.indexService,
        mapBounds,
        fromMoment,
        toMoment,
        maxCount,
        maxCc,
        offset,
      );
    },
    previewPrefix: 'https://roda.sentinel-hub.com/sentinel-s2-l1c',
    awsLink: 'http://sentinel-s2-l1c.s3-website.eu-central-1.amazonaws.com/',
    indexService: `https://services.sentinel-hub.com/index/v3/collections/S2L1C/searchIndex`,
    resolution: 10,
    minZoom: 5,
    maxZoom: 16,
    allowOverZoomBy: 2,
  },
  {
    name: 'Sentinel-2 L2A - volcanoes',
    id: 'S2L2A-volcanoes',
    baseUrls: {
      WMS: 'https://services.sentinel-hub.com/ogc/wms/d3c58479-ae72-48a9-bfb2-4273baaf25fe',
    },
    search: {
      useLayer: layer => true,
    },
    minDate: '2015-01-01',
    shortName: 'L2A',
    getTileUrl: function(tile) {
      return `https://services.sentinel-hub.com/index/s2/v3/tiles/${tile.id}`;
    },
    // getPreviewImage: function(tile) {
    //   return `${this.previewPrefix}/tiles${tile.dataUri.split('tiles')[1]}/preview.jpg`
    // },
    getAwsPath: function(tile) {
      return tile.dataUri;
    },
    getCrsLabel: function(tile) {
      return getCrsLabel(tile);
    },
    getDates: (from, to, area) =>
      getDatesFromSHServiceV3(
        'https://services.sentinel-hub.com/index/v3/collections/S2L2A/findAvailableData',
        from,
        to,
        area,
      ),
    constructSpacecraftInfo: function(tiles) {
      return constructSpacecraftInfoSentinel2(this.name, tiles);
    },
    getTilesFromIndexService: function(mapBounds, fromMoment, toMoment, maxCount, maxCc, offset) {
      return getTilesFromSHServiceV3(
        this.indexService,
        mapBounds,
        fromMoment,
        toMoment,
        maxCount,
        maxCc,
        offset,
      );
    },
    awsLink: 'http://sentinel-s2-l1c.s3-website.eu-central-1.amazonaws.com/',
    indexService: `https://services.sentinel-hub.com/index/v3/collections/S2L2A/searchIndex`,

    resolution: 10,
    fisResolutionCeiling: 1400,
    maxZoom: 16,
    allowOverZoomBy: 2,
    minZoom: 7,
  },

  {
    name: 'Landsat 8 L1 - volcanoes',
    id: 'L8L1-volcanoes',
    baseUrls: {
      WMS: 'https://services-uswest2.sentinel-hub.com/ogc/wms/e5efe6fb-7c55-431b-913f-2bb8ea5afb29',
    },
    search: {
      useLayer: layer => true,
    },
    minDate: '2015-01-01',
    shortName: 'L8',
    getPreviewImage: function(tile) {
      return `${this.previewPrefix}/tiles${tile.dataUri.split('tiles')[1]}/preview.jpg`;
    },
    getAwsPath: function(tile) {
      return tile.dataUri;
    },
    getTileUrl: function(tile) {
      return `https://services-uswest2.sentinel-hub.com/index/l8/v3/tiles/${tile.id}`;
    },
    getSciHubLink: function(product) {
      return `https://scihub.copernicus.eu/dhus/odata/v1/Products('${
        product.split('/').splice(-1)[0]
      }')/$value`;
    },
    getCrsLabel: function(tile) {
      return getCrsLabel(tile);
    },
    getDates: (from, to, area) =>
      getDatesFromSHServiceV3(
        'https://services-uswest2.sentinel-hub.com/index/v3/collections/L8L1C/findAvailableData',
        from,
        to,
        area,
      ),
    constructSpacecraftInfo: function(tiles) {
      return constructSpacecraftInfoSentinel2(this.name, tiles);
    },
    getTilesFromIndexService: function(mapBounds, fromMoment, toMoment, maxCount, maxCc, offset) {
      return getTilesFromSHServiceV3(
        this.indexService,
        mapBounds,
        fromMoment,
        toMoment,
        maxCount,
        maxCc,
        offset,
      );
    },
    previewPrefix: 'https://roda.sentinel-hub.com/sentinel-s2-l1c',
    awsLink: 'http://landsat-pds.s3.amazonaws.com',
    indexService: `https://services-uswest2.sentinel-hub.com/index/v3/collections/L8L1C/searchIndex`,
    resolution: 10,
    minZoom: 5,
    maxZoom: 16,
    allowOverZoomBy: 2,
  },
];

export const DATASOURCES = [...defaultDatasources, ...wildfireDatasources, ...volcanoesDatasources];

let evalSourcesMapFromDatasources = {};
DATASOURCES.filter(ds => ds.evalsource).forEach(ds => {
  evalSourcesMapFromDatasources[ds.name] = ds.evalsource;
});
export const evalSourcesMap = {
  'Sentinel-1': 'S1',
  'Sentinel-2': 'S2',
  'Landsat 8': 'L8',
  ...evalSourcesMapFromDatasources,
};

export const DATASET_MAP = {
  S2L1C: 'Sentinel-2 L1C',
  S2L2A: 'Sentinel-2 L2A',
};

export const DEFAULT_POLY_STYLE = {
  weight: 1,
  color: '#398ade',
  opacity: 0.8,
  fillColor: '#398ade',
  fillOpacity: 0.15,
};
export const HIGHLIGHT_POLY_STYLE = {
  weight: 2,
  color: '#57de71',
  opacity: 1,
  fillColor: '#57de71',
  fillOpacity: 0.3,
};

const config = {
  layers: {},
  startLocation: '',
  doRefresh: true,
  datasources: [DATASOURCES.find(inst => inst.id === 'S2L1C').name],
  instances: DATASOURCES, // use only if you need user's instances, otherwise import and use DATASOURCES directly
  isLoaded: true,
  searchResults: {},
  searchFilterResults: {},
  searchParams: {},
  lat: 41.9,
  lng: 12.5,
  zoom: 10,
  size: [0, 0],
  opacity: 100,
  maxcc: 100,
  imgWmsUrl: '',
  mapBounds: null,
  mapMaxBounds: [[-90, -Infinity], [90, Infinity]],
  minDate: moment('1984-03-01'),
  maxDate: moment.utc(),
  dateFrom: moment.utc().subtract(1, 'months'),
  dateTo: moment.utc(),
  availableDays: [],
  preset: {},
  currView: views.PRESETS,
  channels: {},
  mainTabIndex: 0,
  path: '',
  presets: {},
  isActiveLayerVisible: true,
  compareMode: false,
  evalscript: {},
  evalscripturl: {},
  isEvalUrl: false,
  user: null,
  selectedResult: null,
  compareModeType: 'opacity',
  modalDialogs: [],
  userPins: getPinsFromLocalStorage(),
  views,
  themesUrl: null,
};

export default config;
