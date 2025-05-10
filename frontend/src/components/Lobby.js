import React from 'react';

function Lobby({
  playerName,
  setPlayerName,
  gameIdInput,
  setGameIdInput,
  setGameState,
  gameState,
  setMessage,
  handleStartGame,
  handleStartRound,
}) {
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
        host: playerName,
        gameStarted: false,
      }));
      setMessage(`✅ Game created! Your game ID is: ${data.gameId}`);
    } catch {
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
        host: data.gameRoom.host,
      }));
      setMessage(`✅ Joined game ${gameIdInput}`);
    } catch {
      setMessage("❌ Couldn't join game.");
    }
  };

  return (
    <div className="lobby-container">
      {!gameState.gameId && (
        <>
          <input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Your name"
          />
          <input
            value={gameIdInput}
            onChange={(e) => setGameIdInput(e.target.value)}
            placeholder="Game ID to join"
          />
          <button onClick={handleJoinGame}>🎮 Join</button>
          <button onClick={handleCreateGame}>🚀 Create</button>
        </>
      )}

      {gameState.gameId && (
        <>
          <h3>👥 Players List</h3>
          <ul>
            {gameState.players.map((player, i) => (
              <li key={i}>{player}</li>
            ))}
          </ul>

          {gameState.host === playerName && (
            <button onClick={handleStartGame}>▶️ Start Game</button>
          )}
        </>
      )}
    </div>
  );
}

export default Lobby;
