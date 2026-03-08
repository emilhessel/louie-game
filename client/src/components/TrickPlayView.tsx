'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClientGameState, Card } from '@louie/shared';
import { PlayingCard } from './PlayingCard';
import { SUIT_SYMBOL } from '@/lib/cardUtils';
import PlayerHand from './PlayerHand';
import EventLog from './EventLog';

interface TrickPlayViewProps {
  gameState: ClientGameState;
  onPlayCard: (cardId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}

export default function TrickPlayView({ gameState, onPlayCard }: TrickPlayViewProps) {
  const round = gameState.round!;
  const myPlayerId = gameState.myPlayerId;
  const isSpectator = !myPlayerId || myPlayerId === '';
  const isMyTurn = round.currentLeaderId === myPlayerId && !round.currentTrick.complete;

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playError, setPlayError] = useState<string | null>(null);

  // Which cards are legal to play
  const playableIds = useMemo<Set<string>>(() => {
    if (!isMyTurn || isSpectator) return new Set();
    const { ledSuit } = round.currentTrick;
    if (!ledSuit) return new Set(gameState.myHand.map(c => c.id));
    const hasSuit = gameState.myHand.some(c => c.suit === ledSuit);
    if (hasSuit) return new Set(gameState.myHand.filter(c => c.suit === ledSuit).map(c => c.id));
    return new Set(gameState.myHand.map(c => c.id));
  }, [isMyTurn, isSpectator, round.currentTrick, gameState.myHand]);

