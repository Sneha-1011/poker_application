import type { Card, Rank, Suit, HandEvaluation } from "@/types/poker"

// Create a new deck of cards
export function createDeck(): Card[] {
  const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"]
  const ranks: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]
  const deck: Card[] = []

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank, faceUp: false })
    }
  }

  return shuffleDeck(deck)
}

// Shuffle the deck using Fisher-Yates algorithm
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Get the numerical value of a card rank
export function getRankValue(rank: Rank): number {
  const rankValues: Record<Rank, number> = {
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "10": 10,
    J: 11,
    Q: 12,
    K: 13,
    A: 14,
  }
  return rankValues[rank]
}

// Compare two cards by rank
export function compareCards(a: Card, b: Card): number {
  return getRankValue(b.rank) - getRankValue(a.rank)
}

// Get all possible 5-card combinations from a set of cards
export function getCombinations(cards: Card[], k: number): Card[][] {
  if (k > cards.length || k <= 0) {
    return []
  }

  if (k === cards.length) {
    return [cards]
  }

  if (k === 1) {
    return cards.map((card) => [card])
  }

  const combinations: Card[][] = []
  for (let i = 0; i < cards.length - k + 1; i++) {
    const head = cards.slice(i, i + 1)
    const tailCombinations = getCombinations(cards.slice(i + 1), k - 1)
    for (const tailCombination of tailCombinations) {
      combinations.push([...head, ...tailCombination])
    }
  }

  return combinations
}

// Check if cards form a flush
function isFlush(cards: Card[]): boolean {
  const suit = cards[0].suit
  return cards.every((card) => card.suit === suit)
}

// Check if cards form a straight
function isStraight(cards: Card[]): boolean {
  const sortedCards = [...cards].sort((a, b) => getRankValue(a.rank) - getRankValue(b.rank))

  // Handle special case: A-5 straight
  if (
    sortedCards[0].rank === "2" &&
    sortedCards[1].rank === "3" &&
    sortedCards[2].rank === "4" &&
    sortedCards[3].rank === "5" &&
    sortedCards[4].rank === "A"
  ) {
    return true
  }

  for (let i = 1; i < sortedCards.length; i++) {
    if (getRankValue(sortedCards[i].rank) !== getRankValue(sortedCards[i - 1].rank) + 1) {
      return false
    }
  }

  return true
}

// Count occurrences of each rank
function getRankCounts(cards: Card[]): Map<Rank, number> {
  const counts = new Map<Rank, number>()
  for (const card of cards) {
    counts.set(card.rank, (counts.get(card.rank) || 0) + 1)
  }
  return counts
}

