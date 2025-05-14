import React, { useEffect, useState } from 'react';
import socket from '../socket';
import './GameBoard.css';

function GameBoard({ gameState, setGameState, playerName, answers, setAnswers, setMessage }) {
  const [submissions, setSubmissions] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [roundInProgress, setRoundInProgress] = useState(false);
  const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:6464';

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
    } else {
      setMessage(data.message || '❌ Submission failed.');
    }
  };

  const fetchSubmissions = async () => {
    const res = await fetch(`${BASE_URL}/submissions?gameId=${gameState.gameId}`);
    const data = await res.json();
    setSubmissions(data);
  };

  const fetchGameState = async () => {
    if (!gameState?.gameId) return;
    try {
      const res = await fetch(`${BASE_URL}/game-state?gameId=${gameState.gameId}`);
      const data = await res.json();
      if (res.ok) {
        setGameState(data);
      } else {
        setMessage(data.message || '❌ Failed to fetch game state.');
      }
    } catch (err) {
      console.error('❌ Failed to fetch game state:', err);
    }
  };

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
    setMessage('➡️ New round started!');

    // ✅ Use data directly instead of waiting for socket or refetch
    setGameState((prev) => ({
      ...prev,
      currentRound: data.currentRound,
      currentLetter: data.currentLetter,
    }));

    console.log("✅ Letter received from /next-round:", data.currentLetter);
  } catch (err) {
    console.error('❌ handleNextRound error:', err);
    setMessage('❌ An error occurred.');
  } finally {
    setRoundInProgress(false);
  }
};


  useEffect(() => {
    const handleRoundStarted = ({ letter }) => {
      // ✅ Save the letter into gameState for consistent display
      setGameState((prev) => ({ ...prev, currentLetter: letter }));
    };

    socket.on('roundStarted', handleRoundStarted);
    return () => socket.off('roundStarted', handleRoundStarted);
  }, [setGameState]);

  console.log("🕵️ gameState.currentRound =", gameState.currentRound);

  return (
    <div className="game-board">
      <h2>Round {gameState.currentRound}</h2>
      <h3>Letter: {gameState.currentLetter || 'Waiting...'}</h3>

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

      {submitted && (
        <div className="submission-score-wrapper">
          <div className="submissions">
            <h3>Submissions</h3>
            {Object.entries(submissions).map(([player, ans], idx) => (
              <div key={idx} className="submission-entry">
                <strong>{player}</strong>
                <ul>
                  {Object.entries(ans).map(([cat, val]) => (
                    <li key={cat}>{cat}: {val}</li>
                  ))}
                </ul>
                {gameState.host === playerName && (
                  <div className="score-controls">
                    <button onClick={() => handleUpdateScore(player, 1)}>+1</button>
                    <button onClick={() => handleUpdateScore(player, -1)}>-1</button>
                  </div>
                )}
              </div>
            ))}
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

      {gameState.host === playerName && (
  <button className="next-round-button" onClick={handleNextRound} disabled={roundInProgress || gameState.currentRound > 0 && !submitted}>
    ➡️ Next Round
  </button>
)}
    </div>
  );
}

export default GameBoard;