  const handleCardClick = useCallback((card: Card) => {
    if (!playableIds.has(card.id)) return;
    if (selectedCardId === card.id) {
      // Second click = play
      handlePlay(card.id);
    } else {
      setSelectedCardId(card.id);
      setPlayError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCardId, playableIds]);

  const handlePlay = useCallback(async (cardId: string) => {
    setPlaying(true);
    setPlayError(null);
    const res = await onPlayCard(cardId);
    setPlaying(false);
    if (!res.ok) {
      setPlayError(res.error);
    } else {
      setSelectedCardId(null);
    }
  }, [onPlayCard]);

  const trickNumber = round.completedTricks.length + 1;
  const currentLeader = gameState.players.find(p => p.id === round.currentLeaderId);
  const selectedCard = gameState.myHand.find(c => c.id === selectedCardId);

  return (
    <div className="felt-bg min-h-screen flex flex-col items-center py-6 px-4">

      {/* Header */}
      <div className="mb-5 text-center">
        <h1 className="text-3xl font-bold text-gold" style={{ fontFamily: 'var(--font-playfair)' }}>
          ♠ LOUIE ♥
        </h1>
        <p className="text-cream/40 text-xs tracking-widest uppercase mt-1">
          Round {round.roundNumber} of 17 · Trick {trickNumber} of {round.handSize}
        </p>
      </div>

      <div className="w-full max-w-3xl space-y-4">

        {/* ── Scoreboard strip ─────────────────────────────────────────────── */}
        <div className="panel px-5 py-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <p className="text-xs text-cream/40 uppercase tracking-widest">Scoreboard</p>
            {round.trump && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-cream/40 uppercase tracking-widest">Trump</span>
                <PlayingCard card={round.trump} size="sm" />
              </div>
            )}
            {gameState.paused && <span className="badge badge-red">⏸ Paused</span>}
          </div>
          <div className="flex flex-wrap gap-3">
            {gameState.players.map(player => {
              const bid = round.bids[player.id]?.bid ?? 0;
              const tricks = round.tricksWon[player.id] ?? 0;
              const isMe = player.id === myPlayerId;
              const isLeading = player.id === round.currentLeaderId && !round.currentTrick.complete;
              const hitBid = tricks === bid;

              return (
                <div
                  key={player.id}
                  className={`seat-card occupied flex flex-col items-center gap-1 p-3 min-w-[80px]
                    ${isMe ? 'self' : ''}
                    ${isLeading ? 'border-gold/60' : ''}`}
                >
                  <span className="text-xs text-cream/50 truncate max-w-[72px]">{player.name}</span>
                  {isMe && (
                    <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', color: '#f5f0e8', border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.6rem' }}>you</span>
                  )}
                  <span
                    className="text-lg font-bold font-mono"
                    style={{ color: hitBid ? '#fbbf24' : '#f5f0e8' }}
                  >
                    {tricks}
                  </span>
                  <span className="text-xs text-cream/30">bid {bid}</span>
                  {isLeading && (
                    <span className="text-gold text-xs animate-pulse">▶ turn</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Trick table ──────────────────────────────────────────────────── */}
        <div className="panel px-5 py-6 relative overflow-hidden">
          <p className="text-xs text-cream/40 uppercase tracking-widest mb-4">
            {round.currentTrick.plays.length === 0 ? 'Trick table' : `Trick ${trickNumber}`}
          </p>

          {/* Winner overlay */}
          <AnimatePresence>
            {round.currentTrick.complete && (
              <motion.div
                key="winner-banner"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg"
              >
                <span className="text-4xl mb-2">🏆</span>
                <p className="text-gold text-2xl font-bold" style={{ fontFamily: 'var(--font-playfair)' }}>
                  {round.currentTrick.winnerName} wins!
                </p>
                <p className="text-cream/40 text-sm mt-1">Collecting trick…</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cards in play */}
          {round.currentTrick.plays.length > 0 ? (
            <div className="flex flex-wrap gap-4 justify-center">
              <AnimatePresence>
              {round.currentTrick.plays.map((play, index) => (
                <motion.div
                  key={play.playerId}
                  initial={{ y: -20, opacity: 0, scale: 0.8 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6, y: 20, transition: { delay: index * 0.07, duration: 0.2 } }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  className="flex flex-col items-center gap-2"
                >
                  <PlayingCard card={play.card} size="md" />
                  <span className="text-xs text-cream/60 max-w-[64px] text-center truncate">
                    {play.playerName}
                    {play.playerId === myPlayerId && <span className="text-cream/30"> (you)</span>}
                  </span>
                </motion.div>
              ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center justify-center h-20">
              {isMyTurn ? (
                <p className="text-cream/40 text-sm italic">Your lead — play a card from your hand</p>
              ) : (
                <p className="text-cream/30 text-sm italic">
                  Waiting for {currentLeader?.name ?? '…'} to lead…
                </p>
              )}
            </div>
          )}

          {/* Whose turn it is (when trick ongoing, not your turn) */}
          {round.currentTrick.plays.length > 0 && !round.currentTrick.complete && !isMyTurn && (
            <p className="text-center text-cream/30 text-xs mt-4 italic">
              Waiting for {currentLeader?.name ?? '…'}…
            </p>
          )}
        </div>

        {/* ── My turn controls ─────────────────────────────────────────────── */}
        {isMyTurn && !isSpectator && (
          <AnimatePresence>
            {selectedCard && (
              <motion.div
                key="play-confirm"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="panel px-5 py-4 flex flex-col items-center gap-3 border-gold/30"
              >
                <div className="flex items-center gap-3">
                  <PlayingCard card={selectedCard} size="sm" selected />
                  <div>
                    <p className="text-cream/60 text-sm">Playing:</p>
                    <p className="text-gold font-semibold">
                      {selectedCard.rank} of {selectedCard.suit}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handlePlay(selectedCard.id)}
                    disabled={playing || !!gameState.paused}
                    className="btn-primary px-6 py-2 text-sm"
                  >
                    {playing ? 'Playing…' : '▶ Play Card'}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setSelectedCardId(null)}
                    className="btn-secondary px-4 py-2 text-sm"
                  >
                    Cancel
                  </motion.button>
                </div>
                {playError && <p className="text-red-400 text-xs">{playError}</p>}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* ── Turn prompt (no card selected) ──────────────────────────────── */}
        {isMyTurn && !isSpectator && !selectedCard && (
          <div className="panel px-5 py-3 text-center border-gold/20">
            <p className="text-gold text-sm font-medium">
              {round.currentTrick.plays.length === 0
                ? 'Your lead — tap a card to select it, tap again to play'
                : `Follow ${round.currentTrick.ledSuit ? `suit (${SUIT_SYMBOL[round.currentTrick.ledSuit]} ${round.currentTrick.ledSuit})` : ''} — tap a card to select, tap again to play`}
            </p>
            {playError && <p className="text-red-400 text-xs mt-1">{playError}</p>}
          </div>
        )}

        {/* Paused */}
        {gameState.paused && (
          <div className="panel px-4 py-3 border-red-400/40 bg-red-900/20 flex items-center gap-2">
            <span className="text-red-400">⏸</span>
            <span className="text-red-300 text-sm">Game paused — waiting for a player to reconnect…</span>
          </div>
        )}

        {/* Hand — above event log */}
        {gameState.myHand.length > 0 && (
          <PlayerHand
            hand={gameState.myHand}
            onPlayCard={isMyTurn ? handleCardClick : undefined}
            playableIds={playableIds}
            selectedCardId={selectedCardId ?? undefined}
          />
        )}

        <EventLog events={gameState.eventLog} />
      </div>
    </div>
  );
}
