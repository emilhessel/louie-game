import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  CreateGameRequest,
  CreateGameResponse,
  JoinGameRequest,
  JoinGameResponse,
  ApiError,
} from '@louie/shared';
import { createGame, joinGame } from './gameRegistry';
import { registerSocketHandlers, broadcastGameState } from './socketHandlers';

// ─────────────────────────────────────────────
//  Config
// ─────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:3000';

// ─────────────────────────────────────────────
//  Express app
// ─────────────────────────────────────────────

const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

// ── Health check ─────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ ok: true, timestamp: Date.now() });
});

// ── Create game ──────────────────────────────
app.post('/api/games', (req, res) => {
  const { playerName, videoLink } = req.body as CreateGameRequest;

  if (!playerName?.trim()) {
    return res.status(400).json({ ok: false, error: 'Player name is required.' } satisfies ApiError);
  }
  const name = playerName.trim();
  if (name.length > 20) {
    return res.status(400).json({ ok: false, error: 'Name must be 20 characters or less.' } satisfies ApiError);
  }

  const result = createGame(name, videoLink);
  console.log(`[api] Created game ${result.gameId} for "${name}"`);
  return res.status(201).json({
    ok: true,
    gameId: result.gameId,
    playerId: result.playerId,
  } satisfies CreateGameResponse);
});

// ── Join game ────────────────────────────────
app.post('/api/games/:gameId/join', (req, res) => {
  const gameId = req.params.gameId.trim().toUpperCase();
  const { playerName, asSpectator = false } = req.body as JoinGameRequest;

  if (!playerName?.trim()) {
    return res.status(400).json({ ok: false, error: 'Player name is required.' } satisfies ApiError);
  }
  const name = playerName.trim();
  if (name.length > 20) {
    return res.status(400).json({ ok: false, error: 'Name must be 20 characters or less.' } satisfies ApiError);
  }

  const result = joinGame(gameId, name, asSpectator);
  if (!result.ok) {
    return res.status(400).json(result satisfies ApiError);
  }

  console.log(`[api] "${name}" joined ${gameId} as ${result.role}`);
  return res.status(200).json({
    ok: true,
    playerId: result.playerId,
    role: result.role,
  } satisfies JoinGameResponse);
});

// ─────────────────────────────────────────────
//  Socket.IO
// ─────────────────────────────────────────────

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
  },
});

io.on('connection', socket => {
  console.log(`[socket] connected: ${socket.id}`);
  registerSocketHandlers(io, socket);
});

// ─────────────────────────────────────────────
//  Start
// ─────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`\n🃏  Louie server running on http://localhost:${PORT}`);
  console.log(`    Accepting connections from ${CLIENT_URL}\n`);
});
