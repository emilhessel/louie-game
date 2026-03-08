import { Server, Socket } from 'socket.io';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from '@louie/shared';
import {
  getGame,
  getClientState,
  rejoinGame,
  handleDisconnect,
  startGame,
  dealCard,
  finishDealing,
  resetForReDeal,
  flipTrump,
  placeBid,
  revealBids,
  advanceToTrickPlay,
  playCard,
  sweepTrick,
  scoreRound,
  readyForNextRound,
  advanceToNextRound,
} from './gameRegistry';

type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type Sock = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

// ─────────────────────────────────────────────
//  Bid countdown (server-orchestrated)
// ─────────────────────────────────────────────

/**
 * Runs a 3 → 2 → 1 countdown, then reveals bids, then advances to trick play.
 * Each step takes exactly 1 second; after reveal, 2 more seconds before trick play.
 */
function startBidCountdown(io: IO, gameId: string): void {
  const steps = [3, 2, 1] as const;
  let step = 0;

  function tick() {
    const game = getGame(gameId);
    if (!game || !game.round) return;

    if (step < steps.length) {
      game.round.bidCountdown = steps[step];
      broadcastGameState(io, gameId);
      step++;
      setTimeout(tick, 1000);
    } else {
      // Countdown finished — reveal bids
      revealBids(gameId);
      broadcastGameState(io, gameId);

      // After 2s, advance to trick play
      setTimeout(() => {
        advanceToTrickPlay(gameId);
        broadcastGameState(io, gameId);
      }, 2000);
    }
  }

  setTimeout(tick, 1000); // 1s pause after last bid before "3" appears
}

// ─────────────────────────────────────────────
//  Broadcast helpers
// ─────────────────────────────────────────────

/**
 * Send personalized game state to every connected member of the game room.
 * Players each get their own private hand; spectators get an empty hand.
 */
export function broadcastGameState(io: IO, gameId: string): void {
  const game = getGame(gameId);
  if (!game) return;

  for (const player of game.players) {
    if (!player.socketId) continue;
    const state = getClientState(game, player.id);
    io.to(player.socketId).emit('game_state', state);
  }

  for (const [socketId, entry] of Object.entries(game.socketMap)) {
    if (entry.role === 'spectator') {
      const state = getClientState(game, '');
      io.to(socketId).emit('game_state', state);
    }
  }
}

// ─────────────────────────────────────────────
//  Register all handlers for a socket
// ─────────────────────────────────────────────

