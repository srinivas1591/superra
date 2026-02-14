# Super Ra

Multiplayer word deduction game (3–15 players). No login; join via invite link. Uses MongoDB for invite validation and scores.

## Run locally

1. **Env**  
   Copy `.env.example` to `.env` in the project root and set:
   - `MONGO_DSN` – your MongoDB connection string  
   - `MONGO_DB_DATABASE` – e.g. `superra`  
   - `FRONTEND_URL` – `http://localhost:5173` for local dev  

2. **Install**  
   From project root:
   ```bash
   npm run install:all
   ```

3. **Start**  
   - One terminal: `npm run dev` (runs server + client together), or  
   - Terminal 1: `npm run dev:server` (server on port 3001)  
   - Terminal 2: `npm run dev:client` (client on port 5173)  

4. **Play**  
   Open http://localhost:5173. Create a game, share the invite link (or code). Join from another device/browser using the same link. Start when you have at least 3 players.

## Deploy

**Netlify hosts only the frontend.** The game needs a long‑running Node server with WebSockets, which Netlify does not provide. So you need two deploys:

### 1. Frontend on Netlify (free)

- In Netlify: **New site → Import from Git** (or drag `client` folder).
- **Base directory:** `client`
- **Build command:** `npm run build` (or leave blank; `client/netlify.toml` sets it)
- **Publish directory:** `dist`
- **Environment variable:** `VITE_API_URL` = your backend URL (e.g. `https://super-ra-api.onrender.com`). Required so the client can connect to the game server.

The repo has `client/netlify.toml` so SPA routes work (e.g. `/play/ABC`).

### 2. Backend elsewhere (free tier options)

Deploy the **root** of this repo (Node server) to a service that runs a persistent process and allows WebSockets, e.g.:

- **Render** – free tier, WebSockets supported
- **Railway** – free tier
- **Fly.io** – free tier

Set on the backend:

- `PORT` (often provided by the host)
- `MONGO_DSN`, `MONGO_DB_DATABASE`
- `FRONTEND_URL` = your Netlify URL (e.g. `https://your-app.netlify.app`) for CORS and Socket.io

Then use that backend URL as `VITE_API_URL` in Netlify.

## Roles (in-game names)

See `server/constants.js` and `client/src/constants.js` to change display names.

- **Manchodu** (crew) – same secret word; find and eliminate Massgod & Dongazook.  
- **Massgod** (blur) – different word; survive to the end.  
- **Dongazook** (blank) – no word; survive or guess the Manchodu word if eliminated.
