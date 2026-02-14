# Deploy Super Ra (free)

Do **Backend first**, then **Frontend**, so you can paste the backend URL into the frontend.

---

## Part 1: Backend on Render

1. **Push your code to GitHub** (if not already).
   - Make sure `.env` is **not** committed (it’s in `.gitignore`). You’ll add secrets in Render.

2. **Go to [render.com](https://render.com)** and sign up (free).

3. **New → Web Service**.

4. **Connect your repo** (GitHub) and select the `undercover` (or your repo) repository.

5. **Settings:**
   - **Name:** `super-ra-api` (or any name).
   - **Region:** Pick closest to you.
   - **Root Directory:** leave **empty** (repo root has `server/` and `package.json`).
   - **Runtime:** Node.
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`

6. **Environment variables** (Add → paste each):
   - `MONGO_DSN` = your MongoDB Atlas connection string (e.g. `mongodb+srv://user:pass@cluster0.xxx.mongodb.net/?retryWrites=true`)
   - `MONGO_DB_DATABASE` = `superra`
   - `FRONTEND_URL` = leave empty for now; you’ll set it after Netlify deploy (e.g. `https://your-app.netlify.app`)

7. Click **Create Web Service**. Wait for the first deploy to finish.

8. **Copy your backend URL** (e.g. `https://super-ra-api.onrender.com`). You’ll need it for the frontend and for `FRONTEND_URL`.

9. **Set `FRONTEND_URL` on Render:**
   - Render dashboard → your service → **Environment**.
   - Add or edit: `FRONTEND_URL` = `https://YOUR-NETLIFY-SITE.netlify.app` (you’ll get this in Part 2).

---

## Part 2: Frontend on Netlify

1. **Go to [netlify.com](https://netlify.com)** and sign up (free).

2. **Add new site → Import an existing project** → connect the same GitHub repo.

3. **Settings:**
   - **Base directory:** `client` if your repo root contains the `client` folder; if your repo root is `games` and the app is in `undercover`, use `undercover/client`.
   - **Build command:** `npm run build` (or leave blank; `client/netlify.toml` sets it).
   - **Publish directory:** `dist` (or leave blank; netlify.toml sets it).

4. **Environment variables** → New variable:
   - **Key:** `VITE_API_URL`
   - **Value:** your Render backend URL **with no trailing slash** (e.g. `https://super-ra-api.onrender.com`)

5. **Deploy site.** Wait for the build to finish.

6. **Copy your site URL** (e.g. `https://random-name-123.netlify.app`).

7. **Go back to Render** and set:
   - `FRONTEND_URL` = your Netlify site URL (e.g. `https://random-name-123.netlify.app`).
   - Save. Render will redeploy so CORS and Socket.io allow your frontend.

---

## Done

- **Frontend:** Open your Netlify URL. Create a game and share the link.
- **Backend:** Render free tier sleeps after ~15 min of no traffic; the first visit after that may take 30–60 seconds to wake up.

---

## Optional: Custom domain

- **Netlify:** Site settings → Domain management → Add custom domain.
- **Render:** No custom domain needed unless you want a different API URL; then use their paid tier or a reverse proxy.
