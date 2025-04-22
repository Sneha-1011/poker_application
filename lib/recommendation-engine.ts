import type {
  GameState,
  Card,
  ActionType,
  Recommendation,
  PayoffMatrix,
  MixedStrategy,
  NashEquilibrium,
} from "@/types/poker"
import { evaluateBestHand, getRankValue } from "./card-utils"

// Calculate hand strength (0-1)
function calculateHandStrength(holeCards: Card[], communityCards: Card[]): number {
  if (holeCards.length < 2) return 0

  if (communityCards.length === 0) {
    return calculatePreFlopHandStrength(holeCards)
  }

  const handEvaluation = evaluateBestHand(holeCards, communityCards)

  // Base strength on hand rank
  let strength = 0

  switch (handEvaluation.rank) {
    case "royal-flush":
      strength = 1.0
      break
    case "straight-flush":
      strength = 0.95
      break
    case "four-of-a-kind":
      strength = 0.9
      break
    case "full-house":
      strength = 0.8
      break
    case "flush":
      strength = 0.7
      break
    case "straight":
      strength = 0.6
      break
    case "three-of-a-kind":
      strength = 0.5
      break
    case "two-pair":
      strength = 0.4
      break
    case "pair":
      strength = 0.25
      break
    case "high-card":
      // Scale high card strength based on the highest card
      const highCard = handEvaluation.cards[0]
      strength = 0.1 + ((getRankValue(highCard.rank) - 2) / 13) * 0.15
      break
  }

  return strength
}

// Calculate pre-flop hand strength with improved logic
function calculatePreFlopHandStrength(holeCards: Card[]): number {
  if (holeCards.length < 2) return 0

  const [card1, card2] = holeCards
  const rank1 = getRankValue(card1.rank)
  const rank2 = getRankValue(card2.rank)
  const isPair = rank1 === rank2
  const isSuited = card1.suit === card2.suit
  const highRank = Math.max(rank1, rank2)
  const lowRank = Math.min(rank1, rank2)
  const gap = highRank - lowRank

  // Premium pairs (AA, KK, QQ, JJ)
  if (isPair && rank1 >= 11) {
    return 0.9 + (rank1 - 11) * 0.025 // AA: 0.975, KK: 0.95, QQ: 0.925, JJ: 0.9
  }

  // Medium pairs (TT, 99, 88)
  if (isPair && rank1 >= 8) {
    return 0.8 + (rank1 - 8) * 0.033 // TT: 0.866, 99: 0.833, 88: 0.8
  }

  // Small pairs (77, 66, 55, 44, 33, 22)
  if (isPair) {
    return 0.6 + (rank1 - 2) * 0.033 // 77: 0.766, 66: 0.733, ..., 22: 0.6
  }

  // Premium connectors (AK, AQ, AJ, KQ)
  if (highRank >= 11 && lowRank >= 10 && gap <= 3) {
    let strength = 0.7 + (highRank + lowRank - 21) * 0.02
    if (isSuited) strength += 0.05
    return strength
  }

  // Connected cards
  if (gap === 1) {
    let strength = 0.5 + (highRank + lowRank - 3) * 0.01
    if (isSuited) strength += 0.05
    return strength
  }

  // One high card
  if (highRank >= 12) {
    let strength = 0.4 + (highRank - 12) * 0.05 + (lowRank - 2) * 0.01
    if (isSuited) strength += 0.05
    return strength
  }

  // Other hands
  let strength = 0.2 + (highRank + lowRank - 4) * 0.005
  if (isSuited) strength += 0.05
  if (gap <= 2) strength += 0.05

  return Math.max(0.1, Math.min(strength, 0.5))
}

// Calculate pot odds
function calculatePotOdds(gameState: GameState, callAmount: number): number {
  if (callAmount === 0) return 0
  return callAmount / (gameState.pot + callAmount)
}

