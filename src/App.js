import React, { Component } from 'react';
import { connect } from 'react-redux';
import AlertContainer from 'react-alert';
import Rodal from 'rodal';
import { LocationSearchBox } from 'eo-components';
import 'rodal/lib/rodal.css';
import RootMap from './components/RootMap';
import Tools from './components/Tools';
import { loadGetCapabilitiesAndSaveLayers, reflect, loadInstances } from './utils/ajax';
import { checkAuthState } from './utils/auth';
import { getPolyfill } from './utils/polyfills';
import { fetchThemes } from './utils/ajax';

import { NotificationPanel } from 'eo-components';
import Store from './store';
import DEFAULT_THEMES from './default_themes.json';

import './App.scss';
class App extends Component {
  alertOptions = {
    offset: 14,
    position: 'bottom left',
    theme: 'dark',
    time: 5000,
    transition: 'scale',
  };

  constructor(props) {
    super(props);
    this.state = {
      isLoaded: false,
      toolsVisible: window.innerWidth > 900,
      newLocation: false,
      isCompare: false,
      user: {},
      themes: null,
    };
    getPolyfill();
    checkAuthState();
  }

  componentDidMount() {
    this.initAppStateFromParams();
    this.fetchLayers();
    this.updateMapViewFromURL();
  }

  initAppStateFromParams = () => {
    const { datasource, themesUrl } = this.getUrlParams();

    if (datasource) {
      const instance = Store.current.instances.find(inst => inst.name === datasource);
      loadGetCapabilitiesAndSaveLayers(instance).then(() => {
        this.handleNewHash();
      });
    }

    if (themesUrl) {
      fetchThemes(themesUrl)
        .then(res => {
          this.setState({
            themes: res.data,
          });
          Store.setThemesUrl(themesUrl);
        })
        .catch(e => {
          console.error(e);
          this.setState({
            themes: DEFAULT_THEMES,
          });
          App.displayErrorMessage(
            'Error loading specified theme, see console for more info (common causes: ad blockers, network errors). Using default themes instead.',
          );
        });
    } else {
      this.setState({
        themes: DEFAULT_THEMES,
      });
    }
  };

  fetchLayers() {
    let promises = [];
    Store.current.instances.forEach(instance => {
      promises.push(loadGetCapabilitiesAndSaveLayers(instance));
    });
    Promise.all(promises.map(reflect))
      .then(obj => {
        const okInstances = obj.filter(x => x.success);
        const insts = Store.current.instances.filter(inst =>
          okInstances.find(inst2 => inst2.name === inst.data),
        );
        this.setState({ isLoaded: true, isModal: false });
        Store.setInstances(insts);
      })
      .catch(e => {
        this.setState({ isLoaded: true, isModal: false });
        App.displayErrorMessage(`An error occured: ${e.message}`);
      });
    Promise.race(promises).then(instName => {
      this.setState({ isLoaded: true, isModal: false });
    });
  }

  static displayErrorMessage(errMsg) {
    const modalDialogId = `error-message-${errMsg}`;
    Store.addModalDialog(
      modalDialogId,
      <Rodal
        animation="slideUp"
        visible={true}
        width={500}
        height={100}
        onClose={() => Store.removeModalDialog(modalDialogId)}
        closeOnEsc={true}
      >
        <NotificationPanel msg={errMsg} type="error" />
      </Rodal>,
    );
  }

  setMapLocation = data => {
    const [lng, lat] = data.location;
    Store.setMapView({ lat, lng, update: true });
  };

  onFinishSearch = res => {
    this._map.refs.wrappedInstance.clearPolygons();
    if (res === undefined || res.length === 0) {
      return;
    }
    this._map.refs.wrappedInstance.showPolygons(res);
    this.setState({ newLocation: false });
  };

  updateMapViewFromURL = () => {
    const { lat, lng, zoom } = this.getUrlParams();
    if (lat || lng) {
      const location = {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        zoom: parseInt(zoom, 10),
      };
      Store.setMapView({ ...location, update: true });
    }
  };

