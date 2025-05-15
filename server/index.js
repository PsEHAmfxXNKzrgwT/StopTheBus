const express = require('express');
const fs = require('fs');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 6464;

app.use(cors());
app.use(express.json());

const http = require('http');
const { Server } = require('socket.io');

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Make io available in routes
app.set('io', io);

// Confirm socket connections
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  socket.on('joinGame', ({ gameId, playerName }) => {
    socket.join(gameId);
    console.log(`📡 ${playerName} joined room ${gameId}`);

    const gameRoom = gameRooms[gameId];
    if (gameRoom) {
      if (!gameRoom.players.includes(playerName)) {
        gameRoom.players.push(playerName);
        gameRoom.scores[playerName] = 0;
      }
      io.to(gameId).emit('playerJoined', gameRoom); // ✅ always emit
    }

  });

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected:', socket.id);
  });
});

// Persistent in-memory store
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

loadGameRooms()
  .then(data => { gameRooms = data; })
  .catch(err => console.error('Error loading game rooms:', err));

// function generateShortGameId() {
//   return uuidv4();
// }

function generateShortGameId() {
  let id;
  do {
    id = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit number
  } while (gameRooms[id]); // ensure uniqueness
  return id;
}


function getRandomLetter() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return alphabet[Math.floor(Math.random() * alphabet.length)];
}

function handleError(res, message, statusCode = 400) {
  return res.status(statusCode).json({ success: false, message });
}

// Routes

app.post('/create-game', async (req, res) => {
  const { playerName } = req.body;
  if (!playerName) return handleError(res, "❌ Player name is required.");

  const newGameId = generateShortGameId();

  gameRooms[newGameId] = {
  gameId: newGameId,
  players: [playerName],
  host: playerName,
  gameStarted: false,
  currentRound: 0,
  currentLetter: null,
  categories: [], // ✅ start empty
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

app.post('/set-categories', (req, res) => {
  const { gameId, categories, playerName } = req.body;
  const gameRoom = gameRooms[gameId];

  

  if (!gameRoom) return res.status(404).json({ error: 'Game not found' });
  if (gameRoom.host !== playerName) return res.status(403).json({ error: 'Only the host can set categories' });

  gameRoom.categories = categories; // ✅ Must save this!
  res.json({ success: true, message: '✅ Categories saved' });
});


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
    gameRoom
  });
});

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

  io.to(gameId).emit('gameStarted', gameRoom); // ✅ send to all
  console.log(`🚦 Starting game ${gameId} with categories:`, gameRoom.categories);

  res.status(200).json({
    success: true,
    message: "🎮 Game started!",
    gameRoom,
  });
});

app.post('/start-round', async (req, res) => {
  const { gameId } = req.body;
  const gameRoom = gameRooms[gameId];

  if (!gameRoom) return handleError(res, "❌ Game not found.", 404);
  if (!gameRoom.gameStarted) return handleError(res, "❌ Game has not started.");

  const letter = getRandomLetter();
  gameRoom.currentLetter = letter;

  await saveGameRooms();

  io.to(gameId).emit('roundStarted', { letter }); // ✅ scoped emit

  res.status(200).json({
    success: true,
    currentRound: gameRoom.currentRound,
    currentLetter: letter,
  });
});

app.post('/submit-answers', async (req, res) => {
  const { gameId, playerName, answers } = req.body;
  if (!gameId || !playerName || !answers) return handleError(res, "❌ Game ID, playerName, and answers are required.");

  const gameRoom = gameRooms[gameId];
  if (!gameRoom) return handleError(res, "❌ Game not found.", 404);
  if (!gameRoom.gameStarted) return handleError(res, "❌ Game has not started.");
  if (gameRoom.submissions[playerName]) return handleError(res, "❌ Already submitted this round.");

  const allFilled = gameRoom.categories.every(cat => answers[cat] && answers[cat].trim() !== '');
  if (!allFilled) return handleError(res, "❌ All categories must be answered.");

  gameRoom.submissions[playerName] = answers;

  await saveGameRooms();

  res.status(200).json({
    success: true,
    message: "✅ Answers submitted successfully."
  });
});

app.get('/submissions', (req, res) => {
  const { gameId } = req.query;
  if (!gameId) return handleError(res, "❌ Game ID is required.");

  const gameRoom = gameRooms[gameId];
  if (!gameRoom) return handleError(res, "❌ Game not found.", 404);

  res.status(200).json(gameRoom.submissions || {});
});

app.post('/update-score', async (req, res) => {
  const { gameId, playerName, score } = req.body;
  if (!gameId || !playerName || typeof score !== 'number') {
    return handleError(res, "❌ Game ID, player name, and score are required.");
  }

  const gameRoom = gameRooms[gameId];
  if (!gameRoom || !gameRoom.players.includes(playerName)) {
    return handleError(res, "❌ Invalid player or game.");
  }

  gameRoom.scores[playerName] += score;
  await saveGameRooms();

  res.status(200).json({
    success: true,
    message: "✅ Score updated.",
    scores: gameRoom.scores
  });
});

app.post('/next-round', async (req, res) => {
  const { gameId, playerName } = req.body;
  const gameRoom = gameRooms[gameId];

  if (!gameRoom) return handleError(res, "❌ Game not found.", 404);
  if (!gameRoom.gameStarted) return handleError(res, "❌ Game has not started.");
  if (gameRoom.host !== playerName) return handleError(res, "❌ Only the host can start the round.");

  // ✅ Only increment if letter already exists (i.e. it's not the first round)
  if (gameRoom.currentLetter !== null) {
    gameRoom.currentRound += 1;
  }

  gameRoom.currentLetter = getRandomLetter();
  gameRoom.submissions = {};

  await saveGameRooms();

  io.to(gameId).emit('roundStarted', {
    letter: gameRoom.currentLetter,
    currentRound: gameRoom.currentRound,
  });

  res.status(200).json({
    success: true,
    message: "➡️ New round started.",
    currentRound: gameRoom.currentRound,
    currentLetter: gameRoom.currentLetter,
  });
});


app.get('/get-game', (req, res) => {
  const { gameId } = req.query;
  if (!gameId) return handleError(res, "❌ Game ID is required.");

  const gameRoom = gameRooms[gameId];
  if (!gameRoom) return handleError(res, "❌ Game not found.", 404);

  res.status(200).json({
    success: true,
    ...gameRoom,
  });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});
