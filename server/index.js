const express = require('express');
const fs = require('fs');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 6464;

app.use(cors());
app.use(express.json());


let gameRooms = {};

function loadGameRooms() {
  return new Promise((resolve, reject) => {
    fs.readFile('gameRooms.json', 'utf8', (err, data) => {
      if (err) {
        console.warn('⚠️ No saved gameRooms.json found, starting fresh.');
        return resolve({});
      }
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(new Error('Failed to parse saved game rooms.'));
      }
    });
  });
}

function saveGameRooms() {
  return new Promise((resolve, reject) => {
    fs.writeFile('gameRooms.json', JSON.stringify(gameRooms, null, 2), 'utf8', (err) => {
      if (err) reject(err);
      resolve();
    });
  });
}

process.on('SIGINT', async () => {
  console.log('💾 Saving gameRooms before shutdown...');
  await saveGameRooms();
  process.exit();
});

loadGameRooms().then(data => {
  gameRooms = data;
}).catch(err => {
  console.error('Error loading game rooms:', err);
});

function generateShortGameId() {
  return uuidv4();  // Using uuid for better uniqueness
}

function getRandomLetter() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return alphabet[Math.floor(Math.random() * alphabet.length)];
}

function handleError(res, message, statusCode = 400) {
  return res.status(statusCode).json({
    success: false,
    message
  });
}

// Create a game
app.post('/create-game', async (req, res) => {
  const { playerName } = req.body;
  if (!playerName) return handleError(res, "❌ Player name is required.");

  const newGameId = generateShortGameId();

  gameRooms[newGameId] = {
    gameId: newGameId,
    players: [playerName],
    host: playerName,
    gameStarted: false,
    currentRound: 1,
    currentLetter: null,
    categories: ['Boy', 'Girl', 'Country', 'Food', 'Colour', 'Car', 'Movie / TV Show'],
    submissions: {},
    scores: { [playerName]: 0 },
  };

  await saveGameRooms();
  res.status(200).json({
    success: true,
    message: "✅ Game created successfully!",
    gameId: newGameId,
    host: playerName,
  });
});

// Join a game
app.post('/join-game', async (req, res) => {
  const { gameId, playerName } = req.body;
  if (!gameId || !playerName) return handleError(res, "❌ Game ID and player name are required.");

  const gameRoom = gameRooms[gameId];
  if (!gameRoom) return handleError(res, "❌ Game not found.", 404);
  if (gameRoom.gameStarted) return handleError(res, "❌ Game has already started.");
  if (gameRoom.players.includes(playerName)) return handleError(res, "❌ Player already joined.");

  gameRoom.players.push(playerName);
  gameRoom.scores[playerName] = 0;

  await saveGameRooms();
  res.status(200).json({
    success: true,
    message: `✅ ${playerName} joined game ${gameId}`,
    gameRoom: {
      ...gameRoom,
      host: gameRoom.host,
    }
  });
});

// Start the game (host only)
app.post('/start-game', async (req, res) => {
  const { gameId, playerName } = req.body;
  const gameRoom = gameRooms[gameId];

  if (!gameRoom) return handleError(res, "❌ Game not found.", 404);
  if (gameRoom.gameStarted) return handleError(res, "❌ Game already started.");
  if (gameRoom.players.length < 1) return handleError(res, "❌ At least 1 player is required.");
  if (gameRoom.host !== playerName) return handleError(res, "❌ Only the host can start the game.");

  gameRoom.gameStarted = true;
  gameRoom.currentRound = 1;
  gameRoom.currentLetter = null;
  gameRoom.submissions = {};
  gameRoom.scores = Object.fromEntries(gameRoom.players.map(p => [p, 0]));

  await saveGameRooms();
  res.status(200).json({
    success: true,
    message: "🎮 Game started!"
  });
});

// Start a round
app.post('/start-round', async (req, res) => {
  const { gameId } = req.body;
  const gameRoom = gameRooms[gameId];

  if (!gameRoom) return handleError(res, "❌ Game not found.", 404);
  if (!gameRoom.gameStarted) return handleError(res, "❌ Game has not started.");

const letter = getRandomLetter();
gameRoom.currentLetter = letter;
io.emit('roundStarted', { letter });

  await saveGameRooms();

  res.status(200).json({
    success: true,
    currentRound: gameRoom.currentRound,
    currentLetter: letter,
  });
});

// Submit answers
app.post('/submit-answers', async (req, res) => {
  const { gameId, playerName, answers } = req.body;
  if (!gameId || !playerName || !answers) return handleError(res, "❌ Game ID, playerName, and answers are required.");

  const gameRoom = gameRooms[gameId];
  if (!gameRoom) return handleError(res, "❌ Game not found.", 404);
  if (!gameRoom.gameStarted) return handleError(res, "❌ Game has not started.");
  if (gameRoom.submissions[playerName]) return handleError(res, "❌ Already submitted this round.");

  const requiredCategories = gameRoom.categories;
  const allFilled = requiredCategories.every(cat => answers[cat] && answers[cat].trim() !== '');

  if (!allFilled) {
    return handleError(res, "❌ All categories must be answered.");
  }

  gameRoom.submissions[playerName] = answers;
  await saveGameRooms();

  res.status(200).json({
    success: true,
    message: "✅ Answers submitted successfully."
  });
});

// Get submissions
app.get('/submissions', (req, res) => {
  const { gameId } = req.query;
  if (!gameId) return handleError(res, "❌ Game ID is required.");

  const gameRoom = gameRooms[gameId];
  if (!gameRoom) return handleError(res, "❌ Game not found.", 404);

  res.status(200).json(gameRoom.submissions || {});
});

// Update score
app.post('/update-score', async (req, res) => {
  const { gameId, playerName, score } = req.body;
  if (!gameId || !playerName || typeof score !== 'number') {
    return handleError(res, "❌ Game ID, player name, and score are required.");
  }

  const gameRoom = gameRooms[gameId];
  if (!gameRoom) return handleError(res, "❌ Game not found.", 404);
  if (!gameRoom.players.includes(playerName)) {
    return handleError(res, "❌ Invalid player.");
  }

  gameRoom.scores[playerName] += score;
  await saveGameRooms();

  res.status(200).json({
    success: true,
    message: "✅ Score updated.",
    scores: gameRoom.scores
  });
});

// Advance to next round
app.post('/next-round', async (req, res) => {
  const { gameId, playerName } = req.body;
  const gameRoom = gameRooms[gameId];

  if (!gameRoom) return handleError(res, "❌ Game not found.", 404);
  if (!gameRoom.gameStarted) return handleError(res, "❌ Game has not started.");
  if (gameRoom.host !== playerName) return handleError(res, "❌ Only the host can start the round.");

  const allPlayersSubmitted = gameRoom.players.every(player => player in gameRoom.submissions);
  if (!allPlayersSubmitted) {
    return handleError(res, "⏳ Not all players have submitted.");
  }

  gameRoom.currentRound += 1;
  gameRoom.currentLetter = null;
  gameRoom.submissions = {};

  await saveGameRooms();
  res.status(200).json({
    success: true,
    message: "➡️ Moved to next round."
  });
});

// Get full game state
app.get('/get-game', (req, res) => {
  const { gameId } = req.query;
  if (!gameId) return handleError(res, "❌ Game ID is required.");

  const gameRoom = gameRooms[gameId];
  if (!gameRoom) return handleError(res, "❌ Game not found.", 404);

  res.status(200).json({
    success: true,
    ...gameRoom,
    host: gameRoom.host,
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on ${process.env.BACKEND_URL || `http://0.0.0.0:${PORT}`}`);
});
