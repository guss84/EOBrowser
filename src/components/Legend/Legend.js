import React from 'react';

import './Legend.scss';
import axios, { CancelToken, isCancel } from 'axios';
import { createGradients } from '../../utils/legendUtils';

/*
Generates legends by using url pointing to legend's json definition
*/
export class LegendFromDefinitionJson extends React.Component {
  static defaultProps = {
    legendDefinitionJsonUrl: null,
  };
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      legend: null,
      error: null,
    };
    this.cancelTokenSource = CancelToken.source();
  }

  loadLegendDefinition(url) {
    const newPromise = new Promise((resolve, reject) => {
      axios(url, {
        cancelToken: this.cancelTokenSource.token,
      })
        .then(res => resolve({ legend: res.data }))
        .catch(e => reject(e));
    });
    return newPromise;
  }

  componentDidMount() {
    let { legendDefinitionJsonUrl } = this.props;
    this.setState({
      loading: true,
    });

    this.loadLegendDefinition(legendDefinitionJsonUrl)
      .then(legend => this.setState({ legend, loading: false }))
      .catch(error => {
        if (!isCancel(error)) {
          this.setState({ error, loading: false });
        }
      });
  }

  componentWillUnmount() {
    if (this.state.loading) {
      this.cancelTokenSource.cancel('Operation cancelled by user.');
    }
  }

  render() {
    const { loading, legend, error } = this.state;
    if (loading) {
      return (
        <div className="legend">
          <i className="fa fa-spinner fa-spin fa-fw" />
        </div>
      );
    }
    if (error) {
      return <p>Error while loading legend data.</p>;
    }
    if (legend) {
      return <LegendFromSpec legendSpec={legend} />;
    }
    return null;
  }
}
/*
Generates legend by using url to standard getLegendGraphics request or 
any other image  
*/
export class LegendFromGraphicsUrl extends React.Component {
  static defaultProps = {
    legendUrl: null,
    handleError: null,
  };
  constructor(props) {
    super(props);
    this.state = {
      error: false,
      loading: true,
    };
  }
  handleError = () => {
    this.setState({ error: true, loading: false });
    this.props.hideLegend();
  };

  render() {
    if (this.state.error) return null;

    return (
      <div className="legend">
        {this.state.loading && <i className="fa fa-spinner fa-spin fa-fw" />}
        <img
          src={this.props.legendUrl}
          alt="legend"
          onError={this.handleError}
          onLoad={() => {
            this.setState({ loading: false });
          }}
        />
      </div>
    );
  }
}

/*
Generates legend specified in legends.json file
*/
export class LegendFromSpec extends React.Component {
  static defaultProps = {
    spec: null,
  };

  renderDiscreteLegendItem(legendItem, index) {
    return (
      <div key={index} className="legend-item discrete">
        <div
          className="color"
          style={{
            backgroundColor: legendItem.color,
          }}
        />

        <label>{legendItem.label}</label>
      </div>
    );
  }

  renderContinuousLegend(legend) {
    const { minPosition, maxPosition, gradients } = createGradients(legend);

    return (
      <div className="legend-item continuous">
        <div className="gradients">
          {gradients.map((g, index) => (
            <div
              key={index}
              className="gradient"
              style={{
                bottom: `${g.pos * 100}%`,
                height: `${g.size * 100}%`,
                background: `linear-gradient(to top, ${g.startColor}, ${g.endColor})`,
              }}
            />
          ))}
        </div>
        <div className="ticks">
          {legend.gradients.filter(g => g.label !== undefined && g.label !== null).map((g, index) => (
            <label
              key={index}
              className="tick"
              style={{
                bottom: `${((g.position - minPosition) / (maxPosition - minPosition) * 100).toFixed(1)}%`,
              }}
            >
              {g.label}
            </label>
          ))}
        </div>
      </div>
    );
  }

  render() {
    if (!this.props.legendSpec) {
      return null;
    }
    try {
      let legend;
      if (this.props.legendSpec) {
        const { items, gradients } = this.props.legendSpec.legend;
        if (gradients) {
          legend = <div className="legend">{this.renderContinuousLegend(this.props.legendSpec.legend)}</div>;
        }

        if (items) {
          legend = (
            <div className="legend">
              {items.map((legendItem, index) => this.renderDiscreteLegendItem(legendItem, index))}
            </div>
          );
        }
      }
      return legend;
    } catch (err) {
      console.error(err);
      return <div>Error parsing legend data.</div>;
    }
  }
}
