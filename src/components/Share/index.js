import React, { Component } from 'react';
import onClickOutside from 'react-onclickoutside';
import axios from 'axios';
import './social.scss';
const TAGS_STRING = `by @sentinel_hub #EarthObservation`;
class SocialShare extends Component {
  constructor() {
    super();
    this.state = { displayOptions: false };
  }

  shortenUrl = urlLocation => {
    const GOOGLE_API_KEY = 'AIzaSyB2HD0qUbLvImH3WtGE1Ik6HGnE_q8VP5I';
    const url = `https://www.googleapis.com/urlshortener/v1/url?key=${GOOGLE_API_KEY}`;
    return new Promise((resolve, reject) => {
      const axiosInstance = axios.create({
        headers: { 'Content-Type': 'application/json' },
      });

      axiosInstance
        .post(url, {
          longUrl: urlLocation,
        })
        .then(res => resolve(res.data.id))
        .catch(e => reject(e));
    });
  };

  toggleOverlay = () => {
    this.setState(oldState => {
      return {
        displayOptions: !oldState.displayOptions,
      };
    });
  };

  handleClickOutside = () => {
    this.setState({
      displayOptions: false,
    });
  };

  openWindow = async socialSite => {
    const shortUrl = await this.shortenUrl(window.location.href);
    let link;
    switch (socialSite) {
      case 'twitter':
        link = `https://twitter.com/home?status=${encodeURIComponent(`${shortUrl}  ${TAGS_STRING}`)}`;
        break;
      case 'facebook':
        link = `https://www.facebook.com/sharer/sharer.php?u=${shortUrl}`;
        break;
      default:
        throw new Error('Social site for sharing not found');
    }
    window.open(link, '_blank');
  };

  renderOptionsOverlay = () => {
    return (
      <div className={this.state.displayOptions ? 'social-networks show' : 'social-networks'}>
        <ul>
          <li className="social-twitter">
            <a onClick={() => this.openWindow('twitter')}>
              <i className="fa fa-twitter fa-lg" />
            </a>
          </li>
          <li className="social-facebook">
            <a onClick={() => this.openWindow('facebook')}>
              <i className="fa fa-facebook fa-lg" />
            </a>
          </li>
        </ul>
      </div>
    );
  };

  render() {
    return (
      <div onClick={this.toggleOverlay} className="shareIcon">
        <i className="fa fa-share-alt" />
        {this.state.displayOptions && this.renderOptionsOverlay()}
      </div>
    );
  }
}
export default onClickOutside(SocialShare);
