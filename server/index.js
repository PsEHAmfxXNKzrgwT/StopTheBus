const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;
const cors = require('cors');

app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
  res.send('Stop the Bus backend is running!');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// Game state with categories, players, and scores
let gameState = {
  players: [],
  currentRound: 1,
  scores: {},
  gameStarted: false,
  categories: ['Boy', 'Girl', 'Country', 'Food', 'Colour', 'Car', 'Movie / TV Show'], // 7 categories
};

// Start the game
app.post('/start-game', (req, res) => {
  gameState.gameStarted = true;
  gameState.players = []; // Empty players for a fresh game
  gameState.scores = {};
  gameState.currentRound = 1;
  res.status(200).json(gameState); // Return updated game state
});

// Add a player
app.post('/add-player', (req, res) => {
  const { playerName } = req.body;

  if (!playerName) {
    return res.status(400).send("Player name is required.");
  }

  if (!gameState.gameStarted) {
    gameState.players.push(playerName);
    gameState.scores[playerName] = 0; // Initialize score
    res.status(200).json(gameState); // Return updated game state
  } else {
    res.status(400).send("Game has already started!");
  }
});

// Start round (for simplicity, just increment the round)
app.post('/start-round', (req, res) => {
  if (gameState.players.length < 2) {
    return res.status(400).send("At least two players are required to start the round.");
  }

  if (!gameState.gameStarted) {
    return res.status(400).send("Game not started yet.");
  }

  const currentCategory = gameState.categories[gameState.currentRound - 1];
  gameState.currentRound++;

  res.status(200).json({ currentCategory, currentRound: gameState.currentRound });
});

app.use(express.json()); // Needed to parse JSON body

// Store submitted answers (in-memory)
gameState.submissions = {};

app.post('/submit-answers', (req, res) => {
  const { playerName, answers } = req.body;

  if (!gameState.players.includes(playerName)) {
    return res.status(400).send('Player not found');
  }

  gameState.submissions[playerName] = answers;
  res.status(200).send('Answers submitted successfully');
});


// Update scores for a player in the current round
app.post('/update-score', (req, res) => {
  const { playerName, score } = req.body;

  if (!gameState.players.includes(playerName)) {
    return res.status(400).send(`${playerName} is not a valid player.`);
  }

  if (!score && score !== 0) {
    return res.status(400).send("Score is required.");
  }

  gameState.scores[playerName] += score;
  res.status(200).json(gameState);
});
