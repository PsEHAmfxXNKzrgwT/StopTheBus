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
      fetchSubmissions();
    } else {
      setMessage(data.message || '❌ Submission failed.');
    }
  };

  const fetchSubmissions = async () => {
    const res = await fetch(`${BASE_URL}/submissions?gameId=${gameState.gameId}`);
    const data = await res.json();
    setSubmissions(data);
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
      // Do not set gameState manually — let the socket update all players
    } catch (err) {
      console.error('❌ handleNextRound error:', err);
      setMessage('❌ An error occurred.');
    } finally {
      setRoundInProgress(false);
    }
  };

  useEffect(() => {
    const handleRoundStarted = ({ letter, currentRound }) => {
      console.log(`📡 roundStarted received`, { letter, currentRound });
      setGameState((prev) => ({
        ...prev,
        currentLetter: letter,
        currentRound: currentRound ?? prev.currentRound,
      }));
      setSubmitted(false);
      setAnswers({});
      setSubmissions({});
      setMessage(`🔤 Round ${currentRound} started with letter "${letter}"`);
    };

    socket.on('roundStarted', handleRoundStarted);

    socket.onAny((event, data) => {
      console.log(`[${playerName}] Event received:`, event, data);
    });

    return () => {
      socket.off('roundStarted', handleRoundStarted);
      socket.offAny();
    };
  }, []);

  const getCategoryEmoji = (category) => {
    switch (category) {
      case 'Boy': return '👦';
      case 'Girl': return '👧';
      case 'Country': return '🌍';
      case 'Food': return '🍽️';
      case 'Colour': return '🎨';
      case 'Car': return '🚗';
      case 'Movie / TV Show': return '🎬';
      default: return '❓';
    }
  };

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
                <table className="submission-table">
                  <tbody>
                    {Object.entries(ans).map(([cat, val]) => (
                      <tr key={cat}>
                        <td className="emoji">{getCategoryEmoji(cat)}</td>
                        <td className="category-name"><strong>{cat}</strong></td>
                        <td className="answer">{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
  <button
    className="next-round-button"
    onClick={handleNextRound}
    disabled={roundInProgress}
  >
    ➡️ {gameState.currentLetter === null ? 'Start Round' : 'Next Round'}
  </button>
)}

    </div>
  );
}

export default GameBoard;
