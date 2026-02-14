import { nanoid } from 'nanoid';
import { getRandomWordPair, suggestRoles } from './words.js';

const MAX_PLAYERS = 15;
const MIN_PLAYERS = 3;

export const PHASES = {
  LOBBY: 'lobby',
  DESCRIPTION: 'description',
  DISCUSSION: 'discussion',
  ELIMINATION: 'elimination',
  BLANK_GUESS: 'blank_guess',
  ROUND_END: 'round_end',
  ENDED: 'ended',
};

// In-memory games (keyed by inviteCode). Persisted to MongoDB for invite validation.
const games = new Map();

function assignRoles(playerIds, counts) {
  const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
  const roles = {};
  let i = 0;
  for (let n = 0; n < counts.crew && i < shuffled.length; n++) roles[shuffled[i++]] = 'crew';
  for (let n = 0; n < counts.blur && i < shuffled.length; n++) roles[shuffled[i++]] = 'blur';
  for (let n = 0; n < counts.blank && i < shuffled.length; n++) roles[shuffled[i++]] = 'blank';
  return roles;
}

function assignWords(roles, crewWord, blurWord) {
  const words = {};
  for (const [id, role] of Object.entries(roles)) {
    if (role === 'crew') words[id] = crewWord;
    else if (role === 'blur') words[id] = blurWord;
    else words[id] = null; // blank
  }
  return words;
}

export function createGame(hostStableId, hostSocketId, hostName, inviteCode) {
  const game = {
    inviteCode,
    hostId: hostStableId,
    players: [{ id: hostStableId, socketId: hostSocketId, name: hostName, score: 0 }],
    phase: PHASES.LOBBY,
    round: 0,
    wordPair: null,
    roles: {},
    words: {},
    eliminated: [],
    descriptionOrder: [],
    descriptions: {},
    votes: {},
    blankGuess: null,
    winner: null,
    createdAt: Date.now(),
  };
  games.set(inviteCode, game);
  return game;
}

export function getGame(inviteCode) {
  return games.get(inviteCode) || null;
}

export function addPlayer(inviteCode, socketId, playerName) {
  const game = games.get(inviteCode);
  if (!game || game.phase !== PHASES.LOBBY) return null;
  if (game.players.length >= MAX_PLAYERS) return null;
  if (game.players.some((p) => p.socketId === socketId || p.name.toLowerCase() === playerName.toLowerCase())) return null;
  const stableId = nanoid();
  game.players.push({ id: stableId, socketId, name: playerName, score: 0 });
  return { game, newPlayerId: stableId };
}

export function removePlayer(inviteCode, socketId) {
  const game = games.get(inviteCode);
  if (!game) return;
  if (game.phase === PHASES.LOBBY) {
    const removed = game.players.find((p) => p.socketId === socketId);
    game.players = game.players.filter((p) => p.socketId !== socketId);
    if (removed && game.hostId === removed.id && game.players.length) game.hostId = game.players[0].id;
    if (game.players.length === 0) games.delete(inviteCode);
  }
}

export function updatePlayerSocket(inviteCode, playerId, newSocketId) {
  const game = games.get(inviteCode);
  if (!game) return null;
  const p = game.players.find((x) => x.id === playerId);
  if (!p) return null;
  p.socketId = newSocketId;
  return game;
}

export function canStart(game) {
  return game && game.phase === PHASES.LOBBY && game.players.length >= MIN_PLAYERS && game.hostId;
}

export function startGame(inviteCode) {
  const game = games.get(inviteCode);
  if (!canStart(game)) return null;
  const playerIds = game.players.map((p) => p.id);
  const counts = suggestRoles(playerIds.length);
  const [crewWord, blurWord] = getRandomWordPair();
  game.wordPair = [crewWord, blurWord];
  game.roles = assignRoles(playerIds, counts);
  game.words = assignWords(game.roles, crewWord, blurWord);
  game.phase = PHASES.DESCRIPTION;
  game.round = 1;
  game.eliminated = [];
  game.descriptionOrder = [...playerIds].sort(() => Math.random() - 0.5);
  game.descriptions = {};
  game.votes = {};
  game.blankGuess = null;
  return game;
}

export function getAlivePlayerIds(game) {
  return game.players.filter((p) => !game.eliminated.includes(p.id)).map((p) => p.id);
}

export function submitDescription(inviteCode, playerId, text) {
  const game = games.get(inviteCode);
  if (!game || game.phase !== PHASES.DESCRIPTION) return null;
  game.descriptions[playerId] = (text || '').trim().slice(0, 50);
  return game;
}

export function allDescriptionsIn(game) {
  const alive = getAlivePlayerIds(game);
  return alive.every((id) => game.descriptions[id] != null && game.descriptions[id] !== '');
}

export function moveToDiscussion(inviteCode) {
  const game = games.get(inviteCode);
  if (!game || game.phase !== PHASES.DESCRIPTION || !allDescriptionsIn(game)) return null;
  game.phase = PHASES.DISCUSSION;
  return game;
}

export function moveToElimination(inviteCode) {
  const game = games.get(inviteCode);
  if (!game || game.phase !== PHASES.DISCUSSION) return null;
  game.phase = PHASES.ELIMINATION;
  game.votes = {};
  return game;
}

