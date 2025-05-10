import React, { useState, useEffect } from 'react';

function GameBoard({ gameState, playerName, answers, setAnswers, setMessage }) {
  const [submissions, setSubmissions] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (category, value) => {
    setAnswers((prev) => ({ ...prev, [category]: value }));
  };

  const handleSubmit = async () => {
    if (submitted) return setMessage('✅ Already submitted!');
    const res = await fetch('http://localhost:6464/submit-answers', {
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
    const res = await fetch(`http://localhost:6464/submissions?gameId=${gameState.gameId}`);
    const data = await res.json();
    setSubmissions(data);
  };

  const handleUpdateScore = async (player, delta) => {
    const res = await fetch('http://localhost:6464/update-score', {
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
    const res = await fetch('http://localhost:6464/next-round', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: gameState.gameId,
        playerName,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setSubmitted(false);
      setAnswers({});
      setMessage('➡️ Moved to next round.');
    } else {
      setMessage(data.message || '❌ Failed to move to next round.');
    }
  };

  useEffect(() => {
    if (!gameState.gameId) return;
    const interval = setInterval(() => {
      fetchSubmissions();
    }, 3000);
    return () => clearInterval(interval);
  }, [gameState.gameId]);

  return (
    <div className="game-board">
      <h2>Round {gameState.currentRound}</h2>
      <h3>Letter: {gameState.currentLetter || 'Waiting...'}</h3>

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
