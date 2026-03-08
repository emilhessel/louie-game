'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClientGameState } from '@louie/shared';
import { PlayingCard, FaceDownCard } from './PlayingCard';
import { SUIT_SYMBOL, SUIT_COLOR } from '@/lib/cardUtils';
import PlayerHand from './PlayerHand';
import EventLog from './EventLog';

interface TrumpRevealViewProps {
  gameState: ClientGameState;
  onFlipTrump: () => Promise<{ ok: true } | { ok: false; error: string }>;
}

export default function TrumpRevealView({ gameState, onFlipTrump }: TrumpRevealViewProps) {
  const round = gameState.round!;
  const dealer = gameState.players[gameState.dealerIndex];
  const isDealer = gameState.myPlayerId === dealer?.id;
  const [flipping, setFlipping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFlip = useCallback(async () => {
    setFlipping(true);
    setError(null);
    const res = await onFlipTrump();
    setFlipping(false);
    if (!res.ok) setError(res.error);
  }, [onFlipTrump]);

  return (
    <div className="felt-bg min-h-screen flex flex-col items-center py-6 px-4">

      {/* Header */}
      <div className="mb-5 text-center">
        <h1 className="text-3xl font-bold text-gold" style={{ fontFamily: 'var(--font-playfair)' }}>
          ♠ LOUIE ♥
        </h1>
        <p className="text-cream/40 text-xs tracking-widest uppercase mt-1">
          Round {round.roundNumber} of 17 · Revealing Trump
        </p>
      </div>

      <div className="w-full max-w-3xl space-y-4">

        {/* Status */}
        <div className="panel px-5 py-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-cream/40 uppercase tracking-widest">Dealer</span>
            <span className="text-gold font-semibold">{dealer?.name ?? '—'}</span>
            {isDealer && <span className="badge badge-gold">You</span>}
          </div>
          {gameState.paused && <span className="badge badge-red">⏸ Paused</span>}
        </div>

        {/* Trump card area */}
        <div className="panel px-5 py-8 flex flex-col items-center gap-4">
          <p className="text-xs text-cream/40 uppercase tracking-widest mb-2">
            {round.trump ? 'Trump this round' : 'Trump card (face down)'}
          </p>

          <AnimatePresence mode="wait">
            {round.trump ? (
              <motion.div
                key="trump-revealed"
                initial={{ rotateY: 90, scale: 0.7, opacity: 0 }}
                animate={{ rotateY: 0, scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.23, 1.0, 0.32, 1.0] }}
                style={{ perspective: 800 }}
              >
                <PlayingCard card={round.trump} size="lg" />
              </motion.div>
            ) : (
              <motion.div
                key="trump-hidden"
                exit={{ rotateY: 90, scale: 0.7, opacity: 0 }}
                transition={{ duration: 0.25 }}
                style={{ perspective: 800 }}
              >
                <FaceDownCard size="lg" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Suit label after reveal */}
          <AnimatePresence>
            {round.trump && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-center"
              >
                <span
                  className="text-4xl font-bold"
                  style={{ color: SUIT_COLOR[round.trump.suit] === '#1a1a1a' ? '#f5f0e8' : SUIT_COLOR[round.trump.suit] }}
                >
                  {SUIT_SYMBOL[round.trump.suit]}
                </span>
                <p className="text-cream/70 text-sm mt-1 capitalize font-medium">
                  {round.trump.suit} are trump
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Flip button */}
          {!round.trump && isDealer && (
            <motion.button
              onClick={handleFlip}
              disabled={flipping || !!gameState.paused}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="btn-primary px-8 py-3 text-base mt-2"
            >
              {flipping ? 'Flipping…' : '🂠 Flip Trump'}
            </motion.button>
          )}

          {!round.trump && !isDealer && (
            <p className="text-cream/40 text-sm italic">
              Waiting for {dealer?.name ?? 'dealer'} to flip trump…
            </p>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        {/* Paused banner */}
        {gameState.paused && (
          <div className="panel px-4 py-3 border-red-400/40 bg-red-900/20 flex items-center gap-2">
            <span className="text-red-400">⏸</span>
            <span className="text-red-300 text-sm">Game paused — waiting for a player to reconnect…</span>
          </div>
        )}

        <EventLog events={gameState.eventLog} />
      </div>

      {/* Hand */}
      {gameState.myHand.length > 0 && (
        <div className="w-full max-w-3xl mt-4">
          <PlayerHand hand={gameState.myHand} />
        </div>
      )}
    </div>
  );
}
