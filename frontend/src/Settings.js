import React, { useState, useEffect } from 'react';
import './Settings.css';

function Settings({ toggleDarkMode, currentMode }) {
  return (
    <div className="settings-container">
      <h2>Settings</h2>
      <div className="toggle-container">
        <label>Dark Mode</label>
        <button className="toggle-btn" onClick={toggleDarkMode}>
          {currentMode === 'dark' ? '🌞 Light Mode' : '🌙 Dark Mode'}
        </button>
      </div>
    </div>
  );
}

export default Settings;