// Evaluate a 5-card hand
export function evaluateHand(cards: Card[]): HandEvaluation {
  if (cards.length !== 5) {
    throw new Error("Hand must contain exactly 5 cards")
  }

  const isHandFlush = isFlush(cards)
  const isHandStraight = isStraight(cards)
  const rankCounts = getRankCounts(cards)
  const sortedCards = [...cards].sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank))

  // Royal Flush
  if (isHandFlush && isHandStraight && sortedCards[0].rank === "A" && sortedCards[1].rank === "K") {
    return {
      rank: "royal-flush",
      value: 9000000,
      cards: sortedCards,
      description: "Royal Flush",
    }
  }

  // Straight Flush
  if (isHandFlush && isHandStraight) {
    const highCard = sortedCards[0]
    return {
      rank: "straight-flush",
      value: 8000000 + getRankValue(highCard.rank),
      cards: sortedCards,
      description: `Straight Flush, ${highCard.rank} high`,
    }
  }

  // Four of a Kind
  const fourOfAKind = [...rankCounts.entries()].find(([_, count]) => count === 4)
  if (fourOfAKind) {
    const [rank] = fourOfAKind
    const kicker = sortedCards.find((card) => card.rank !== rank)!
    return {
      rank: "four-of-a-kind",
      value: 7000000 + getRankValue(rank) * 100 + getRankValue(kicker.rank),
      cards: sortedCards,
      description: `Four of a Kind, ${rank}s`,
    }
  }

  // Full House
  const hasThreeOfAKind = [...rankCounts.entries()].some(([_, count]) => count === 3)
  const hasPair = [...rankCounts.entries()].some(([_, count]) => count === 2)
  if (hasThreeOfAKind && hasPair) {
    const threeRank = [...rankCounts.entries()].find(([_, count]) => count === 3)![0]
    const pairRank = [...rankCounts.entries()].find(([_, count]) => count === 2)![0]
    return {
      rank: "full-house",
      value: 6000000 + getRankValue(threeRank) * 100 + getRankValue(pairRank),
      cards: sortedCards,
      description: `Full House, ${threeRank}s over ${pairRank}s`,
    }
  }

  // Flush
  if (isHandFlush) {
    const values = sortedCards.map((card) => getRankValue(card.rank))
    return {
      rank: "flush",
      value: 5000000 + values[0] * 10000 + values[1] * 1000 + values[2] * 100 + values[3] * 10 + values[4],
      cards: sortedCards,
      description: `Flush, ${sortedCards[0].rank} high`,
    }
  }

  // Straight
  if (isHandStraight) {
    // Handle A-5 straight (where A is low)
    if (
      sortedCards[0].rank === "A" &&
      sortedCards[1].rank === "5" &&
      sortedCards[2].rank === "4" &&
      sortedCards[3].rank === "3" &&
      sortedCards[4].rank === "2"
    ) {
      return {
        rank: "straight",
        value: 4000000 + 5, // 5-high straight
        cards: sortedCards,
        description: "5-high Straight",
      }
    }

    return {
      rank: "straight",
      value: 4000000 + getRankValue(sortedCards[0].rank),
      cards: sortedCards,
      description: `${sortedCards[0].rank}-high Straight`,
    }
  }

  // Three of a Kind
  if (hasThreeOfAKind) {
    const threeRank = [...rankCounts.entries()].find(([_, count]) => count === 3)![0]
    const kickers = sortedCards.filter((card) => card.rank !== threeRank)
    return {
      rank: "three-of-a-kind",
      value:
        3000000 + getRankValue(threeRank) * 1000 + getRankValue(kickers[0].rank) * 10 + getRankValue(kickers[1].rank),
      cards: sortedCards,
      description: `Three of a Kind, ${threeRank}s`,
    }
  }

  // Two Pair
  const pairs = [...rankCounts.entries()].filter(([_, count]) => count === 2)
  if (pairs.length === 2) {
    const [highPairRank, lowPairRank] = pairs.map(([rank]) => rank).sort((a, b) => getRankValue(b) - getRankValue(a))
    const kicker = sortedCards.find((card) => card.rank !== highPairRank && card.rank !== lowPairRank)!
    return {
      rank: "two-pair",
      value: 2000000 + getRankValue(highPairRank) * 1000 + getRankValue(lowPairRank) * 10 + getRankValue(kicker.rank),
      cards: sortedCards,
      description: `Two Pair, ${highPairRank}s and ${lowPairRank}s`,
    }
  }

  // Pair
  if (hasPair) {
    const pairRank = [...rankCounts.entries()].find(([_, count]) => count === 2)![0]
    const kickers = sortedCards.filter((card) => card.rank !== pairRank)
    return {
      rank: "pair",
      value:
        1000000 +
        getRankValue(pairRank) * 10000 +
        getRankValue(kickers[0].rank) * 100 +
        getRankValue(kickers[1].rank) * 10 +
        getRankValue(kickers[2].rank),
      cards: sortedCards,
      description: `Pair of ${pairRank}s`,
    }
  }

  // High Card
  const values = sortedCards.map((card) => getRankValue(card.rank))
  return {
    rank: "high-card",
    value: values[0] * 10000 + values[1] * 1000 + values[2] * 100 + values[3] * 10 + values[4],
    cards: sortedCards,
    description: `${sortedCards[0].rank} High`,
  }
}

// Evaluate the best 5-card hand from 7 cards (2 hole cards + 5 community cards)
export function evaluateBestHand(holeCards: Card[], communityCards: Card[]): HandEvaluation {
  const allCards = [...holeCards, ...communityCards]
  const combinations = getCombinations(allCards, 5)

  let bestHand: HandEvaluation | null = null

  for (const combo of combinations) {
    const evaluation = evaluateHand(combo)
    if (!bestHand || evaluation.value > bestHand.value) {
      bestHand = evaluation
    }
  }

  return bestHand!
}
