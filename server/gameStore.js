import { getDb } from './db.js';
import { getGame, persistGame, PHASES } from './gameState.js';

const COLL = 'games';

function gameToDoc(game) {
  return {
    inviteCode: game.inviteCode,
    hostId: game.hostId,
    players: game.players,
    phase: game.phase,
    round: game.round,
    wordPair: game.wordPair,
    roles: game.roles,
    words: game.words,
    eliminated: game.eliminated,
    descriptionOrder: game.descriptionOrder,
    descriptions: game.descriptions,
    votes: game.votes,
    winner: game.winner,
    blankGuess: game.blankGuess,
    createdAt: game.createdAt,
    updatedAt: Date.now(),
  };
}

export async function saveGameToDb(game) {
  const db = getDb();
  if (!db) return;
  await db.collection(COLL).updateOne(
    { inviteCode: game.inviteCode },
    { $set: gameToDoc(game) },
    { upsert: true }
  );
}

export async function deleteGameFromDb(inviteCode) {
  const db = getDb();
  if (!db) return;
  await db.collection(COLL).deleteOne({ inviteCode });
}

function docToGame(doc) {
  if (!doc) return null;
  const players = (doc.players || []).map((p) => ({
    id: p.id,
    socketId: null,
    name: p.name,
    score: p.score ?? 0,
  }));
  return {
    inviteCode: doc.inviteCode,
    hostId: doc.hostId,
    players,
    phase: doc.phase,
    round: doc.round ?? 0,
    wordPair: doc.wordPair,
    roles: doc.roles ?? {},
    words: doc.words ?? {},
    eliminated: doc.eliminated ?? [],
    descriptionOrder: doc.descriptionOrder ?? [],
    descriptions: doc.descriptions ?? {},
    votes: doc.votes ?? {},
    winner: doc.winner,
    blankGuess: doc.blankGuess,
    createdAt: doc.createdAt,
  };
}

export async function loadActiveGamesFromDb() {
  const db = getDb();
  if (!db) return;
  const cursor = db.collection(COLL).find({ phase: { $ne: PHASES.ENDED } });
  for await (const doc of cursor) {
    const game = docToGame(doc);
    if (game) persistGame(game);
  }
}

export async function findGameByCode(inviteCode) {
  const db = getDb();
  if (!db) return null;
  const doc = await db.collection(COLL).findOne({ inviteCode });
  return doc;
}

export async function validateInviteCode(inviteCode) {
  const inMemory = getGame(inviteCode);
  if (inMemory) {
    const isLobby = inMemory.phase === PHASES.LOBBY;
    const canJoin = isLobby && inMemory.players.length < 15;
    return {
      valid: true,
      canJoin,
      playerCount: inMemory.players.length,
      hostName: inMemory.players[0]?.name,
    };
  }
  const doc = await findGameByCode(inviteCode);
  if (!doc) return { valid: false };
  const isLobby = doc.phase === PHASES.LOBBY;
  const canJoin = isLobby && (doc.players?.length ?? 0) < 15;
  return {
    valid: true,
    canJoin,
    playerCount: doc.players?.length ?? 0,
    hostName: doc.players?.[0]?.name,
  };
}

export async function saveScoresToDb(game) {
  const db = getDb();
  if (!db) return;
  for (const p of game.players) {
    await db.collection('profiles').updateOne(
      { gameId: game.inviteCode, playerId: p.id },
      {
        $set: {
          gameId: game.inviteCode,
          playerId: p.id,
          name: p.name,
          score: p.score,
          updatedAt: Date.now(),
        },
      },
      { upsert: true }
    );
  }
}
