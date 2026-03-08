# Louie — Real-Time Multiplayer Card Game

A polished, real-time multiplayer web version of the trick-taking card game **Louie**.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), Tailwind CSS, Framer Motion |
| Backend | Node.js, Express, Socket.IO |
| Language | TypeScript everywhere |
| Persistence | In-memory (Map + 24h TTL) |
| Monorepo | npm workspaces |

---

## Project Structure

```
louie-game/
├── shared/       ← Shared TypeScript types (compiled to dist/)
├── server/       ← Express + Socket.IO server (port 3001)
└── client/       ← Next.js app (port 3000)
```

---

## Running Locally

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher

### Install & start dev servers

```bash
# From the root of the project (louie-game/)
npm install

# Build the shared types package first (required once before dev)
npm run build --workspace=shared

# Start both server and client
npm run dev
```

This starts:
- **Server** at `http://localhost:3001`
- **Client** at `http://localhost:3000`

### Or start them separately

```bash
# Terminal 1
npm run dev:server

# Terminal 2
npm run dev:client
```

---

## How to Play (Quick Test)

1. Open **two browser windows** (regular + incognito).
2. **Window 1** — go to `http://localhost:3000`, click **Create Game**, enter a name.
3. **Window 2** — click **Join Game**, enter the 6-character Game ID shown in Window 1.
4. The host (Window 1) can click **Start Game** once 2+ players have joined.

---

## Running Tests

```bash
npm run test
```

---

## Deploying

See `.env.example` for required environment variables.

### Frontend → Vercel (one-click)

A `vercel.json` is included in `client/`. Just:

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → import your repo
3. Set **Root Directory** to `client`
4. Add environment variable: `NEXT_PUBLIC_SERVER_URL=https://your-render-server.onrender.com`
5. Deploy

### Backend → Render (one-click)

A `render.yaml` is included in the repo root. Just:

1. Go to [render.com](https://render.com) → **New** → **Blueprint**
2. Connect your GitHub repo — Render reads `render.yaml` automatically
3. Set the `CLIENT_URL` environment variable to your Vercel URL (e.g. `https://louie-game.vercel.app`)
4. Deploy

### Manual Render setup (alternative)

1. New **Web Service** → connect repo
2. Build command: `npm install && npm run build --workspace=shared && npm run build --workspace=server`
3. Start command: `npm start --workspace=server`
4. Add env vars: `CLIENT_URL`, `NODE_ENV=production`

---

## Architecture

### Server-authoritative state
All game state lives on the server. Clients only render what they receive. Every action is validated server-side.

### Private hands
The server sends each player their own hand separately. Spectators never see any hands.

### Reconnection
Players are identified by a stable `playerId` stored in `localStorage`. When a socket reconnects, the client sends `rejoin_game` and the server restores their state.

### Pause on disconnect
Disconnecting during an active game phase (dealing, bidding, trick play) pauses the game. It resumes when all players reconnect. The lobby phase never pauses.

### Seeded deck shuffle
Deck shuffling uses a Mulberry32 PRNG seeded with the game ID hash — reproducible deals for debugging.

---

## Milestones

| # | Status | Description |
|---|---|---|
| M1 | ✅ Done | Scaffolding, lobby, WebSocket connection, create/join |
| M2 | ✅ Done | Manual dealing, animated card counts, misdeal detection + auto-reset |
| M3 | ✅ Done | Trump reveal, hidden bidding, 3-2-1 countdown reveal |
| M4 | ✅ Done | Trick play, follow-suit enforcement, winner determination |
| M5 | ✅ Done | Scoring, scorecard modal, round transitions, game over screen |
| M6 | ✅ Done | Mobile responsive, card sweep animation, Vercel + Render deploy config |
