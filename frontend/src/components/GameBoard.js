import React, { useEffect, useState } from 'react';
import socket from '../socket';

function GameBoard({ gameState, playerName, answers, setAnswers, setMessage }) {
  const [submissions, setSubmissions] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [letter, setLetter] = useState(null);
  const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:6464';

  console.log("🔁 RENDER: letter state =", letter, "gameState.currentLetter =", gameState.currentLetter);

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
    try {
      const nextRes = await fetch(`${BASE_URL}/next-round`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: gameState.gameId,
          playerName,
        }),
      });

      let nextDataText = await nextRes.text();
      let nextData;
      try {
        nextData = JSON.parse(nextDataText);
      } catch (err) {
        console.error("❌ /next-round returned invalid JSON:", nextDataText);
        return setMessage('❌ Invalid response from server on next round.');
      }

      if (!nextRes.ok) {
        return setMessage(nextData.message || '❌ Failed to move to next round.');
      }

      const startRes = await fetch(`${BASE_URL}/start-round`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: gameState.gameId }),
      });

      let startDataText = await startRes.text();
      let startData;
      try {
        startData = JSON.parse(startDataText);
      } catch (err) {
        console.error("❌ /start-round returned invalid JSON:", startDataText);
        return setMessage('❌ Invalid response from server on round start.');
      }

      if (!startRes.ok) {
        return setMessage(startData.message || '❌ Failed to start new round.');
      }

      setSubmitted(false);
      setAnswers({});
      setMessage('➡️ New round started!');
    } catch (err) {
      console.error('❌ handleNextRound error:', err);
      setMessage('❌ An error occurred.');
    }
  };

  useEffect(() => {
    const handleRoundStarted = ({ letter }) => {
      console.log("📥 Received roundStarted:", letter);
      setLetter(letter);
    };

    socket.on('roundStarted', handleRoundStarted);
    return () => socket.off('roundStarted', handleRoundStarted);
  }, []);

  return (
    <div className="game-board">
      <h2>Round {gameState.currentRound}</h2>
      <h3>Letter: {letter || gameState.currentLetter || 'Waiting...'}</h3>

      {!submitted && (
        <div className="answer-form">
          {gameState.categories.map((cat) => (
            <div key={cat}>
              <label>{cat}:</label>
              <input
                value={answers[cat] || ''}
                onChange={(e) => handleChange(cat, e.target.value)}
              />
            </div>
          ))}
          <button onClick={handleSubmit}>✅ Submit Answers</button>
        </div>
      )}

      {submitted && (
        <div className="submissions">
          <h3>Submissions</h3>
          {Object.entries(submissions).map(([player, ans], idx) => (
            <div key={idx}>
              <strong>{player}</strong>
              <ul>
                {Object.entries(ans).map(([cat, val]) => (
                  <li key={cat}>
                    {cat}: {val}
                  </li>
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
      )}

      {gameState.host === playerName && submitted && (
        <button onClick={handleNextRound}>➡️ Next Round</button>
      )}

      <div className="scores">
        <h3>Scores</h3>
        <ul>
          {Object.entries(gameState.scores).map(([player, score]) => (
            <li key={player}>
              {player}: {score}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default GameBoard;
