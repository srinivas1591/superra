import { MongoClient } from 'mongodb';

const MONGO_DSN = process.env.MONGO_DSN || '';
const MONGO_DB_DATABASE = process.env.MONGO_DB_DATABASE || 'superra';

let client = null;
let db = null;

export async function connectDb() {
  if (db) return db;
  if (!MONGO_DSN) throw new Error('MONGO_DSN is required');
  client = new MongoClient(MONGO_DSN);
  await client.connect();
  db = client.db(MONGO_DB_DATABASE);
  return db;
}

export function getDb() {
  return db;
}

export async function closeDb() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
