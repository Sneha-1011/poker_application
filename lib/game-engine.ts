import type { GameState, Player, ActionType, PlayerAction } from "@/types/poker"
import { createDeck, evaluateBestHand } from "./card-utils"

// Initialize a new game state
export function initializeGame(
  aiPlayerCount = 5,
  initialChips = 1000,
  smallBlindAmount = 5,
  bigBlindAmount = 10,
  humanPlayerName = "You",
  humanAvatarId = "avatar1",
  aiAvatarIds = ["ai1", "ai2", "ai3", "ai4", "ai5"],
): GameState {
  // Create players
  const players: Player[] = []

  // Add human player
  players.push({
    id: 1,
    name: humanPlayerName,
    type: "human",
    chips: initialChips,
    hand: [],
    bet: 0,
    folded: false,
    isAllIn: false,
    isDealer: true,
    isSmallBlind: false,
    isBigBlind: false,
    isActive: true,
    avatarId: humanAvatarId,
  })

  // Add AI players
  for (let i = 0; i < aiPlayerCount; i++) {
    players.push({
      id: i + 2,
      name: `AI Player ${i + 1}`,
      type: "ai",
      chips: initialChips,
      hand: [],
      bet: 0,
      folded: false,
      isAllIn: false,
      isDealer: false,
      isSmallBlind: false,
      isBigBlind: false,
      isActive: true,
      avatarId: aiAvatarIds[i] || `ai${i + 1}`,
    })
  }

  // Set dealer, small blind, and big blind positions
  const dealerIndex = 0
  const smallBlindIndex = (dealerIndex + 1) % players.length
  const bigBlindIndex = (dealerIndex + 2) % players.length

  players[dealerIndex].isDealer = true
  players[smallBlindIndex].isSmallBlind = true
  players[bigBlindIndex].isBigBlind = true

  // Create initial game state
  const gameState: GameState = {
    players,
    deck: [],
    communityCards: [],
    pot: 0,
    sidePots: [],
    currentRound: "pre-flop",
    currentPlayerIndex: (bigBlindIndex + 1) % players.length,
    dealerIndex,
    smallBlindIndex,
    bigBlindIndex,
    smallBlindAmount,
    bigBlindAmount,
    minBet: bigBlindAmount,
    lastRaiseAmount: bigBlindAmount,
    lastBetAmount: bigBlindAmount,
    roundBettingComplete: false,
    gameOver: false,
    winners: [],
    handEvaluations: {},
    actionHistory: [],
    roundStarted: false,
    playersActed: [],
  }

  return startNewHand(gameState)
}

// Start a new hand
export function startNewHand(gameState: GameState): GameState {
  const newState = { ...gameState }

  // Reset player states
  newState.players = newState.players.map((player) => ({
    ...player,
    hand: [],
    bet: 0,
    folded: false,
    isAllIn: false,
    isActive: player.chips > 0,
  }))

  // Rotate dealer, small blind, and big blind positions
  rotatePositions(newState)

  // Reset game state
  newState.deck = createDeck()
  newState.communityCards = []
  newState.pot = 0
  newState.sidePots = []
  newState.currentRound = "pre-flop"
  newState.currentPlayerIndex = (newState.bigBlindIndex + 1) % newState.players.length
  newState.minBet = newState.bigBlindAmount
  newState.lastRaiseAmount = newState.bigBlindAmount
  newState.lastBetAmount = newState.bigBlindAmount
  newState.roundBettingComplete = false
  newState.gameOver = false
  newState.winners = []
  newState.handEvaluations = {}
  newState.actionHistory = []
  newState.roundStarted = false
  newState.playersActed = []

  // Deal cards
  dealCards(newState)

  // Post blinds
  postBlinds(newState)

  // Mark the round as started
  newState.roundStarted = true

  return newState
}