// Update the calculateExpectedValue function to be more accurate
function calculateExpectedValue(gameState: GameState, action: ActionType, amount = 0, handStrength: number): number {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const potSize = gameState.pot
  const activePlayers = gameState.players.filter((p) => !p.folded && p.isActive && !p.isAllIn)
  const playerCount = activePlayers.length

  // Adjust hand strength based on number of players
  // More players = lower chance of winning with the same hand
  const adjustedHandStrength = handStrength * Math.pow(0.85, playerCount - 1)

  switch (action) {
    case "fold":
      // EV of fold is negative what you've already put in
      return -currentPlayer.bet

    case "check":
      // EV of check is your equity in the pot
      return potSize * adjustedHandStrength

    case "call": {
      const callAmount = amount || 0
      const newPotSize = potSize + callAmount

      // Calculate pot odds
      const potOdds = callAmount / (potSize + callAmount)

      // If hand strength is better than pot odds, calling has positive EV
      if (adjustedHandStrength > potOdds) {
        return adjustedHandStrength * newPotSize - callAmount
      } else {
        return -callAmount
      }
    }

    case "bet":
    case "raise": {
      const raiseAmount = amount || 0
      const newPotSize = potSize + raiseAmount

      // Higher bet size = more fold equity but less likely to be called
      const betSizeRatio = raiseAmount / (potSize || 1)

      // Fold equity increases with bet size but decreases with hand strength
      // Strong hands want calls, weak hands want folds
      const foldEquity = Math.min(0.7, Math.max(0, 0.2 + betSizeRatio * 0.3 - adjustedHandStrength * 0.4))

      // Probability of being called
      const callProbability = 1 - foldEquity

      // EV = (fold equity * current pot) + (call probability * win equity * new pot) - raise amount
      return foldEquity * potSize + callProbability * adjustedHandStrength * newPotSize - raiseAmount
    }

    default:
      return 0
  }
}

// Create a payoff matrix for the current game state
function createPayoffMatrix(gameState: GameState): PayoffMatrix {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const handStrength = calculateHandStrength(currentPlayer.hand, gameState.communityCards)
  const validActions = getValidActionsWithAmounts(gameState)

  const payoffMatrix: PayoffMatrix = {}

  // Define opponent strategies
  const opponentStrategies = ["aggressive", "passive", "balanced"]

  // Calculate payoffs for each action against each opponent strategy
  for (const action of validActions) {
    payoffMatrix[action.type + (action.amount ? `-${action.amount}` : "")] = {}

    for (const opponentStrategy of opponentStrategies) {
      let payoff = 0

      switch (opponentStrategy) {
        case "aggressive":
          // Aggressive opponents are more likely to call/raise
          if (action.type === "fold") {
            payoff = -currentPlayer.bet
          } else if (action.type === "check" || action.type === "call") {
            payoff = calculateExpectedValue(gameState, action.type, action.amount, handStrength) * 0.8
          } else {
            payoff = calculateExpectedValue(gameState, action.type, action.amount, handStrength) * 1.2
          }
          break

        case "passive":
          // Passive opponents are more likely to fold/check/call
          if (action.type === "fold") {
            payoff = -currentPlayer.bet
          } else if (action.type === "check" || action.type === "call") {
            payoff = calculateExpectedValue(gameState, action.type, action.amount, handStrength) * 1.2
          } else {
            payoff = calculateExpectedValue(gameState, action.type, action.amount, handStrength) * 0.8
          }
          break

        case "balanced":
          // Balanced opponents play optimally
          payoff = calculateExpectedValue(gameState, action.type, action.amount, handStrength)
          break
      }

      payoffMatrix[action.type + (action.amount ? `-${action.amount}` : "")][opponentStrategy] = payoff
    }
  }

  return payoffMatrix
}

