'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClientGameState } from '@louie/shared';
import { FaceDownCard } from './PlayingCard';
import PlayerHand from './PlayerHand';
import SortModal from './SortModal';
import { SortPrefs, DEFAULT_SORT_PREFS } from '@/lib/cardUtils';

function getSortKey(gameId: string, playerId: string) {
  return `louie_sort_${gameId}_${playerId}`;
}

interface DealingViewProps {
  gameState: ClientGameState;
  onDealCard: (targetPlayerId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  onFinishDealing: () => Promise<{ ok: true } | { ok: false; error: string }>;
}

export default function DealingView({ gameState, onDealCard, onFinishDealing }: DealingViewProps) {
  const round = gameState.round!;
  const dealer = gameState.players[gameState.dealerIndex];
  const isDealer = gameState.myPlayerId === dealer?.id;

  const isSpectator = !gameState.myPlayerId || gameState.myPlayerId === '';
  const [dealError, setDealError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  const [sortPrefs, setSortPrefs] = useState<SortPrefs>(() => {
    if (typeof window === 'undefined') return DEFAULT_SORT_PREFS;
    try {
      const raw = localStorage.getItem(getSortKey(gameState.gameId, gameState.myPlayerId));
      return raw ? (JSON.parse(raw) as SortPrefs) : DEFAULT_SORT_PREFS;
    } catch {
      return DEFAULT_SORT_PREFS;
    }
  });
  const [sortModalOpen, setSortModalOpen] = useState(false);

  const handleSortChange = useCallback((prefs: SortPrefs) => {
    setSortPrefs(prefs);
    try {
      localStorage.setItem(getSortKey(gameState.gameId, gameState.myPlayerId), JSON.stringify(prefs));
    } catch {}
  }, [gameState.gameId, gameState.myPlayerId]);

  // Track which player was just dealt to so we can animate their count badge
  const prevCountsRef = useRef<Record<string, number>>({});
  const [recentTargetKey, setRecentTargetKey] = useState<Record<string, number>>({});

  useEffect(() => {
    const prev = prevCountsRef.current;
    const curr = round.handCounts;
    const updates: Record<string, number> = {};
    for (const pid of Object.keys(curr)) {
      if ((curr[pid] ?? 0) > (prev[pid] ?? 0)) {
        // Use a monotonically increasing key so the same player can get multiple
        // animations in sequence (key change = new animation instance)
        updates[pid] = (recentTargetKey[pid] ?? 0) + 1;
      }
    }
    if (Object.keys(updates).length > 0) {
      setRecentTargetKey(k => ({ ...k, ...updates }));
    }
    prevCountsRef.current = { ...curr };
    // We intentionally omit recentTargetKey from deps to avoid infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.handCounts]);

  const handleDeal = useCallback(async (targetPlayerId: string) => {
    if (!isDealer || gameState.paused) return;
    setDealError(null);
    const res = await onDealCard(targetPlayerId);
    if (!res.ok) setDealError(res.error);
  }, [isDealer, gameState.paused, onDealCard]);

  const handleFinish = useCallback(async () => {
    setFinishing(true);
    setFinishError(null);
    const res = await onFinishDealing();
    setFinishing(false);
    if (!res.ok) setFinishError(res.error);
  }, [onFinishDealing]);

  const anyDealt = Object.values(round.handCounts).some(c => c > 0);
  const allCorrect = gameState.players.every(p => (round.handCounts[p.id] ?? 0) === round.handSize);

  // Deck pile — show 1-3 stacked cards for visual depth
  const pileDepth = Math.min(3, Math.ceil(gameState.deckRemaining / 15) + 1);

  return (
    <div className="felt-bg min-h-screen flex flex-col items-center py-6 px-4">

      {/* Sort modal */}
      <AnimatePresence>
        {sortModalOpen && (
          <SortModal
            prefs={sortPrefs}
            onChange={handleSortChange}
            onClose={() => setSortModalOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── MISDEAL overlay ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {round.misdeal && (
          <motion.div
            key="misdeal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.4, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 20 }}
              className="text-center px-6"
            >
              <div
                className="font-black text-red-500 mb-3 leading-none"
                style={{ fontSize: 'clamp(3.5rem, 12vw, 7rem)', fontFamily: 'var(--font-playfair)', letterSpacing: '-0.02em' }}
              >
                MISDEAL!
              </div>
              <p className="text-cream/70 text-lg mb-1">Wrong number of cards dealt.</p>
              <p className="text-cream/40 text-sm">Reshuffling the deck in a moment…</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-5 text-center">
        <h1 className="text-3xl font-bold text-gold" style={{ fontFamily: 'var(--font-playfair)' }}>
          ♠ LOUIE ♥
        </h1>
        <p className="text-cream/40 text-xs tracking-widest uppercase mt-1">
          Round {round.roundNumber} of 17 · {round.handSize} cards each
        </p>
      </div>

      <div className="w-full max-w-3xl space-y-4">

        {/* ── Status bar ──────────────────────────────────────────────────── */}
        <div className="panel px-5 py-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-cream/40 uppercase tracking-widest">Dealer</span>
            <span className="text-gold font-semibold">{dealer?.name ?? '—'}</span>
            {isDealer && <span className="badge badge-gold">You</span>}
          </div>
          <div className="flex items-center gap-3">
            {gameState.paused && (
              <span className="badge badge-red">⏸ Paused</span>
            )}
            <div className="text-right">
              <span className="text-xs text-cream/40 uppercase tracking-widest">Deck · </span>
              <span className="text-cream font-mono font-semibold">{gameState.deckRemaining}</span>
              <span className="text-cream/30 text-xs"> left</span>
            </div>
          </div>
        </div>

        {/* ── Player targets + deck ────────────────────────────────────────── */}
        <div className="panel px-5 py-5">
          <p className="text-xs text-cream/40 uppercase tracking-widest mb-4">
            {isDealer
              ? 'Click a player to deal them one card'
              : `Waiting for ${dealer?.name ?? 'dealer'} to deal…`}
          </p>

          {/* Players in a responsive grid */}
          <div className="flex flex-wrap gap-3 justify-center mb-6">
            {gameState.players.map(player => {
              const count = round.handCounts[player.id] ?? 0;
              const done = count === round.handSize;
              const animKey = recentTargetKey[player.id] ?? 0;
              const isMe = player.id === gameState.myPlayerId;
              const clickable = isDealer && !gameState.paused && !done;

              return (
                <motion.button
                  key={player.id}
                  onClick={() => clickable ? handleDeal(player.id) : undefined}
                  disabled={!clickable}
                  whileHover={clickable ? { scale: 1.05, y: -3 } : {}}
                  whileTap={clickable ? { scale: 0.96 } : {}}
                  className={`seat-card occupied flex flex-col items-center gap-1 p-3 min-w-[100px] transition-colors
                    ${done ? 'border-emerald-500/50' : ''}
                    ${isMe ? 'self' : ''}
                    ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <span className="text-xs text-cream/40">
                    {player.id === dealer?.id ? '🃏 dealer' : `seat ${player.seatIndex + 1}`}
                  </span>
                  <span className="text-sm font-semibold text-cream truncate max-w-[90px] text-center">
                    {player.name}
                    {isMe && <span className="text-cream/30 text-xs ml-1">(you)</span>}
                  </span>

                  {/* Card count — re-keys to replay animation on each deal */}
                  <motion.div
                    key={`count-${player.id}-${animKey}`}
                    initial={{ scale: 1.6, color: '#c9a84c' }}
                    animate={{ scale: 1, color: done ? '#6fcf97' : '#f5f0e8' }}
                    transition={{ duration: 0.35 }}
                    className="text-2xl font-bold font-mono mt-0.5"
                  >
                    {count}
                  </motion.div>
                  <span className="text-xs text-cream/30">/ {round.handSize}</span>

                  <div className={`w-1.5 h-1.5 rounded-full mt-1 ${player.connected ? 'bg-emerald-400' : 'bg-red-400'}`} />

                  {clickable && (
                    <span className="text-gold/60 text-xs">deal ↓</span>
                  )}
                  {done && (
                    <span className="text-emerald-400 text-xs">✓</span>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Deck pile (centered) */}
          <div className="flex justify-center">
            <div className="relative" style={{ width: 54, height: 78 }}>
              {Array.from({ length: pileDepth - 1 }, (_, i) => (
                <div
                  key={i}
                  className="absolute"
                  style={{ top: -(i + 1) * 2, left: -(i + 1) * 1.5, zIndex: i }}
                >
                  <FaceDownCard size="md" />
                </div>
              ))}
              <div className="relative" style={{ zIndex: pileDepth }}>
                <FaceDownCard size="md" count={gameState.deckRemaining} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Errors ────────────────────────────────────────────────────────── */}
        {(dealError || finishError) && (
          <p className="text-red-400 text-sm text-center">{dealError ?? finishError}</p>
        )}

        {/* ── Dealer controls ───────────────────────────────────────────────── */}
        {isDealer && (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={handleFinish}
              disabled={!anyDealt || finishing || !!gameState.paused}
              className="btn-primary px-8 py-3 text-base"
            >
              {finishing ? 'Checking…' : '✓ Done Dealing'}
            </button>
            <p className="text-xs text-cream/30">
              Each player needs exactly {round.handSize} card{round.handSize !== 1 ? 's' : ''}.
              {allCorrect && anyDealt && (
                <span className="text-emerald-400 ml-1">All counts correct ✓</span>
              )}
            </p>
          </div>
        )}

        {/* Paused banner */}
        {gameState.paused && (
          <div className="panel px-4 py-3 border-red-400/40 bg-red-900/20 flex items-center gap-2">
            <span className="text-red-400">⏸</span>
            <span className="text-red-300 text-sm">
              Game paused — waiting for a player to reconnect…
            </span>
          </div>
        )}

        {/* ── Player's hand ────────────────────────────────────────────────── */}
        {gameState.myHand.length > 0 && (
          <PlayerHand
            hand={gameState.myHand}
            label="Your hand (so far)"
            sortPrefs={sortPrefs}
            onSortClick={!isSpectator ? () => setSortModalOpen(true) : undefined}
          />
        )}

      </div>
    </div>
  );
}