// Rotate dealer, small blind, and big blind positions
function rotatePositions(gameState: GameState): void {
  const activePlayers = gameState.players.filter((player) => player.isActive)
  if (activePlayers.length < 2) return

  // Reset all position flags
  gameState.players.forEach((player) => {
    player.isDealer = false
    player.isSmallBlind = false
    player.isBigBlind = false
  })

  // Find next active player for dealer
  let newDealerIndex = (gameState.dealerIndex + 1) % gameState.players.length
  while (!gameState.players[newDealerIndex].isActive) {
    newDealerIndex = (newDealerIndex + 1) % gameState.players.length
  }

  // Find next active player for small blind
  let newSmallBlindIndex = (newDealerIndex + 1) % gameState.players.length
  while (!gameState.players[newSmallBlindIndex].isActive) {
    newSmallBlindIndex = (newSmallBlindIndex + 1) % gameState.players.length
  }

  // Find next active player for big blind
  let newBigBlindIndex = (newSmallBlindIndex + 1) % gameState.players.length
  while (!gameState.players[newBigBlindIndex].isActive) {
    newBigBlindIndex = (newBigBlindIndex + 1) % gameState.players.length
  }

  // Set new positions
  gameState.players[newDealerIndex].isDealer = true
  gameState.players[newSmallBlindIndex].isSmallBlind = true
  gameState.players[newBigBlindIndex].isBigBlind = true

  // Update game state
  gameState.dealerIndex = newDealerIndex
  gameState.smallBlindIndex = newSmallBlindIndex
  gameState.bigBlindIndex = newBigBlindIndex
  gameState.currentPlayerIndex = (newBigBlindIndex + 1) % gameState.players.length

  // Skip inactive players for current player
  while (!gameState.players[gameState.currentPlayerIndex].isActive) {
    gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length
  }
}

// Deal cards to players
function dealCards(gameState: GameState): void {
  // Deal 2 cards to each active player
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < gameState.players.length; j++) {
      if (gameState.players[j].isActive) {
        const card = gameState.deck.pop()!
        card.faceUp = gameState.players[j].type === "human" // Only show human player's cards
        gameState.players[j].hand.push(card)
      }
    }
  }
}

// Post blinds
function postBlinds(gameState: GameState): void {
  const smallBlindPlayer = gameState.players[gameState.smallBlindIndex]
  const bigBlindPlayer = gameState.players[gameState.bigBlindIndex]

  // Post small blind
  const smallBlindAmount = Math.min(smallBlindPlayer.chips, gameState.smallBlindAmount)
  smallBlindPlayer.chips -= smallBlindAmount
  smallBlindPlayer.bet = smallBlindAmount
  if (smallBlindPlayer.chips === 0) smallBlindPlayer.isAllIn = true

  // Post big blind
  const bigBlindAmount = Math.min(bigBlindPlayer.chips, gameState.bigBlindAmount)
  bigBlindPlayer.chips -= bigBlindAmount
  bigBlindPlayer.bet = bigBlindAmount
  if (bigBlindPlayer.chips === 0) bigBlindPlayer.isAllIn = true

  // Add blinds to pot
  gameState.pot = smallBlindAmount + bigBlindAmount

  // Record actions
  gameState.actionHistory.push({
    type: "bet",
    amount: smallBlindAmount,
    player: smallBlindPlayer,
  })

  gameState.actionHistory.push({
    type: "bet",
    amount: bigBlindAmount,
    player: bigBlindPlayer,
  })

  // Add small blind and big blind players to the players who have acted
  gameState.playersActed = [gameState.smallBlindIndex, gameState.bigBlindIndex]
}

