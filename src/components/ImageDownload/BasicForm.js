import React from 'react';
import Toggle from 'react-toggle';

import App from '../../App';

export default class BasicForm extends React.Component {
  OVERLAY_TITLE = "The map's overlay layers(place labels, streets and political boundaries) will be added to the image.";
  CAPTIONS_TITLE = 'Exported image(s) will include datasource and date, zoom scale and branding';
  DESCRIPTION_TITLE = 'Add a short description to the exported image';

  render() {
    const {
      showCaptions,
      updateFormData,
      addMapOverlays,
      showLegend,
      userDescription,
      hasLegendData,
      addingMapOverlaysPossible,
    } = this.props;
    return (
      <div>
        <div className="formField">
          <label title={this.CAPTIONS_TITLE}>
            Show captions
            <i
              className="fa fa-question-circle"
              onClick={ev => {
                App.displayErrorMessage(this.CAPTIONS_TITLE);
              }}
            />
          </label>
          <div className="form-input">
            <Toggle
              checked={showCaptions}
              icons={false}
              onChange={() => updateFormData('showCaptions', !showCaptions)}
            />
          </div>
        </div>
        {addingMapOverlaysPossible && (
          <div className="formField">
            <label title={this.OVERLAY_TITLE}>
              Add map overlays
              <i
                className="fa fa-question-circle"
                onClick={ev => {
                  App.displayErrorMessage(this.OVERLAY_TITLE);
                }}
              />
            </label>
            <div className="form-input">
              <Toggle
                checked={addMapOverlays}
                icons={false}
                onChange={() => updateFormData('addMapOverlays', !addMapOverlays)}
              />
            </div>
          </div>
        )}
        {hasLegendData && (
          <div className="formField">
            <label title="Show legend">
              Show legend
              <i
                className="fa fa-question-circle"
                onClick={ev => {
                  App.displayErrorMessage('Exported image will include legend');
                }}
              />
            </label>
            <div className="form-input">
              <Toggle
                checked={showLegend}
                icons={false}
                onChange={() => updateFormData('showLegend', !showLegend)}
              />
            </div>
          </div>
        )}
        {showCaptions && (
          <div className="formField">
            <label title={this.DESCRIPTION_TITLE}>
              Description
              <i
                className="fa fa-question-circle"
                onClick={ev => {
                  App.displayErrorMessage(this.DESCRIPTION_TITLE);
                }}
              />
            </label>
            <div className="form-input">
              <input
                className="full-width"
                value={userDescription}
                onChange={ev => updateFormData('userDescription', ev.target.value)}
                maxLength="64"
              />
            </div>
          </div>
        )}
      </div>
    );
  }
}
