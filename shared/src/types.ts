// ─────────────────────────────────────────────
//  Cards
// ─────────────────────────────────────────────

export type Suit = 'spades' | 'hearts' | 'clubs' | 'diamonds';

export type Rank =
  | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'
  | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string; // e.g. "A_of_spades"
}

// ─────────────────────────────────────────────
//  Players & Spectators
// ─────────────────────────────────────────────

export interface Player {
  id: string;        // stable UUID (persists across reconnects)
  socketId: string;  // current socket (changes on reconnect, empty if offline)
  name: string;      // Louie Name chosen at session start
  seatIndex: number; // 0–4
  connected: boolean;
  score: number;     // cumulative score across all rounds
  odds: string;      // "X:Y" label shown in scorecard header (generated at join time)
}

export interface Spectator {
  id: string;
  name: string;
  connected: boolean;
}

// ─────────────────────────────────────────────
//  Game phases
// ─────────────────────────────────────────────

export type Phase =
  | 'lobby'
  | 'dealing'
  | 'trump_reveal'
  | 'bidding'
  | 'trick_play'
  | 'round_complete'
  | 'game_over';

// ─────────────────────────────────────────────
//  Event log
// ─────────────────────────────────────────────

export type EventType =
  | 'system'
  | 'join'
  | 'deal'
  | 'trump'
  | 'bid'
  | 'play'
  | 'score'
  | 'error';

export interface GameEvent {
  id: string;
  timestamp: number;
  message: string;
  type: EventType;
}

// ─────────────────────────────────────────────
//  Trick play
// ─────────────────────────────────────────────

export interface TrickPlay {
  playerId: string;
  playerName: string;
  card: Card;
}

export interface TrickState {
  plays: TrickPlay[];
  ledSuit?: Suit;
  winnerId?: string;
  winnerName?: string;
  complete: boolean;
}

// ─────────────────────────────────────────────
//  Round state
// ─────────────────────────────────────────────

export interface BidState {
  hasBid: boolean;
  bid?: number; // revealed only after all players have bid
}

export interface RoundState {
  roundNumber: number;   // 1–17
  handSize: number;      // cards per player this round
  trump?: Card;          // set after dealer flips
  bids: Record<string, BidState>; // playerId → bid info
  bidsRevealed: boolean;
  completedTricks: TrickState[];
  currentTrick: TrickState;
  currentLeaderId: string; // who leads the current trick
  tricksWon: Record<string, number>; // playerId → tricks won
  dealingComplete: boolean;
  handCounts: Record<string, number>; // playerId → cards dealt so far
  /** Set briefly after a misdeal; cleared once the deck is reshuffled */
  misdeal?: boolean;
  /** PlayerId who most recently received a card (for client animation) */
  lastDealTargetId?: string;
  /** 3 → 2 → 1 during bid countdown; undefined otherwise */
  bidCountdown?: number;
  /** Player IDs who have clicked "Ready for next round" */
  playersReady?: string[];
}

// ─────────────────────────────────────────────
//  Score history
// ─────────────────────────────────────────────

export interface ScoreEntry {
  round: number;
  bid: number;
  tricksWon: number;
  roundScore: number;
  cumulativeScore: number;
}

// ─────────────────────────────────────────────
//  Full game state (safe for clients — no hands)
// ─────────────────────────────────────────────

export interface GameState {
  gameId: string;
  phase: Phase;
  players: Player[];      // ordered by seatIndex
  spectators: Spectator[];
  hostId: string;         // playerId of the host (first to join)
  dealerIndex: number;    // index into players[]; -1 before game starts
  currentRound: number;   // 1–17 (0 before game starts)
  round?: RoundState;     // present during/after first round
  deckRemaining: number;  // cards left in dealer's hand during dealing phase
  scoreHistory: Record<string, ScoreEntry[]>; // playerId → round entries
  eventLog: GameEvent[];
  createdAt: number;
  paused: boolean;        // true when a player is disconnected mid-game
}

// ─────────────────────────────────────────────
//  Client-specific state (adds private hand)
// ─────────────────────────────────────────────

export type ClientGameState = GameState & {
  myPlayerId: string;   // empty string for spectators
  myHand: Card[];       // this client's private hand (empty for spectators)
};

// ─────────────────────────────────────────────
//  Socket.IO event maps
// ─────────────────────────────────────────────

export interface ServerToClientEvents {
  game_state: (state: ClientGameState) => void;
  error: (payload: { message: string }) => void;
}

export interface ClientToServerEvents {
  rejoin_game: (
    data: { gameId: string; playerName: string; playerId: string },
    callback: (res: { ok: true } | { ok: false; error: string }) => void,
  ) => void;
  start_game: (
    data: { gameId: string },
    callback: (res: { ok: true } | { ok: false; error: string }) => void,
  ) => void;
  deal_card: (
    data: { gameId: string; targetPlayerId: string },
    callback: (res: { ok: true } | { ok: false; error: string }) => void,
  ) => void;
  finish_dealing: (
    data: { gameId: string },
    callback: (res: { ok: true } | { ok: false; error: string }) => void,
  ) => void;
  flip_trump: (
    data: { gameId: string },
    callback: (res: { ok: true } | { ok: false; error: string }) => void,
  ) => void;
  place_bid: (
    data: { gameId: string; bid: number },
    callback: (res: { ok: true } | { ok: false; error: string }) => void,
  ) => void;
  play_card: (
    data: { gameId: string; cardId: string },
    callback: (res: { ok: true } | { ok: false; error: string }) => void,
  ) => void;
  ready_next_round: (
    data: { gameId: string },
    callback: (res: { ok: true } | { ok: false; error: string }) => void,
  ) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  gameId?: string;
  playerId?: string;
  role?: 'player' | 'spectator';
}

// ─────────────────────────────────────────────
//  REST API shapes (used by home page create/join)
// ─────────────────────────────────────────────

export interface CreateGameRequest {
  playerName: string;
}
export interface CreateGameResponse {
  ok: true;
  gameId: string;
  playerId: string;
}

export interface JoinGameRequest {
  playerName: string;
  asSpectator?: boolean;
}
export interface JoinGameResponse {
  ok: true;
  playerId: string;
  role: 'player' | 'spectator';
}

export interface ApiError {
  ok: false;
  error: string;
}

// ─────────────────────────────────────────────
//  Saved session (localStorage)
// ─────────────────────────────────────────────

export interface LouieSession {
  gameId: string;
  playerName: string;
  playerId: string;
  role: 'player' | 'spectator';
}

// ─────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────

// Hand sizes for each of the 17 rounds
export const HAND_SIZES: number[] = [9, 8, 7, 6, 5, 4, 3, 2, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export const MAX_PLAYERS = 5;