// Get valid actions for the current player
export function getValidActions(gameState: GameState): {
  type: ActionType
  minAmount?: number
  maxAmount?: number
}[] {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex]

  // If player has folded or is all-in, they can't take any actions
  if (currentPlayer.folded || currentPlayer.isAllIn || !currentPlayer.isActive) {
    return []
  }

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
    validActions.push({ type: "call", minAmount: callAmount, maxAmount: callAmount })
  }

  // Bet is valid if no one has bet and the player has enough chips
  if (highestBet === 0 && currentPlayer.chips > 0) {
    const minBet = Math.min(gameState.minBet, currentPlayer.chips)
    validActions.push({
      type: "bet",
      minAmount: minBet,
      maxAmount: currentPlayer.chips,
    })
  }

  // Raise is valid if there's a bet to raise and the player has enough chips
  if (highestBet > 0 && currentPlayer.chips > highestBet - currentPlayer.bet) {
    // Calculate minimum raise amount
    const minRaiseAmount = Math.min(gameState.lastRaiseAmount, currentPlayer.chips)
    const totalRaiseAmount = highestBet + minRaiseAmount - currentPlayer.bet

    // Only add raise as an option if player has enough chips to make minimum raise
    if (currentPlayer.chips >= totalRaiseAmount) {
      validActions.push({
        type: "raise",
        minAmount: totalRaiseAmount,
        maxAmount: currentPlayer.chips,
      })
    }
  }

  return validActions
}

// Process a player action
export function processAction(gameState: GameState, action: ActionType, amount?: number): GameState {
  const newState = { ...gameState, playersActed: [...gameState.playersActed] }
  const currentPlayer = newState.players[newState.currentPlayerIndex]
  const highestBet = Math.max(...newState.players.map((p) => p.bet))

  // Skip if player has folded or is all-in
  if (currentPlayer.folded || currentPlayer.isAllIn || !currentPlayer.isActive) {
    moveToNextPlayer(newState)
    return newState
  }

  // Add current player to the list of players who have acted
  if (!newState.playersActed.includes(newState.currentPlayerIndex)) {
    newState.playersActed.push(newState.currentPlayerIndex)
  }

  // Record the action
  const playerAction: PlayerAction = {
    type: action,
    player: { ...currentPlayer },
  }

  switch (action) {
    case "fold":
      currentPlayer.folded = true
      break

    case "check":
      // No changes needed
      break

    case "call":
      const callAmount = Math.min(highestBet - currentPlayer.bet, currentPlayer.chips)
      currentPlayer.chips -= callAmount
      currentPlayer.bet += callAmount
      newState.pot += callAmount
      playerAction.amount = callAmount

      if (currentPlayer.chips === 0) {
        currentPlayer.isAllIn = true
      }
      break

    case "bet":
      if (amount === undefined || amount < newState.minBet || amount > currentPlayer.chips) {
        console.error(`Invalid bet amount: ${amount}, min: ${newState.minBet}, chips: ${currentPlayer.chips}`)
        // Use minimum bet amount if invalid
        amount = Math.min(newState.minBet, currentPlayer.chips)
      }

      currentPlayer.chips -= amount
      currentPlayer.bet += amount
      newState.pot += amount
      newState.lastBetAmount = amount
      newState.lastRaiseAmount = amount
      playerAction.amount = amount

      if (currentPlayer.chips === 0) {
        currentPlayer.isAllIn = true
      }
      break

    case "raise":
      // For raise, amount is the additional amount the player is putting in
      if (amount === undefined) {
        console.error("Raise amount is undefined")
        // Use minimum raise amount if undefined
        const minRaiseAmount = Math.min(newState.lastRaiseAmount, currentPlayer.chips)
        amount = minRaiseAmount
      }

      // Ensure amount doesn't exceed player's chips
      if (amount > currentPlayer.chips) {
        console.error(`Raise amount exceeds player's chips: ${amount}, max: ${currentPlayer.chips}`)
        amount = currentPlayer.chips
      }

      // Add the amount to the player's bet and pot
      currentPlayer.chips -= amount
      currentPlayer.bet += amount
      newState.pot += amount

      // Calculate the raise amount (how much more than the previous highest bet)
      const raiseAmount = currentPlayer.bet - highestBet
      if (raiseAmount > 0) {
        newState.lastRaiseAmount = raiseAmount
      }

      playerAction.amount = amount

      if (currentPlayer.chips === 0) {
        currentPlayer.isAllIn = true
      }
      break
  }

  // Add action to history
  newState.actionHistory.push(playerAction)

  // Check if there's only one player left not folded
  const activePlayers = newState.players.filter((p) => !p.folded && p.isActive)
  if (activePlayers.length === 1) {
    // End the game and declare the remaining player as winner
    newState.gameOver = true
    newState.winners = [activePlayers[0]]
    newState.currentRound = "showdown"

    // Award the pot to the winner
    activePlayers[0].chips += newState.pot

    return newState
  }

  // Check if round is complete
  checkRoundComplete(newState)

  // Move to next player if round is not complete
  if (!newState.roundBettingComplete) {
    moveToNextPlayer(newState)
  } else {
    // Move to next round if betting is complete
    moveToNextRound(newState)
  }

  return newState
}

