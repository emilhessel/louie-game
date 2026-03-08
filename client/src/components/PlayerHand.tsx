'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@louie/shared';
import { PlayingCard } from './PlayingCard';
import { sortHand } from '@/lib/cardUtils';

interface PlayerHandProps {
  hand: Card[];
  label?: string;
  /** Called when the player clicks a card (trick-play phase, M4) */
  onPlayCard?: (card: Card) => void;
  /** Set of card IDs that are legal to play right now (M4) */
  playableIds?: Set<string>;
  selectedCardId?: string;
}

export default function PlayerHand({
  hand,
  label = 'Your hand',
  onPlayCard,
  playableIds,
  selectedCardId,
}: PlayerHandProps) {
  const sorted = useMemo(() => sortHand(hand), [hand]);

  return (
    <div className="panel px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-cream/40 uppercase tracking-widest">{label}</span>
        <span className="text-xs text-cream/30 font-mono">{sorted.length} card{sorted.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="flex flex-wrap gap-2 min-h-[86px] items-end">
        <AnimatePresence initial={false}>
          {sorted.map(card => {
            const isPlayable = playableIds ? playableIds.has(card.id) : !!onPlayCard;
            return (
              <motion.div
                key={card.id}
                initial={{ y: -36, opacity: 0, scale: 0.75 }}
                animate={{ y: 0,   opacity: 1, scale: 1    }}
                exit={   { y: 20,  opacity: 0, scale: 0.7  }}
                transition={{ type: 'spring', stiffness: 340, damping: 26 }}
              >
                <PlayingCard
                  card={card}
                  size="md"
                  selected={card.id === selectedCardId}
                  disabled={playableIds ? !isPlayable : false}
                  onClick={isPlayable && onPlayCard ? () => onPlayCard(card) : undefined}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>

        {sorted.length === 0 && (
          <span className="text-cream/20 text-sm italic self-center">No cards yet…</span>
        )}
      </div>
    </div>
  );
}
