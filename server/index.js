const express = require('express');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 6464;

app.use(cors());
app.use(express.json());

let gameState = {
  players: [],
  currentRound: 1,
  scores: {},
  gameStarted: false,
  categories: ['Boy', 'Girl', 'Country', 'Food', 'Colour', 'Car', 'Movie / TV Show'],
  submissions: {},
};

// Load previous state if available
function loadGameState() {
  try {
    const data = fs.readFileSync('gameState.json');
    return JSON.parse(data);
  } catch (err) {
    console.warn('⚠️ No saved gameState.json found, starting fresh.');
    return gameState;
  }
}

// Save state to file
function saveGameState() {
  fs.writeFileSync('gameState.json', JSON.stringify(gameState, null, 2));
}

gameState = loadGameState();

// Auto-save middleware
app.use((req, res, next) => {
  saveGameState();
  next();
});

app.get('/', (req, res) => {
  res.send('🚦 Stop the Bus backend is running!');
});

// Add player
app.post('/add-player', (req, res) => {
  const { playerName } = req.body;
  if (!playerName) return res.status(400).send("❌ Player name is required.");

  if (gameState.players.includes(playerName)) {
    return res.status(400).send("❌ Player already exists.");
  }

  if (!gameState.gameStarted) {
    gameState.players.push(playerName);
    gameState.scores[playerName] = 0;
    res.status(200).json({ message: "✅ Player added.", gameState });
  } else {
    res.status(400).send("❌ Game already started.");
  }
});

// Start game
app.post('/start-game', (req, res) => {
  if (gameState.players.length < 1) {
    return res.status(400).send("❌ At least 1 player is required.");
  }

  gameState.gameStarted = true;
  gameState.currentRound = 1;
  gameState.submissions = {};
  gameState.scores = gameState.players.reduce((acc, player) => {
    acc[player] = 0;
    return acc;
  }, {});

  res.status(200).send("🎮 Game started!");
});

// Start round
app.post('/start-round', (req, res) => {
  if (!gameState.gameStarted) {
    return res.status(400).send("❌ Game has not started.");
  }

  const categoryIndex = gameState.currentRound - 1;
  if (categoryIndex >= gameState.categories.length) {
    return res.status(400).send("✅ Game has finished all rounds.");
  }

  const currentCategory = gameState.categories[categoryIndex];
  res.status(200).json({
    currentCategory,
    currentRound: gameState.currentRound,
  });
});

// Submit answers
app.post('/submit-answers', (req, res) => {
  const { playerName, answers } = req.body;

  if (!playerName || !answers) {
    return res.status(400).send("❌ playerName and answers are required.");
  }

  const requiredCategories = gameState.categories;
  const allFilled = requiredCategories.every(
    (cat) => answers[cat] && answers[cat].trim() !== ''
  );

  if (!allFilled) {
    return res.status(400).send("❌ All categories must be answered.");
  }

  gameState.submissions[playerName] = answers;
  console.log(`📨 Received answers from ${playerName}:`, answers);

  res.status(200).send("✅ Answers submitted successfully.");
});

// Get submissions
app.get('/submissions', (req, res) => {
  res.status(200).json(gameState.submissions || {});
});

// Update score
app.post('/update-score', (req, res) => {
  const { playerName, score } = req.body;

  if (!gameState.players.includes(playerName)) {
    return res.status(400).send("❌ Invalid player.");
  }

  if (typeof score !== 'number') {
    return res.status(400).send("❌ Score must be a number.");
  }

  gameState.scores[playerName] += score;
  res.status(200).json({ message: "✅ Score updated.", scores: gameState.scores });
});

// Start next round
app.post('/next-round', (req, res) => {
  if (!gameState.gameStarted) {
    return res.status(400).send("❌ Game not started.");
  }

  if (gameState.currentRound >= gameState.categories.length) {
    return res.status(400).send("✅ All rounds are complete.");
  }

  gameState.currentRound++;
  const newCategory = gameState.categories[gameState.currentRound - 1];

  res.status(200).json({
    message: "➡️ Next round started!",
    currentCategory: newCategory,
    currentRound: gameState.currentRound,
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
