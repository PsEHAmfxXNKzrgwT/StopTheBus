import React, { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter as Router, Route, Link, Routes } from 'react-router-dom';  // Use Routes instead of Switch for react-router-dom v6
import Settings from './Settings'; // Import the Settings page component

function App() {
  const [gameState, setGameState] = useState({
    gameId: null,
    currentRound: 1,
    scores: {},
    gameStarted: false,
    categories: ['Boy', 'Girl', 'Country', 'Food', 'Colour', 'Car', 'Movie / TV Show'],
    players: [],
    currentLetter: null,
  });

  const [playerName, setPlayerName] = useState('');
  const [gameIdInput, setGameIdInput] = useState('');
  const [answers, setAnswers] = useState({});
  const [message, setMessage] = useState('');
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true' || false);

  const handleInputChange = (category, value) => {
    setAnswers((prev) => ({ ...prev, [category]: value }));
  };

  const handlePlayerNameChange = (e) => setPlayerName(e.target.value);
  const handleGameIdChange = (e) => setGameIdInput(e.target.value);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', newMode);
    document.documentElement.setAttribute('data-theme', newMode ? 'dark' : 'light');
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Handle Game Functions
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
        setMessage("🎮 Game started! Waiting for submissions.");
        // ❌ Removed auto-start of the first round (handled manually by host now)
      } else {
        const text = await res.text();
        setMessage("❌ " + text);
      }
    } catch {
      setMessage('❌ Error starting game.');
    }
  };
  

  const handleStartRound = async () => {
    try {
      const nextRoundRes = await fetch('http://localhost:6464/next-round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: gameState.gameId, playerName }),
      });
  
      const nextRoundText = await nextRoundRes.text();
      if (!nextRoundRes.ok) {
        return setMessage(`⚠️ ${nextRoundText}`);
      }
  
      const res = await fetch('http://localhost:6464/start-round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: gameState.gameId, playerName }),
      });
  
      const data = await res.json();
      setGameState((prev) => ({
        ...prev,
        currentRound: data.currentRound,
        currentLetter: data.currentLetter,
      }));
  
      setAnswers({});
      setMessage(`🔤 New round started! Letter: ${data.currentLetter}`);
    } catch (err) {
      setMessage('❌ Error starting new round.');
    }
  };
  
  

  const handleSubmitAnswers = async () => {
    const allFilled = gameState.categories.every(
      (cat) => answers[cat] && answers[cat].trim() !== ''
    );
    if (!allFilled) return setMessage("❌ Fill all categories.");

    // Validate answers for each category
    const invalidAnswers = gameState.categories.filter((cat) => {
      const answer = answers[cat]?.trim();
      if (!answer) return false;

      // Check if the answer starts with the round letter
      const firstLetter = answer.charAt(0).toUpperCase();
      const roundLetter = gameState.currentLetter?.toUpperCase();

      // Check if it starts with the round letter or if it is multiple words, the first word starts with the round letter
      return !(firstLetter === roundLetter || answer.split(' ')[0].charAt(0).toUpperCase() === roundLetter);
    });

    if (invalidAnswers.length > 0) {
      return setMessage(`❌ Answers for ${invalidAnswers.join(', ')} must start with the letter ${gameState.currentLetter}`);
    }

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
            currentLetter: data.currentLetter,
            scores: data.scores || prev.scores,
            host: data.host,
          }));
          
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [gameState.gameId]);

  {gameState.host === playerName && (
    <button onClick={handleStartRound}>🔄 Next Round</button>
  )}
  

  return (
    <Router>
      <div className="app-container">
        <h1>🚌 Stop the Bus</h1>
        <nav>
          <Link to="/">Home</Link> | <Link to="/settings">Settings</Link>
        </nav>
        <div className="main-content" style={{ flexGrow: 1, overflow: 'auto' }}>
          <Routes>
            <Route path="/settings" element={<Settings toggleDarkMode={toggleDarkMode} currentMode={darkMode ? 'dark' : 'light'} />} />
            <Route path="/" element={
              <>
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
                    {gameState.currentLetter && (
                      <p><strong>🅰️ Letter:</strong> Words must start with <b>{gameState.currentLetter}</b></p>
                    )}

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
              </>
            } />
          </Routes>
        </div>

        {message && <div className="message">{message}</div>}
      </div>
    </Router>
  );
}

export default App;
