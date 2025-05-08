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
  try {
    const data = fs.readFileSync('gameRooms.json');
    return JSON.parse(data);
  } catch {
    console.warn('⚠️ No saved gameRooms.json found, starting fresh.');
    return {};
  }
}

function saveGameRooms() {
  fs.writeFileSync('gameRooms.json', JSON.stringify(gameRooms, null, 2));
}

process.on('SIGINT', () => {
  console.log('💾 Saving gameRooms before shutdown...');
  saveGameRooms();
  process.exit();
});

gameRooms = loadGameRooms();

function generateShortGameId(length = 4) {
  const characters = '123456789';
  let gameId = '';
  for (let i = 0; i < length; i++) {
    gameId += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return gameId;
}

function getRandomLetter() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return alphabet[Math.floor(Math.random() * alphabet.length)];
}

// Create a game
app.post('/create-game', (req, res) => {
  const { playerName } = req.body;
  if (!playerName) return res.status(400).send("❌ Player name is required.");

  const newGameId = generateShortGameId();

  gameRooms[newGameId] = {
    gameId: newGameId,
    players: [playerName],
    host: playerName, // <-- add this
    gameStarted: false,
    currentRound: 1,
    currentLetter: null,
    categories: ['Boy', 'Girl', 'Country', 'Food', 'Colour', 'Car', 'Movie / TV Show'],
    submissions: {},
    scores: { [playerName]: 0 },
  };
  
  

  saveGameRooms();
  res.status(200).json({
    message: "✅ Game created successfully!",
    gameId: newGameId,
    host: playerName, // ✅ Return host
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
  res.status(200).json({
    message: `✅ ${playerName} joined game ${gameId}`,
    gameRoom: {
      ...gameRoom,
      host: gameRoom.host, // ✅ Return host
    }
  });
});

// Start the game (host only)
app.post('/start-game', (req, res) => {
  const { gameId, playerName } = req.body;
  const gameRoom = gameRooms[gameId];

  if (!gameRoom) return res.status(404).send("❌ Game not found.");
  if (gameRoom.gameStarted) return res.status(400).send("❌ Game already started.");
  if (gameRoom.players.length < 1) return res.status(400).send("❌ At least 1 player is required.");
  if (gameRoom.host !== playerName) return res.status(403).send("❌ Only the host can start the game."); // ✅ Host check

  gameRoom.gameStarted = true;
  gameRoom.currentRound = 1;
  gameRoom.currentLetter = null;
  gameRoom.submissions = {};
  gameRoom.scores = Object.fromEntries(gameRoom.players.map(p => [p, 0]));

  saveGameRooms();
  res.status(200).send("🎮 Game started!");
});

// Start a round
app.post('/start-round', (req, res) => {
  const { gameId } = req.body;
  const gameRoom = gameRooms[gameId];

  if (!gameRoom) return res.status(404).send("❌ Game not found.");
  if (!gameRoom.gameStarted) return res.status(400).send("❌ Game has not started.");

  const letter = getRandomLetter();
  gameRoom.currentLetter = letter;

  saveGameRooms();

  res.status(200).json({
    currentRound: gameRoom.currentRound,
    currentLetter: letter,
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
  if (gameRoom.host !== playerName) return res.status(403).send("❌ Only the host can start the round.");


  const allPlayersSubmitted = gameRoom.players.every(player => player in gameRoom.submissions);
  if (!allPlayersSubmitted) {
    return res.status(400).send("⏳ Not all players have submitted.");
  }

  gameRoom.currentRound += 1;
  gameRoom.currentLetter = null;
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

  res.status(200).json({
    ...gameRoom,
    host: gameRoom.host, // ✅ Include host info
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on ${process.env.BACKEND_URL || `http://0.0.0.0:${PORT}`}`);
});
