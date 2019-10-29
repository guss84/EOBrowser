import React from 'react';
import Store from '../store';
import { connect } from 'react-redux';
import 'react-toggle/style.css';
import RCSlider from 'rc-slider';
import { NotificationPanel } from 'eo-components';
import { checkIfFisLayer } from '../utils/utils';

const ATM_FILTERS = {
  null: 'None',
  DOS1: 'DOS1',
  ATMCOR: 'Statistical',
};
class EffectsPanel extends React.Component {
  constructor(props) {
    super(props);

    const {
      gainOverride = 1,
      gammaOverride = 1,
      redRangeOverride = [0, 1],
      greenRangeOverride = [0, 1],
      blueRangeOverride = [0, 1],
      valueRangeOverride = [-1.2, 0.7],
    } = Store.current.selectedResult;

    // valueRangeOverride slider should be similar to Gamma/Gain slider (not linear)

    this.state = {
      atmFilterValues: Object.keys(ATM_FILTERS).map(key => ({
        value: key,
        text: ATM_FILTERS[key],
      })),

      gainOverride: this.logToLinear(gainOverride, 0.01, 100),
      gainOverrideLabels: gainOverride,
      gammaOverride: this.logToLinear(gammaOverride, 0.1, 10),
      gammaOverrideLabels: gammaOverride,

      redRangeOverride: redRangeOverride,
      redRangeOverrideLabels: redRangeOverride,
      greenRangeOverride: greenRangeOverride,
      greenRangeOverrideLabels: greenRangeOverride,
      blueRangeOverride: blueRangeOverride,
      blueRangeOverrideLabels: blueRangeOverride,

      valueRangeOverride: valueRangeOverride,
      valueRangeOverrideLabels: valueRangeOverride,
    };
  }

  getDefaultState = () => ({
    gainOverride: this.logToLinear(1, 0.01, 100),
    gainOverrideLabels: 1,
    gammaOverride: this.logToLinear(1, 0.1, 10),
    gammaOverrideLabels: 1,

    redRangeOverride: [0, 1],
    redRangeOverrideLabels: [0, 1],
    greenRangeOverride: [0, 1],
    greenRangeOverrideLabels: [0, 1],
    blueRangeOverride: [0, 1],
    blueRangeOverrideLabels: [0, 1],

    valueRangeOverride: [-1.2, 0.7],
    valueRangeOverrideLabels: [-1.2, 0.7],
  });

  logToLinear = (e, min, max) => {
    return (Math.log(e) - Math.log(min)) / (Math.log(max) - Math.log(min)) * max;
  };

  calcLog = (e, min, max) => {
    const pos = e / max;
    const value = min * Math.exp(pos * Math.log(max / min));
    return value.toFixed(1);
  };

  updateAtmFilter = e => {
    Store.setAtmFilter(e.target.value);
  };

  updateGainOverride = () => {
    Store.setGainOverride(this.state.gainOverrideLabels);
  };
  updateGammaOverride = () => {
    Store.setGammaOverride(this.state.gammaOverrideLabels);
  };
  updateRedRangeOverride = () => {
    checkIfFisLayer()
      ? Store.setRedRangeOverride(undefined)
      : Store.setRedRangeOverride(this.state.redRangeOverrideLabels);
  };
  updateGreenRangeOverride = () => {
    checkIfFisLayer()
      ? Store.setGreenRangeOverride(undefined)
      : Store.setGreenRangeOverride(this.state.greenRangeOverrideLabels);
  };
  updateBlueRangeOverride = () => {
    checkIfFisLayer()
      ? Store.setBlueRangeOverride(undefined)
      : Store.setBlueRangeOverride(this.state.blueRangeOverrideLabels);
  };

  updateValueRangeOverride = () => {
    checkIfFisLayer()
      ? Store.setValueRangeOverride(this.state.valueRangeOverrideLabels)
      : Store.setValueRangeOverride(undefined);
  };

  changeGainOverride = e => {
    this.setState({
      gainOverride: e,
      gainOverrideLabels: this.calcLog(e, 0.01, 100),
    });
  };
  changeGammaOverride = e => {
    this.setState({
      gammaOverride: e,
      gammaOverrideLabels: this.calcLog(e, 0.1, 10),
    });
  };
  changeRedRangeOverride = e => {
    this.setState({
      redRangeOverride: e,
      redRangeOverrideLabels: e,
    });
  };
  changeGreenRangeOverride = e => {
    this.setState({
      greenRangeOverride: e,
      greenRangeOverrideLabels: e,
    });
  };
  changeBlueRangeOverride = e => {
    this.setState({
      blueRangeOverride: e,
      blueRangeOverrideLabels: e,
    });
  };

