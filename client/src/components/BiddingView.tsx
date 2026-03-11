'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClientGameState } from '@louie/shared';
import { PlayingCard } from './PlayingCard';
import { SUIT_SYMBOL, SUIT_COLOR } from '@/lib/cardUtils';
import PlayerHand from './PlayerHand';

interface BiddingViewProps {
  gameState: ClientGameState;
  onPlaceBid: (bid: number) => Promise<{ ok: true } | { ok: false; error: string }>;
  onCancelBidCountdown: () => Promise<{ ok: true } | { ok: false; error: string }>;
}

export default function BiddingView({ gameState, onPlaceBid, onCancelBidCountdown }: BiddingViewProps) {
  const round = gameState.round!;
  const myBidState = round.bids[gameState.myPlayerId];
  const hasLocked = myBidState?.hasBid ?? false;
  const isSpectator = !gameState.myPlayerId || gameState.myPlayerId === '';

  const [bidValue, setBidValue] = useState(() => myBidState?.bid ?? 0);
  const [locking, setLocking] = useState(false);
  const [bidError, setBidError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const lockedCount = Object.values(round.bids).filter(b => b.hasBid).length;
  const totalPlayers = gameState.players.length;
  const isCountingDown = round.bidCountdown !== undefined;
  const isRevealed = round.bidsRevealed;

  // Keep bid input pre-populated from server state (for after a cancel)
  useEffect(() => {
    if (myBidState?.bid !== undefined && !hasLocked) {
      setBidValue(myBidState.bid);
    }
  }, [myBidState?.bid, hasLocked]);

  // Flash bid section after 20s of waiting to lock in
  const [isIdling, setIsIdling] = useState(false);
  useEffect(() => {
    if (hasLocked || isRevealed || isCountingDown || isSpectator) {
      setIsIdling(false);
      return;
    }
    setIsIdling(false);
    const t = setTimeout(() => setIsIdling(true), 20_000);
    return () => clearTimeout(t);
  }, [hasLocked, isRevealed, isCountingDown, isSpectator]);

  const handleLock = useCallback(async () => {
    setLocking(true);
    setBidError(null);
    const res = await onPlaceBid(bidValue);
    setLocking(false);
    if (!res.ok) setBidError(res.error);
  }, [bidValue, onPlaceBid]);

  const handleCancel = useCallback(async () => {
    setCancelling(true);
    await onCancelBidCountdown();
    setCancelling(false);
  }, [onCancelBidCountdown]);

  const adjustBid = useCallback((delta: number) => {
    setBidValue(v => Math.max(0, v + delta));
  }, []);

  const trumpSuit = round.trump?.suit;
  const trumpColor = trumpSuit
    ? (SUIT_COLOR[trumpSuit] === '#1a1a1a' ? '#f5f0e8' : SUIT_COLOR[trumpSuit])
    : '#f5f0e8';

  // Compute bid summary for reveal banner
  const totalBid = Object.values(round.bids).reduce((sum, b) => sum + (b.bid ?? 0), 0);
  const tricks = round.handSize;
  let revealSubtext = '';
  if (isRevealed) {
    if (totalBid < tricks) {
      revealSubtext = `It's an under-bid: ${totalBid} bid${totalBid !== 1 ? 's' : ''} for ${tricks} trick${tricks !== 1 ? 's' : ''}`;
    } else if (totalBid > tricks) {
      revealSubtext = `It's an over-bid: ${totalBid} bid${totalBid !== 1 ? 's' : ''} for ${tricks} trick${tricks !== 1 ? 's' : ''}`;
    } else {
      revealSubtext = `It's a freebie — Everyone wins! Unless you screw this up...`;
    }
  }

  return (
    <div className="felt-bg min-h-screen flex flex-col items-center py-6 px-4">

      {/* ── Countdown overlay ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {isCountingDown && (
          <motion.div
            key="countdown-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm"
          >
            <p className="text-cream/50 text-sm uppercase tracking-widest mb-4">All bids locked in!</p>
            <AnimatePresence mode="wait">
              <motion.div
                key={`n-${round.bidCountdown}`}
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1,   opacity: 1 }}
                exit={{    scale: 1.8, opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.23, 1.0, 0.32, 1.0] }}
              >
                <span
                  className="font-black text-gold leading-none select-none"
                  style={{ fontSize: 'clamp(7rem, 25vw, 14rem)', fontFamily: 'var(--font-playfair)' }}
                >
                  {round.bidCountdown}
                </span>
              </motion.div>
            </AnimatePresence>
            {/* Change-my-mind button — available to all players */}
            {!isSpectator && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                onClick={handleCancel}
                disabled={cancelling}
                className="mt-10 text-cream/50 hover:text-cream/80 text-sm transition-colors underline underline-offset-2 pointer-events-auto"
              >
                {cancelling ? '…' : 'Oh shoot — I changed my mind!'}
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── "Bid cancelled" overlay ─────────────────────────────────────────── */}
      <AnimatePresence>
        {!isCountingDown && round.bidCancelledBy && (
          <motion.div
            key="cancel-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm pointer-events-none"
          >
            <motion.p
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-cream text-xl font-semibold text-center px-8"
              style={{ fontFamily: 'var(--font-playfair)' }}
            >
              {round.bidCancelledBy} wants to change their bid
            </motion.p>
            <p className="text-cream/40 text-sm mt-3">Bids unlocked — update your bid…</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="mb-5 text-center">
        <h1 className="text-3xl font-bold text-gold" style={{ fontFamily: 'var(--font-playfair)' }}>
          ♠ LOUIE ♥
        </h1>
        <p className="text-cream/40 text-xs tracking-widest uppercase mt-1">
          Round {round.roundNumber} of 17 · Bidding
        </p>
      </div>

      <div className="w-full max-w-3xl space-y-4">

        {/* Trump + status bar */}
        <div className="panel px-5 py-3 flex items-center justify-between flex-wrap gap-3">
          {round.trump && (
            <div className="flex items-center gap-3">
              <PlayingCard card={round.trump} size="sm" />
              <div>
                <p className="text-xs text-cream/40 uppercase tracking-widest">Trump</p>
                <p className="font-semibold" style={{ color: trumpColor }}>
                  {SUIT_SYMBOL[round.trump.suit]} {round.trump.suit}
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 ml-auto">
            {gameState.paused && <span className="badge badge-red">⏸ Paused</span>}
            <div className="text-right">
              <span className="text-xs text-cream/40 uppercase tracking-widest">Bids locked </span>
              <span className="text-cream font-semibold font-mono">{lockedCount}</span>
              <span className="text-cream/30 text-xs"> / {totalPlayers}</span>
            </div>
          </div>
        </div>

        {/* ── Player bid status grid ──────────────────────────────────────── */}
        <div className="panel px-5 py-4">
          <p className="text-xs text-cream/40 uppercase tracking-widest mb-3">Players · Trick Play Order</p>
          <div className="flex flex-wrap gap-3">
            {gameState.players.map((player, playerIdx) => {
              const bs = round.bids[player.id];
              const locked = bs?.hasBid ?? false;
              const isMe = player.id === gameState.myPlayerId;

              const leaderStartIdx = (gameState.dealerIndex + 1) % gameState.players.length;
              const trickOrder = (playerIdx - leaderStartIdx + gameState.players.length) % gameState.players.length + 1;
              const isFirstToPlay = trickOrder === 1;

              return (
                <motion.div
                  key={player.id}
                  layout
                  className={`seat-card occupied flex flex-col items-center gap-1 p-3 min-w-[90px]
                    ${locked ? 'border-emerald-500/50' : ''}`}
                >
                  <span className="text-xs text-cream/40 truncate max-w-[80px]">{player.name}</span>
                  <div className="flex gap-1 flex-wrap justify-center">
                    {isMe && <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', color: '#f5f0e8', border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.6rem' }}>you</span>}
                    <span
                      className="badge"
                      style={{
                        background: isFirstToPlay ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)',
                        color: isFirstToPlay ? '#fbbf24' : '#f5f0e888',
                        border: `1px solid ${isFirstToPlay ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.1)'}`,
                        fontSize: '0.6rem',
                      }}
                    >
                      {trickOrder === 1 ? '▶ leads' : `${trickOrder}${trickOrder === 2 ? 'nd' : trickOrder === 3 ? 'rd' : 'th'}`}
                    </span>
                  </div>

                  {isRevealed ? (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      className="text-center"
                    >
                      <span className="text-3xl font-bold text-gold font-mono">
                        {bs?.bid ?? '?'}
                      </span>
                      <p className="text-xs text-cream/30">bid</p>
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 mt-1">
                      {locked ? (
                        <>
                          <span className="text-emerald-400 text-lg">✓</span>
                          <span className="text-xs text-emerald-400/70">locked</span>
                          {isMe && bs?.bid !== undefined && (
                            <span className="text-gold font-mono text-sm font-semibold">{bs.bid}</span>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="text-cream/20 text-lg">?</span>
                          <span className="text-xs text-cream/30">thinking…</span>
                        </>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── Bid input (own player, not yet locked, not revealed) ───────── */}
        {!isSpectator && !hasLocked && !isRevealed && !isCountingDown && (
          <div className={`panel px-5 py-5 ${isIdling ? 'attention-glow' : ''}`}>
            <p className="text-xs text-cream/40 uppercase tracking-widest mb-4">Your bid</p>
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-4">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => adjustBid(-1)}
                  disabled={bidValue <= 0}
                  className="w-12 h-12 rounded-full btn-secondary text-xl font-bold flex items-center justify-center disabled:opacity-30"
                >
                  −
                </motion.button>

                <motion.div
                  key={bidValue}
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.15 }}
                  className="w-20 text-center"
                >
                  <span className="text-5xl font-bold text-cream font-mono">{bidValue}</span>
                </motion.div>

                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => adjustBid(1)}
                  className="w-12 h-12 rounded-full btn-secondary text-xl font-bold flex items-center justify-center"
                >
                  +
                </motion.button>
              </div>

              <p className="text-xs text-cream/30">
                Hand size: {round.handSize} card{round.handSize !== 1 ? 's' : ''}
                {round.trump && (
                  <span style={{ color: trumpColor }} className="ml-2">
                    · Trump: {SUIT_SYMBOL[round.trump.suit]}
                  </span>
                )}
              </p>

              {bidError && <p className="text-red-400 text-sm">{bidError}</p>}

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleLock}
                disabled={locking || !!gameState.paused}
                className="btn-primary px-8 py-3 text-base"
              >
                {locking ? 'Locking…' : `🔒 Lock In Bid: ${bidValue}`}
              </motion.button>
            </div>
          </div>
        )}

        {/* Locked confirmation (own player) */}
        {!isSpectator && hasLocked && !isRevealed && !isCountingDown && (
          <div className="panel px-5 py-4 text-center border-emerald-500/30">
            <p className="text-emerald-400 font-semibold text-lg">
              ✓ Bid locked: <span className="text-gold">{myBidState?.bid}</span>
            </p>
            <p className="text-cream/40 text-sm mt-1">
              Waiting for {totalPlayers - lockedCount} more player{totalPlayers - lockedCount !== 1 ? 's' : ''}…
            </p>
          </div>
        )}

        {/* Spectator note */}
        {isSpectator && !isRevealed && (
          <div className="panel px-5 py-3 text-center">
            <p className="text-cream/40 text-sm italic">
              {lockedCount < totalPlayers
                ? `Waiting for ${totalPlayers - lockedCount} player${totalPlayers - lockedCount !== 1 ? 's' : ''} to bid…`
                : 'All bids in — countdown starting…'}
            </p>
          </div>
        )}

        {/* Revealed bids banner */}
        {isRevealed && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="panel px-5 py-4 text-center border-gold/40"
          >
            <p className="text-gold font-semibold text-lg">Bids revealed!</p>
            <p className="text-cream/70 text-sm mt-1">{revealSubtext}</p>
            <p className="text-cream/40 text-xs mt-2">Trick play begins shortly…</p>
          </motion.div>
        )}

        {/* Paused */}
        {gameState.paused && (
          <div className="panel px-4 py-3 border-red-400/40 bg-red-900/20 flex items-center gap-2">
            <span className="text-red-400">⏸</span>
            <span className="text-red-300 text-sm">Game paused — waiting for a player to reconnect…</span>
          </div>
        )}

        {/* Hand */}
        {gameState.myHand.length > 0 && (
          <PlayerHand hand={gameState.myHand} />
        )}
      </div>
    </div>
  );
}