// Get valid actions with amounts
function getValidActionsWithAmounts(gameState: GameState): {
  type: ActionType
  amount?: number
}[] {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const highestBet = Math.max(...gameState.players.map((p) => p.bet))
  const validActions = []

  // Fold is always valid
  validActions.push({ type: "fold" })

  // Check is valid if no one has bet or the player has already matched the highest bet
  if (currentPlayer.bet === highestBet) {
    validActions.push({ type: "check" })
  }

  // Call is valid if there's a bet to call and the player has enough chips
  if (highestBet > currentPlayer.bet && currentPlayer.chips > 0) {
    const callAmount = Math.min(highestBet - currentPlayer.bet, currentPlayer.chips)
    validActions.push({ type: "call", amount: callAmount })
  }

  // Bet is valid if no one has bet and the player has enough chips
  if (highestBet === 0 && currentPlayer.chips > 0) {
    const minBet = Math.min(gameState.minBet, currentPlayer.chips)
    validActions.push({ type: "bet", amount: minBet })

    // Add larger bet sizes
    if (currentPlayer.chips >= minBet * 2) {
      validActions.push({ type: "bet", amount: minBet * 2 })
    }
    if (currentPlayer.chips >= minBet * 3) {
      validActions.push({ type: "bet", amount: minBet * 3 })
    }
  }

  // Raise is valid if there's a bet to raise and the player has enough chips
  if (highestBet > 0 && currentPlayer.chips > highestBet - currentPlayer.bet) {
    const minRaise = Math.min(highestBet - currentPlayer.bet + gameState.lastRaiseAmount, currentPlayer.chips)
    validActions.push({ type: "raise", amount: minRaise })

    // Add larger raise sizes
    if (currentPlayer.chips >= minRaise * 2) {
      validActions.push({ type: "raise", amount: minRaise * 2 })
    }
    if (currentPlayer.chips >= minRaise * 3) {
      validActions.push({ type: "raise", amount: minRaise * 3 })
    }
  }

  return validActions
}

// Calculate mixed strategy (simplified Nash equilibrium)
function calculateMixedStrategy(payoffMatrix: PayoffMatrix): MixedStrategy {
  const actions = Object.keys(payoffMatrix)
  const strategies = Object.keys(payoffMatrix[actions[0]])

  // Calculate average payoff for each action
  const averagePayoffs: Record<string, number> = {}
  for (const action of actions) {
    let sum = 0
    for (const strategy of strategies) {
      sum += payoffMatrix[action][strategy]
    }
    averagePayoffs[action] = sum / strategies.length
  }

  // Find the best action
  let bestAction = actions[0]
  let bestPayoff = averagePayoffs[bestAction]
  for (const action of actions) {
    if (averagePayoffs[action] > bestPayoff) {
      bestAction = action
      bestPayoff = averagePayoffs[action]
    }
  }

  // Calculate regret for each action
  const regrets: Record<string, number> = {}
  for (const action of actions) {
    regrets[action] = Math.max(0, averagePayoffs[action] - bestPayoff)
  }

  // Calculate sum of regrets
  let regretSum = 0
  for (const action of actions) {
    regretSum += regrets[action]
  }

  // Calculate mixed strategy
  const mixedStrategy: MixedStrategy = {}
  if (regretSum > 0) {
    for (const action of actions) {
      mixedStrategy[action] = regrets[action] / regretSum
    }
  } else {
    // If all regrets are 0, use a uniform distribution
    for (const action of actions) {
      mixedStrategy[action] = 1 / actions.length
    }
  }

  return mixedStrategy
}

// Calculate Nash equilibrium
function calculateNashEquilibrium(payoffMatrix: PayoffMatrix): NashEquilibrium {
  const mixedStrategy = calculateMixedStrategy(payoffMatrix)

  // Calculate expected payoffs
  const expectedPayoffs: Record<string, number> = {}
  const strategies = Object.keys(payoffMatrix[Object.keys(payoffMatrix)[0]])

  for (const strategy of strategies) {
    let sum = 0
    for (const [action, probability] of Object.entries(mixedStrategy)) {
      sum += probability * payoffMatrix[action][strategy]
    }
    expectedPayoffs[strategy] = sum
  }

  return {
    strategies: {
      1: mixedStrategy, // Player 1's strategy
    },
    expectedPayoffs: expectedPayoffs,
  }
}

