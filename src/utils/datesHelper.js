import moment from 'moment';
import axios from 'axios';
import Store from '../store';
import { getCoordsFromBounds } from './coords';

export const ISO_8601_UTC = `YYYY-MM-DD[T]HH:mm:ss.SSS[Z]`;
export const STANDARD_STRING_DATE_FORMAT = 'YYYY-MM-DD';
export function getAndSetNextPrev(direction) {
  const { maxDate, minDate, selectedResult } = Store.current;
  let { time, datasource, indexService } = selectedResult;
  let { mapBounds: bounds } = Store.current;
  let activeLayer = [...Store.current.instances, ...(Store.current.userInstances || {})].find(inst => {
    return inst.name === datasource || inst.id === datasource;
  });
  const newService = activeLayer.indexService.includes('v3/collections');
  const clip = {
    type: 'Polygon',
    crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:EPSG::4326' } },
    coordinates: [getCoordsFromBounds(bounds, false, newService)],
  };
  const from =
    direction === 'prev'
      ? moment(minDate).format(STANDARD_STRING_DATE_FORMAT)
      : moment(time)
          .add(1, 'day')
          .format(STANDARD_STRING_DATE_FORMAT);
  const to =
    direction === 'prev'
      ? moment(time).format(STANDARD_STRING_DATE_FORMAT)
      : moment(maxDate).format(STANDARD_STRING_DATE_FORMAT);
  let payload = {
    clipping: clip,
    maxcount: 1,
    priority: direction === 'prev' ? 'mostRecent' : 'leastRecent',
    timeFrom: from,
    timeTo: to,
  };

  return new Promise((resolve, reject) => {
    if (!newService) {
      indexService += `/search?expand=true&from=${from}&to=${to}&maxcount=1&priority=${
        direction === 'prev' ? 'mostRecent' : 'leastRecent'
      }&offset=0`;
    }
    axios
      .post(indexService, newService ? payload : clip, {
        headers: new Headers({
          'Accept-CRS': 'EPSG:4326',
          'Content-Type': 'application/json;charset=utf-8',
          Accept: 'application/json',
        }),
      })
      .then(response => response.data)
      .then(res => {
        if (res.tiles.length === 1) {
          resolve(res.tiles[0].sensingTime);
        }
        if (res.tiles.length === 0) reject('no date found');
      });
  });
}

export function queryDatesForActiveMonth(singleDate, datasourceName) {
  const startOfMonth = moment(singleDate).startOf('month');
  const endOfMonth = moment(singleDate).endOf('month');
  return fetchAvailableDates(startOfMonth, endOfMonth, datasourceName);
}

export function fetchAvailableDates(from, to, selectedDataSource, queryArea) {
  let selectedResult =
    Store.current.selectedResult || Store.current.instances.find(ds => ds.name === selectedDataSource);
  const newService = selectedResult.indexService && selectedResult.indexService.includes('v3/collections');
  if (!queryArea) {
    queryArea = {
      type: 'Polygon',
      crs: {
        type: 'name',
        properties: {
          name: 'urn:ogc:def:crs:EPSG::4326',
        },
      },
      coordinates: [getCoordsFromBounds(Store.current.mapBounds, false, newService)],
    };
  }
  const getDatesMethod = selectedResult.getDates || selectedResult.activeLayer.getDates;
  return getDatesMethod(from, to, queryArea);
}