export function submitVote(inviteCode, voterId, targetId) {
  const game = games.get(inviteCode);
  if (!game || game.phase !== PHASES.ELIMINATION) return null;
  const alive = getAlivePlayerIds(game);
  if (!alive.includes(voterId) || !alive.includes(targetId)) return null;
  game.votes[voterId] = targetId;
  return game;
}

export function allVotesIn(game) {
  const alive = getAlivePlayerIds(game);
  return alive.every((id) => game.votes[id] != null);
}

function countVotes(game) {
  const tally = {};
  for (const targetId of Object.values(game.votes)) tally[targetId] = (tally[targetId] || 0) + 1;
  let max = 0;
  let eliminatedId = null;
  for (const [id, count] of Object.entries(tally)) {
    if (count > max) {
      max = count;
      eliminatedId = id;
    }
  }
  // Tie: pick first player with max votes (deterministic)
  if (!eliminatedId && Object.keys(tally).length > 0) {
    const maxCount = Math.max(...Object.values(tally));
    eliminatedId = Object.entries(tally).find(([, c]) => c === maxCount)?.[0] ?? null;
  }
  return eliminatedId;
}

export function resolveElimination(inviteCode) {
  const game = games.get(inviteCode);
  if (!game || game.phase !== PHASES.ELIMINATION || !allVotesIn(game)) return null;
  const eliminatedId = countVotes(game);
  if (!eliminatedId) return null;
  game.eliminated.push(eliminatedId);
  const role = game.roles[eliminatedId];
  if (role === 'blank') {
    game.phase = PHASES.BLANK_GUESS;
    game.blankGuess = { playerId: eliminatedId };
    return game;
  }
  return checkWinAndNextRound(inviteCode);
}

export function submitBlankGuess(inviteCode, guess) {
  const game = games.get(inviteCode);
  if (!game || game.phase !== PHASES.BLANK_GUESS || !game.blankGuess) return null;
  const crewWord = game.wordPair[0];
  const correct = (guess || '').trim().toLowerCase() === crewWord.toLowerCase();
  game.blankGuess.guess = guess;
  game.blankGuess.correct = correct;
  if (correct) {
    game.winner = 'blur'; // blank wins with blur
    game.phase = PHASES.ENDED;
    addScores(game, 'blur');
    return game;
  }
  return checkWinAndNextRound(inviteCode);
}

function addScores(game, winnerGroup) {
  const points = { crew: 2, blur: 10, blank: 6 };
  for (const p of game.players) {
    const role = game.roles[p.id];
    if (winnerGroup === 'crew' && (role === 'blur' || role === 'blank')) continue;
    if ((winnerGroup === 'blur' || winnerGroup === 'blank') && role === 'crew') continue;
    p.score = (p.score || 0) + (points[role] || 0);
  }
}

function checkWinAndNextRound(inviteCode) {
  const game = games.get(inviteCode);
  const alive = getAlivePlayerIds(game);
  const aliveCrew = alive.filter((id) => game.roles[id] === 'crew').length;
  const aliveBlur = alive.filter((id) => game.roles[id] === 'blur').length;
  const aliveBlank = alive.filter((id) => game.roles[id] === 'blank').length;

  if (aliveBlur === 0 && aliveBlank === 0) {
    game.winner = 'crew';
    game.phase = PHASES.ENDED;
    addScores(game, 'crew');
    return game;
  }
  if (aliveCrew <= 1) {
    game.winner = 'blur';
    game.phase = PHASES.ENDED;
    addScores(game, 'blur');
    return game;
  }

  game.phase = PHASES.ROUND_END;
  game.votes = {};
  game.descriptions = {};
  return game;
}

export function nextRound(inviteCode) {
  const game = games.get(inviteCode);
  if (!game || game.phase !== PHASES.ROUND_END) return null;
  game.phase = PHASES.DESCRIPTION;
  game.round += 1;
  game.descriptionOrder = getAlivePlayerIds(game).sort(() => Math.random() - 0.5);
  return game;
}

export function getPublicGame(inviteCode, playerId) {
  const game = games.get(inviteCode);
  if (!game) return null;
  const playersPublic = game.players.map((p) => ({ id: p.id, name: p.name, score: p.score ?? 0 }));
  const publicGame = {
    inviteCode: game.inviteCode,
    hostId: game.hostId,
    players: playersPublic,
    phase: game.phase,
    round: game.round,
    eliminated: game.eliminated,
    descriptionOrder: game.descriptionOrder,
    descriptions: game.descriptions,
    votes: game.votes,
    winner: game.winner,
    blankGuess: game.blankGuess ? { playerId: game.blankGuess.playerId, guess: game.blankGuess.guess, correct: game.blankGuess.correct } : null,
  };
  if (playerId && game.players.some((p) => p.id === playerId)) {
    publicGame.myPlayerId = playerId;
    publicGame.myRole = game.roles[playerId] ?? null;
    publicGame.myWord = game.words[playerId] !== undefined ? game.words[playerId] : undefined;
  }
  if (game.phase === PHASES.ENDED) {
    publicGame.wordPair = game.wordPair;
  }
  return publicGame;
}

export function persistGame(game) {
  return games.set(game.inviteCode, game);
}

export { MAX_PLAYERS, MIN_PLAYERS };