  changeValueRangeOverride = e => {
    this.setState({
      valueRangeOverride: e,
      valueRangeOverrideLabels: e,
    });
  };

  resetAll = () => {
    this.setState({ ...this.getDefaultState() }, () => {
      Store.setAtmFilter('none');
      this.updateGammaOverride();
      this.updateGainOverride();
      this.updateRedRangeOverride();
      this.updateGreenRangeOverride();
      this.updateBlueRangeOverride();
      // TODO: value manipulation
      // this.updateValueRangeOverride();
    });
  };

  renderAtmosphericCorrectionDropdown() {
    const { atmFilter } = Store.current.selectedResult;
    const { atmFilterValues } = this.state;
    return (
      <label>
        <span>Atmospheric correction</span>
        <div className="gainSlider">
          <select value={atmFilter} onChange={this.updateAtmFilter}>
            {atmFilterValues.map(obj => (
              <option value={obj.value} key={obj.value}>
                {obj.text}
              </option>
            ))}
          </select>
        </div>
      </label>
    );
  }

  renderGainSlider() {
    return (
      <label>
        <span>Gain</span>
        <div className="gainSlider">
          <RCSlider
            min={0.01}
            max={100}
            step={0.1}
            value={this.state.gainOverride}
            onChange={this.changeGainOverride}
            onAfterChange={this.updateGainOverride}
          />
          <span>{this.state.gainOverrideLabels}</span>
        </div>
      </label>
    );
  }

  renderGammaSlider() {
    return (
      <label>
        <span>Gamma</span>
        <div className="gainSlider">
          <RCSlider
            min={0.1}
            max={10}
            step={0.1}
            value={this.state.gammaOverride}
            onChange={this.changeGammaOverride}
            onAfterChange={this.updateGammaOverride}
          />
          <span>{this.state.gammaOverrideLabels}</span>
        </div>
      </label>
    );
  }

  renderColorSliders() {
    return (
      <div>
        <label>
          <span>R</span>
          <div className="gainSlider">
            <span>{this.state.redRangeOverrideLabels[0]}</span>
            <RCSlider.Range
              min={0}
              max={1}
              step={0.001}
              value={this.state.redRangeOverride}
              onChange={this.changeRedRangeOverride}
              onAfterChange={this.updateRedRangeOverride}
              allowCross={false}
            />
            <span>{this.state.redRangeOverrideLabels[1]}</span>
          </div>
        </label>

        <label>
          <span>G</span>
          <div className="gainSlider">
            <span>{this.state.greenRangeOverrideLabels[0]}</span>
            <RCSlider.Range
              min={0}
              max={1}
              step={0.001}
              value={this.state.greenRangeOverride}
              onChange={this.changeGreenRangeOverride}
              onAfterChange={this.updateGreenRangeOverride}
              allowCross={false}
            />
            <span>{this.state.greenRangeOverrideLabels[1]}</span>
          </div>
        </label>

        <label>
          <span>B</span>
          <div className="gainSlider">
            <span>{this.state.blueRangeOverrideLabels[0]}</span>
            <RCSlider.Range
              min={0}
              max={1}
              step={0.001}
              value={this.state.blueRangeOverride}
              onChange={this.changeBlueRangeOverride}
              onAfterChange={this.updateBlueRangeOverride}
              allowCross={false}
            />
            <span>{this.state.blueRangeOverrideLabels[1]}</span>
          </div>
        </label>
      </div>
    );
  }

  renderValueSlider() {
    return (
      <label>
        <span>Value</span>
        <div className="gainSlider">
          <span>{this.state.valueRangeOverrideLabels[0]}</span>
          <RCSlider.Range
            min={-1.2}
            max={0.7}
            step={0.001}
            value={this.state.valueRangeOverride}
            onChange={this.changeValueRangeOverride}
            onAfterChange={this.updateValueRangeOverride}
            allowCross={false}
          />
          <span>{this.state.valueRangeOverrideLabels[1]}</span>
        </div>
      </label>
    );
  }

  render() {
    const { datasource } = Store.current.selectedResult;
    return (
      <div className="effectsPanel">
        <div style={{ marginBottom: 10, textAlign: 'right' }}>
          <a onClick={this.resetAll}>
            <i className="fa fa-undo" /> Reset all
          </a>
        </div>

        {datasource.includes('Sentinel-2') && this.renderAtmosphericCorrectionDropdown()}

        {this.renderGainSlider()}
        {this.renderGammaSlider()}

        {checkIfFisLayer() ? (
          // TODO: value manipulation
          <label /> // this.renderValueSlider() // use RAW values
        ) : (
          this.renderColorSliders() // use RGB channels
        )}

        <NotificationPanel msg="Effects are disabled for some preconfigured products" type="warning" />
      </div>
    );
  }
}
export default connect(store => store)(EffectsPanel);
