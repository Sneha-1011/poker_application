"use client"

import React from "react"

import { useState, useEffect, useRef } from "react"
import type { GameState, ActionType, Recommendation, Player } from "@/types/poker"
import { initializeGame, processAction, getValidActions, prepareGameDataForSave } from "@/lib/game-engine"
import { generateRecommendation, makeAIDecision } from "@/lib/recommendation-engine"
import { Button } from "@/components/ui/button"
import { initDatabase, saveGameResults } from "@/app/actions/db-actions"
import { toast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import Image from "next/image"
import CommunityCards from "./community-cards"
import ActionControls from "./action-controls"
import RecommendationPanel from "./recommendation-panel"
import ChipAnimation from "./chip-animation"
import WinnerDisplay from "./winner-display"
import { ChevronLeft } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export default function PokerTable() {
  const router = useRouter()
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dbInitialized, setDbInitialized] = useState(false)
  const [aiThinking, setAiThinking] = useState(false)
  const [dbError, setDbError] = useState<string | null>(null)
  const [gameSettings, setGameSettings] = useState<{
    username: string
    aiPlayerCount: number
    avatarId: string
    aiAvatars: string[]
  } | null>(null)
  const [showRecommendation, setShowRecommendation] = useState(true)
  const [chipAnimation, setChipAnimation] = useState<{
    from: { x: number; y: number }
    to: { x: number; y: number }
    amount: number
    isVisible: boolean
  } | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const potRef = useRef<HTMLDivElement>(null)
  const playerRefs = useRef<(HTMLDivElement | null)[]>([])
  const dealSoundRef = useRef<HTMLAudioElement | null>(null)
  const winSoundRef = useRef<HTMLAudioElement | null>(null)
  const foldSoundRef = useRef<HTMLAudioElement | null>(null)
  const checkSoundRef = useRef<HTMLAudioElement | null>(null)

  // Initialize audio elements
  useEffect(() => {
    if (typeof window !== "undefined") {
      dealSoundRef.current = new Audio("/assets/card-deal.mp3")
      winSoundRef.current = new Audio("/assets/win.mp3")
      foldSoundRef.current = new Audio("/assets/fold.mp3")
      checkSoundRef.current = new Audio("/assets/check.mp3")
    }
  }, [])

  // Play sound effect
  const playSound = (type: "deal" | "win" | "fold" | "check") => {
    const soundRef =
      type === "deal"
        ? dealSoundRef.current
        : type === "win"
          ? winSoundRef.current
          : type === "fold"
            ? foldSoundRef.current
            : checkSoundRef.current

    if (soundRef) {
      soundRef.currentTime = 0
      soundRef.play().catch((err) => console.error("Error playing sound:", err))
    }
  }

  // Load game settings from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSettings = localStorage.getItem("pokerGameSettings")
      if (savedSettings) {
        setGameSettings(JSON.parse(savedSettings))
      } else {
        // If no settings found, redirect to lobby
        router.push("/")
      }
    }
  }, [router])

  // Initialize the game and database
  useEffect(() => {
    if (!gameSettings) return

    const initGame = async () => {
      try {
        // Initialize database
        const result = await initDatabase()
        setDbInitialized(result.success)

        if (result.success) {
          toast({
            title: "Database Initialized",
            description: "Database connection established successfully.",
          })
        } else {
          setDbError(result.message)
          toast({
            title: "Database Warning",
            description: "Database connection failed. Game will run without saving data.",
            variant: "destructive",
          })
        }

        // Initialize game state with the selected number of players
        const initialGameState = initializeGame(
          gameSettings.aiPlayerCount,
          1000,
          5,
          10,
          gameSettings.username,
          gameSettings.avatarId,
          gameSettings.aiAvatars,
        )

        setGameState(initialGameState)
        playSound("deal")

        toast({
          title: "Game Started",
          description: "Texas Hold'em poker game initialized successfully.",
        })

        setIsLoading(false)
      } catch (error) {
        console.error("Failed to initialize game:", error)
        setDbError((error as Error).message)

        // Still initialize the game even if database fails
        const initialGameState = initializeGame(
          gameSettings.aiPlayerCount,
          1000,
          5,
          10,
          gameSettings.username,
          gameSettings.avatarId,
          gameSettings.aiAvatars,
        )
        setGameState(initialGameState)

        toast({
          title: "Database Error",
          description: "Failed to connect to database. Game will run without saving data.",
          variant: "destructive",
        })

        setIsLoading(false)
      }
    }

    initGame()
  }, [gameSettings])

  // Generate recommendation when game state changes
  useEffect(() => {
    if (gameState && !gameState.gameOver && gameState.players[gameState.currentPlayerIndex].type === "human") {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex]

      // Only generate recommendation if the player can actually act
      if (!currentPlayer.folded && !currentPlayer.isAllIn && currentPlayer.isActive) {
        const newRecommendation = generateRecommendation(gameState)
        setRecommendation(newRecommendation)
      } else {
        setRecommendation(null)
      }
    } else {
      setRecommendation(null)
    }
  }, [gameState])

  // Handle AI turns
  useEffect(() => {
    if (gameState && !gameState.gameOver) {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex]

      // Check if there's only one player not folded
      const activePlayers = gameState.players.filter((p) => !p.folded && p.isActive)
      if (activePlayers.length === 1 && !gameState.gameOver) {
        // End the game and declare the remaining player as winner
        const newGameState = { ...gameState }
        newGameState.gameOver = true
        newGameState.winners = [activePlayers[0]]
        newGameState.currentRound = "showdown"

        // Award the pot to the winner
        const winnerIndex = gameState.players.findIndex((p) => p.id === activePlayers[0].id)
        newGameState.players[winnerIndex].chips += newGameState.pot

        setGameState(newGameState)
        playSound("win")

        toast({
          title: `${activePlayers[0].name} wins!`,
          description: "All other players folded.",
        })
        return
      }

      // Check if we're at showdown with all 5 community cards
      if (
        gameState.communityCards.length === 5 &&
        gameState.currentRound === "river" &&
        gameState.roundBettingComplete
      ) {
        const newGameState = { ...gameState }
        newGameState.currentRound = "showdown"
        determineWinner(newGameState)
        setGameState(newGameState)
        playSound("win")

        toast({
          title: "Showdown!",
          description: "All community cards have been dealt. Determining winner...",
        })
        return
      }

      // Skip if current player has folded or is all-in
      if (currentPlayer.folded || currentPlayer.isAllIn || !currentPlayer.isActive) {
        console.log(
          `Skipping player ${currentPlayer.name} (folded: ${currentPlayer.folded}, all-in: ${currentPlayer.isAllIn}, active: ${currentPlayer.isActive})`,
        )
        const newGameState = processAction(gameState, "check") // This will just move to next player
        setGameState(newGameState)
        return
      }

      // Only proceed with AI turn if current player is AI
      if (currentPlayer.type === "ai") {
        const aiTurn = async () => {
          setAiThinking(true)
          console.log(`AI player ${currentPlayer.name} (index: ${gameState.currentPlayerIndex}) is thinking...`)

          // Add a small delay to simulate thinking
          await new Promise((resolve) => setTimeout(resolve, 1000))

          try {
            const { action, amount } = makeAIDecision(gameState)
            console.log(`AI player ${currentPlayer.name} decided: ${action} ${amount || ""}`)

            // Play appropriate sound effect
            if (action === "fold") {
              playSound("fold")
            } else if (action === "check") {
              playSound("check")
            }

            // Show chip animation for bets, calls, and raises
            if ((action === "bet" || action === "call" || action === "raise") && amount && amount > 0) {
              const playerElement = playerRefs.current[gameState.currentPlayerIndex]
              const potElement = potRef.current

              if (playerElement && potElement && tableRef.current) {
                const playerRect = playerElement.getBoundingClientRect()
                const potRect = potElement.getBoundingClientRect()
                const tableRect = tableRef.current.getBoundingClientRect()

                setChipAnimation({
                  from: {
                    x: playerRect.left + playerRect.width / 2,
                    y: playerRect.top + playerRect.height / 2,
                  },
                  to: {
                    x: potRect.left + potRect.width / 2,
                    y: potRect.top + potRect.height / 2,
                  },
                  amount: amount,
                  isVisible: true,
                })

                // Wait for animation to complete before updating game state
                setTimeout(() => {
                  setChipAnimation((prev) => (prev ? { ...prev, isVisible: false } : null))

                  const newGameState = processAction(gameState, action, amount)
                  setGameState(newGameState)
                }, 800)
              } else {
                // Fallback if elements aren't available
                const newGameState = processAction(gameState, action, amount)
                setGameState(newGameState)
              }
            } else {
              // For other actions, just update the game state
              const newGameState = processAction(gameState, action, amount)
              setGameState(newGameState)
            }

            // Show toast for AI action
            let actionText = ""
            switch (action) {
              case "fold":
                actionText = "folded"
                break
              case "check":
                actionText = "checked"
                break
              case "call":
                actionText = `called ${amount}`
                break
              case "bet":
                actionText = `bet ${amount}`
                break
              case "raise":
                actionText = `raised to ${amount}`
                break
            }

            toast({
              title: `${currentPlayer.name} ${actionText}`,
              description: "",
            })
          } catch (error) {
            console.error("Error during AI turn:", error)
            toast({
              title: "AI Error",
              description: "There was an error during the AI's turn. Skipping to next player.",
              variant: "destructive",
            })

            // Skip to next player in case of error
            const nextPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length
            const newGameState = { ...gameState, currentPlayerIndex: nextPlayerIndex }
            setGameState(newGameState)
          } finally {
            setAiThinking(false)
          }
        }

        aiTurn()
      }
    }
  }, [gameState])

  // Helper function to determine winner (copied from game-engine for local use)
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

    // Import the evaluateBestHand function from card-utils
    const { evaluateBestHand } = require("@/lib/card-utils")

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

  // Handle player action
  const handleAction = (action: ActionType, amount?: number) => {
    if (!gameState) return

    // Add animation effect to the table
    if (tableRef.current) {
      tableRef.current.classList.add("pulse")
      setTimeout(() => {
        if (tableRef.current) {
          tableRef.current.classList.remove("pulse")
        }
      }, 500)
    }

    // Play appropriate sound effect
    if (action === "fold") {
      playSound("fold")
    } else if (action === "check") {
      playSound("check")
    }

    // Show chip animation for bets, calls, and raises
    if ((action === "bet" || action === "call" || action === "raise") && amount && amount > 0) {
      const playerElement = playerRefs.current[gameState.currentPlayerIndex]
      const potElement = potRef.current

      if (playerElement && potElement && tableRef.current) {
        const playerRect = playerElement.getBoundingClientRect()
        const potRect = potElement.getBoundingClientRect()

        setChipAnimation({
          from: {
            x: playerRect.left + playerRect.width / 2,
            y: playerRect.top + playerRect.height / 2,
          },
          to: {
            x: potRect.left + potRect.width / 2,
            y: potRect.top + potRect.height / 2,
          },
          amount: amount,
          isVisible: true,
        })

        // Wait for animation to complete before updating game state
        setTimeout(() => {
          setChipAnimation((prev) => (prev ? { ...prev, isVisible: false } : null))

          const newGameState = processAction(gameState, action, amount)
          setGameState(newGameState)

          // If the game is over, save results to database
          if (newGameState.gameOver && dbInitialized) {
            saveGameData(newGameState)
          }
        }, 800)
      } else {
        // Fallback if elements aren't available
        const newGameState = processAction(gameState, action, amount)
        setGameState(newGameState)

        // If the game is over, save results to database
        if (newGameState.gameOver && dbInitialized) {
          saveGameData(newGameState)
        }
      }
    } else {
      // For other actions, just update the game state
      const newGameState = processAction(gameState, action, amount)
      setGameState(newGameState)

      // If the game is over, save results to database
      if (newGameState.gameOver && dbInitialized) {
        saveGameData(newGameState)
      }
    }
  }

  // Save game data to database
  const saveGameData = (newGameState: GameState) => {
    const gameData = prepareGameDataForSave(newGameState)
    saveGameResults(gameData)
      .then((result) => {
        if (result.success) {
          toast({
            title: "Game Saved",
            description: "Game results saved to database successfully.",
          })
        } else {
          toast({
            title: "Save Error",
            description: result.message,
            variant: "destructive",
          })
        }
      })
      .catch((error) => {
        console.error("Failed to save game results:", error)
        toast({
          title: "Save Error",
          description: "Failed to save game results to database.",
          variant: "destructive",
        })
      })
  }

  // Start a new game
  const startNewGame = () => {
    if (!gameSettings) return

    const newGameState = initializeGame(
      gameSettings.aiPlayerCount,
      1000,
      5,
      10,
      gameSettings.username,
      gameSettings.avatarId,
      gameSettings.aiAvatars,
    )
    setGameState(newGameState)
    playSound("deal")

    toast({
      title: "New Hand Started",
      description: "The dealer has shuffled the deck and dealt new cards.",
    })
  }

  // Return to lobby
  const returnToLobby = () => {
    router.push("/")
  }

  // Toggle recommendation panel
  const toggleRecommendation = () => {
    setShowRecommendation(!showRecommendation)
  }

  if (isLoading || !gameState || !gameSettings) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-white">Loading Poker Game...</h2>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
        </div>
      </div>
    )
  }

  // Calculate positions for players around the table
  const getPlayerPositions = () => {
    const totalPlayers = gameState.players.length
    const positions: { [key: number]: { top: string; left: string; transform: string } } = {}

    // Human player is always at the bottom
    positions[0] = { top: "80%", left: "50%", transform: "translateX(-50%)" }

    if (totalPlayers <= 3) {
      // 2-3 players: one at the top
      positions[1] = { top: "0", left: "42%", transform: "translateX(-50%)" }
      if (totalPlayers === 3) {
        positions[2] = { top: "35%", left: "82%", transform: "translateY(-50%)" }
      }
    } else if (totalPlayers <= 5) {
      // 4-5 players: two at the top, one or two on the sides
      positions[1] = { top: "0%", left: "28%", transform: "translateX(-50%)" }
      positions[2] = { top: "0%", left: "62%", transform: "translateX(-50%)" }
      positions[3] = { top: "28%", left: "3%", transform: "translateY(-50%)" }
      if (totalPlayers === 5) {
        positions[4] = { top: "30%", left: "85%", transform: "translate(-100%, -50%)" }
      }
    } else {
      // 6 players: two at the top, two on the sides, one at the bottom-right
      positions[1] = { top: "0%", left: "28%", transform: "translateX(-50%)" }
      positions[2] = { top: "0%", left: "62%", transform: "translateX(-50%)" }
      positions[3] = { top: "28%", left: "3%", transform: "translateY(-50%)" }
      positions[4] = { top: "30%", left: "85%", transform: "translate(-100%, -50%)" }
      positions[5] = { top: "70%", left: "78%", transform: "translate(-50%, -50%)" }
    }

    return positions
  }

  const playerPositions = getPlayerPositions()

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gray-900 text-white">
      {/* Header with back button and game info */}
      <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-center">
        <Button variant="ghost" size="sm" onClick={returnToLobby} className="text-white hover:bg-gray-800">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Lobby
        </Button>

        <div className="flex items-center gap-4">
          <div className="bg-gray-800 px-4 py-1 rounded-full text-sm">Small Blind: ${gameState.smallBlindAmount}</div>
          <div className="bg-gray-800 px-4 py-1 rounded-full text-sm">Big Blind: ${gameState.bigBlindAmount}</div>
          <div className="bg-gray-800 px-4 py-1 rounded-full text-sm">
            Round: {gameState.currentRound.charAt(0).toUpperCase() + gameState.currentRound.slice(1)}
          </div>
        </div>
      </div>

      {/* Database error notification */}
      {dbError && (
        <div className="absolute top-16 left-0 right-0 bg-red-600 text-white p-2 text-center text-sm">
          Database Error: Game will run without saving data.
        </div>
      )}

      {/* Main poker table */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="relative w-[90vw] h-[80vh] max-w-6xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Poker table */}
          <div
            ref={tableRef}
            className="absolute inset-0 poker-felt rounded-[50%] border-[20px] table-rim shadow-2xl flex items-center justify-center transition-all duration-300"
          >
            {/* Pot display */}
            <motion.div
              ref={potRef}
              className="absolute top-[30%] left-[44%] transform -translate-x-1/2 -translate-y-1/2 z-10"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="bg-gray-900/80 backdrop-blur-sm px-6 py-3 rounded-full text-center">
                <div className="text-xl font-bold text-yellow-400">Pot: ${gameState.pot}</div>
              </div>
            </motion.div>

            {/* Community cards */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <CommunityCards cards={gameState.communityCards} />
            </div>

            {/* AI thinking indicator */}
            <AnimatePresence>
              {aiThinking && (
                <motion.div
                  className="absolute top-[40%] left-1/2 transform -translate-x-1/2 bg-black/70 px-4 py-2 rounded-md"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  AI is thinking...
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Chip animation */}
          {chipAnimation && (
            <ChipAnimation
              fromPosition={chipAnimation.from}
              toPosition={chipAnimation.to}
              amount={chipAnimation.amount}
              isVisible={chipAnimation.isVisible}
              onComplete={() => setChipAnimation(null)}
            />
          )}

          {/* Players around the table */}
          {gameState.players.map((player, index) => (
            <PlayerPosition
              key={player.id}
              player={player}
              position={playerPositions[index]}
              isCurrentPlayer={gameState.currentPlayerIndex === index}
              isDealer={player.isDealer}
              isSmallBlind={player.isSmallBlind}
              isBigBlind={player.isBigBlind}
              isWinner={gameState.winners.some((w) => w.id === player.id)}
              showdown={gameState.currentRound === "showdown"}
              isHuman={player.type === "human"}
              avatarId={player.avatarId}
              ref={(el) => (playerRefs.current[index] = el)}
            />
          ))}
        </motion.div>
      </div>

      {/* Winner display */}
      {gameState.gameOver && gameState.winners.length > 0 && (
        <WinnerDisplay winners={gameState.winners} onNewGame={startNewGame} />
      )}

<AnimatePresence>
  {gameState.currentPlayerIndex === 0 &&
    !gameState.gameOver &&
    !gameState.players[0].folded &&
    !gameState.players[0].isAllIn &&
    gameState.players[0].isActive && (
    <motion.div
      className="absolute bottom-4 left-8 flex flex-row items-end justify-start space-x-6"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {recommendation && showRecommendation && (
        <div className="w-[400px] max-w-sm">
          <RecommendationPanel recommendation={recommendation} />
        </div>
      )}
      <div className="w-[300px] max-w-sm">
        <ActionControls
          validActions={getValidActions(gameState)}
          onAction={handleAction}
        />
      </div>
    </motion.div>
    )}
</AnimatePresence>


      {/* Toggle recommendation button */}
      <div className="absolute right-4 top-20">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleRecommendation}
          className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
        >
          {showRecommendation ? "Hide Advice" : "Show Advice"}
        </Button>
      </div>
    </div>
  )
}

