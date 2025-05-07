import { useState } from 'react';
import './App.css';

function App() {
  const [response, setResponse] = useState('');

  const pingBackend = async () => {
    try {
      const res = await fetch('http://localhost:50001/');
      const text = await res.text();
      setResponse(text);
    } catch (err) {
      setResponse('Error connecting to backend');
      console.error(err);
    }
  };

  return (
    <div className="App">
      <h1>Stop the Bus</h1>
      <button onClick={pingBackend}>Ping Backend</button>
      <p>{response}</p>
    </div>
  );
}

export default App;
