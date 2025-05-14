import React, {
  useMemo,
  useState,
  createContext,
  useContext,
  useEffect
} from 'react';
import './App.css';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Settings from './Settings';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';
import ThemeSelector from './components/ThemeSelector'; // ✅ imported externally
import DarkModeToggle from './components/DarkModeToggle';

import {
  createTheme,
  ThemeProvider as MUIThemeProvider,
  useTheme
} from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import IconButton from '@mui/material/IconButton';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

const ColorModeContext = createContext();

const themes = {
  light: { palette: { mode: 'light' } },
  softDark: {
    palette: {
      mode: 'dark',
      background: { default: '#1e1e1e', paper: '#2a2a2a' },
      text: { primary: '#ffffff', secondary: '#bbbbbb' }
    }
  },
  black: {
    palette: {
      mode: 'dark',
      background: { default: '#000000', paper: '#121212' },
      text: { primary: '#ffffff', secondary: '#888888' }
    }
  },
  blue: {
    palette: {
      mode: 'dark',
      background: { default: '#0a192f', paper: '#112240' },
      text: { primary: '#ffffff', secondary: '#90caf9' }
    }
  },
  sepia: {
    palette: {
      mode: 'dark',
      background: { default: '#2b1b0e', paper: '#3c2f2f' },
      text: { primary: '#f5e6c4', secondary: '#c9a97e' }
    }
  }
};

const CustomThemeProvider = ({ children }) => {
  const [themeName, setThemeName] = useState(localStorage.getItem('themeName') || 'softDark');

  useEffect(() => {
    localStorage.setItem('themeName', themeName);
  }, [themeName]);

  const colorMode = useMemo(() => ({
    setTheme: (name) => setThemeName(name),
    current: themeName
  }), [themeName]);

  const theme = useMemo(() => createTheme(themes[themeName] || themes.softDark), [themeName]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MUIThemeProvider>
    </ColorModeContext.Provider>
  );
};

export const useColorMode = () => useContext(ColorModeContext);



function AppContent() {
  const [gameState, setGameState] = useState({
    gameId: null,
    currentRound: 0,
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

  useEffect(() => {
    if (!gameState.gameId || !gameState.gameStarted) return;

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
      } catch {
        // silent error
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [gameState.gameId, gameState.gameStarted]);

  const handleStartGame = async () => {
    if (!gameState.gameId) return setMessage("❌ No game to start.");

    try {
      const res = await fetch('http://localhost:6464/start-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: gameState.gameId, playerName }),
      });

      if (res.ok) {
        setGameState((prev) => ({ ...prev, gameStarted: true }));
        setMessage("🎮 Game started! Click ➡️ Next Round to begin.");
      } else {
        const text = await res.text();
        setMessage("❌ " + text);
      }
    } catch {
      setMessage('❌ Error starting game.');
    }
  };

  return (
    <Router>
      <div className="app-container">
        <h1>🚌 Stop the Bus</h1>
        <DarkModeToggle />
        <ThemeSelector />
        <nav>
          <Link to="/">Home</Link> | <Link to="/settings">Settings</Link>
        </nav>

        <Routes>
          <Route path="/settings" element={<Settings />} />
          <Route
            path="/"
            element={
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
                />
              ) : (
                <GameBoard
                  gameState={gameState}
                  setGameState={setGameState}
                  playerName={playerName}
                  answers={answers}
                  setAnswers={setAnswers}
                  setMessage={setMessage}
                />
              )
            }
          />
        </Routes>

        {message && <div className="message">{message}</div>}
      </div>
    </Router>
  );
}

export default function App() {
  return (
    <CustomThemeProvider>
      <AppContent />
    </CustomThemeProvider>
  );
}
