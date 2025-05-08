import React from 'react';

function Settings({ toggleDarkMode, currentMode }) {
  return (
    <div className="settings">
      <h2>Settings</h2>
      <label>
        Dark Mode:
        <input type="checkbox" checked={currentMode === 'dark'} onChange={toggleDarkMode} />
      </label>
    </div>
  );
}

export default Settings;
