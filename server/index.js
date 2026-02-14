import './loadEnv.js';
import { createServer } from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { connectDb } from './db.js';
import { nanoid } from 'nanoid';
import {
  createGame,
  getGame,
  addPlayer,
  removePlayer,
  updatePlayerSocket,
  canStart,
  startGame,
  getPublicGame,
  submitDescription,
  allDescriptionsIn,
  moveToDiscussion,
  moveToElimination,
  submitVote,
  allVotesIn,
  resolveElimination,
  submitBlankGuess,
  nextRound,
  PHASES,
} from './gameState.js';
import { validateInviteCode, saveGameToDb, saveScoresToDb, deleteGameFromDb, loadActiveGamesFromDb } from './gameStore.js';
import { validateName, validateClue, validateBlankGuess, LIMITS } from './validation.js';

const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: FRONTEND_URL, methods: ['GET', 'POST'] },
});

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', FRONTEND_URL);
  next();
});

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/api/game/:code', async (req, res) => {
  const result = await validateInviteCode(req.params.code.toUpperCase());
  if (!result.valid) return res.status(404).json({ error: 'Invalid invite code' });
  return res.json(result);
});

function emitGameToRoom(code) {
  const game = getGame(code);
  if (!game || !game.players.length) return;
  for (const p of game.players) {
    if (!p.socketId) continue;
    const s = io.sockets.sockets.get(p.socketId);
    if (s) s.emit('game', getPublicGame(code, p.id));
  }
}

