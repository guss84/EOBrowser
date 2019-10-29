import React from 'react';
import styled from 'styled-components';

import Button from './Button';

const Style = styled.div`
  .onetime-notification {
    margin: 20px 10px;
    border: 1px solid #b6bf00;
    border-radius: 10px;
    padding: 10px 20px;
    color: #b6bf00;
    opacity: 1;
    max-height: ${props => props.maxHeight}px;
    transition: all 0.7s;
    overflow-y: hidden;

    div.got-it-btn {
      float: right;
    }
  }
  .onetime-notification.closed {
    opacity: 0;
    max-height: 0;
    margin-top: 0;
    margin-bottom: 0;
    padding-top: 0;
    padding-bottom: 0;
  }
`;

export default class OneTimeNotification extends React.Component {
  static defaultProps = {
    id: '',
    msg: '',
    maxHeight: 200,
  };

  constructor(props) {
    super(props);
    this.state = {
      confirmed: localStorage.getItem(props.confirmationId) !== null,
    };
  }

  saveConfirmation(confirmationId) {
    localStorage[confirmationId] = JSON.stringify(true);
    this.setState({
      confirmed: true,
    });
  }

  render() {
    return (
      <Style maxHeight={this.props.maxHeight}>
        <div className={`onetime-notification ${this.state.confirmed ? 'closed' : ''}`}>
          <div>
            {this.props.msg}
            <div className="got-it-btn">
              <Button
                text="Got it"
                icon="times"
                onClick={ev => this.saveConfirmation(this.props.confirmationId)}
              />
            </div>
            <div style={{ clear: 'both' }} />
          </div>
        </div>
      </Style>
    );
  }
}
