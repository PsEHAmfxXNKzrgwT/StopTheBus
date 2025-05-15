import React, { useEffect, useState } from 'react';
import socket from '../socket';
import CategorySelector from './CategorySelector';

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
  const [selectedCategories, setSelectedCategories] = useState([]);
  const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:6464';

  const handleCreateGame = async () => {
    if (!playerName) return setMessage("❌ Please enter a player name.");
    try {
      const res = await fetch(`${BASE_URL}/create-game`, {
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
      const res = await fetch(`${BASE_URL}/join-game`, {
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

  const saveCategories = async () => {
    if (!selectedCategories.length) {
      return setMessage("❌ Please select at least one category.");
    }

    try {
      await fetch(`${BASE_URL}/set-categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: gameState.gameId,
          categories: selectedCategories,
          playerName,
        }),
      });
      setMessage("✅ Categories saved!");
    } catch {
      setMessage("❌ Failed to save categories.");
    }
  };

  const startGameWithCategories = async () => {
    await saveCategories();
    handleStartGame();
  };

  useEffect(() => {
    if (gameState.gameId && playerName) {
      socket.emit('joinGame', {
        gameId: gameState.gameId,
        playerName,
      });
    }
  }, [gameState.gameId, playerName]);

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
            <>
              <CategorySelector onSubmit={setSelectedCategories} />
              <button onClick={startGameWithCategories}>▶️ Start Game</button>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default Lobby;