io.on('connection', (socket) => {
  socket.on('create', async ({ inviteCode, name }) => {
    const code = (inviteCode || '').toString().toUpperCase().slice(0, LIMITS.INVITE_CODE_MAX_LENGTH);
    if (!code) {
      socket.emit('error', { message: 'Invite code required' });
      return;
    }
    const nameResult = validateName(name);
    if (!nameResult.valid) {
      socket.emit('error', { message: nameResult.error });
      return;
    }
    let game = getGame(code);
    if (game) {
      socket.emit('error', { message: 'This code is already in use' });
      return;
    }
    const hostStableId = nanoid();
    game = createGame(hostStableId, socket.id, nameResult.value, code);
    await saveGameToDb(game);
    socket.join(code);
    socket.gameCode = code;
    socket.playerId = hostStableId;
    socket.emit('joined', { inviteCode: code, isHost: true, game: getPublicGame(code, hostStableId) });
    emitGameToRoom(code);
  });

  socket.on('join', async ({ inviteCode, name }) => {
    const code = (inviteCode || '').toString().toUpperCase().slice(0, LIMITS.INVITE_CODE_MAX_LENGTH);
    if (!code) {
      socket.emit('error', { message: 'Invite code required' });
      return;
    }
    const nameResult = validateName(name);
    if (!nameResult.valid) {
      socket.emit('error', { message: nameResult.error });
      return;
    }
    const validation = await validateInviteCode(code);
    if (!validation.valid || !validation.canJoin) {
      socket.emit('error', { message: validation.valid ? 'Game full or already started' : 'Invalid invite code' });
      return;
    }
    let game = getGame(code);
    if (!game) {
      socket.emit('error', { message: 'Game not found. Ask the host to create a new game.' });
      return;
    }
    const addResult = addPlayer(code, socket.id, nameResult.value);
    if (!addResult) {
      socket.emit('error', { message: 'Could not join (full or duplicate name)' });
      return;
    }
    game = addResult.game;
    const newPlayerId = addResult.newPlayerId;
    await saveGameToDb(game);
    socket.join(code);
    socket.gameCode = code;
    socket.playerId = newPlayerId;
    socket.emit('joined', { inviteCode: code, isHost: false, game: getPublicGame(code, newPlayerId) });
    emitGameToRoom(code);
  });

  socket.on('reconnect', async ({ inviteCode: codeParam, playerId }) => {
    const code = (codeParam || socket.gameCode || '').toString().toUpperCase().slice(0, 8);
    if (!code || !playerId) return;
    let game = getGame(code);
    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }
    const updated = updatePlayerSocket(code, playerId, socket.id);
    if (!updated) {
      socket.emit('error', { message: 'Player not in this game' });
      return;
    }
    socket.join(code);
    socket.gameCode = code;
    socket.playerId = playerId;
    await saveGameToDb(updated);
    socket.emit('joined', { inviteCode: code, isHost: game.hostId === playerId, game: getPublicGame(code, playerId) });
    emitGameToRoom(code);
  });

  socket.on('start', async () => {
    const code = socket.gameCode;
    if (!code) return;
    const game = getGame(code);
    if (!game || game.hostId !== socket.playerId || !canStart(game)) {
      socket.emit('error', { message: 'Only host can start with at least 3 players' });
      return;
    }
    startGame(code);
    await saveGameToDb(game);
    emitGameToRoom(code);
  });

  socket.on('description', ({ text }) => {
    const code = socket.gameCode;
    if (!code) return;
    const clueResult = validateClue(text);
    if (!clueResult.valid) {
      socket.emit('error', { message: clueResult.error });
      return;
    }
    submitDescription(code, socket.playerId, clueResult.value);
    emitGameToRoom(code);
  });

  socket.on('phase:discussion', () => {
    const code = socket.gameCode;
    if (!code) return;
    const game = getGame(code);
    if (!game || game.hostId !== socket.playerId) return;
    const updated = moveToDiscussion(code);
    if (updated) emitGameToRoom(code);
  });

  socket.on('phase:elimination', () => {
    const code = socket.gameCode;
    if (!code) return;
    const game = getGame(code);
    if (!game || game.hostId !== socket.playerId) return;
    moveToElimination(code);
    emitGameToRoom(code);
  });

  socket.on('vote', ({ targetId }) => {
    const code = socket.gameCode;
    if (!code) return;
    submitVote(code, socket.playerId, targetId);
    emitGameToRoom(code);
  });

  socket.on('resolve', async () => {
    const code = socket.gameCode;
    if (!code) return;
    const game = getGame(code);
    if (!game || game.hostId !== socket.playerId) return;
    if (game.phase !== PHASES.ELIMINATION || !allVotesIn(game)) return;
    resolveElimination(code);
    const updated = getGame(code);
    if (updated?.phase === PHASES.ENDED) {
      await saveScoresToDb(updated);
      await deleteGameFromDb(code);
    } else {
      await saveGameToDb(updated);
    }
    emitGameToRoom(code);
  });

  socket.on('blankGuess', async ({ guess }) => {
    const code = socket.gameCode;
    if (!code) return;
    const game = getGame(code);
    const isBlank = game?.blankGuess?.playerId === socket.playerId;
    if (!game || game.phase !== PHASES.BLANK_GUESS || !isBlank) return;
    const guessResult = validateBlankGuess(guess);
    if (!guessResult.valid) {
      socket.emit('error', { message: guessResult.error });
      return;
    }
    submitBlankGuess(code, guessResult.value);
    const updated = getGame(code);
    if (updated?.phase === PHASES.ENDED) {
      await saveScoresToDb(updated);
      await deleteGameFromDb(code);
    }
    emitGameToRoom(code);
  });

  socket.on('nextRound', async () => {
    const code = socket.gameCode;
    if (!code) return;
    const game = getGame(code);
    if (!game || game.hostId !== socket.playerId) return;
    nextRound(code);
    const updated = getGame(code);
    await saveGameToDb(updated);
    emitGameToRoom(code);
  });

  socket.on('disconnect', () => {
    const code = socket.gameCode;
    if (code) {
      removePlayer(code, socket.id);
      const game = getGame(code);
      if (game) {
        saveGameToDb(game);
        emitGameToRoom(code);
      }
    }
  });
});

async function main() {
  try {
    await connectDb();
    console.log('MongoDB connected');
    await loadActiveGamesFromDb();
    console.log('Active games loaded from DB');
  } catch (e) {
    console.warn('MongoDB not connected:', e.message);
  }
  httpServer.listen(PORT, () => {
    console.log(`Super Ra server at http://localhost:${PORT}`);
  });
}

main();
