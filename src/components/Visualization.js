import React, { Component } from 'react';
import { connect } from 'react-redux';
import moment from 'moment';
import LayerDatasourcePicker from './LayerDatasourcePicker';
import EffectsPanel from './EffectsPanel';
import { NotificationPanel } from 'eo-components';
import Store from '../store';
import AddPin from './AddPin';
import Rodal from 'rodal';
import { isCustomPreset, getZoomLimitsForSelectedLayer } from '../utils/utils';
import DayPicker from './DayPicker';
import OneTimeNotification from './OneTimeNotification';
import Timelapse from './Timelapse';
import { DATASOURCES, DATASET_MAP } from '../store/config';

class Visualization extends Component {
  state = {
    showEffects: false,
    fetchingAlternativeDatasourceInfo: false,
  };

  zoomTo = ({ lat, lng }) => {
    Store.setMapView({ lat, lng, zoom: 10, update: true });
  };

  updateDate = date => {
    Store.setSelectedResult({
      ...Store.current.selectedResult,
      time: moment(date).format('YYYY-MM-DD'),
    });
  };

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

  getTileInfo() {
    const { isActiveLayerVisible, selectedResult, presets } = Store.current;
    const { datasource: datasourceName, lat, time, lng, zoom, userId } = selectedResult;
    let datasource = DATASOURCES.find(ds => ds.name === datasourceName);
    if (!datasource) {
      datasource = Store.current.instances.find(inst => inst.name === datasourceName);
    }
    const dsSupportsZoomToTile = datasource.zoomToTile !== false;
    const dsSupportsEffects = datasource.effects !== false;

    const showNextPrev = datasource.showPrevNextDate === undefined ? true : datasource.showPrevNextDate;

    const siblingDatasource = datasource.siblingDatasourceId
      ? DATASOURCES.find(ds => ds.id === datasource.siblingDatasourceId)
      : undefined;

    const isSiblingDataAvailable = datasource.siblingDatasourceId
      ? this.checkSiblingAvailability(siblingDatasource, time)
      : false;

    const { showEffects, fetchingAlternativeDatasourceInfo } = this.state;
    const minDate = selectedResult.minDate ? new Date(selectedResult.minDate) : undefined;
    const maxDate = selectedResult.maxDate ? new Date(selectedResult.maxDate) : undefined;
    return (
      <div className="visualizationInfoPanel">
        <div className="tileActions">
          {dsSupportsZoomToTile && lat && lng ? (
            <a onClick={() => this.zoomTo({ lat, lng, zoom })} title="Zoom to tile">
              <i className="fa fa-search" />
            </a>
          ) : null}
          <AddPin />
          <a onClick={() => Store.toggleActiveLayer(!isActiveLayerVisible)}>
            <i
              title={isActiveLayerVisible ? 'Hide layer' : 'Show layer'}
              className={`fa fa-eye${isActiveLayerVisible ? '-slash' : ''}`}
            />
          </a>
          {dsSupportsEffects && (
            <a
              onClick={() => this.setState({ showEffects: !showEffects })}
              title={`Show ${showEffects ? 'visualization' : 'effects'}`}
            >
              <i className={`fa fa-${showEffects ? 'paint-brush' : 'sliders'}`} />
            </a>
          )}
        </div>
        {userId && (
          <div>
            <b className="leaveMeAlone">Configuration:</b> {datasourceName}
          </div>
        )}
        <div>
          <b className="leaveMeAlone">Dataset:</b>{' '}
          {userId
            ? presets[datasourceName]
              ? DATASET_MAP[presets[datasourceName][0].dataset]
              : datasourceName
            : datasourceName}
          {siblingDatasource && (
            <a
              style={{ marginLeft: 20 }}
              title={
                isSiblingDataAvailable
                  ? `Search for ${siblingDatasource.name} tiles on this date`
                  : `Tiles for ${siblingDatasource.name} are not available on this date or in this area`
              }
              className="btn"
              onClick={() => this.getSiblingData(siblingDatasource, time)}
              disabled={!isSiblingDataAvailable}
            >
              {fetchingAlternativeDatasourceInfo ? (
                <i className="fa fa-spinner fa-spin fa-fw" />
              ) : (
                `Show ${siblingDatasource.shortName}`
              )}
            </a>
          )}
        </div>
        <div>
          <b className="leaveMeAlone">Date:</b>
          <DayPicker
            onSelect={e => this.updateDate(e)}
            selectedDay={moment(time)}
            showNextPrev={showNextPrev}
            minDate={minDate}
            maxDate={maxDate}
          />
        </div>
      </div>
    );
  }

  checkSiblingAvailability = (datasource, time) => {
    const timeIsAfterMinDate = datasource.minDate ? moment(time).isAfter(datasource.minDate) : true;
    const timeIsBeforeMaxDate = datasource.maxDate ? moment(time).isBefore(datasource.maxDate) : true;
    return timeIsAfterMinDate && timeIsBeforeMaxDate;
  };

