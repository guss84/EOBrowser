import React from 'react';
import flatten from 'lodash/flatten';
import moment from 'moment';

import Sentinel1DataSourceHandler from './Sentinel1DataSourceHandler';
import Sentinel2AWSDataSourceHandler from './Sentinel2AWSDataSourceHandler';
import Sentinel3DataSourceHandler from './Sentinel3DataSourceHandler';
import Sentinel5PDataSourceHandler from './Sentinel5PDataSourceHandler';
import LandsatDataSourceHandler from './LandsatDataSourceHandler';
import ProbaVDataSourceHandler from './ProbaVDataSourceHandler';
import EnvisatMerisDataSourceHandler from './EnvisatMerisDataSourceHandler';
import ModisDataSourceHandler from './ModisDataSourceHandler';
import GibsDataSourceHandler from './GibsDataSourceHandler';
import DataSourceHandler from './DataSourceHandler';

let dataSourceHandlers = [];
let hasMore = true;

export function initializeDataSourceHandlers() {
  dataSourceHandlers = [
    new Sentinel1DataSourceHandler(),
    new Sentinel2AWSDataSourceHandler(),
    new Sentinel3DataSourceHandler(),
    new Sentinel5PDataSourceHandler(),
    new LandsatDataSourceHandler(),
    new EnvisatMerisDataSourceHandler(),
    new ModisDataSourceHandler(),
    new ProbaVDataSourceHandler(),
    new GibsDataSourceHandler(),
  ];
}

export function registerHandlers(service, url, name, configs, preselected) {
  const handledBy = dataSourceHandlers.filter(dsHandler =>
    dsHandler.willHandle(service, url, name, configs, preselected),
  );
  return handledBy.length !== 0;
}

export function prepareNewSearch(fromMoment, toMoment, mapBounds) {
  dataSourceHandlers
    .filter(dsh => dsh.isHandlingAnyUrl())
    .forEach(dsh => dsh.prepareNewSearch(fromMoment, toMoment, mapBounds));
}

export function performSearch(currentLat, currentLng) {
  const applicableDSHandlers = dataSourceHandlers.filter(dsh => dsh.isHandlingAnyUrl());
  const allSearchPromises = applicableDSHandlers.map(dsh => dsh.performSearch());
  return new Promise((resolve, reject) => {
    if (allSearchPromises.filter(searchPromise => searchPromise !== null).length === 0) {
      reject('Please select data source(s)!');
      return;
    }

    Promise.all(allSearchPromises)
      .then(resultsLists => {
        // This is a very simplistic way of retrieving the search results. We put them all in the same
        // array, sort them and take first 50.

        // We need to remember the handlerIndex in each of the results, so that when we sort the results
        // and pick the first 50, we can tell the handlers how many of their results were consumed:
        const markedResultsLists = resultsLists.map(
          (tiles, handlerIndex) => (tiles === null ? [] : tiles.map(tile => ({ ...tile, handlerIndex }))),
        );

        // Sort results and take only first 50:
        const results = flatten(markedResultsLists);
        results.sort((a, b) => moment(b.sensingTime).diff(moment(a.sensingTime)));
        const firstNResults = results.slice(0, DataSourceHandler.N_RESULTS);

        hasMore = results.length > DataSourceHandler.N_RESULTS;

        // Tell handlers that their results were consumed, so that "Load more" will skip them:
        firstNResults.forEach(t => {
          applicableDSHandlers[t.handlerIndex].markAsConsumed(t);
        });

        const finalResults = firstNResults.map((t, resultIndex) => ({
          tileData: {
            ...t,
            sensingTime: moment.utc(t.sensingTime).format('HH:mm:ss') + ' UTC',
            time: moment.utc(t.sensingTime).format('YYYY-MM-DD'),
            cloudCoverage: t.cloudCoverage === undefined ? -1 : t.cloudCoverage,
            lat: currentLat,
            lng: currentLng,
          },
          resultIndex: resultIndex,
          properties: {
            index: 0,
            queryParams: {},
          },
        }));

        resolve(finalResults);
      })
      .catch(e => {
        console.error(e);
        reject(`Search error: ${e}`);
      });
  });
}

export function currentSearchHasMoreResults() {
  return hasMore;
}

export function renderDataSourcesInputs() {
  return dataSourceHandlers
    .filter(dsh => dsh.isHandlingAnyUrl())
    .map((dsh, dshIndex) => <div key={dshIndex}>{dsh.getSearchFormComponents()}</div>);
}
