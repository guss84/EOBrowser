import React from 'react';
import sgLogo from './logo30.png';

const Header = ({ user, onLogout, showLogin, onShowLogin, onCollapse }) => (
  <header className="logoHeader">
    <a className="toggleSettings" onClick={onCollapse}>
      <i className="fa fa-chevron-left" />
    </a>

    {showLogin &&
      user && (
        <span className="userHello">
          Hello, <b>{user.name && user.name.trim() ? user.name : user.email}</b>
        </span>
      )}

    {showLogin && (
      <span className="userPanel">
        {user ? (
          <a onClick={onLogout} title="Logout">
            <i className="fa fa-power-off" />
          </a>
        ) : (
          <a className="btn" onClick={onShowLogin || null}>
            Login
          </a>
        )}
      </span>
    )}
    <span className="appTitle">
      <a className="sgLogo" href="https://www.sinergise.com" target="_blank" rel="noopener noreferrer">
        <img src={sgLogo} alt="Sinergise" />
      </a>
      {!showLogin ? 'Image browser' : 'EO Browser'}
    </span>
  </header>
);
export default Header;