// Player position component
interface PlayerPositionProps {
  player: Player
  position: { top: string; left: string; transform: string }
  isCurrentPlayer: boolean
  isDealer: boolean
  isSmallBlind: boolean
  isBigBlind: boolean
  isWinner: boolean
  showdown: boolean
  isHuman?: boolean
  avatarId?: string
}

const PlayerPosition = React.forwardRef<HTMLDivElement, PlayerPositionProps>(
  (
    {
      player,
      position,
      isCurrentPlayer,
      isDealer,
      isSmallBlind,
      isBigBlind,
      isWinner,
      showdown,
      isHuman = false,
      avatarId,
    },
    ref,
  ) => {
    // Get avatar image based on player type and selected avatar
    function getAvatarSrc() {
      if (avatarId) {
        return `/assets/${avatarId}.png`
      }
      // Fallback to a default avatar if the specific one isn't available
      return isHuman ? "/assets/avatar1.png" : "/assets/ai1.png"
    }

    return (
      <motion.div
        ref={ref}
        className="absolute w-48"
        style={{
          top: position.top,
          left: position.left,
          transform: position.transform,
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className={`flex flex-col items-center transition-all duration-300`}
          animate={{
            scale: isCurrentPlayer ? 1.1 : 1,
            filter: player.folded ? "grayscale(1) brightness(0.7)" : "grayscale(0) brightness(1)",
          }}
        >
          {/* Player avatar and info */}
          <div
            className={`relative ${
              isCurrentPlayer ? "ring-4 ring-yellow-400" : ""
            } rounded-lg bg-gray-800/80 backdrop-blur-sm p-2 shadow-lg`}
          >
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="relative">
                <div className={`w-12 h-12 rounded-full overflow-hidden ${isWinner ? "ring-2 ring-yellow-400" : ""}`}>
                  <Image
                    src={getAvatarSrc() || "/placeholder.svg"}
                    alt={player.name}
                    width={48}
                    height={48}
                    className="rounded-full object-cover"
                  />
                </div>

                {/* Dealer/Blind indicators */}
                {isDealer && (
                  <div className="absolute -top-2 -right-2 bg-white text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    D
                  </div>
                )}
                {isSmallBlind && (
                  <div className="absolute -top-2 -right-2 bg-white text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    SB
                  </div>
                )}
                {isBigBlind && (
                  <div className="absolute -top-2 -right-2 bg-white text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    BB
                  </div>
                )}
              </div>

              {/* Player info */}
              <div>
                <div className="font-medium text-sm truncate max-w-[100px]">{player.name}</div>
                <div className="text-xs text-gray-300">${player.chips}</div>

                {/* Status indicators */}
                {player.folded && <div className="text-xs text-red-400 font-bold">FOLDED</div>}
                {player.isAllIn && <div className="text-xs text-yellow-400 font-bold">ALL IN</div>}
                {isWinner && <div className="text-xs text-yellow-400 font-bold">WINNER!</div>}
              </div>
            </div>

            {/* Player's bet */}
            <AnimatePresence>
              {player.bet > 0 && (
                <motion.div
                  className="absolute -bottom-6 left-1/2 transform -translate-x-1/2"
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 10, opacity: 0 }}
                >
                  <div className="bg-yellow-600 text-white px-2 py-1 rounded-full text-xs font-bold">${player.bet}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Player's cards */}
          <div className="mt-8 flex space-x-1">
            {player.hand.map((card, idx) => (
              <motion.div
                key={idx}
                className={`w-10 h-14 rounded-md ${
                  card.faceUp || showdown ? "bg-white text-black" : "bg-red-900 border border-red-700"
                }`}
                initial={{ rotateY: 180, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{ delay: idx * 0.2, duration: 0.5 }}
              >
                {card.faceUp || showdown ? (
                  <div className="h-full flex flex-col justify-between p-1">
                    <div
                      className={`text-xs font-bold ${
                        card.suit === "hearts" || card.suit === "diamonds" ? "text-red-600" : "text-black"
                      }`}
                    >
                      {card.rank}
                    </div>
                    <div
                      className={`text-center text-xs ${
                        card.suit === "hearts" || card.suit === "diamonds" ? "text-red-600" : "text-black"
                      }`}
                    >
                      {card.suit === "hearts"
                        ? "♥"
                        : card.suit === "diamonds"
                          ? "♦"
                          : card.suit === "clubs"
                            ? "♣"
                            : "♠"}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="w-6 h-8 rounded border border-white/30"></div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    )
  },
)
PlayerPosition.displayName = "PlayerPosition"
