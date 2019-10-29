import React from 'react';
import AdvancedHolder from './advanced/AdvancedHolder';
import WMSImage from './WMSImage';
import { isCustomPreset } from '../utils/utils';
import { LegendFromSpec, LegendFromDefinitionJson, LegendFromGraphicsUrl } from './Legend/Legend';
import Store from '../store';
import axios from 'axios';
import { findMatchingLegendSpec } from '../utils/legendUtils';
const GETLEGEND_CACHE = {};

/*
check if legend url exists and returns image
*/
const checkLegendUrl = url => {
  if (GETLEGEND_CACHE[url]) {
    return GETLEGEND_CACHE[url];
  }

  const newPromise = new Promise((resolve, reject) => {
    axios
      .get(url)
      .then(res => {
        if (res.headers['content-type'].indexOf('image') > -1) {
          resolve();
        } else {
          reject();
        }
      })
      .catch(e => {
        reject(e);
      });
  });
  GETLEGEND_CACHE[url] = newPromise;
  return newPromise;
};

class LayerPicker extends React.Component {
  handleToggleDetails = ev => {
    ev.preventDefault();
    this.props.onToggleDetails();
  };

  constructor(props) {
    super(props);
    this.state = { shouldRenderLegend: false };
  }

  hideLegend = () => {
    this.setState({
      shouldRenderLegend: false,
    });
  };

  setShouldRenderLegend = hasLegend => {
    this.setState({
      shouldRenderLegend: hasLegend,
    });
  };

  componentDidMount() {
    let hasLegendSpec = findMatchingLegendSpec(this.props.datasourceId, this.props.id) !== undefined;
    if (hasLegendSpec || this.props.legendDefinitionJsonUrl) {
      this.setShouldRenderLegend(true);
    } else {
      this.props.legendUrl &&
        checkLegendUrl(this.props.legendUrl)
          .then(res => this.setShouldRenderLegend(true))
          .catch(err => this.setShouldRenderLegend(false));
    }
  }
  render() {
    const {
      id,
      name,
      description,
      isActive,
      thumbnail,
      showDetails,
      legendUrl,
      legendDefinitionJsonUrl,
    } = this.props;
    const legendSpec = findMatchingLegendSpec(this.props.datasourceId, this.props.id);
    const { shouldRenderLegend } = this.state;
    return (
      <div>
        <a
          onClick={() => {
            if (!isActive) {
              this.props.onActivate(id);
            }
          }}
          className={isActive ? 'active' : ''}
        >
          <WMSImage alt={name} src={thumbnail} />
          {isActive &&
            shouldRenderLegend && (
              <i
                className={`fa fa-angle-double-down ${showDetails ? 'show' : ''}`}
                onClick={this.handleToggleDetails}
              />
            )}
          {name}
          <small>{description}</small>
        </a>
        {isActive &&
          showDetails &&
          shouldRenderLegend &&
          (legendSpec ? (
            <LegendFromSpec legendSpec={legendSpec} />
          ) : legendDefinitionJsonUrl ? (
            <LegendFromDefinitionJson legendDefinitionJsonUrl={legendDefinitionJsonUrl} />
          ) : (
            legendUrl && <LegendFromGraphicsUrl legendUrl={legendUrl} hideLegend={this.hideLegend} />
          ))}
      </div>
    );
  }
}

class LayerDatasourcePicker extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showDetails: false,
    };
  }

  toggleDetails = () => {
    this.setState(oldState => ({
      showDetails: !oldState.showDetails,
    }));
  };

  renderSimpleHolder() {
    const { presets = [], channels = [], activePreset, userId, supportsCustom, onActivate } = this.props;
    // legendUrl is in presets[i].legendUrl;

    // const datasource = DATASOURCES.find(ds => ds.name === Store.current.selectedResult.datasource);
    // This doesn't work for custom instances.
    // Custom instances are available in Store.current.instances
    const datasource = Store.current.instances.find(
      ds => ds.name === Store.current.selectedResult.datasource,
    );
    const datasourceId = datasource.id;
    return (
      <div className="layerDatasourcePicker">
        {supportsCustom &&
          channels.length > 0 && (
            <a
              key={0}
              onClick={() => {
                onActivate('CUSTOM');
              }}
              className={isCustomPreset(activePreset) ? 'active' : ''}
            >
              <i className="icon fa fa-paint-brush" />Custom<small>Create custom rendering</small>
            </a>
          )}

        {presets.map((preset, i) => (
          <LayerPicker
            key={`${datasourceId}-${preset.id}`}
            id={preset.id}
            name={preset.name}
            description={preset.description}
            isActive={preset.id === activePreset}
            thumbnail={userId ? preset.image : `images/presets/${preset.id}.jpg`}
            showDetails={this.state.showDetails}
            legendSpec={preset.legend || null}
            onActivate={onActivate}
            onToggleDetails={this.toggleDetails}
            datasourceId={datasourceId}
            legendUrl={presets[i].legendUrl}
            legendDefinitionUrl={presets[i].legendDefinitionUrl}
            legendDefinitionJsonUrl={presets[i].legendDefinitionJsonUrl}
          />
        ))}
      </div>
    );
  }

  render() {
    let { isCustomSelected } = this.props;
    return <div>{isCustomSelected ? <AdvancedHolder /> : this.renderSimpleHolder()}</div>;
  }
}

export default LayerDatasourcePicker;
