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
  const [category, setCategory] = useState('');

  const handleInputChange = (category, value) => {
    setAnswers((prev) => ({ ...prev, [category]: value }));
  };

  const handlePlayerNameChange = (e) => setPlayerName(e.target.value);
  const handleGameIdChange = (e) => setGameIdInput(e.target.value);

  const handleCreateGame = async () => {
    if (!playerName) return setMessage("❌ Please enter a player name.");
    try {
      const res = await fetch('http://localhost:6464/create-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName }),
      });
      const data = await res.json();
      setGameState((prev) => ({
        ...prev,
        gameId: data.gameId,
        players: [playerName],
        gameStarted: false,
      }));
      setMessage(`✅ Game created! Your game ID is: ${data.gameId}`);
    } catch (err) {
      setMessage('❌ Error creating game.');
    }
  };

  const handleJoinGame = async () => {
    if (!playerName || !gameIdInput) {
      return setMessage("❌ Please enter a player name and Game ID.");
    }

    try {
      const res = await fetch('http://localhost:6464/join-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: gameIdInput, playerName }),
      });
      const data = await res.json();
      setGameState((prev) => ({
        ...prev,
        gameId: gameIdInput,
        players: data.gameRoom.players,
        gameStarted: data.gameRoom.gameStarted,
        scores: data.gameRoom.scores,
      }));
      setMessage(`✅ Joined game ${gameIdInput}`);
    } catch {
      setMessage("❌ Couldn't join game.");
    }
  };

  const handleStartGame = async () => {
    if (!gameState.gameId) return setMessage("❌ No game to start.");
    try {
      const res = await fetch('http://localhost:6464/start-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: gameState.gameId }),
      });
      if (res.ok) {
        setGameState((prev) => ({ ...prev, gameStarted: true, currentRound: 1 }));
        await handleStartRound();
      }
    } catch {
      setMessage('❌ Error starting game.');
    }
  };

  const handleStartRound = async () => {
    try {
      const res = await fetch('http://localhost:6464/start-round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: gameState.gameId }),
      });
      const data = await res.json();
      setCategory(data.currentCategory);
      setGameState((prev) => ({
        ...prev,
        currentRound: data.currentRound,
      }));
      setAnswers({});
      setMessage(`🧠 New round started! Category: ${data.currentCategory}`);
    } catch (err) {
      setMessage('✅ Game has finished all rounds.');
    }
  };

  const handleSubmitAnswers = async () => {
    const allFilled = gameState.categories.every(
      (cat) => answers[cat] && answers[cat].trim() !== ''
    );
    if (!allFilled) return setMessage("❌ Fill all categories.");
    try {
      const res = await fetch('http://localhost:6464/submit-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: gameState.gameId,
          playerName,
          answers,
        }),
      });
      const text = await res.text();
      setMessage("✅ " + text);
    } catch {
      setMessage("❌ Failed to submit.");
    }
  };

  useEffect(() => {
    if (!gameState.gameId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:6464/get-game?gameId=${gameState.gameId}`);
        if (res.ok) {
          const data = await res.json();
          setGameState((prev) => ({
            ...prev,
            players: data.players,
            gameStarted: data.gameStarted,
            currentRound: data.currentRound,
            scores: data.scores || prev.scores,
          }));
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [gameState.gameId]);

  return (
    <div className="app-container">
      <h1>🚌 Stop the Bus</h1>
      {gameState.gameId && (
        <p><strong>🆔 Game Code:</strong> {gameState.gameId}</p>
      )}
      <div className="main-content" style={{ flexGrow: 1, overflow: 'auto' }}>
        {!gameState.gameStarted && !gameState.gameId && (
          <>
            <input value={playerName} onChange={handlePlayerNameChange} placeholder="Your name" />
            <input value={gameIdInput} onChange={handleGameIdChange} placeholder="Game ID to join" />
            <button onClick={handleJoinGame}>🎮 Join</button>
            <button onClick={handleCreateGame}>🚀 Create</button>
          </>
        )}

        {!gameState.gameStarted && gameState.gameId && (
          <>
            <h3>👥 Players List</h3>
            <ul>
              {gameState.players.map((player, index) => (
                <li key={index}>{player}</li>
              ))}
            </ul>
            <button onClick={handleStartGame}>▶️ Start Game</button>
          </>
        )}

        {gameState.gameStarted && (
          <>
            <h3>🎲 Round {gameState.currentRound}</h3>
            <p><strong>Category:</strong> {category}</p>

            <div className="category-inputs">
              {gameState.categories.map((cat) => (
                <div key={cat} className="category-input-box">
                  <label>{cat}</label>
                  <input
                    value={answers[cat] || ''}
                    onChange={(e) => handleInputChange(cat, e.target.value)}
                  />
                </div>
              ))}
            </div>

            <div style={{ marginTop: '10px' }}>
              <button onClick={handleSubmitAnswers}>📤 Submit</button>
              <button onClick={handleStartRound}>🔄 Next Round</button>
            </div>

            <div className="scores">
              <h4>🏆 Scores</h4>
              {Object.entries(gameState.scores).map(([player, score]) => (
                <p key={player}>{player}: {score}</p>
              ))}
            </div>
          </>
        )}
      </div>

      {message && <div className="message">{message}</div>}
    </div>
  );
}

export default App;
