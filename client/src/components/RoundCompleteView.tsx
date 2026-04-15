'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ClientGameState } from '@louie/shared';
import { SUIT_SYMBOL, SUIT_COLOR } from '@/lib/cardUtils';

interface RoundCompleteViewProps {
  gameState: ClientGameState;
  onReady: () => Promise<{ ok: true } | { ok: false; error: string }>;
}

export default function RoundCompleteView({ gameState, onReady }: RoundCompleteViewProps) {
  const round = gameState.round!;
  const isLastRound = gameState.currentRound === 17;
  const isSpectator = !gameState.myPlayerId || gameState.myPlayerId === '';

  const [readying, setReadying] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(30);

  useEffect(() => {
    const id = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  const myReady = round.playersReady?.includes(gameState.myPlayerId) ?? false;
  const readyCount = round.playersReady?.length ?? 0;
  const totalPlayers = gameState.players.length;

  const handleReady = useCallback(async () => {
    setReadying(true);
    await onReady();
    setReadying(false);
  }, [onReady]);

  const trumpSuit = round.trump?.suit;
  const trumpColor = trumpSuit
    ? (SUIT_COLOR[trumpSuit] === '#1a1a1a' ? '#f5f0e8' : SUIT_COLOR[trumpSuit])
    : '#f5f0e8';

  const playerScores = gameState.players.map(player => {
    const entry = gameState.scoreHistory[player.id]?.find(e => e.round === round.roundNumber);
    return { player, entry };
  });

  return (
    <div className="felt-bg min-h-screen flex flex-col items-center py-6 px-4">

      {/* Header */}
      <div className="mb-5 text-center">
        <h1 className="text-3xl font-bold text-gold" style={{ fontFamily: 'var(--font-playfair)' }}>
          ♠ LOUIE ♥
        </h1>
        <p className="text-cream/40 text-xs tracking-widest uppercase mt-1">
          Round {round.roundNumber} of 17 · Complete
        </p>
      </div>

      <div className="w-full max-w-2xl space-y-4">

        {/* Round summary header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel px-5 py-4 text-center border-gold/40"
        >
          <p className="text-gold text-xl font-bold" style={{ fontFamily: 'var(--font-playfair)' }}>
            Round {round.roundNumber} Complete!
          </p>
          {trumpSuit && (
            <p className="text-sm mt-1" style={{ color: trumpColor }}>
              Trump was {SUIT_SYMBOL[trumpSuit]} {trumpSuit}
            </p>
          )}
        </motion.div>

        {/* Scores table */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="panel px-5 py-4"
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-cream/40 uppercase tracking-widest">Round Scores</p>
            <p className="text-xs text-emerald-400/50">★ made bid</p>
          </div>

          <div className="overflow-x-auto">
          <div className="space-y-2 min-w-[360px]">
            <div className="grid grid-cols-5 gap-2 text-xs text-cream/30 uppercase tracking-widest pb-2 border-b border-white/10">
              <span className="col-span-2">Player</span>
              <span className="text-center">Bid</span>
              <span className="text-center">Tricks</span>
              <span className="text-center">+Points</span>
            </div>

            {playerScores.map(({ player, entry }) => {
              const hitBid = entry ? entry.tricksWon === entry.bid : false;
              const isMe = player.id === gameState.myPlayerId;
              const isReady = round.playersReady?.includes(player.id) ?? false;
              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                  className={`grid grid-cols-5 gap-2 py-2 rounded px-1 items-center
                    ${isMe ? 'bg-white/5' : ''}
                    ${hitBid ? 'border-l-2 border-emerald-500/60 pl-2' : ''}`}
                >
                  <div className="col-span-2 flex items-center gap-1.5">
                    <span className="text-cream text-sm font-medium truncate">{player.name}</span>
                    {isMe && <span className="text-cream/30 text-xs">(you)</span>}
                    {isReady && <span className="text-emerald-400 text-xs">✓</span>}
                  </div>
                  <span className="text-center text-cream/60 font-mono text-sm">
                    {entry?.bid ?? '—'}
                  </span>
                  <span className={`text-center font-mono text-sm font-semibold ${hitBid ? 'text-emerald-400' : 'text-cream'}`}>
                    {entry?.tricksWon ?? '—'}
                  </span>
                  <div className="text-center">
                    <span className={`font-mono text-sm font-bold ${hitBid ? 'text-gold' : 'text-cream/80'}`}>
                      +{entry?.roundScore ?? 0}
                    </span>
                    {hitBid && <span className="text-emerald-400/70 text-xs ml-1">★</span>}
                  </div>
                </motion.div>
              );
            })}
          </div>
          </div>
        </motion.div>

        {/* Cumulative standings */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="panel px-5 py-4"
        >
          <p className="text-xs text-cream/40 uppercase tracking-widest mb-3">Total Standings</p>
          <div className="space-y-2">
            {[...gameState.players]
              .sort((a, b) => b.score - a.score)
              .map((player, rank) => {
                const isMe = player.id === gameState.myPlayerId;
                return (
                  <div key={player.id} className={`flex items-center gap-3 py-1 ${isMe ? 'text-cream' : 'text-cream/70'}`}>
                    <span className="text-cream/30 font-mono text-sm w-4">{rank + 1}.</span>
                    <span className="flex-1 text-sm font-medium">{player.name}</span>
                    {isMe && <span className="text-cream/30 text-xs">(you)</span>}
                    <span className="font-mono text-lg font-bold text-gold">{player.score}</span>
                  </div>
                );
              })}
          </div>
        </motion.div>

        {/* Ready button / status */}
        {!isLastRound && !isSpectator && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="panel px-5 py-4 text-center"
          >
            {myReady ? (
              <div className="space-y-2">
                <p className="text-emerald-400 font-semibold">✓ You're ready!</p>
                <p className="text-cream/40 text-sm">
                  Waiting for {totalPlayers - readyCount} more player{totalPlayers - readyCount !== 1 ? 's' : ''}…
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-cream/50 text-sm">
                  {readyCount > 0
                    ? `${readyCount} of ${totalPlayers} players ready`
                    : 'Ready to play the next round?'}
                </p>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleReady}
                  disabled={readying}
                  className="btn-primary px-8 py-3"
                >
                  {readying ? 'Getting ready…' : '▶ Ready for Next Round'}
                </motion.button>
                <p className="text-cream/20 text-xs">Auto-advances in {secondsLeft}s if not everyone is ready</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Spectator note */}
        {!isLastRound && isSpectator && (
          <div className="panel px-5 py-3 text-center">
            <p className="text-cream/40 text-sm italic">
              {readyCount < totalPlayers
                ? `Waiting for players to ready up (${readyCount}/${totalPlayers})…`
                : 'All ready — next round starting…'}
            </p>
          </div>
        )}

        {/* Last round notice */}
        {isLastRound && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <p className="text-gold text-sm font-medium animate-pulse">
              Calculating final scores…
            </p>
          </motion.div>
        )}

      </div>
    </div>
  );
}