// Check if the current betting round is complete
function checkRoundComplete(gameState: GameState): void {
  const activePlayers = gameState.players.filter((p) => !p.folded && p.isActive)

  // If only one player remains, the round is complete
  if (activePlayers.length === 1) {
    gameState.roundBettingComplete = true
    return
  }

  // If all active players are all-in, the round is complete
  const allInPlayers = activePlayers.filter((p) => p.isAllIn)
  if (allInPlayers.length === activePlayers.length - 1) {
    gameState.roundBettingComplete = true
    return
  }

  // Check if all active players have bet the same amount or folded
  const highestBet = Math.max(...activePlayers.map((p) => p.bet))
  const allBetsEqual = activePlayers.every((p) => p.bet === highestBet || p.isAllIn)

  // Check if all active players have acted in this round
  const activePlayerIndices = gameState.players
    .map((p, i) => (p.isActive && !p.folded && !p.isAllIn ? i : -1))
    .filter((i) => i !== -1)

  const allPlayersActed = activePlayerIndices.every((i) => gameState.playersActed.includes(i))

  // The round is complete if all bets are equal and all players have acted
  gameState.roundBettingComplete = allBetsEqual && allPlayersActed && gameState.roundStarted
}

// Move to the next player
function moveToNextPlayer(gameState: GameState): void {
  let nextPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length

  // Skip players who have folded, are all-in, or inactive
  while (
    gameState.players[nextPlayerIndex].folded ||
    gameState.players[nextPlayerIndex].isAllIn ||
    !gameState.players[nextPlayerIndex].isActive
  ) {
    nextPlayerIndex = (nextPlayerIndex + 1) % gameState.players.length

    // If we've gone full circle, the round is complete
    if (nextPlayerIndex === gameState.currentPlayerIndex) {
      gameState.roundBettingComplete = true
      return
    }
  }

  gameState.currentPlayerIndex = nextPlayerIndex
}

