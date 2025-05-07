import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [playerName, setPlayerName] = useState('');
  const [players, setPlayers] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [message, setMessage] = useState('');
  const [gameState, setGameState] = useState(null);
  const [answers, setAnswers] = useState({});
  

  const handleSubmitAnswers = async () => {
    try {
      const response = await fetch('http://localhost:50001/submit-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName, answers }),
      });
  
      const data = await response.text();
      setMessage(data); // show response message
    } catch (error) {
      setMessage('Error submitting answers.');
    }
  };
  

  const handleAddPlayer = async () => {
    if (!playerName) return;

    try {
      const response = await fetch('http://localhost:50001/add-player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playerName }),
      });

      const text = await response.text();
      setMessage(text);

      if (response.ok) {
        setPlayers((prev) => [...prev, playerName]);
        setPlayerName('');
      }
    } catch (error) {
      setMessage('Error adding player.');
    }
  };

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const randomLetter = alphabet[Math.floor(Math.random() * alphabet.length)];

const handleStartGame = async () => {
  try {
    const response = await fetch('http://localhost:50001/start-game', {
      method: 'POST',
    });

    const data = await response.json();
    data.letter = randomLetter; // Add the letter to game state
    setGameState(data);
    setGameStarted(true);
    setMessage('Game started!');
  } catch (error) {
    setMessage('Error starting game.');
  }
};

  

  return (
    <div className="App">
      <h1>🚌 Stop the Bus</h1>
  
      {!gameStarted && (
        <>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter player name"
          />
          <button onClick={handleAddPlayer}>Add Player</button>
          <button onClick={handleStartGame}>Start Game</button>
        </>
      )}
  
      {message && <p>{message}</p>}
  
      <h2>Players:</h2>
      <ul>
        {players.map((name, index) => (
          <li key={index}>{name}</li>
        ))}
      </ul>
  
      {gameStarted && <h2>Game has started! 🚀</h2>}
  
      {/* 👉 INSERT the gameState block here */}
      {gameState && (
        <div>
          <h3>Game Info</h3>
          <p><strong>Round:</strong> {gameState.currentRound}</p>
          <p><strong>Players:</strong></p>
          <ul>
            {gameState.players.map((player, index) => (
              <li key={index}>
                {player} (Score: {gameState.scores[player]})
              </li>
            ))}
          </ul>
          <p><strong>Categories:</strong> {gameState.categories.join(', ')}</p>
          <h3>Letter: {gameState.letter}</h3>

<h3>Enter Answers:</h3>
<form>
  {gameState.categories.map((category, index) => (
    <div key={index}>
      <label>{category}:</label>
      <input
        type="text"
        value={answers[category] || ''}
        onChange={(e) =>
          setAnswers({ ...answers, [category]: e.target.value })
        }
      />
    </div>
  ))}
  <button type="button" onClick={handleSubmitAnswers}>
  Submit Answers
</button>
</form>

        </div>
      )}
    </div>
  );
  
}

export default App;
