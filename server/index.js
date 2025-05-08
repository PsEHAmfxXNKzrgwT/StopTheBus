const express = require('express');
const fs = require('fs');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();  // Load environment variables

const app = express();
const PORT = process.env.PORT || 6464;  // Use environment variable or default to 6464

app.use(cors());
app.use(express.json());

let gameRooms = {};

// Load gameRooms from file
function loadGameRooms() {
  try {
    const data = fs.readFileSync('gameRooms.json');
    return JSON.parse(data);
  } catch {
    console.warn('⚠️ No saved gameRooms.json found, starting fresh.');
    return {};
  }
}

// Save gameRooms to file
function saveGameRooms() {
  fs.writeFileSync('gameRooms.json', JSON.stringify(gameRooms, null, 2));
}

// Graceful shutdown saving
process.on('SIGINT', () => {
  console.log('💾 Saving gameRooms before shutdown...');
  saveGameRooms();
  process.exit();
});

gameRooms = loadGameRooms();

// Generate short numeric game ID
function generateShortGameId(length = 4) {
  const characters = '123456789';
  let gameId = '';
  for (let i = 0; i < length; i++) {
    gameId += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return gameId;
}

// Create a game
app.post('/create-game', (req, res) => {
  const { playerName } = req.body;
  if (!playerName) return res.status(400).send("❌ Player name is required.");

  const newGameId = generateShortGameId();

  gameRooms[newGameId] = {
    gameId: newGameId,
    players: [playerName],
    gameStarted: false,
    currentRound: 1,
    categories: ['Boy', 'Girl', 'Country', 'Food', 'Colour', 'Car', 'Movie / TV Show'],
    submissions: {},
    scores: { [playerName]: 0 },
  };

  saveGameRooms();
  res.status(200).json({
    message: "✅ Game created successfully!",
    gameId: newGameId,
  });
});

// Join a game
app.post('/join-game', (req, res) => {
  const { gameId, playerName } = req.body;
  if (!gameId || !playerName) return res.status(400).send("❌ Game ID and player name are required.");

  const gameRoom = gameRooms[gameId];
  if (!gameRoom) return res.status(404).send("❌ Game not found.");
  if (gameRoom.gameStarted) return res.status(400).send("❌ Game has already started.");
  if (gameRoom.players.includes(playerName)) return res.status(400).send("❌ Player already joined.");

  gameRoom.players.push(playerName);
  gameRoom.scores[playerName] = 0;

  saveGameRooms();
  res.status(200).json({ message: `✅ ${playerName} joined game ${gameId}`, gameRoom });
});

// Start the game
app.post('/start-game', (req, res) => {
  const { gameId } = req.body;
  const gameRoom = gameRooms[gameId];

  if (!gameRoom) return res.status(404).send("❌ Game not found.");
  if (gameRoom.gameStarted) return res.status(400).send("❌ Game already started.");
  if (gameRoom.players.length < 1) return res.status(400).send("❌ At least 1 player is required.");

  gameRoom.gameStarted = true;
  gameRoom.currentRound = 1;
  gameRoom.submissions = {};
  gameRoom.scores = Object.fromEntries(gameRoom.players.map(p => [p, 0]));

  saveGameRooms();
  res.status(200).send("🎮 Game started!");
});

// Start a round (return category)
app.post('/start-round', (req, res) => {
  const { gameId } = req.body;
  const gameRoom = gameRooms[gameId];

  if (!gameRoom) return res.status(404).send("❌ Game not found.");
  if (!gameRoom.gameStarted) return res.status(400).send("❌ Game has not started.");

  const categoryIndex = gameRoom.currentRound - 1;
  if (categoryIndex >= gameRoom.categories.length) {
    return res.status(400).send("✅ Game has finished all rounds.");
  }

  const currentCategory = gameRoom.categories[categoryIndex];
  res.status(200).json({
    currentCategory,
    currentRound: gameRoom.currentRound,
  });
});

// Submit answers
app.post('/submit-answers', (req, res) => {
  const { gameId, playerName, answers } = req.body;
  if (!gameId || !playerName || !answers) {
    return res.status(400).send("❌ Game ID, playerName, and answers are required.");
  }

  const gameRoom = gameRooms[gameId];
  if (!gameRoom) return res.status(404).send("❌ Game not found.");
  if (!gameRoom.gameStarted) return res.status(400).send("❌ Game has not started.");
  if (gameRoom.submissions[playerName]) return res.status(400).send("❌ Already submitted this round.");

  const requiredCategories = gameRoom.categories;
  const allFilled = requiredCategories.every(cat => answers[cat] && answers[cat].trim() !== '');

  if (!allFilled) {
    return res.status(400).send("❌ All categories must be answered.");
  }

  gameRoom.submissions[playerName] = answers;
  saveGameRooms();

  res.status(200).send("✅ Answers submitted successfully.");
});

// Get submissions
app.get('/submissions', (req, res) => {
  const { gameId } = req.query;
  if (!gameId) return res.status(400).send("❌ Game ID is required.");

  const gameRoom = gameRooms[gameId];
  if (!gameRoom) return res.status(404).send("❌ Game not found.");

  res.status(200).json(gameRoom.submissions || {});
});

// Update score
app.post('/update-score', (req, res) => {
  const { gameId, playerName, score } = req.body;
  if (!gameId || !playerName || typeof score !== 'number') {
    return res.status(400).send("❌ Game ID, player name, and score are required.");
  }

  const gameRoom = gameRooms[gameId];
  if (!gameRoom) return res.status(404).send("❌ Game not found.");
  if (!gameRoom.players.includes(playerName)) {
    return res.status(400).send("❌ Invalid player.");
  }

  gameRoom.scores[playerName] += score;
  saveGameRooms();

  res.status(200).json({ message: "✅ Score updated.", scores: gameRoom.scores });
});

// Advance to next round
app.post('/next-round', (req, res) => {
  const { gameId } = req.body;
  const gameRoom = gameRooms[gameId];

  if (!gameRoom) return res.status(404).send("❌ Game not found.");
  if (!gameRoom.gameStarted) return res.status(400).send("❌ Game has not started.");

  const allPlayersSubmitted = gameRoom.players.every(player => player in gameRoom.submissions);
  if (!allPlayersSubmitted) {
    return res.status(400).send("⏳ Not all players have submitted.");
  }

  gameRoom.currentRound += 1;
  gameRoom.submissions = {};

  saveGameRooms();
  res.status(200).send("➡️ Moved to next round.");
});

// Get full game state
app.get('/get-game', (req, res) => {
  const { gameId } = req.query;
  if (!gameId) return res.status(400).send("❌ Game ID is required.");

  const gameRoom = gameRooms[gameId];
  if (!gameRoom) return res.status(404).send("❌ Game not found.");

  res.status(200).json(gameRoom);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on ${process.env.BACKEND_URL || `http://0.0.0.0:${PORT}`}`);
});

