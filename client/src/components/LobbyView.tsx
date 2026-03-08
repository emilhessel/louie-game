'use client';

import { useState, useCallback } from 'react';
import { ClientGameState } from '@louie/shared';
import SeatCard from './SeatCard';
import EventLog from './EventLog';

interface LobbyViewProps {
  gameState: ClientGameState;
  onStartGame: () => Promise<{ ok: true } | { ok: false; error: string }>;
}

const MAX_SEATS = 5;

export default function LobbyView({ gameState, onStartGame }: LobbyViewProps) {
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/game/${gameState.gameId}`
      : `/game/${gameState.gameId}`;

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text
    }
  }, [shareUrl]);

  const handleStart = useCallback(async () => {
    setStarting(true);
    setStartError(null);
    const res = await onStartGame();
    setStarting(false);
    if (!res.ok) setStartError(res.error);
  }, [onStartGame]);

  const myPlayer = gameState.players.find(p => p.id === gameState.myPlayerId);
  const isHost = gameState.myPlayerId === gameState.hostId;
  const canStart = isHost && gameState.players.length >= 2;

  // Build seats array (always show 5 slots)
  const seats = Array.from({ length: MAX_SEATS }, (_, i) =>
    gameState.players.find(p => p.seatIndex === i),
  );

  return (
    <div className="felt-bg min-h-screen flex flex-col items-center py-8 px-4">

      {/* Header */}
      <div className="mb-8 text-center">
        <h1
          className="text-4xl md:text-5xl font-bold text-gold mb-1"
          style={{ fontFamily: 'var(--font-playfair)' }}
        >
          ♠ LOUIE ♥
        </h1>
        <p className="text-cream/50 text-sm tracking-widest uppercase">Lobby</p>
      </div>

      <div className="w-full max-w-3xl space-y-5">

        {/* Game ID + Share */}
        <div className="panel px-5 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <p className="text-xs text-cream/40 uppercase tracking-widest mb-1">Game ID</p>
              <p
                className="text-3xl font-bold text-gold tracking-[0.2em] font-mono"
              >
                {gameState.gameId}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <button onClick={copyLink} className="btn-secondary text-sm">
                {copied ? '✓ Copied!' : '⎘ Copy Invite Link'}
              </button>
              <p className="text-xs text-cream/30 font-mono break-all">{shareUrl}</p>
            </div>
          </div>
        </div>

        {/* Paused banner */}
        {gameState.paused && (
          <div className="panel px-4 py-3 border-red-400/40 bg-red-900/20 flex items-center gap-2">
            <span className="text-red-400 text-lg">⏸</span>
            <span className="text-red-300 text-sm font-medium">
              Game paused — waiting for a player to reconnect…
            </span>
          </div>
        )}

        {/* Seats */}
        <div className="panel px-5 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-cream/70 uppercase tracking-widest">
              Players ({gameState.players.length} / {MAX_SEATS})
            </h2>
            {gameState.players.length < MAX_SEATS && (
              <span className="text-xs text-cream/30">
                {MAX_SEATS - gameState.players.length} seat{gameState.players.length === 4 ? '' : 's'} open
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-3 justify-start">
            {seats.map((player, i) => (
              <SeatCard
                key={i}
                seatIndex={i}
                player={player}
                isDealer={gameState.dealerIndex === i}
                isHost={player?.id === gameState.hostId}
                isYou={player?.id === gameState.myPlayerId}
              />
            ))}
          </div>
        </div>

        {/* Spectators */}
        {(gameState.spectators.length > 0 || true) && (
          <div className="panel px-5 py-4">
            <h2 className="text-sm font-semibold text-cream/70 uppercase tracking-widest mb-3">
              Spectators ({gameState.spectators.length})
            </h2>
            {gameState.spectators.length === 0 ? (
              <p className="text-xs text-cream/30 italic">No spectators yet</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {gameState.spectators.map(s => (
                  <div key={s.id} className="flex items-center gap-1.5 text-sm text-cream/60">
                    <div className={`w-1.5 h-1.5 rounded-full ${s.connected ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                    {s.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Event log */}
        <EventLog events={gameState.eventLog} />

        {/* Start game */}
        <div className="flex flex-col items-center gap-2">
          {startError && (
            <p className="text-red-400 text-sm">{startError}</p>
          )}
          {isHost ? (
            <>
              <button
                onClick={handleStart}
                disabled={!canStart || starting}
                className="btn-primary text-base px-8 py-3"
              >
                {starting ? 'Starting…' : '▶ Start Game'}
              </button>
              {!canStart && (
                <p className="text-xs text-cream/40">
                  Need at least 2 players to start
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-cream/40 italic">
              Waiting for the host to start the game…
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
