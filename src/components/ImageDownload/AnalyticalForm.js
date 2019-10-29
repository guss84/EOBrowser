import React from 'react';
import Toggle from 'react-toggle';

import App from '../../App';
import { RESOLUTION_DIVISORS, AVAILABLE_CRS } from './ImageDownloadPanel';
import { IMAGE_FORMATS } from '../../store/config';

export default class AnalyticalForm extends React.PureComponent {
  CAPTIONS_TITLE = 'File will have logo attached.';

  render() {
    const {
      imageFormat,
      downloadLayers,
      isIPT,
      resolutionDivisor,
      selectedCrs,
      mPresets,
      mChannels,
      showLogo,
      renderImageSize,
      updateFormData,
      renderCRSResolution,
      updateLayer,
    } = this.props;
    return (
      <div className="analyticalMode opened">
        <div className="formField">
          <label title={this.CAPTIONS_TITLE}>
            Show logo
            <i
              className="fa fa-question-circle"
              onClick={ev => {
                App.displayErrorMessage(this.CAPTIONS_TITLE);
              }}
            />
          </label>
          <div className="form-input">
            <Toggle checked={showLogo} icons={false} onChange={() => updateFormData('showLogo', !showLogo)} />
          </div>
        </div>
        <div className="row">
          <label>Image format:</label>
          <select value={imageFormat} onChange={e => updateFormData('imageFormat', e.target.value)}>
            {IMAGE_FORMATS.filter(imf => (isIPT ? !imf.value.includes('application') : imf)).map(obj => (
              <option key={obj.text} data-ext={obj.ext} value={obj.value}>
                {obj.text}
              </option>
            ))}
          </select>
        </div>
        <div className="row">
          <label>Image resolution:</label>
          <div>
            <select
              style={{ width: '100%' }}
              value={resolutionDivisor}
              onChange={ev => updateFormData('resolutionDivisor', ev.target.value)}
            >
              {RESOLUTION_DIVISORS.map(r => (
                <option key={r.text} value={r.value}>
                  {r.text}
                </option>
              ))}
            </select>
            <small>{renderImageSize(resolutionDivisor)}</small>
          </div>
        </div>
        <div className="row">
          <label>Coordinate system:</label>
          <div>
            <select
              style={{ width: '100%' }}
              value={selectedCrs}
              onChange={ev => updateFormData('selectedCrs', ev.target.value)}
            >
              {AVAILABLE_CRS.map(obj => (
                <option key={obj.text} value={obj.value}>
                  {obj.text}
                </option>
              ))}
            </select>
            <small>{renderCRSResolution(resolutionDivisor, selectedCrs)}</small>
          </div>
        </div>
        <div className="row">
          <label>Layers:</label>
          <div className="downloadLayers">
            <div className="column">
              <span className="layerTitle">Visualized</span>
              {mPresets.map(l => {
                const { text, value } = l;
                return (
                  <label key={text}>
                    <input
                      type="checkbox"
                      checked={!!downloadLayers[value]}
                      onChange={e => updateLayer(value, e.target.checked)}
                    />
                    {text}
                  </label>
                );
              })}
            </div>
            <div className="column">
              <span className="layerTitle">Raw</span>
              {mChannels.map(l => {
                const { text, value } = l;
                return (
                  <label key={text}>
                    <input
                      type="checkbox"
                      checked={!!downloadLayers[value]}
                      onChange={e => updateLayer(value, e.target.checked)}
                    />
                    {text}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
