import React from 'react';

function GameBoard({ playerName, gameState, answers, setAnswers, setMessage, setGameState }) {
  const handleInputChange = (category, value) => {
    setAnswers((prev) => ({ ...prev, [category]: value }));
  };

  const handleSubmitAnswers = async () => {
    const allFilled = gameState.categories.every(
      (cat) => answers[cat] && answers[cat].trim() !== ''
    );
    if (!allFilled) return setMessage("❌ Fill all categories.");

    const invalidAnswers = gameState.categories.filter((cat) => {
      const answer = answers[cat]?.trim();
      const roundLetter = gameState.currentLetter?.toUpperCase();
      return !answer || answer[0].toUpperCase() !== roundLetter;
    });

    if (invalidAnswers.length > 0) {
      return setMessage(`❌ Answers for ${invalidAnswers.join(', ')} must start with ${gameState.currentLetter}`);
    }

    try {
      const res = await fetch('http://localhost:6464/submit-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: gameState.gameId, playerName, answers }),
      });
      const text = await res.text();
      setMessage("✅ " + text);
    } catch {
      setMessage("❌ Failed to submit.");
    }
  };

  const handleStartRound = async () => {
    try {
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
      setMessage(`🔤 New round! Letter: ${data.currentLetter}`);
    } catch {
      setMessage('❌ Error starting round.');
    }
  };

  return (
    <>
      <h3>🎲 Round {gameState.currentRound}</h3>
      {gameState.currentLetter && <p>🅰️ Letter: <b>{gameState.currentLetter}</b></p>}
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
        {gameState.host === playerName && <button onClick={handleStartRound}>🔄 Next Round</button>}
      </div>
      <div className="scores">
        <h4>🏆 Scores</h4>
        {Object.entries(gameState.scores).map(([player, score]) => (
          <p key={player}>{player}: {score}</p>
        ))}
      </div>
    </>
  );
}

export default GameBoard;