// Generate a recommendation for the current player
export function generateRecommendation(gameState: GameState): Recommendation {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const handStrength = calculateHandStrength(currentPlayer.hand, gameState.communityCards)

  // Get valid actions
  const validActions = getValidActionsWithAmounts(gameState)

  // Direct action selection based on hand strength
  let bestAction: ActionType = "fold"
  let bestAmount: number | undefined = undefined

  // Pre-flop strategy
  if (gameState.currentRound === "pre-flop") {
    if (handStrength > 0.8) {
      // Premium hands: raise if possible, otherwise call/check
      if (validActions.some((a) => a.type === "raise")) {
        bestAction = "raise"
        bestAmount = validActions.find((a) => a.type === "raise")?.amount
      } else if (validActions.some((a) => a.type === "bet")) {
        bestAction = "bet"
        bestAmount = validActions.find((a) => a.type === "bet")?.amount
      } else if (validActions.some((a) => a.type === "call")) {
        bestAction = "call"
        bestAmount = validActions.find((a) => a.type === "call")?.amount
      } else {
        bestAction = "check"
      }
    } else if (handStrength > 0.6) {
      // Strong hands: call/check, or small raise
      if (validActions.some((a) => a.type === "call")) {
        bestAction = "call"
        bestAmount = validActions.find((a) => a.type === "call")?.amount
      } else if (validActions.some((a) => a.type === "bet")) {
        bestAction = "bet"
        bestAmount = validActions.find((a) => a.type === "bet")?.amount
      } else {
        bestAction = "check"
      }
    } else if (handStrength > 0.4) {
      // Medium hands: check if possible, call small bets
      if (validActions.some((a) => a.type === "check")) {
        bestAction = "check"
      } else if (
        validActions.some((a) => a.type === "call") &&
        (validActions.find((a) => a.type === "call")?.amount || 0) < gameState.pot / 4
      ) {
        bestAction = "call"
        bestAmount = validActions.find((a) => a.type === "call")?.amount
      } else {
        bestAction = "fold"
      }
    } else {
      // Weak hands: check if free, otherwise fold
      if (validActions.some((a) => a.type === "check")) {
        bestAction = "check"
      } else {
        bestAction = "fold"
      }
    }
  }
  // Post-flop strategy
  else {
    if (handStrength > 0.7) {
      // Very strong hands: bet/raise
      if (validActions.some((a) => a.type === "raise")) {
        bestAction = "raise"
        bestAmount = validActions.find((a) => a.type === "raise")?.amount
      } else if (validActions.some((a) => a.type === "bet")) {
        bestAction = "bet"
        bestAmount = validActions.find((a) => a.type === "bet")?.amount
      } else if (validActions.some((a) => a.type === "call")) {
        bestAction = "call"
        bestAmount = validActions.find((a) => a.type === "call")?.amount
      } else {
        bestAction = "check"
      }
    } else if (handStrength > 0.5) {
      // Strong hands: call/check, or small bet
      if (validActions.some((a) => a.type === "bet")) {
        bestAction = "bet"
        bestAmount = validActions.find((a) => a.type === "bet")?.amount
      } else if (validActions.some((a) => a.type === "call")) {
        bestAction = "call"
        bestAmount = validActions.find((a) => a.type === "call")?.amount
      } else {
        bestAction = "check"
      }
    } else if (handStrength > 0.3) {
      // Medium hands: check if possible, call small bets
      if (validActions.some((a) => a.type === "check")) {
        bestAction = "check"
      } else if (
        validActions.some((a) => a.type === "call") &&
        (validActions.find((a) => a.type === "call")?.amount || 0) < gameState.pot / 3
      ) {
        bestAction = "call"
        bestAmount = validActions.find((a) => a.type === "call")?.amount
      } else {
        bestAction = "fold"
      }
    } else {
      // Weak hands: check if free, otherwise fold
      if (validActions.some((a) => a.type === "check")) {
        bestAction = "check"
      } else {
        bestAction = "fold"
      }
    }
  }

  // Calculate expected value for the chosen action
  const expectedValue = calculateExpectedValue(gameState, bestAction, bestAmount, handStrength)

  // Determine risk level based on hand strength and action type
  let riskLevel: "low" | "medium" | "high" = "medium"

  if (bestAction === "fold") {
    riskLevel = handStrength > 0.4 ? "medium" : "low"
  } else if (bestAction === "check") {
    riskLevel = handStrength > 0.5 ? "low" : "medium"
  } else if (bestAction === "call") {
    riskLevel = handStrength > 0.6 ? "low" : handStrength > 0.3 ? "medium" : "high"
  } else if ((bestAction === "bet" || bestAction === "raise") && bestAmount) {
    if (bestAmount > gameState.pot / 2) {
      riskLevel = handStrength > 0.7 ? "medium" : "high"
    } else {
      riskLevel = handStrength > 0.5 ? "medium" : "high"
    }
  }

  // Generate reasoning
  let reasoning = ""

  if (gameState.currentRound === "pre-flop") {
    reasoning = generatePreFlopReasoning(currentPlayer.hand, bestAction, handStrength)
  } else {
    reasoning = generatePostFlopReasoning(
      handStrength,
      bestAction,
      gameState.communityCards.length,
      gameState.pot,
      bestAmount,
    )
  }

  // Generate alternative actions
  const alternativeActions = []

  // Add check/call as alternative to fold
  if (bestAction === "fold") {
    if (validActions.some((a) => a.type === "check")) {
      alternativeActions.push({
        action: "check",
        expectedValue: calculateExpectedValue(gameState, "check", undefined, handStrength),
      })
    } else if (validActions.some((a) => a.type === "call")) {
      const callAmount = validActions.find((a) => a.type === "call")?.amount
      alternativeActions.push({
        action: "call",
        amount: callAmount,
        expectedValue: calculateExpectedValue(gameState, "call", callAmount, handStrength),
      })
    }
  }

  // Add fold as alternative to risky calls/bets
  if ((bestAction === "call" || bestAction === "bet" || bestAction === "raise") && handStrength < 0.5) {
    alternativeActions.push({
      action: "fold",
      expectedValue: calculateExpectedValue(gameState, "fold", undefined, handStrength),
    })
  }

  // Add more aggressive action as alternative to check/call
  if (bestAction === "check" && handStrength > 0.4 && validActions.some((a) => a.type === "bet")) {
    const betAmount = validActions.find((a) => a.type === "bet")?.amount
    alternativeActions.push({
      action: "bet",
      amount: betAmount,
      expectedValue: calculateExpectedValue(gameState, "bet", betAmount, handStrength),
    })
  } else if (bestAction === "call" && handStrength > 0.6 && validActions.some((a) => a.type === "raise")) {
    const raiseAmount = validActions.find((a) => a.type === "raise")?.amount
    alternativeActions.push({
      action: "raise",
      amount: raiseAmount,
      expectedValue: calculateExpectedValue(gameState, "raise", raiseAmount, handStrength),
    })
  }

  return {
    action: bestAction,
    amount: bestAmount,
    confidence: 0.7 + handStrength * 0.3, // Higher confidence with stronger hands
    reasoning,
    expectedValue,
    riskLevel,
    alternativeActions,
  }
}

