import React from 'react';
import { connect } from 'react-redux';
import { BandsToRGB, GroupedBandsToRGB } from 'eo-components';

import Store from '../../store';
import CodeMirror from './CodeMirror';
import { b64EncodeUnicode, b64DecodeUnicode } from '../../utils/utils';

import './advanced.scss';

const ToggleModeButton = ({ isScript, onToggle }) => (
  <a className={'toggleBandMode' + (isScript ? ' script' : '')} onClick={() => onToggle(!isScript)}>
    <i className="fa fa-hand-paper-o" />
    <i className="fa fa-code script" />
  </a>
);

class AdvancedHolder extends React.Component {
  isScriptView = () => {
    return this.props.currView === this.props.views.SCRIPT;
  };

  toggleMode = isBand => {
    let { views } = this.props;
    Store.setCurrentView(isBand ? views.BANDS : views.SCRIPT);
  };

  updateScript = state => {
    const { isEvalUrl, evalscript, evalscripturl } = state;
    Store.setEvalScript(b64EncodeUnicode(evalscript));
    Store.setEvalUrl(window.encodeURIComponent(evalscripturl));
    Store.setEvalMode(isEvalUrl);
  };

  onBack = () => {
    Store.setCurrentView(this.props.views.PRESETS);
  };

  render() {
    const {
      channels,
      selectedResult: { layers, evalscript, evalscripturl, datasource, activeLayer: activeDatasource },
      currView,
      isEvalUrl,
      style,
      views,
    } = this.props;
    const dsChannels = channels[datasource];
    const isScript = currView === views.SCRIPT;
    const groupedChannels =
      activeDatasource && activeDatasource.groupChannels ? activeDatasource.groupChannels(dsChannels) : null;

    return layers && dsChannels ? (
      <div className="advancedPanel" style={style}>
        <header>
          <a onClick={this.onBack} className="btn secondary">
            <i className="fa fa-arrow-left" />Back
          </a>
          <ToggleModeButton isScript={isScript} onToggle={() => this.toggleMode(isScript)} />
        </header>
        {isScript ? (
          <CodeMirror
            evalscript={b64DecodeUnicode(evalscript)}
            evalscripturl={window.decodeURIComponent(evalscripturl || '')}
            isEvalUrl={isEvalUrl}
            onRefresh={() => Store.refresh()}
            onLoad={this.updateScript}
            onChange={this.updateScript}
          />
        ) : groupedChannels ? (
          <GroupedBandsToRGB
            groupedBands={groupedChannels}
            value={layers}
            onChange={value => Store.setLayers(value)}
          />
        ) : (
          <BandsToRGB bands={dsChannels} value={layers} onChange={value => Store.setLayers(value)} />
        )}
      </div>
    ) : (
      <div />
    );
  }
}

export default connect(s => s)(AdvancedHolder);
