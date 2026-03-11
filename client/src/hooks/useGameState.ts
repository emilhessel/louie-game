'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  ClientGameState,
  ServerToClientEvents,
  ClientToServerEvents,
  LouieSession,
} from '@louie/shared';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3001';
const SESSION_KEY = 'louie_session';

// ─────────────────────────────────────────────
//  Session helpers
// ─────────────────────────────────────────────

export function saveSession(session: LouieSession) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {}
}

export function loadSession(): LouieSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as LouieSession) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}

// ─────────────────────────────────────────────
//  Hook
// ─────────────────────────────────────────────

type LouieSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

type ActionResult = { ok: true } | { ok: false; error: string };

interface UseGameStateReturn {
  gameState: ClientGameState | null;
  connected: boolean;
  error: string | null;
  /** Attempt to rejoin using a saved session. Returns true if successful. */
  tryRejoin: (session: LouieSession) => Promise<boolean>;
  /** Emit start_game. Host only. */
  startGame: (gameId: string) => Promise<ActionResult>;
  /** Emit deal_card. Dealer only. */
  dealCard: (gameId: string, targetPlayerId: string) => Promise<ActionResult>;
  /** Emit finish_dealing. Dealer only. */
  finishDealing: (gameId: string) => Promise<ActionResult>;
  /** Emit flip_trump. Dealer only. */
  flipTrump: (gameId: string) => Promise<ActionResult>;
  /** Emit place_bid. */
  placeBid: (gameId: string, bid: number) => Promise<ActionResult>;
  /** Emit play_card. */
  playCard: (gameId: string, cardId: string) => Promise<ActionResult>;
  /** Emit cancel_bid_countdown. Any player can call this. */
  cancelBidCountdown: (gameId: string) => Promise<ActionResult>;
  /** Emit ready_next_round. */
  readyNextRound: (gameId: string) => Promise<ActionResult>;
}

export function useGameState(): UseGameStateReturn {
  const socketRef = useRef<LouieSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create socket once on mount
  useEffect(() => {
    const socket: LouieSocket = io(SERVER_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
      setConnected(true);
      setError(null);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('game_state', (state) => {
      setGameState(state);
    });

    socket.on('error', ({ message }) => {
      setError(message);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const tryRejoin = useCallback(async (session: LouieSession): Promise<boolean> => {
    const socket = socketRef.current;
    if (!socket) return false;

    // Wait for connection if needed
    if (!socket.connected) {
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => resolve(), 5000);
        socket.once('connect', () => { clearTimeout(timeout); resolve(); });
      });
    }

    return new Promise((resolve) => {
      socket.emit(
        'rejoin_game',
        {
          gameId: session.gameId,
          playerName: session.playerName,
          playerId: session.playerId,
        },
        (res) => {
          if (res.ok) {
            resolve(true);
          } else {
            setError(res.error);
            resolve(false);
          }
        },
      );
    });
  }, []);

  const startGame = useCallback(async (gameId: string): Promise<ActionResult> => {
    const socket = socketRef.current;
    if (!socket) return { ok: false, error: 'Not connected.' };
    return new Promise(resolve => socket.emit('start_game', { gameId }, resolve));
  }, []);

  const dealCard = useCallback(async (gameId: string, targetPlayerId: string): Promise<ActionResult> => {
    const socket = socketRef.current;
    if (!socket) return { ok: false, error: 'Not connected.' };
    return new Promise(resolve => socket.emit('deal_card', { gameId, targetPlayerId }, resolve));
  }, []);

  const finishDealing = useCallback(async (gameId: string): Promise<ActionResult> => {
    const socket = socketRef.current;
    if (!socket) return { ok: false, error: 'Not connected.' };
    return new Promise(resolve => socket.emit('finish_dealing', { gameId }, resolve));
  }, []);

  const flipTrump = useCallback(async (gameId: string): Promise<ActionResult> => {
    const socket = socketRef.current;
    if (!socket) return { ok: false, error: 'Not connected.' };
    return new Promise(resolve => socket.emit('flip_trump', { gameId }, resolve));
  }, []);

  const placeBid = useCallback(async (gameId: string, bid: number): Promise<ActionResult> => {
    const socket = socketRef.current;
    if (!socket) return { ok: false, error: 'Not connected.' };
    return new Promise(resolve => socket.emit('place_bid', { gameId, bid }, resolve));
  }, []);

  const playCard = useCallback(async (gameId: string, cardId: string): Promise<ActionResult> => {
    const socket = socketRef.current;
    if (!socket) return { ok: false, error: 'Not connected.' };
    return new Promise(resolve => socket.emit('play_card', { gameId, cardId }, resolve));
  }, []);

  const cancelBidCountdown = useCallback(async (gameId: string): Promise<ActionResult> => {
    const socket = socketRef.current;
    if (!socket) return { ok: false, error: 'Not connected.' };
    return new Promise(resolve => socket.emit('cancel_bid_countdown', { gameId }, resolve));
  }, []);

  const readyNextRound = useCallback(async (gameId: string): Promise<ActionResult> => {
    const socket = socketRef.current;
    if (!socket) return { ok: false, error: 'Not connected.' };
    return new Promise(resolve => socket.emit('ready_next_round', { gameId }, resolve));
  }, []);

  return { gameState, connected, error, tryRejoin, startGame, dealCard, finishDealing, flipTrump, placeBid, playCard, cancelBidCountdown, readyNextRound };
}
