export type Suit = "hearts" | "diamonds" | "clubs" | "spades"
export type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A"

export interface Card {
  suit: Suit
  rank: Rank
  faceUp: boolean
}

export type HandRank =
  | "high-card"
  | "pair"
  | "two-pair"
  | "three-of-a-kind"
  | "straight"
  | "flush"
  | "full-house"
  | "four-of-a-kind"
  | "straight-flush"
  | "royal-flush"

export interface HandEvaluation {
  rank: HandRank
  value: number
  cards: Card[]
  description: string
}

export type PlayerType = "human" | "ai"
export type ActionType = "check" | "bet" | "call" | "raise" | "fold"
export type GameRound = "pre-flop" | "flop" | "turn" | "river" | "showdown"

export interface PlayerAction {
  type: ActionType
  amount?: number
  player: Player
}

export interface Player {
  id: number
  name: string
  type: PlayerType
  chips: number
  hand: Card[]
  bet: number
  folded: boolean
  isAllIn: boolean
  isDealer: boolean
  isSmallBlind: boolean
  isBigBlind: boolean
  isActive: boolean
  avatarId?: string
}

export interface GameState {
  players: Player[]
  deck: Card[]
  communityCards: Card[]
  pot: number
  sidePots: { amount: number; eligiblePlayers: number[] }[]
  currentRound: GameRound
  currentPlayerIndex: number
  dealerIndex: number
  smallBlindIndex: number
  bigBlindIndex: number
  smallBlindAmount: number
  bigBlindAmount: number
  minBet: number
  lastRaiseAmount: number
  lastBetAmount: number
  roundBettingComplete: boolean
  gameOver: boolean
  winners: Player[]
  handEvaluations: Record<number, HandEvaluation>
  actionHistory: PlayerAction[]
  roundStarted: boolean
  playersActed: number[]
}

export interface Recommendation {
  action: ActionType
  amount?: number
  confidence: number
  reasoning: string
  expectedValue: number
  riskLevel: "low" | "medium" | "high"
  alternativeActions: {
    action: ActionType
    amount?: number
    expectedValue: number
  }[]
}

export interface PayoffMatrix {
  [key: string]: {
    [key: string]: number
  }
}

export interface MixedStrategy {
  [key: string]: number
}

export interface NashEquilibrium {
  strategies: {
    [playerId: number]: MixedStrategy
  }
  expectedPayoffs: {
    [playerId: number]: number
  }
}