// Generate reasoning for pre-flop decisions
function generatePreFlopReasoning(hand: Card[], action: ActionType, handStrength: number): string {
  const [card1, card2] = hand
  const rank1 = card1.rank
  const rank2 = card2.rank
  const isPair = rank1 === rank2
  const isSuited = card1.suit === card2.suit
  const isConnected = Math.abs(getRankValue(rank1 as any) - getRankValue(rank2 as any)) <= 2

  // Create a description of the hand
  let handDescription = ""
  if (isPair) {
    handDescription = `a pair of ${rank1}s`
  } else if (isConnected && isSuited) {
    handDescription = `${rank1}${rank2} suited connected cards`
  } else if (isConnected) {
    handDescription = `${rank1}${rank2} connected cards`
  } else if (isSuited) {
    handDescription = `${rank1}${rank2} suited`
  } else {
    handDescription = `${rank1}${rank2}`
  }

  // Generate reasoning based on hand strength and action
  if (handStrength > 0.7) {
    if (action === "fold") {
      return `You have ${handDescription}. This is a strong hand, but the recommendation to fold may be due to unfavorable table dynamics.`
    } else if (action === "check" || action === "call") {
      return `You have ${handDescription}. This is a strong hand that warrants at least calling to see more cards.`
    } else {
      return `You have ${handDescription}. This is a strong hand that justifies aggressive play.`
    }
  } else if (handStrength > 0.4) {
    if (action === "fold") {
      return `You have ${handDescription}. This is a decent hand, but folding may be the right move given the current betting.`
    } else if (action === "check" || action === "call") {
      return `You have ${handDescription}. This is a decent hand worth seeing more cards with minimal investment.`
    } else {
      return `You have ${handDescription}. This hand has potential and may benefit from aggressive play to build the pot.`
    }
  } else {
    if (action === "fold") {
      return `You have ${handDescription}. This hand is relatively weak and folding is often the correct play.`
    } else if (action === "check" || action === "call") {
      return `You have ${handDescription}. This hand is marginal but may be worth continuing with minimal investment.`
    } else {
      return `You have ${handDescription}. While this hand is weak, a strategic bet or raise might win the pot immediately.`
    }
  }
}

