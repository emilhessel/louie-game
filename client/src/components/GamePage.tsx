'use client';

import React, { useEffect, useState, useCallback, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { LouieSession, ClientGameState } from '@louie/shared';
import { useGameState, loadSession, saveSession, clearSession } from '@/hooks/useGameState';
import LobbyView from './LobbyView';
import DealingView from './DealingView';
import TrumpRevealView from './TrumpRevealView';
import BiddingView from './BiddingView';
import TrickPlayView from './TrickPlayView';
import RoundCompleteView from './RoundCompleteView';
import GameOverView from './GameOverView';
import ScorecardModal from './ScorecardModal';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3001';

interface GamePageProps {
  gameId: string;
}

type JoinStatus = 'loading' | 'needs_name' | 'joining' | 'connected' | 'error';

export default function GamePage({ gameId }: GamePageProps) {
  const router = useRouter();
  const { gameState, connected, error: socketError, tryRejoin, startGame, dealCard, finishDealing, flipTrump, placeBid, playCard, readyNextRound } = useGameState();

  const [status, setStatus] = useState<JoinStatus>('loading');
  const [pageError, setPageError] = useState<string | null>(null);
  const [scorecardOpen, setScorecardOpen] = useState(false);

  // Name modal state (for fresh visitors)
  const [nameInput, setNameInput] = useState('');
  const [joiningAs, setJoiningAs] = useState<'player' | 'spectator' | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [fullGame, setFullGame] = useState(false);

  // ── On mount: check for saved session ─────────────────────────────────────
  useEffect(() => {
    const session = loadSession();
    if (session && session.gameId === gameId) {
      // Attempt auto-rejoin
      setStatus('loading');
      tryRejoin(session).then(ok => {
        if (ok) {
          setStatus('connected');
        } else {
          // Session is stale — ask for name
          clearSession();
          setStatus('needs_name');
        }
      });
    } else {
      // No session for this game — ask for name
      setStatus('needs_name');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  // ── Name submission (fresh join) ──────────────────────────────────────────
  const handleNameSubmit = useCallback(
    async (e: FormEvent, asSpectator = false) => {
      e.preventDefault();
      const name = nameInput.trim();
      if (!name) { setJoinError('Enter your Louie Name.'); return; }

      setJoiningAs(asSpectator ? 'spectator' : 'player');
      setJoinError(null);
      setStatus('joining');

      try {
        const res = await fetch(`${SERVER_URL}/api/games/${gameId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName: name, asSpectator }),
        });
        const data = await res.json();

        if (!data.ok) {
          if (data.error?.toLowerCase().includes('full')) {
            setFullGame(true);
          }
          setJoinError(data.error);
          setStatus('needs_name');
          setJoiningAs(null);
          return;
        }

        const session: LouieSession = {
          gameId,
          playerName: name,
          playerId: data.playerId,
          role: data.role,
        };
        saveSession(session);

        const ok = await tryRejoin(session);
        if (ok) {
          setStatus('connected');
        } else {
          setJoinError('Connected to server but could not sync game state. Try refreshing.');
          setStatus('needs_name');
        }
      } catch {
        setJoinError('Could not reach the server. Is it running?');
        setStatus('needs_name');
      } finally {
        setJoiningAs(null);
      }
    },
    [nameInput, gameId, tryRejoin],
  );

  const handleStartGame = useCallback(async () => {
    return startGame(gameId);
  }, [startGame, gameId]);

  const handleDealCard = useCallback(
    (targetPlayerId: string) => dealCard(gameId, targetPlayerId),
    [dealCard, gameId],
  );

  const handleFinishDealing = useCallback(
    () => finishDealing(gameId),
    [finishDealing, gameId],
  );

  const handleFlipTrump = useCallback(
    () => flipTrump(gameId),
    [flipTrump, gameId],
  );

  const handlePlaceBid = useCallback(
    (bid: number) => placeBid(gameId, bid),
    [placeBid, gameId],
  );

  const handlePlayCard = useCallback(
    (cardId: string) => playCard(gameId, cardId),
    [playCard, gameId],
  );

  const handleReadyNextRound = useCallback(
    () => readyNextRound(gameId),
    [readyNextRound, gameId],
  );

  // ── Render: loading ───────────────────────────────────────────────────────
  if (status === 'loading' || status === 'joining') {
    return (
      <div className="felt-bg min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-4xl animate-pulse">🃏</div>
          <p className="text-cream/60 text-sm">
            {status === 'joining' ? `Joining as ${joiningAs}…` : 'Reconnecting…'}
          </p>
        </div>
      </div>
    );
  }

  // ── Render: name modal ────────────────────────────────────────────────────
  if (status === 'needs_name') {
    return (
      <div className="felt-bg min-h-screen flex flex-col items-center justify-center px-4">
        <div
          className="text-3xl font-bold text-gold mb-8"
          style={{ fontFamily: 'var(--font-playfair)' }}
        >
          ♠ LOUIE ♥
        </div>
        <div className="panel px-8 py-8 w-full max-w-sm animate-slide-up">
          <h2
            className="text-xl font-semibold text-gold mb-1"
            style={{ fontFamily: 'var(--font-playfair)' }}
          >
            Join Game {gameId}
          </h2>
          <p className="text-cream/40 text-sm mb-6">Enter your Louie Name to join</p>

          <form onSubmit={handleNameSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-cream/50 uppercase tracking-widest mb-1.5">
                Your Louie Name
              </label>
              <input
                className="input-felt"
                placeholder="e.g. Captain Tricks"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                maxLength={20}
                autoFocus
              />
            </div>

            {joinError && <p className="text-red-400 text-sm">{joinError}</p>}

            {fullGame && (
              <button
                type="button"
                onClick={e => handleNameSubmit(e as unknown as FormEvent, true)}
                className="btn-secondary w-full py-2 text-sm"
              >
                👁 Join as Spectator Instead
              </button>
            )}

            <button
              type="submit"
              disabled={!nameInput.trim()}
              className="btn-primary w-full py-3"
            >
              Join Game →
            </button>
          </form>

          <button
            onClick={() => router.push('/')}
            className="mt-4 text-cream/30 text-sm hover:text-cream/60 w-full text-center"
          >
            ← Back to home
          </button>
        </div>
      </div>
    );
  }

  // ── Render: error ─────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="felt-bg min-h-screen flex items-center justify-center px-4">
        <div className="panel px-8 py-8 w-full max-w-sm text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <p className="text-red-400">{pageError ?? socketError ?? 'Something went wrong.'}</p>
          <button onClick={() => router.push('/')} className="btn-secondary">
            ← Home
          </button>
        </div>
      </div>
    );
  }

  // ── Render: connected — show appropriate phase view ───────────────────────
  if (!gameState) {
    return (
      <div className="felt-bg min-h-screen flex items-center justify-center">
        <p className="text-cream/40 text-sm animate-pulse">Syncing game state…</p>
      </div>
    );
  }

  // Connection status overlay (disconnected from WS but still have last state)
  const wsWarning = !connected && (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-900/80 text-yellow-200 text-xs text-center py-1.5 px-4 backdrop-blur-sm">
      ⚡ Reconnecting to server…
    </div>
  );

  // Scorecard button — visible during all active (non-lobby) phases
  const showScoreButton = gameState.phase !== 'lobby' && gameState.currentRound > 0;
  const scoreButton = showScoreButton && (
    <button
      onClick={() => setScorecardOpen(true)}
      className="fixed bottom-5 right-5 z-40 btn-secondary px-4 py-2 text-sm shadow-lg"
    >
      📊 Scores
    </button>
  );

  let phaseView: React.ReactNode;
  switch (gameState.phase) {
    case 'lobby':
      phaseView = <LobbyView gameState={gameState} onStartGame={handleStartGame} />;
      break;
    case 'dealing':
      phaseView = (
        <DealingView
          gameState={gameState}
          onDealCard={handleDealCard}
          onFinishDealing={handleFinishDealing}
        />
      );
      break;
    case 'trump_reveal':
      phaseView = <TrumpRevealView gameState={gameState} onFlipTrump={handleFlipTrump} />;
      break;
    case 'bidding':
      phaseView = <BiddingView gameState={gameState} onPlaceBid={handlePlaceBid} />;
      break;
    case 'trick_play':
      phaseView = <TrickPlayView gameState={gameState} onPlayCard={handlePlayCard} />;
      break;
    case 'round_complete':
      phaseView = <RoundCompleteView gameState={gameState} onReady={handleReadyNextRound} />;
      break;
    case 'game_over':
      phaseView = <GameOverView gameState={gameState} />;
      break;
    default:
      phaseView = <PlaceholderPhaseView phase={gameState.phase} gameState={gameState} />;
  }

  return (
    <>
      {wsWarning}
      {phaseView}
      {scoreButton}
      <AnimatePresence>
        {scorecardOpen && (
          <ScorecardModal gameState={gameState} onClose={() => setScorecardOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

// ── Placeholder for phases not yet implemented ────────────────────────────────
function PlaceholderPhaseView({
  phase,
  gameState,
}: {
  phase: string;
  gameState: ClientGameState;
}) {
  const dealer = gameState.players[gameState.dealerIndex];
  return (
    <div className="felt-bg min-h-screen flex flex-col items-center justify-center px-4 gap-6">
      <h1
        className="text-5xl font-bold text-gold"
        style={{ fontFamily: 'var(--font-playfair)' }}
      >
        ♠ LOUIE ♥
      </h1>
      <div className="panel px-8 py-8 text-center space-y-3 w-full max-w-md">
        <p className="text-xs text-cream/40 uppercase tracking-widest">Phase</p>
        <p className="text-2xl font-semibold text-cream capitalize">{phase.replace('_', ' ')}</p>
        {dealer && (
          <p className="text-cream/60 text-sm">
            Round {gameState.currentRound} · Dealer: <strong className="text-gold">{dealer.name}</strong>
          </p>
        )}
        <p className="text-cream/30 text-xs mt-4 italic">
          This phase will be built in the next milestone.
        </p>
      </div>
      <div className="panel px-5 py-3 w-full max-w-md">
        <p className="text-xs text-cream/40 uppercase tracking-widest mb-2">Players</p>
        <div className="flex flex-wrap gap-2">
          {gameState.players.map(p => (
            <span key={p.id} className="text-sm text-cream/70 flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${p.connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
              {p.name}
              {p.id === gameState.myPlayerId && (
                <span className="text-xs text-cream/30">(you)</span>
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