// Move to the next round
function moveToNextRound(gameState: GameState): void {
  console.log(`Moving to next round from ${gameState.currentRound}`)

  // Reset player bets for the new round
  gameState.players.forEach((player) => {
    player.bet = 0
  })

  // Reset round state
  gameState.roundBettingComplete = false
  gameState.lastRaiseAmount = gameState.bigBlindAmount
  gameState.roundStarted = false
  gameState.playersActed = []

  // Determine the next round
  switch (gameState.currentRound) {
    case "pre-flop":
      gameState.currentRound = "flop"
      // Deal the flop (3 community cards)
      for (let i = 0; i < 3; i++) {
        const card = gameState.deck.pop()!
        card.faceUp = true
        gameState.communityCards.push(card)
      }
      break

    case "flop":
      gameState.currentRound = "turn"
      // Deal the turn (1 community card)
      const turnCard = gameState.deck.pop()!
      turnCard.faceUp = true
      gameState.communityCards.push(turnCard)
      break

    case "turn":
      gameState.currentRound = "river"
      // Deal the river (1 community card)
      const riverCard = gameState.deck.pop()!
      riverCard.faceUp = true
      gameState.communityCards.push(riverCard)
      break

    case "river":
      gameState.currentRound = "showdown"
      // Evaluate hands and determine winner
      determineWinner(gameState)
      return // Return early as the game is over

    case "showdown":
      // Start a new hand
      startNewHand(gameState)
      return
  }

  // Set the first active player after the dealer as the current player
  if (gameState.currentRound !== "showdown") {
    // Start with the first player after the dealer
    gameState.currentPlayerIndex = (gameState.dealerIndex + 1) % gameState.players.length

    // Find the first active player who can act
    let checkedAllPlayers = false
    const startingIndex = gameState.currentPlayerIndex

    while (
      (gameState.players[gameState.currentPlayerIndex].folded ||
        gameState.players[gameState.currentPlayerIndex].isAllIn ||
        !gameState.players[gameState.currentPlayerIndex].isActive) &&
      !checkedAllPlayers
    ) {
      gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length

      // If we've checked all players and come back to the start, break to avoid infinite loop
      if (gameState.currentPlayerIndex === startingIndex) {
        checkedAllPlayers = true
      }
    }

    // If all players are folded/all-in/inactive except one, end the round
    if (checkedAllPlayers) {
      // Move directly to showdown or end the hand
      const activePlayers = gameState.players.filter((p) => !p.folded && p.isActive)
      if (activePlayers.length <= 1) {
        gameState.currentRound = "showdown"
        determineWinner(gameState)
      }
    }
  }

  // Mark the round as started
  gameState.roundStarted = true

  console.log(`New round: ${gameState.currentRound}, current player: ${gameState.currentPlayerIndex}`)
}

// Determine the winner(s) of the hand
function determineWinner(gameState: GameState): void {
  const activePlayers = gameState.players.filter((p) => !p.folded && p.isActive)

  // If only one player remains, they win
  if (activePlayers.length === 1) {
    const winner = activePlayers[0]
    winner.chips += gameState.pot
    gameState.winners = [winner]
    gameState.gameOver = true
    return
  }

  // Evaluate hands for all active players
  for (const player of activePlayers) {
    const handEvaluation = evaluateBestHand(player.hand, gameState.communityCards)
    gameState.handEvaluations[player.id] = handEvaluation

    // Reveal all cards at showdown
    player.hand.forEach((card) => {
      card.faceUp = true
    })
  }

  // Find the player(s) with the best hand
  let bestHandValue = -1
  const winners: Player[] = []

  for (const player of activePlayers) {
    const handValue = gameState.handEvaluations[player.id].value

    if (handValue > bestHandValue) {
      bestHandValue = handValue
      winners.length = 0
      winners.push(player)
    } else if (handValue === bestHandValue) {
      winners.push(player)
    }
  }

  // Distribute the pot among winners
  const winAmount = Math.floor(gameState.pot / winners.length)
  winners.forEach((winner) => {
    winner.chips += winAmount
  })

  // Handle remainder chips (give to the first winner)
  const remainder = gameState.pot % winners.length
  if (remainder > 0 && winners.length > 0) {
    winners[0].chips += remainder
  }

  gameState.winners = winners
  gameState.gameOver = true
}

// Prepare game data for saving to database
export function prepareGameDataForSave(gameState: GameState) {
  return {
    playerCount: gameState.players.filter((p) => p.isActive).length,
    pot: gameState.pot,
    winnerId: gameState.winners.length > 0 ? gameState.winners[0].id : null,
    winners: gameState.winners.map((w) => w.id),
    players: gameState.players.map((p) => ({
      id: p.id,
      name: p.name,
      chips: p.chips,
    })),
    actions: gameState.actionHistory.map((a) => ({
      playerId: a.player.id,
      type: a.type,
      amount: a.amount || 0,
    })),
  }
}