// Generate reasoning for post-flop decisions
function generatePostFlopReasoning(
  handStrength: number,
  action: ActionType,
  communityCardCount: number,
  potSize: number,
  betAmount?: number,
): string {
  const roundName = communityCardCount === 3 ? "flop" : communityCardCount === 4 ? "turn" : "river"

  // Describe hand strength
  let handDescription = ""
  if (handStrength > 0.8) {
    handDescription = "a very strong hand"
  } else if (handStrength > 0.6) {
    handDescription = "a strong hand"
  } else if (handStrength > 0.4) {
    handDescription = "a decent hand"
  } else if (handStrength > 0.2) {
    handDescription = "a marginal hand"
  } else {
    handDescription = "a weak hand"
  }

  // Generate reasoning based on hand strength, action, and round
  if (action === "fold") {
    return `You have ${handDescription} on the ${roundName}. The recommendation to fold suggests the risk of continuing doesn't justify the potential reward.`
  } else if (action === "check") {
    return `You have ${handDescription} on the ${roundName}. Checking allows you to see more cards without additional investment.`
  } else if (action === "call") {
    return `You have ${handDescription} on the ${roundName}. Calling keeps you in the hand at minimal cost to see if your hand improves.`
  } else if (action === "bet" || action === "raise") {
    if (handStrength > 0.6) {
      return `You have ${handDescription} on the ${roundName}. Betting or raising helps build the pot with your strong hand.`
    } else if (handStrength > 0.3) {
      return `You have ${handDescription} on the ${roundName}. A strategic bet might win the pot now or give you a free card on the next round.`
    } else {
      return `You have ${handDescription} on the ${roundName}. This is likely a bluff attempt that could win the pot if your opponents have weak holdings.`
    }
  }

  return `You have ${handDescription} on the ${roundName}. Consider the pot odds and your opponents' likely holdings.`
}

// Make an AI decision
export function makeAIDecision(gameState: GameState): { action: ActionType; amount?: number } {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const recommendation = generateRecommendation(gameState)

  // Validate the recommended action is valid
  const validActions = getValidActionsWithAmounts(gameState)

  // Check if the recommended action is in the valid actions
  const recommendedActionStr = recommendation.action + (recommendation.amount ? `-${recommendation.amount}` : "")
  const isValidRecommendation = validActions.some((va) => {
    const vaStr = va.type + (va.amount ? `-${va.amount}` : "")
    return vaStr === recommendedActionStr
  })

  // If recommendation is not valid, find a safe alternative
  if (!isValidRecommendation) {
    console.log(`Invalid AI recommendation: ${recommendedActionStr}. Finding alternative.`)

    // Check if player can check
    if (validActions.some((a) => a.type === "check")) {
      return { action: "check" }
    }

    // Check if player can call
    const callAction = validActions.find((a) => a.type === "call")
    if (callAction) {
      return {
        action: "call",
        amount: Math.min(callAction.amount || 0, currentPlayer.chips),
      }
    }

    // Default to fold if no safe action is available
    return { action: "fold" }
  }

  // Ensure the amount doesn't exceed the player's chips
  if (recommendation.amount && recommendation.amount > currentPlayer.chips) {
    recommendation.amount = currentPlayer.chips
  }

  // Add some randomness to AI decisions
  const random = Math.random()

  // Sometimes choose an alternative action
  if (random < 0.3 && recommendation.alternativeActions.length > 0) {
    const altAction = recommendation.alternativeActions[0]

    // Ensure alternative amount doesn't exceed chips
    if (altAction.amount && altAction.amount > currentPlayer.chips) {
      altAction.amount = currentPlayer.chips
    }

    return {
      action: altAction.action,
      amount: altAction.amount,
    }
  }

  return {
    action: recommendation.action,
    amount: recommendation.amount,
  }
}
