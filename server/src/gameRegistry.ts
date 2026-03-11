import {
  GameState,
  Player,
  Spectator,
  GameEvent,
  Card,
  Rank,
  Suit,
  TrickPlay,
  TrickState,
  ClientGameState,
  BidState,
  HAND_SIZES,
  MAX_PLAYERS,
} from '@louie/shared';
import { v4 as uuidv4 } from 'uuid';
import { buildShuffledDeck } from './game/deckUtils';

// ─────────────────────────────────────────────
//  Server-only game type (extends GameState with private data)
// ─────────────────────────────────────────────

export interface ServerGame extends GameState {
  /** Private hands — NEVER broadcast to the room */
  hands: Record<string, Card[]>; // playerId → cards
  /** Shuffled deck; last element = top card. Pop to deal. */
  deck: Card[];
  /** Maps socketId → { id, role } for fast disconnect/rejoin lookup */
  socketMap: Record<string, { id: string; role: 'player' | 'spectator' }>;
  /** Incremented to abort a running bid countdown */
  bidCountdownVersion: number;
}

// ─────────────────────────────────────────────
//  Registry
// ─────────────────────────────────────────────

const games = new Map<string, ServerGame>();

const GAME_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────

function newEventId() { return uuidv4(); }

function generateGameId(): string {
  // Short, readable, no ambiguous characters
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

function generateOdds(): string {
  const x = Math.floor(Math.random() * 3000) + 1;
  const y = Math.floor(Math.random() * 3000) + 1;
  return `${x}:${y}`;
}

function scheduleCleanup(gameId: string) {
  setTimeout(() => {
    if (games.has(gameId)) {
      console.log(`[registry] Cleaned up game ${gameId} after TTL`);
      games.delete(gameId);
    }
  }, GAME_TTL_MS);
}

function makeEvent(message: string, type: GameEvent['type']): GameEvent {
  return { id: newEventId(), timestamp: Date.now(), message, type };
}

// ─────────────────────────────────────────────
//  Create game (REST handler)
// ─────────────────────────────────────────────

export function createGame(
  playerName: string,
  videoLink?: string,
): { ok: true; gameId: string; playerId: string; game: ServerGame } {
  let gameId: string;
  do { gameId = generateGameId(); } while (games.has(gameId));

  const playerId = uuidv4();
  const player: Player = {
    id: playerId,
    socketId: '',
    name: playerName,
    seatIndex: 0,
    connected: false,
    score: 0,
    odds: generateOdds(),
  };

  const game: ServerGame = {
    gameId,
    phase: 'lobby',
    players: [player],
    spectators: [],
    hostId: playerId,
    dealerIndex: -1,
    currentRound: 0,
    deckRemaining: 0,
    scoreHistory: {},
    eventLog: [makeEvent(`${playerName} created the game`, 'join')],
    createdAt: Date.now(),
    paused: false,
    videoLink: videoLink?.trim() || undefined,
    hands: {},
    deck: [],
    socketMap: {},
    bidCountdownVersion: 0,
  };

  games.set(gameId, game);
  scheduleCleanup(gameId);

  return { ok: true, gameId, playerId, game };
}

// ─────────────────────────────────────────────
//  Join game (REST handler)
// ─────────────────────────────────────────────

export function joinGame(
  gameId: string,
  playerName: string,
  asSpectator: boolean,
): { ok: true; playerId: string; role: 'player' | 'spectator' } | { ok: false; error: string } {
  const game = games.get(gameId);
  if (!game) return { ok: false, error: `Game "${gameId}" not found. Check the game ID.` };

  // Check for name collision across players + spectators
  const nameTaken =
    game.players.some(p => p.name.toLowerCase() === playerName.toLowerCase()) ||
    game.spectators.some(s => s.name.toLowerCase() === playerName.toLowerCase());
  if (nameTaken) return { ok: false, error: `Name "${playerName}" is already taken. Choose another.` };

  const isFull = game.players.length >= MAX_PLAYERS;
  const isStarted = game.phase !== 'lobby';

  // Auto-spectate if game is full or already started
  const becomeSpectator = asSpectator || isFull || isStarted;

  if (becomeSpectator) {
    const spectatorId = uuidv4();
    const spectator: Spectator = {
      id: spectatorId,
      name: playerName,
      connected: false,
    };
    game.spectators.push(spectator);
    game.eventLog.push(makeEvent(`${playerName} joined as spectator`, 'join'));
    return { ok: true, playerId: spectatorId, role: 'spectator' };
  } else {
    const seatIndex = game.players.length;
    const playerId = uuidv4();
    const player: Player = {
      id: playerId,
      socketId: '',
      name: playerName,
      seatIndex,
      connected: false,
      score: 0,
      odds: generateOdds(),
    };
    game.players.push(player);
    game.eventLog.push(makeEvent(`${playerName} joined as Player ${seatIndex + 1}`, 'join'));
    return { ok: true, playerId, role: 'player' };
  }
}

// ─────────────────────────────────────────────
//  Rejoin game (WebSocket handler)
// ─────────────────────────────────────────────

export function rejoinGame(
  gameId: string,
  playerName: string,
  playerId: string,
  socketId: string,
): { ok: true; hand: Card[]; role: 'player' | 'spectator' } | { ok: false; error: string } {
  const game = games.get(gameId);
  if (!game) return { ok: false, error: 'Game not found.' };

  // Try to find as player
  const player = game.players.find(p => p.id === playerId && p.name === playerName);
  if (player) {
    // Remove old socket mapping
    if (player.socketId && game.socketMap[player.socketId]) {
      delete game.socketMap[player.socketId];
    }
    player.socketId = socketId;
    player.connected = true;
    game.socketMap[socketId] = { id: playerId, role: 'player' };

    // Check if all players are now back
    const allConnected = game.players.every(p => p.connected);
    if (allConnected && game.paused) {
      game.paused = false;
      game.eventLog.push(makeEvent(`${playerName} reconnected — game resumed`, 'system'));
    } else {
      game.eventLog.push(makeEvent(`${playerName} reconnected`, 'system'));
    }

    return { ok: true, hand: game.hands[playerId] ?? [], role: 'player' };
  }

  // Try to find as spectator
  const spectator = game.spectators.find(s => s.id === playerId && s.name === playerName);
  if (spectator) {
    spectator.connected = true;
    game.socketMap[socketId] = { id: playerId, role: 'spectator' };
    game.eventLog.push(makeEvent(`${playerName} reconnected (spectator)`, 'system'));
    return { ok: true, hand: [], role: 'spectator' };
  }

  return { ok: false, error: 'Player not found. Your name or ID did not match.' };
}

// ─────────────────────────────────────────────
//  Disconnect handler
// ─────────────────────────────────────────────

export function handleDisconnect(
  socketId: string,
): { gameId: string; game: ServerGame } | null {
  for (const [gameId, game] of games.entries()) {
    const entry = game.socketMap[socketId];
    if (!entry) continue;

    delete game.socketMap[socketId];

    if (entry.role === 'player') {
      const player = game.players.find(p => p.id === entry.id);
      if (player) {
        player.connected = false;
        player.socketId = '';

        // Pause active games (not lobby or game_over)
        if (game.phase !== 'lobby' && game.phase !== 'game_over') {
          game.paused = true;
        }

        game.eventLog.push(makeEvent(`${player.name} disconnected`, 'system'));
      }
    } else {
      // Remove spectators on disconnect
      const idx = game.spectators.findIndex(s => s.id === entry.id);
      if (idx !== -1) {
        const name = game.spectators[idx].name;
        game.spectators.splice(idx, 1);
        game.eventLog.push(makeEvent(`${name} left`, 'system'));
      }
    }

    return { gameId, game };
  }

  return null;
}

// ─────────────────────────────────────────────
//  Start game
// ─────────────────────────────────────────────

export function startGame(
  gameId: string,
  requestingPlayerId: string,
): { ok: true } | { ok: false; error: string } {
  const game = games.get(gameId);
  if (!game) return { ok: false, error: 'Game not found.' };
  if (game.phase !== 'lobby') return { ok: false, error: 'Game has already started.' };
  if (game.hostId !== requestingPlayerId) return { ok: false, error: 'Only the host can start the game.' };
  if (game.players.length < 2) return { ok: false, error: 'Need at least 2 players to start.' };

  game.phase = 'dealing';
  game.currentRound = 1;
  game.dealerIndex = 0; // Player at seat 0 deals round 1

  // Build and shuffle the deck (seeded — reproducible for this game/round)
  game.deck = buildShuffledDeck(game.gameId, 1);
  game.deckRemaining = game.deck.length;

  // Initialize round state
  const handSize = HAND_SIZES[0]; // 9 for round 1
  game.round = {
    roundNumber: 1,
    handSize,
    bids: Object.fromEntries(game.players.map(p => [p.id, { hasBid: false }])),
    bidsRevealed: false,
    completedTricks: [],
    currentTrick: { plays: [], complete: false },
    currentLeaderId: game.players[game.dealerIndex].id,
    tricksWon: Object.fromEntries(game.players.map(p => [p.id, 0])),
    dealingComplete: false,
    handCounts: Object.fromEntries(game.players.map(p => [p.id, 0])),
  };

  const dealerName = game.players[game.dealerIndex].name;
  game.eventLog.push(
    makeEvent(`Game started! ${dealerName} is the dealer — Round 1 (${handSize} cards each).`, 'system'),
  );

  return { ok: true };
}

// ─────────────────────────────────────────────
//  Deal one card
// ─────────────────────────────────────────────

export function dealCard(
  gameId: string,
  dealerPlayerId: string,
  targetPlayerId: string,
): { ok: true } | { ok: false; error: string } {
  const game = games.get(gameId);
  if (!game) return { ok: false, error: 'Game not found.' };
  if (game.phase !== 'dealing') return { ok: false, error: 'Not in dealing phase.' };
  if (game.paused) return { ok: false, error: 'Game is paused.' };
  if (!game.round) return { ok: false, error: 'No active round.' };
  if (game.players[game.dealerIndex]?.id !== dealerPlayerId) {
    return { ok: false, error: 'Only the dealer can deal cards.' };
  }
  if (game.deck.length === 0) {
    return { ok: false, error: 'No cards remaining in the deck.' };
  }

  const target = game.players.find(p => p.id === targetPlayerId);
  if (!target) return { ok: false, error: 'Target player not found.' };

  // Pop from end of deck array (the "top" of the deck)
  const card = game.deck.pop()!;

  if (!game.hands[targetPlayerId]) game.hands[targetPlayerId] = [];
  game.hands[targetPlayerId].push(card);

  game.round.handCounts[targetPlayerId] = (game.round.handCounts[targetPlayerId] ?? 0) + 1;
  game.round.lastDealTargetId = targetPlayerId;
  game.deckRemaining = game.deck.length;

  game.eventLog.push(makeEvent(`${target.name} received a card (${game.round.handCounts[targetPlayerId]}/${game.round.handSize})`, 'deal'));

  return { ok: true };
}

// ─────────────────────────────────────────────
//  Finish dealing (validate + advance or misdeal)
// ─────────────────────────────────────────────

export function finishDealing(
  gameId: string,
  dealerPlayerId: string,
): { ok: true; misdeal: boolean } | { ok: false; error: string } {
  const game = games.get(gameId);
  if (!game) return { ok: false, error: 'Game not found.' };
  if (game.phase !== 'dealing') return { ok: false, error: 'Not in dealing phase.' };
  if (!game.round) return { ok: false, error: 'No active round.' };
  if (game.players[game.dealerIndex]?.id !== dealerPlayerId) {
    return { ok: false, error: 'Only the dealer can finish dealing.' };
  }

  const { handSize, handCounts } = game.round;
  const hasMisdeal = game.players.some(p => (handCounts[p.id] ?? 0) !== handSize);

  if (hasMisdeal) {
    const offenders = game.players
      .filter(p => (handCounts[p.id] ?? 0) !== handSize)
      .map(p => `${p.name} (${handCounts[p.id] ?? 0}/${handSize})`)
      .join(', ');

    game.round.misdeal = true;
    game.eventLog.push(makeEvent(`MISDEAL! Wrong card counts: ${offenders}. Re-dealing in 3s…`, 'system'));
    return { ok: true, misdeal: true };
  }

  // All good — advance to trump reveal
  game.phase = 'trump_reveal';
  game.round.dealingComplete = true;
  game.round.lastDealTargetId = undefined;
  game.eventLog.push(makeEvent('Dealing complete! Dealer must now flip trump.', 'system'));
  return { ok: true, misdeal: false };
}

// ─────────────────────────────────────────────
//  Reset after a misdeal (called by socket handler after delay)
// ─────────────────────────────────────────────

export function resetForReDeal(gameId: string): void {
  const game = games.get(gameId);
  if (!game || !game.round) return;

  // Wipe hands and reshuffle
  game.hands = {};
  game.deck = buildShuffledDeck(game.gameId, game.currentRound);
  game.deckRemaining = game.deck.length;
  game.round.handCounts = Object.fromEntries(game.players.map(p => [p.id, 0]));
  game.round.misdeal = false;
  game.round.lastDealTargetId = undefined;

  game.eventLog.push(makeEvent('Deck reshuffled — deal again.', 'system'));
}

// ─────────────────────────────────────────────
//  Getters
// ─────────────────────────────────────────────

export function getGame(gameId: string): ServerGame | undefined {
  return games.get(gameId);
}

/** Build the state object safe to send to a specific client. */
export function getClientState(game: ServerGame, playerId: string): ClientGameState {
  // Strip server-only fields (deck never goes to clients)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { hands, deck: _deck, socketMap, ...publicState } = game;

  // Hide other players' bid VALUES until all bids are locked and revealed
  let round = publicState.round;
  if (round && !round.bidsRevealed) {
    const safeBids: typeof round.bids = {};
    for (const [pid, bs] of Object.entries(round.bids)) {
      safeBids[pid] = pid === playerId
        ? bs                      // own bid: always visible
        : { hasBid: bs.hasBid };  // others: only show locked status
    }
    round = { ...round, bids: safeBids };
  }

  return {
    ...publicState,
    round,
    myPlayerId: playerId,
    myHand: hands[playerId] ?? [],
  };
}

// ─────────────────────────────────────────────
//  Flip trump (dealer only — trump_reveal phase)
// ─────────────────────────────────────────────

export function flipTrump(
  gameId: string,
  dealerPlayerId: string,
): { ok: true } | { ok: false; error: string } {
  const game = games.get(gameId);
  if (!game) return { ok: false, error: 'Game not found.' };
  if (game.phase !== 'trump_reveal') return { ok: false, error: 'Not in trump reveal phase.' };
  if (game.paused) return { ok: false, error: 'Game is paused.' };
  if (!game.round) return { ok: false, error: 'No active round.' };
  if (game.players[game.dealerIndex]?.id !== dealerPlayerId) {
    return { ok: false, error: 'Only the dealer can flip trump.' };
  }
  if (game.deck.length === 0) {
    return { ok: false, error: 'No cards left in deck to reveal as trump.' };
  }

  const trumpCard = game.deck.pop()!;
  game.round.trump = trumpCard;
  game.deckRemaining = game.deck.length;
  game.phase = 'bidding';

  const dealerName = game.players[game.dealerIndex].name;
  game.eventLog.push(
    makeEvent(
      `${dealerName} flipped trump: ${trumpCard.rank} of ${trumpCard.suit}. Place your bids!`,
      'trump',
    ),
  );

  return { ok: true };
}

// ─────────────────────────────────────────────
//  Place bid (bidding phase)
// ─────────────────────────────────────────────

export function placeBid(
  gameId: string,
  playerId: string,
  bid: number,
): { ok: true; allBid: boolean } | { ok: false; error: string } {
  const game = games.get(gameId);
  if (!game) return { ok: false, error: 'Game not found.' };
  if (game.phase !== 'bidding') return { ok: false, error: 'Not in bidding phase.' };
  if (game.paused) return { ok: false, error: 'Game is paused.' };
  if (!game.round) return { ok: false, error: 'No active round.' };
  if (game.round.bidsRevealed) return { ok: false, error: 'Bids have already been revealed.' };
  if (game.round.bidCountdown !== undefined) {
    return { ok: false, error: 'Countdown has started — bids are locked.' };
  }

  const player = game.players.find(p => p.id === playerId);
  if (!player) return { ok: false, error: 'Player not found.' };
  if (game.round.bids[playerId]?.hasBid) {
    return { ok: false, error: 'You have already locked in your bid.' };
  }

  if (!Number.isInteger(bid) || bid < 0) {
    return { ok: false, error: 'Bid must be a non-negative whole number.' };
  }

  game.round.bids[playerId] = { hasBid: true, bid };

  const lockedCount = Object.values(game.round.bids).filter(b => b.hasBid).length;
  game.eventLog.push(
    makeEvent(`${player.name} locked in their bid (${lockedCount}/${game.players.length} ready)`, 'bid'),
  );

  const allBid = game.players.every(p => game.round!.bids[p.id]?.hasBid);
  return { ok: true, allBid };
}

// ─────────────────────────────────────────────
//  Cancel bid countdown (any player)
// ─────────────────────────────────────────────

export function cancelBidCountdown(
  gameId: string,
  playerId: string,
): { ok: true } | { ok: false; error: string } {
  const game = games.get(gameId);
  if (!game) return { ok: false, error: 'Game not found.' };
  if (!game.round) return { ok: false, error: 'No active round.' };
  if (game.round.bidCountdown === undefined) return { ok: false, error: 'No countdown in progress.' };

  const player = game.players.find(p => p.id === playerId);
  if (!player) return { ok: false, error: 'Player not found.' };

  // Abort the running countdown
  game.bidCountdownVersion += 1;
  game.round.bidCountdown = undefined;

  // Unlock all bids (keep bid values so inputs stay pre-populated)
  for (const [pid, bs] of Object.entries(game.round.bids)) {
    if (bs.hasBid) {
      game.round.bids[pid] = { hasBid: false, bid: bs.bid };
    }
  }

  game.round.bidCancelledBy = player.name;
  game.eventLog.push(makeEvent(`${player.name} wants to change their bid — countdown cancelled`, 'bid'));
  return { ok: true };
}

export function clearBidCancelMessage(gameId: string): void {
  const game = games.get(gameId);
  if (!game?.round) return;
  game.round.bidCancelledBy = undefined;
}

// ─────────────────────────────────────────────
//  Reveal bids (called after countdown finishes)
// ─────────────────────────────────────────────

export function revealBids(gameId: string): void {
  const game = games.get(gameId);
  if (!game || !game.round) return;

  game.round.bidsRevealed = true;
  game.round.bidCountdown = undefined;

  const bidSummary = game.players
    .map(p => `${p.name}: ${game.round!.bids[p.id]?.bid ?? '?'}`)
    .join(' · ');
  game.eventLog.push(makeEvent(`Bids revealed — ${bidSummary}`, 'bid'));
}

// ─────────────────────────────────────────────
//  Advance to trick play
// ─────────────────────────────────────────────

export function advanceToTrickPlay(gameId: string): void {
  const game = games.get(gameId);
  if (!game || !game.round) return;

  game.phase = 'trick_play';

  // First trick is led by the player to the LEFT of the dealer
  const leaderIndex = (game.dealerIndex + 1) % game.players.length;
  game.round.currentLeaderId = game.players[leaderIndex].id;
  game.round.currentTrick = { plays: [], complete: false };

  const leaderName = game.players[leaderIndex].name;
  game.eventLog.push(makeEvent(`Trick play begins — ${leaderName} leads the first trick.`, 'system'));
}

// ─────────────────────────────────────────────
//  Trick play helpers
// ─────────────────────────────────────────────

const RANK_VALUE: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

function determineTrickWinner(trick: TrickState, trumpSuit: Suit | undefined): TrickPlay {
  const trumpPlays = trumpSuit
    ? trick.plays.filter(p => p.card.suit === trumpSuit)
    : [];
  const candidates = trumpPlays.length > 0
    ? trumpPlays
    : trick.plays.filter(p => p.card.suit === trick.ledSuit);
  return candidates.reduce((best, p) =>
    RANK_VALUE[p.card.rank] > RANK_VALUE[best.card.rank] ? p : best,
  );
}

function nextPlayer(game: ServerGame, currentPlayerId: string): string {
  const idx = game.players.findIndex(p => p.id === currentPlayerId);
  return game.players[(idx + 1) % game.players.length].id;
}

// ─────────────────────────────────────────────
//  Play a card
// ─────────────────────────────────────────────

export function playCard(
  gameId: string,
  playerId: string,
  cardId: string,
): { ok: true; trickComplete: boolean; roundComplete: boolean } | { ok: false; error: string } {
  const game = games.get(gameId);
  if (!game) return { ok: false, error: 'Game not found.' };
  if (game.phase !== 'trick_play') return { ok: false, error: 'Not in trick play phase.' };
  if (game.paused) return { ok: false, error: 'Game is paused.' };
  if (!game.round) return { ok: false, error: 'No active round.' };

  const round = game.round;
  if (round.currentLeaderId !== playerId) {
    return { ok: false, error: "It's not your turn." };
  }

  const hand = game.hands[playerId] ?? [];
  const cardIndex = hand.findIndex(c => c.id === cardId);
  if (cardIndex === -1) return { ok: false, error: 'Card not in your hand.' };
  const card = hand[cardIndex];

  // Follow-suit validation
  const { ledSuit } = round.currentTrick;
  if (ledSuit && card.suit !== ledSuit) {
    const hasSuit = hand.some(c => c.suit === ledSuit);
    if (hasSuit) return { ok: false, error: `You must follow suit (${ledSuit}).` };
  }

  // Remove card from hand
  hand.splice(cardIndex, 1);

  const player = game.players.find(p => p.id === playerId)!;
  const play: TrickPlay = { playerId, playerName: player.name, card };
  round.currentTrick.plays.push(play);

  // Set led suit on first play
  if (!round.currentTrick.ledSuit) {
    round.currentTrick.ledSuit = card.suit;
  }

  // Not all played yet — advance turn and return
  if (round.currentTrick.plays.length < game.players.length) {
    round.currentLeaderId = nextPlayer(game, playerId);
    game.eventLog.push(makeEvent(`${player.name} played ${card.rank} of ${card.suit}`, 'play'));
    return { ok: true, trickComplete: false, roundComplete: false };
  }

  // All players have played — complete the trick
  const winner = determineTrickWinner(round.currentTrick, round.trump?.suit);
  round.currentTrick.winnerId = winner.playerId;
  round.currentTrick.winnerName = winner.playerName;
  round.currentTrick.complete = true;
  round.tricksWon[winner.playerId] = (round.tricksWon[winner.playerId] ?? 0) + 1;
  // currentLeaderId will be set to winner after sweep (in sweepTrick)

  const trickNum = round.completedTricks.length + 1;
  game.eventLog.push(makeEvent(
    `${player.name} played ${card.rank} of ${card.suit} · Trick ${trickNum}: ${winner.playerName} wins!`,
    'play',
  ));

  const roundComplete = game.players.every(p => (game.hands[p.id]?.length ?? 0) === 0);
  return { ok: true, trickComplete: true, roundComplete };
}

// ─────────────────────────────────────────────
//  Sweep completed trick to history
// ─────────────────────────────────────────────

export function sweepTrick(gameId: string): void {
  const game = games.get(gameId);
  if (!game || !game.round) return;

  const round = game.round;
  const winnerId = round.currentTrick.winnerId!;
  round.completedTricks.push(round.currentTrick);
  round.currentTrick = { plays: [], complete: false };
  round.currentLeaderId = winnerId;
}

// ─────────────────────────────────────────────
//  Score round and advance phase
// ─────────────────────────────────────────────

export function scoreRound(gameId: string): void {
  const game = games.get(gameId);
  if (!game || !game.round) return;

  const round = game.round;
  const summaryParts: string[] = [];

  for (const player of game.players) {
    const bid = round.bids[player.id]?.bid ?? 0;
    const tricks = round.tricksWon[player.id] ?? 0;
    const hitBid = tricks === bid;
    const roundScore = tricks + (hitBid ? 10 : 0);
    player.score += roundScore;

    if (!game.scoreHistory[player.id]) game.scoreHistory[player.id] = [];
    game.scoreHistory[player.id].push({
      round: round.roundNumber,
      bid,
      tricksWon: tricks,
      roundScore,
      cumulativeScore: player.score,
    });

    summaryParts.push(`${player.name}: ${tricks}/${bid} bid → +${roundScore}`);
  }

  game.phase = 'round_complete';
  round.playersReady = [];
  game.eventLog.push(makeEvent(`Round ${round.roundNumber} scores — ${summaryParts.join(' · ')}`, 'score'));
}

// ─────────────────────────────────────────────
//  Ready for next round
// ─────────────────────────────────────────────

export function readyForNextRound(
  gameId: string,
  playerId: string,
): { ok: true; allReady: boolean } | { ok: false; error: string } {
  const game = games.get(gameId);
  if (!game) return { ok: false, error: 'Game not found.' };
  if (game.phase !== 'round_complete') return { ok: false, error: 'Not in round complete phase.' };
  if (!game.round) return { ok: false, error: 'No active round.' };

  const player = game.players.find(p => p.id === playerId);
  if (!player) return { ok: false, error: 'Player not found.' };

  if (!game.round.playersReady) game.round.playersReady = [];
  if (!game.round.playersReady.includes(playerId)) {
    game.round.playersReady.push(playerId);
    game.eventLog.push(makeEvent(`${player.name} is ready for the next round (${game.round.playersReady.length}/${game.players.length})`, 'system'));
  }

  const allReady = game.players.every(p => game.round!.playersReady!.includes(p.id));
  return { ok: true, allReady };
}

// ─────────────────────────────────────────────
//  Advance to next round (or game over)
// ─────────────────────────────────────────────

export function advanceToNextRound(gameId: string): void {
  const game = games.get(gameId);
  if (!game) return;

  if (game.currentRound >= 17) {
    game.phase = 'game_over';
    const ranked = [...game.players].sort((a, b) => b.score - a.score);
    game.eventLog.push(makeEvent(
      `Game over! Final standings: ${ranked.map((p, i) => `${i + 1}. ${p.name} (${p.score})`).join(' · ')}`,
      'score',
    ));
    return;
  }

  const nextRound = game.currentRound + 1;
  game.currentRound = nextRound;
  game.dealerIndex = (game.dealerIndex + 1) % game.players.length;

  // Rebuild deck and clear hands
  game.deck = buildShuffledDeck(game.gameId, nextRound);
  game.deckRemaining = game.deck.length;
  for (const p of game.players) game.hands[p.id] = [];

  const handSize = HAND_SIZES[nextRound - 1];
  const emptyBids: Record<string, BidState> = {};
  const emptyTricks: Record<string, number> = {};
  const emptyCounts: Record<string, number> = {};
  for (const p of game.players) {
    emptyBids[p.id] = { hasBid: false };
    emptyTricks[p.id] = 0;
    emptyCounts[p.id] = 0;
  }

  const dealerName = game.players[game.dealerIndex].name;
  game.round = {
    roundNumber: nextRound,
    handSize,
    bids: emptyBids,
    bidsRevealed: false,
    completedTricks: [],
    currentTrick: { plays: [], complete: false },
    currentLeaderId: game.players[game.dealerIndex].id,
    tricksWon: emptyTricks,
    dealingComplete: false,
    handCounts: emptyCounts,
  };

  game.phase = 'dealing';
  game.eventLog.push(makeEvent(`Round ${nextRound} begins! ${dealerName} deals (${handSize} cards each).`, 'system'));
}
