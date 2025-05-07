import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [gameState, setGameState] = useState({
    gameId: null,
    currentRound: 1,
    scores: {},
    gameStarted: false,
    categories: ['Boy', 'Girl', 'Country', 'Food', 'Colour', 'Car', 'Movie / TV Show'],
    players: [],
  });

  const [playerName, setPlayerName] = useState('');
  const [gameIdInput, setGameIdInput] = useState('');
  const [answers, setAnswers] = useState({});
  const [message, setMessage] = useState('');

  const handleInputChange = (category, value) => {
    setAnswers((prevAnswers) => ({
      ...prevAnswers,
      [category]: value,
    }));
  };

  const handlePlayerNameChange = (e) => {
    setPlayerName(e.target.value);
  };

  const handleGameIdChange = (e) => {
    setGameIdInput(e.target.value);
  };

  const handleCreateGame = async () => {
    if (!playerName) {
      setMessage("❌ Please enter a player name.");
      return;
    }

    try {
      const response = await fetch('http://localhost:6464/create-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName }),
      });

      if (response.ok) {
        const data = await response.json();
        setGameState((prev) => ({
          ...prev,
          gameId: data.gameId,
          players: [playerName],
          gameStarted: false,
        }));
        setMessage(`✅ Game created! Your game ID is: ${data.gameId}`);
      } else {
        setMessage('❌ Failed to create a game. Please try again.');
      }
    } catch (error) {
      console.error("❌ Error creating game:", error);
      setMessage('❌ Error creating game.');
    }
  };

  const handleJoinGame = async () => {
    if (!playerName || !gameIdInput) {
      setMessage("❌ Please enter a player name and a valid game ID.");
      return;
    }

    try {
      const response = await fetch('http://localhost:6464/join-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: gameIdInput, playerName }),
      });

      if (response.ok) {
        const data = await response.json();
        setGameState((prev) => ({
          ...prev,
          gameId: gameIdInput,
          players: data.gameRoom.players,
          gameStarted: data.gameRoom.gameStarted,
        }));
        setMessage(`✅ Joined game with ID: ${gameIdInput}`);
      } else {
        setMessage('❌ Failed to join the game. Please try again.');
      }
    } catch (error) {
      console.error("❌ Error joining game:", error);
      setMessage('❌ Error joining game.');
    }
  };

  const handleStartGame = async () => {
    if (!gameState.gameId) {
      setMessage("❌ You need to create or join a game first.");
      return;
    }

    try {
      const response = await fetch('http://localhost:6464/start-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: gameState.gameId }),
      });

      if (response.ok) {
        setGameState((prev) => ({
          ...prev,
          gameStarted: true,
          currentRound: 1,
        }));
        setMessage("🎮 Game started!");
      } else {
        setMessage('❌ Failed to start the game. Please try again.');
      }
    } catch (error) {
      console.error("❌ Error starting game:", error);
      setMessage('❌ Error starting game.');
    }
  };

  const handleSubmitAnswers = async () => {
    const allCategoriesAnswered = gameState.categories.every(
      (category) => answers[category] && answers[category].trim() !== ''
    );

    if (!playerName || !allCategoriesAnswered) {
      setMessage("❌ Please provide a player name and answers for all categories.");
      return;
    }

    try {
      const response = await fetch('http://localhost:6464/submit-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: gameState.gameId, playerName, answers }),
      });

      if (response.ok) {
        const data = await response.text();
        setMessage("✅ " + data);
      } else {
        setMessage('❌ Failed to submit answers. Please try again.');
      }
    } catch (error) {
      console.error("❌ Error submitting answers:", error);
      setMessage('❌ Error submitting answers.');
    }
  };

  // 🔁 Polling for updates
  useEffect(() => {
    if (!gameState.gameId) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:6464/get-game?gameId=${gameState.gameId}`);
        if (response.ok) {
          const updatedGame = await response.json();
          setGameState((prev) => ({
            ...prev,
            players: updatedGame.players,
            gameStarted: updatedGame.gameStarted,
            scores: updatedGame.scores || prev.scores,
            currentRound: updatedGame.currentRound || prev.currentRound,
          }));
        }
      } catch (err) {
        console.error("❌ Error polling game state:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [gameState.gameId]);

  return (
    <div className="app-container">
      <h1>🎒 Stop the Bus</h1>

      {/* Join/Create Form */}
      {!gameState.gameStarted && !gameState.gameId && (
        <>
          <div className="player-name-container">
            <h2>👤 Enter Player Name</h2>
            <input
              type="text"
              value={playerName}
              onChange={handlePlayerNameChange}
              placeholder="Enter your name"
            />
          </div>

          <div className="game-id-container">
            <h2>🏁 Create or Join a Game</h2>
            <input
              type="text"
              value={gameIdInput}
              onChange={handleGameIdChange}
              placeholder="Enter Game ID (to join)"
            />
            <button onClick={handleJoinGame}>🎮 Join Game</button>
            <button onClick={handleCreateGame}>🚀 Create Game</button>
          </div>
        </>
      )}

      {/* Start Game Button */}
      {!gameState.gameStarted && gameState.gameId && (
        <button onClick={handleStartGame}>🚀 Start Game</button>
      )}

      {/* Game Info */}
      {gameState.gameStarted && (
        <>
          <div className="game-info">
            <h3>🎲 Game Info</h3>
            <p><strong>🕒 Round:</strong> {gameState.currentRound}</p>
            <p><strong>👥 Players:</strong> {gameState.players.join(', ')}</p>
            <p><strong>📋 Categories:</strong> {gameState.categories.join(', ')}</p>
          </div>

          <div className="category-inputs">
            {gameState.categories.map((category) => (
              <div key={category} className="category-input-box">
                <label><strong>{category}</strong></label>
                <input
                  type="text"
                  value={answers[category] || ''}
                  onChange={(e) => handleInputChange(category, e.target.value)}
                />
              </div>
            ))}
          </div>

          <button onClick={handleSubmitAnswers}>📤 Submit Answers</button>
        </>
      )}

      {/* Message Display */}
      {message && <div className="message">{message}</div>}
    </div>
  );
}

export default App;
