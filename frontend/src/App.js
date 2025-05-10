import React, { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Settings from './Settings';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';





function App() {
  const [gameState, setGameState] = useState({
    gameId: null,
    currentRound: 1,
    scores: {},
    gameStarted: false,
    categories: ['Boy', 'Girl', 'Country', 'Food', 'Colour', 'Car', 'Movie / TV Show'],
    players: [],
    currentLetter: null,
    host: null,
  });

  const [playerName, setPlayerName] = useState('');
  const [gameIdInput, setGameIdInput] = useState('');
  const [answers, setAnswers] = useState({});
  const [message, setMessage] = useState('');
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true');

  // Theme setup
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', newMode);
  };

  // Poll game state
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

  return (
    <Router>
      <div className="app-container">
        <h1>🚌 Stop the Bus</h1>
        <nav>
          <Link to="/">Home</Link> | <Link to="/settings">Settings</Link>
        </nav>

        <Routes>
          <Route path="/settings" element={
            <Settings toggleDarkMode={toggleDarkMode} currentMode={darkMode ? 'dark' : 'light'} />
          } />
          <Route path="/" element={
            !gameState.gameStarted ? (
              <Lobby
  playerName={playerName}
  setPlayerName={setPlayerName}
  gameIdInput={gameIdInput}
  setGameIdInput={setGameIdInput}
  setGameState={setGameState}
  gameState={gameState}
  setMessage={setMessage}
  handleStartGame={handleStartGame}
  handleStartRound={handleStartRound}
/>

            ) : (
              <GameBoard
                gameState={gameState}
                playerName={playerName}
                answers={answers}
                setAnswers={setAnswers}
                setMessage={setMessage}
              />
            )
          } />
        </Routes>

        {message && <div className="message">{message}</div>}
      </div>
    </Router>
  );
}

export default App;