  getSiblingData = (datasource, time) => {
    if (this.checkSiblingAvailability(datasource, time)) {
      this.setState({ fetchingAlternativeDatasourceInfo: true });

      const fromMoment = moment(time).startOf('day');
      const toMoment = moment(time).endOf('day');

      datasource
        .getDates(fromMoment, toMoment)
        .then(data => {
          let fetchedTime = data.length > 0 ? data[0] : undefined;

          // if datasource is limited to some area, check if map intersects datasource bounds
          const isInBounds = datasource.limitedBounds
            ? Store.current.mapBounds && Store.current.mapBounds.intersects(datasource.limitedBounds)
            : true;

          if (fetchedTime && isInBounds) {
            this.setState({ fetchingAlternativeDatasourceInfo: false });
            const result = {
              activeLayer: datasource,
              datasource: datasource.name,
              time: fetchedTime,
              preset: Store.current.presets[datasource.name][0].id,
            };
            Store.setSelectedResult(result);
          } else {
            this.setState({ fetchingAlternativeDatasourceInfo: false });
            this.displayNoSiblingDateWarning(datasource, time);
          }
        })
        .catch(e => {
          this.setState({ fetchingAlternativeDatasourceInfo: false });
          this.displayNoSiblingDateWarning(datasource, time);
          console.error('Error getting dates for ' + datasource.name, e);
        });
    } else {
      this.displayNoSiblingDateWarning(datasource, time);
    }
  };

  displayNoSiblingDateWarning = (datasource, time) => {
    const reason = this.checkSiblingAvailability(datasource, time)
      ? 'No ' + datasource.name + ' tiles found on ' + time + ' for the current view.'
      : datasource.minDate && datasource.maxDate
        ? datasource.name + ' is available from ' + datasource.minDate + ' to ' + datasource.maxDate + '.'
        : datasource.minDate && !datasource.maxDate
          ? datasource.name + ' is available from ' + datasource.minDate + ' onward.'
          : !datasource.minDate && datasource.maxDate
            ? datasource.name + ' is available to ' + datasource.maxDate + '.'
            : datasource.name + " isn't available.";

    const modalDialogId = 'noSiblingDate-warning';
    Store.addModalDialog(
      modalDialogId,
      <Rodal
        animation="slideUp"
        visible={true}
        width={400}
        height={130}
        onClose={() => Store.removeModalDialog(modalDialogId)}
        closeOnEsc={true}
      >
        <div>
          <h3>No tile found</h3>
          {reason}
          <br />
          Try other {datasource.name} tiles or use the search form to get other dates.
        </div>
      </Rodal>,
    );
  };

  activateResult = preset => {
    Store.setPreset(preset);
    this.setState({ showEffects: false });
  };

  render() {
    const { showEffects } = this.state;

    const {
      channels,
      presets,
      selectedResult: { datasource: datasourceName, preset, userId },
      views,
      currView,
      zoom,
    } = this.props;
    const dsLayers = presets[datasourceName];
    let datasource = DATASOURCES.find(ds => ds.name === datasourceName);
    if (!datasource) {
      datasource = Store.current.instances.find(inst => inst.name === datasourceName);
    }

    const { minZoom, maxZoom, allowOverZoomBy } = getZoomLimitsForSelectedLayer();
    const maxZoomWithOverZoom = maxZoom + allowOverZoomBy;
    const dsChannels = channels[datasourceName];
    const mapZoom = Number(zoom);
    const supportsCustom = datasource.customLayer !== false;
    return (
      <div>
        {this.getTileInfo()}
        {showEffects ? (
          <EffectsPanel />
        ) : (
          <LayerDatasourcePicker
            userId={userId}
            activePreset={preset}
            channels={dsChannels}
            supportsCustom={supportsCustom}
            isCustomSelected={supportsCustom && isCustomPreset(preset) && currView !== views.PRESETS}
            presets={dsLayers}
            onActivate={this.activateResult}
          />
        )}
        {mapZoom < minZoom && <NotificationPanel msg="Zoom in to view data" type="info" />}
        {mapZoom > maxZoomWithOverZoom && <NotificationPanel msg="Zoom out to view data" type="info" />}

        {moment.utc().isBefore(moment('2018-07-05')) && (
          // feel free to remove this code after 2018-07-05:
          <OneTimeNotification
            confirmationId="user-knows-download"
            msg={
              <div>
                <div
                  style={{
                    float: 'left',
                  }}
                >
                  <i className="fa fa-exclamation-circle" />
                </div>
                <div
                  style={{
                    marginLeft: 30,
                  }}
                >
                  <span>
                    Looking for download or timelapse buttons? We've moved them to the map - look for &nbsp;<i className="fa fa-file-image-o" />&nbsp;
                    and &nbsp;<i className="fa fa-film" />&nbsp; icons on your right.
                  </span>
                </div>
              </div>
            }
          />
        )}
      </div>
    );
  }
}

export default connect(s => s)(Visualization);
