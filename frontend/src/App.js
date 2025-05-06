import React, { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Fetch the message from the backend
    fetch('http://localhost:5000')
      .then((response) => response.text())
      .then((data) => setMessage(data))
      .catch((error) => console.error('Error:', error));
  }, []);

  return (
    <div className="App">
      <h1>Stop the Bus Game</h1>
      <p>{message}</p>
    </div>
  );
}

export default App;
