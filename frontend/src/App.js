import React, { useState } from 'react';
import './App.css';  // Optional: your styling file

function App() {
  const [gameState, setGameState] = useState({
    currentRound: 1,
    scores: {},
    gameStarted: false,
    categories: ['Boy', 'Girl', 'Country', 'Food', 'Colour', 'Car', 'Movie / TV Show'],
  });

  const [playerName, setPlayerName] = useState('');
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

  const handleSubmitAnswers = async () => {
    console.log("Submitting answers with player name:", playerName);
    const allCategoriesAnswered = gameState.categories.every(
      (category) => answers[category] && answers[category].trim() !== ''
    );

    console.log("Checking answers: ", { answers, allCategoriesAnswered });

    if (!playerName || !allCategoriesAnswered) {
      setMessage("❌ Please provide a player name and answers for all categories.");
      console.warn("Submission blocked: Missing name or answers.", {
        playerName,
        answers,
      });
      return;
    }

    // If everything is valid, proceed to submit
    try {
      console.log("🚀 Submitting answers:", { playerName, answers });

      const response = await fetch('http://localhost:6464/submit-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName, answers }),
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

  return (
    <div className="app-container">
      <h1>🎒 Stop the Bus</h1>

      {/* Player Name Section */}
      {!gameState.gameStarted && (
        <div className="player-name-container">
          <h2>👤 Enter Player Name</h2>
          <input
            type="text"
            value={playerName}
            onChange={handlePlayerNameChange}
            placeholder="Enter your name"
          />

          {/* Start Game Button */}
          <button
            onClick={() => {
              if (playerName) {
                setGameState((prevState) => ({
                  ...prevState,
                  gameStarted: true,
                }));
                setMessage("🎮 Game started!");
              } else {
                setMessage("❌ You need to enter a player name.");
              }
            }}
          >
            🚀 Start Game
          </button>
        </div>
      )}

      {/* Game Info */}
      {gameState.gameStarted && (
        <div className="game-info">
          <h3>🎲 Game Info</h3>
          <p><strong>🕒 Round:</strong> {gameState.currentRound}</p>
          <p><strong>👥 Player:</strong> {playerName}</p>
          <p><strong>📋 Categories:</strong> {gameState.categories.join(', ')}</p>
        </div>
      )}

      {/* Category Input Fields */}
      {gameState.gameStarted && (
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
      )}

      {/* Submit Button */}
      {gameState.gameStarted && (
        <button onClick={handleSubmitAnswers}>📤 Submit Answers</button>
      )}

      {/* Message Display */}
      {message && <div className="message">{message}</div>}
    </div>
  );
}

export default App;
