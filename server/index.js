const express = require('express');
const fs = require('fs');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid'); // For generating unique game IDs (you can remove this if not needed)

const app = express();
const PORT = process.env.PORT || 6464;

app.use(cors());
app.use(express.json());

// Store active games (lobbies)
let gameRooms = {}; // Structure: { gameId: { players: [], gameStarted: false, currentRound: 1, ...} }

// Load previous game rooms if available
function loadGameRooms() {
  try {
    const data = fs.readFileSync('gameRooms.json');
    return JSON.parse(data);
  } catch (err) {
    console.warn('⚠️ No saved gameRooms.json found, starting fresh.');
    return {};
  }
}

// Save game rooms to file
function saveGameRooms() {
  fs.writeFileSync('gameRooms.json', JSON.stringify(gameRooms, null, 2));
}

gameRooms = loadGameRooms();

// Auto-save middleware
app.use((req, res, next) => {
  saveGameRooms();
  next();
});

// Function to generate a short random game ID
function generateShortGameId(length = 4) {
  const characters = '123456789'; // Only numbers 1-9
  let gameId = '';
  for (let i = 0; i < length; i++) {
    gameId += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return gameId;
}

// Create a game (host a game)
app.post('/create-game', (req, res) => {
  const { playerName } = req.body;
  if (!playerName) return res.status(400).send("❌ Player name is required.");

  const newGameId = generateShortGameId(); // Generate a shorter game ID

  gameRooms[newGameId] = {
    gameId: newGameId,
    players: [playerName],
    gameStarted: false,
    currentRound: 1,
    categories: ['Boy', 'Girl', 'Country', 'Food', 'Colour', 'Car', 'Movie / TV Show'],
    submissions: {},
    scores: { [playerName]: 0 },
  };

  res.status(200).json({
    message: "✅ Game created successfully!",
    gameId: newGameId,  // Send back the short game ID
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
  gameRoom.scores = gameRoom.players.reduce((acc, player) => {
    acc[player] = 0;
    return acc;
  }, {});

  res.status(200).send("🎮 Game started!");
});

// Start a round
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
  
  const requiredCategories = gameRoom.categories;
  const allFilled = requiredCategories.every(
    (cat) => answers[cat] && answers[cat].trim() !== ''
  );

  if (!allFilled) {
    return res.status(400).send("❌ All categories must be answered.");
  }

  gameRoom.submissions[playerName] = answers;
  console.log(`📨 Received answers from ${playerName}:`, answers);

  res.status(200).send("✅ Answers submitted successfully.");
});

// Get submissions for a game
app.get('/submissions', (req, res) => {
  const { gameId } = req.query;

  if (!gameId) return res.status(400).send("❌ Game ID is required.");

  const gameRoom = gameRooms[gameId];
  if (!gameRoom) return res.status(404).send("❌ Game not found.");

  res.status(200).json(gameRoom.submissions || {});
});

// Update score for a player
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
  res.status(200).json({ message: "✅ Score updated.", scores: gameRoom.scores });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});


app.get('/get-game', (req, res) => {
  const { gameId } = req.query;

  if (!gameId) return res.status(400).send("❌ Game ID is required.");

  const gameRoom = gameRooms[gameId];
  if (!gameRoom) return res.status(404).send("❌ Game not found.");

  res.status(200).json(gameRoom);
});