  getUrlParams() {
    const hasSearch = window.location.href.includes('?');
    const path = hasSearch
      ? window.location.search.replace(/^[?]/, '')
      : window.location.hash.replace(/^[#]/, '');

    const params = path.split('&');
    const paramMap = {};
    params.forEach(kv => {
      const [key, value] = kv.split('=');
      return (paramMap[key] = window.decodeURIComponent(value));
    });
    return paramMap;
  }

  handleNewHash = async () => {
    const {
      instanceId,
      datasource,
      preset,
      time,
      evalscript = '',
      evalscripturl = '',
      gainOverride,
      gammaOverride,
      redRangeOverride,
      greenRangeOverride,
      blueRangeOverride,
      valueRangeOverride,
      atmFilter,
      layers,
    } = this.getUrlParams();
    const parsedLayers = preset === 'CUSTOM' ? this.parseLayers(layers) : preset;
    const selectedResult = {
      datasource,
      preset,
      time,
      evalscript: window.decodeURIComponent(evalscript),
      evalscripturl,
      gainOverride: gainOverride ? parseFloat(gainOverride) : undefined,
      gammaOverride: gammaOverride ? parseFloat(gammaOverride) : undefined,
      redRangeOverride: redRangeOverride ? JSON.parse(redRangeOverride) : undefined,
      greenRangeOverride: greenRangeOverride ? JSON.parse(greenRangeOverride) : undefined,
      blueRangeOverride: blueRangeOverride ? JSON.parse(blueRangeOverride) : undefined,
      valueRangeOverride: valueRangeOverride ? JSON.parse(valueRangeOverride) : undefined,
      atmFilter,
      layers: parsedLayers,
    };
    const instance = Store.current.instances.find(inst => inst.name === datasource);
    let location = {};
    if (instance) {
      Store.setTabIndex(2);
      Store.setSelectedResult({
        activeLayer: instance,
        ...instance,
        ...selectedResult,
        ...location,
      });
    } else if (instanceId) {
      try {
        const userInstances = await loadInstances();
        const selectedInstance = userInstances.find(inst => inst['@id'] === instanceId);
        if (!selectedInstance) {
          App.displayErrorMessage("You don't have access to this instance.");
          return;
        }
        await loadGetCapabilitiesAndSaveLayers(selectedInstance);
        Store.setTabIndex(2);
        Store.setDatasources([selectedInstance.name]);
        Store.setSelectedResult({
          activeLayer: selectedInstance,
          ...selectedResult,
          datasource: selectedInstance.name,
          ...location,
        });
      } catch (e) {
        App.displayErrorMessage("You don't have access to this instance.");
      }
    }
  };

  parseLayers(value) {
    if (!value) return null;
    const [r, g, b] = value.split(','),
      layers = { r, g, b };
    return layers;
  }

  onHoverTile = i => {
    this._map.refs.wrappedInstance.highlightTile(i);
  };
  onOpacityChange = (opacity, index) => {
    Store.setPinProperty(index, 'opacity', opacity);
    this._map.refs.wrappedInstance.setOverlayParams(opacity, index);
  };
  pinOrderChange = (oldIndex, newIndex) => {
    this._map.refs.wrappedInstance.changeCompareOrder(oldIndex, newIndex);
  };
  onClearData = () => {
    this._map.refs.wrappedInstance.clearPolygons();
  };

  hideTools = () => {
    this.setState({ toolsVisible: false });
  };
  showTools = () => {
    this.setState({ toolsVisible: true });
  };

  renderTools() {
    return (
      <div
        style={{
          display: this.state.toolsVisible ? 'block' : 'none',
        }}
      >
        <Tools
          onFinishSearch={this.onFinishSearch}
          onHoverTile={this.onHoverTile}
          onClearData={this.onClearData}
          onOpacityChange={this.onOpacityChange}
          pinOrderChange={this.pinOrderChange}
          onCollapse={this.hideTools}
          themes={this.state.themes}
        />
      </div>
    );
  }

  render() {
    if (!this.state.isLoaded) {
      return (
        <div id="loading">
          <i className="fa fa-cog fa-spin fa-3x fa-fw" />Loading ...{' '}
        </div>
      );
    }

    return (
      <div className="eocloudRoot">
        <AlertContainer ref={a => (this.msg = a)} {...this.alertOptions} />

        <RootMap
          ref={e => {
            this._map = e;
          }}
          location={this.state.location}
          mapId="mapId"
        />

        <div id="Controls">
          <div id="ControlsContent">
            <div className="pull-right shadow">
              <LocationSearchBox
                googleAccessToken={process.env.REACT_APP_GOOGLE_API_KEY}
                placeholder="Go to Place"
                minChar={4}
                onSelect={this.setMapLocation}
              />
            </div>
          </div>
        </div>

        {this.renderTools()}

        {!this.state.toolsVisible && (
          <a className="toggleSettings" onClick={this.showTools}>
            <i className="fa fa-bars" />
          </a>
        )}

        {this.props.modalDialogs.map(tc => (
          <div key={tc.id} className="modalDialog">
            {tc.component}
          </div>
        ))}
      </div>
    );
  }
}

export default connect(store => store)(App);