export function registerSocketHandlers(io: IO, socket: Sock): void {
  // ── Rejoin (used by game page on load) ──────────────────────────────────
  socket.on('rejoin_game', ({ gameId, playerName, playerId }, callback) => {
    const gId = gameId.trim().toUpperCase();
    const result = rejoinGame(gId, playerName, playerId, socket.id);

    if (!result.ok) {
      callback({ ok: false, error: result.error });
      return;
    }

    socket.data.gameId = gId;
    socket.data.playerId = playerId;
    socket.data.role = result.role;

    socket.join(gId);
    broadcastGameState(io, gId);
    callback({ ok: true });

    console.log(`[socket] ${playerName} rejoined ${gId} as ${result.role}`);
  });

  // ── Start game (host only) ───────────────────────────────────────────────
  socket.on('start_game', ({ gameId }, callback) => {
    const playerId = socket.data.playerId;
    if (!playerId) {
      callback({ ok: false, error: 'You are not in a game.' });
      return;
    }

    const result = startGame(gameId, playerId);
    if (!result.ok) {
      callback({ ok: false, error: result.error });
      return;
    }

    broadcastGameState(io, gameId);
    callback({ ok: true });
    console.log(`[game] ${gameId} started by ${playerId}`);
  });

  // ── Deal one card (dealer only) ──────────────────────────────────────────
  socket.on('deal_card', ({ gameId, targetPlayerId }, callback) => {
    const playerId = socket.data.playerId;
    if (!playerId) { callback({ ok: false, error: 'Not in a game.' }); return; }

    const result = dealCard(gameId, playerId, targetPlayerId);
    if (!result.ok) { callback({ ok: false, error: result.error }); return; }

    broadcastGameState(io, gameId);
    callback({ ok: true });
  });

  // ── Finish dealing (dealer only) ─────────────────────────────────────────
  socket.on('finish_dealing', ({ gameId }, callback) => {
    const playerId = socket.data.playerId;
    if (!playerId) { callback({ ok: false, error: 'Not in a game.' }); return; }

    const result = finishDealing(gameId, playerId);
    if (!result.ok) { callback({ ok: false, error: result.error }); return; }

    broadcastGameState(io, gameId);
    callback({ ok: true });

    if (result.misdeal) {
      // After 3 seconds, reset and re-broadcast so clients can deal again
      setTimeout(() => {
        resetForReDeal(gameId);
        broadcastGameState(io, gameId);
      }, 3000);
    }
  });

  // ── Flip trump (dealer only — trump_reveal phase) ────────────────────────
  socket.on('flip_trump', ({ gameId }, callback) => {
    const playerId = socket.data.playerId;
    if (!playerId) { callback({ ok: false, error: 'Not in a game.' }); return; }

    const result = flipTrump(gameId, playerId);
    if (!result.ok) { callback({ ok: false, error: result.error }); return; }

    broadcastGameState(io, gameId);
    callback({ ok: true });
  });

  // ── Place bid ────────────────────────────────────────────────────────────
  socket.on('place_bid', ({ gameId, bid }, callback) => {
    const playerId = socket.data.playerId;
    if (!playerId) { callback({ ok: false, error: 'Not in a game.' }); return; }

    const result = placeBid(gameId, playerId, bid);
    if (!result.ok) { callback({ ok: false, error: result.error }); return; }

    broadcastGameState(io, gameId);
    callback({ ok: true });

    // All bids in → run 3-2-1 countdown then reveal
    if (result.allBid) {
      startBidCountdown(io, gameId);
    }
  });

  // ── Play a card ─────────────────────────────────────────────────────────
  socket.on('play_card', ({ gameId, cardId }, callback) => {
    const playerId = socket.data.playerId;
    if (!playerId) { callback({ ok: false, error: 'Not in a game.' }); return; }

    const result = playCard(gameId, playerId, cardId);
    if (!result.ok) { callback({ ok: false, error: result.error }); return; }

    broadcastGameState(io, gameId);
    callback({ ok: true });

    if (result.trickComplete) {
      // Pause 1.5s so clients can see the completed trick and winner
      setTimeout(() => {
        sweepTrick(gameId);

        if (result.roundComplete) {
          scoreRound(gameId);
          broadcastGameState(io, gameId); // phase = round_complete

          // Fallback: auto-advance after 30s if players haven't all readied up
          setTimeout(() => {
            const game = getGame(gameId);
            if (game && game.phase === 'round_complete') {
              advanceToNextRound(gameId);
              broadcastGameState(io, gameId);
            }
          }, 30000);
        } else {
          broadcastGameState(io, gameId); // phase = trick_play, fresh trick
        }
      }, 1500);
    }
  });

  // ── Ready for next round ────────────────────────────────────────────────
  socket.on('ready_next_round', ({ gameId }, callback) => {
    const playerId = socket.data.playerId;
    if (!playerId) { callback({ ok: false, error: 'Not in a game.' }); return; }

    const result = readyForNextRound(gameId, playerId);
    if (!result.ok) { callback({ ok: false, error: result.error }); return; }

    broadcastGameState(io, gameId);
    callback({ ok: true });

    if (result.allReady) {
      advanceToNextRound(gameId);
      broadcastGameState(io, gameId);
    }
  });

  // ── Disconnect ───────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const result = handleDisconnect(socket.id);
    if (result) {
      broadcastGameState(io, result.gameId);
      console.log(`[socket] ${socket.id} disconnected from ${result.gameId}`);
    }
  });
}
