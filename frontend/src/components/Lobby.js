import React, { useEffect } from 'react';
import socket from '../socket';

function Lobby({
  playerName,
  setPlayerName,
  gameIdInput,
  setGameIdInput,
  setGameState,
  gameState,
  setMessage,
  handleStartGame,
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

      setGameState({
        gameId: data.gameId,
        players: [playerName],
        host: playerName,
        gameStarted: false,
        scores: {},
      });

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

      setGameState({
        gameId: gameIdInput,
        players: data.gameRoom.players,
        host: data.gameRoom.host,
        gameStarted: data.gameRoom.gameStarted,
        scores: data.gameRoom.scores,
      });

      setMessage(`✅ Joined game ${gameIdInput}`);
    } catch {
      setMessage("❌ Couldn't join game.");
    }
  };

  // ✅ Emit joinGame when gameId and playerName are ready (applies to host and players)
  useEffect(() => {
    if (gameState.gameId && playerName) {
      socket.emit('joinGame', {
        gameId: gameState.gameId,
        playerName,
      });
    }
  }, [gameState.gameId, playerName]);

  // 👂 Listen for playerJoined socket event
  useEffect(() => {
    socket.on('playerJoined', (updatedGameRoom) => {
      setGameState((prev) => ({
        ...prev,
        players: updatedGameRoom.players,
        scores: updatedGameRoom.scores,
      }));
    });

    return () => socket.off('playerJoined');
  }, [setGameState]);

  // 👂 Listen for gameStarted socket event
  useEffect(() => {
    socket.on('gameStarted', (updatedGameRoom) => {
      setGameState(updatedGameRoom);
    });

    return () => socket.off('gameStarted');
  }, [setGameState]);

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
