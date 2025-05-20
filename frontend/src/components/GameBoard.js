import React, { useEffect, useState } from 'react';
import socket from '../socket';
import './GameBoard.css';

function GameBoard({ gameState, setGameState, playerName, answers, setAnswers, setMessage }) {
  const [submissions, setSubmissions] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [roundInProgress, setRoundInProgress] = useState(false);
  const [visibleCategories, setVisibleCategories] = useState([]);
  const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:6464';

  useEffect(() => {
    const fetchGameState = async () => {
      try {
        const res = await fetch(`${BASE_URL}/get-game?gameId=${gameState.gameId}`);
        const data = await res.json();
        if (res.ok && data.categories) {
          setGameState((prev) => ({
            ...prev,
            categories: data.categories,
          }));
        }
      } catch (err) {
        console.error("❌ Failed to fetch game state:", err);
      }
    };
    fetchGameState();
  }, [gameState.gameId, setGameState]);

  const handleChange = (category, value) => {
    setAnswers((prev) => ({ ...prev, [category]: value }));
  };

  const handleSubmit = async () => {
    if (submitted) return setMessage('✅ Already submitted!');
    const res = await fetch(`${BASE_URL}/submit-answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: gameState.gameId,
        playerName,
        answers,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setSubmitted(true);
      setMessage('✅ Answers submitted!');
      socket.emit('fetchSubmissions', { gameId: gameState.gameId });
    } else {
      setMessage(data.message || '❌ Submission failed.');
    }
  };

  useEffect(() => {
    socket.on('submissionsUpdated', (data) => {
      setSubmissions(data);
    });
    return () => {
      socket.off('submissionsUpdated');
    };
  }, []);

  const handleUpdateScore = async (player, delta) => {
    const res = await fetch(`${BASE_URL}/update-score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: gameState.gameId,
        playerName: player,
        score: delta,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage('✅ Score updated.');
    } else {
      setMessage(data.message || '❌ Failed to update score.');
    }
  };

  const handleNextRound = async () => {
    if (roundInProgress) return;
    setRoundInProgress(true);
    try {
      const res = await fetch(`${BASE_URL}/next-round`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: gameState.gameId,
          playerName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return setMessage(data.message || '❌ Failed to move to next round.');
      }
      setSubmitted(false);
      setAnswers({});
      setVisibleCategories([]);
      setMessage('➡️ New round started!');
    } catch (err) {
      console.error('❌ handleNextRound error:', err);
      setMessage('❌ An error occurred.');
    } finally {
      setRoundInProgress(false);
    }
  };

  useEffect(() => {
    const handleRoundStarted = ({ letter, currentRound }) => {
      setGameState((prev) => ({
        ...prev,
        currentLetter: letter,
        currentRound: currentRound ?? prev.currentRound,
      }));
      setSubmitted(false);
      setAnswers({});
      setSubmissions({});
      setVisibleCategories([]);
      setMessage(`🔤 Round ${currentRound} started with letter "${letter}"`);
    };
    socket.on('roundStarted', handleRoundStarted);
    return () => {
      socket.off('roundStarted', handleRoundStarted);
    };
  }, []);

  const isHost = gameState.host === playerName;
  const canControlRound = isHost && !roundInProgress && gameState.currentLetter === null;
  const canScore = isHost && !roundInProgress && submitted;

  return (
    <div className="game-board">
      <h2>Round {gameState.currentRound}</h2>
      <h3>Letter: {gameState.currentLetter || 'Waiting...'}</h3>

      {canControlRound && (
        <button
          className="next-round-button"
          onClick={handleNextRound}
        >
          🎬 Start Round
        </button>
      )}

      {!submitted && (
        <>
          <div className="category-row">
            {gameState.categories.map((cat) => (
              <div key={cat} className="category-box">
                <label>{cat}</label>
                <input
                  type="text"
                  value={answers[cat] || ''}
                  onChange={(e) => handleChange(cat, e.target.value)}
                />
              </div>
            ))}
          </div>
          <button className="submit-button" onClick={handleSubmit}>
            ✅ Submit Answers
          </button>
        </>
      )}

      {Object.keys(submissions).length > 0 && (
        <div className="submission-score-wrapper">
          <div className="answer-grid">
            <h3>All Answers</h3>
            <table>
              <thead>
                <tr>
                  <th>Player</th>
                  {gameState.categories.map((cat) =>
                    visibleCategories.includes(cat) ? <th key={cat}>{cat}</th> : null
                  )}
                </tr>
              </thead>
              <tbody>
                {Object.entries(submissions).map(([player, playerAnswers]) => (
                  <tr key={player}>
                    <td><strong>{player}</strong></td>
                    {gameState.categories.map((cat) =>
                      visibleCategories.includes(cat)
                        ? <td key={cat}>{playerAnswers?.[cat]?.trim() || '-'}</td>
                        : null
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="scores">
            <h3>Scores</h3>
            <ul>
              {Object.entries(gameState.scores).map(([player, score]) => (
                <li key={player}>{player}: {score}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {canScore && (
        <div style={{ marginTop: '10px' }}>
          <button onClick={() => {
            socket.emit('scoreRound', { gameId: gameState.gameId });
            setVisibleCategories(gameState.categories);
          }}>
            🧮 Score Entire Round
          </button>
          <button onClick={() => {
            const next = gameState.categories.find(cat => !visibleCategories.includes(cat));
            if (next) setVisibleCategories([...visibleCategories, next]);
          }}>
            ➕ Reveal Next Category
          </button>
          <button
            className="next-round-button"
            onClick={handleNextRound}
          >
            ➡️ Next Round
          </button>
        </div>
      )}
    </div>
  );
}

export default GameBoard;
