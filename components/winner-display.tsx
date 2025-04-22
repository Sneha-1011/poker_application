"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"
import type { Player } from "@/types/poker"
import { Button } from "@/components/ui/button"
import { Trophy, Star } from "lucide-react"

interface WinnerDisplayProps {
  winners: Player[]
  onNewGame: () => void
}

export default function WinnerDisplay({ winners, onNewGame }: WinnerDisplayProps) {
  const [showConfetti, setShowConfetti] = useState(false)

  // Launch confetti when component mounts
  useEffect(() => {
    if (winners.length > 0) {
      setShowConfetti(true)

      // Create confetti burst
      const duration = 3 * 1000
      const animationEnd = Date.now() + duration
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min

      const interval: any = setInterval(() => {
        const timeLeft = animationEnd - Date.now()

        if (timeLeft <= 0) {
          return clearInterval(interval)
        }

        const particleCount = 50 * (timeLeft / duration)

        // Launch confetti from both sides
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        })
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        })
      }, 250)

      return () => clearInterval(interval)
    }
  }, [winners])

  // No winners, don't show anything
  if (winners.length === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="relative max-w-md w-full mx-auto p-8 rounded-xl overflow-hidden"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
        >
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500 via-amber-500 to-yellow-600 animate-gradient-xy"></div>

          {/* Sparkles */}
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-white rounded-full"
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                }}
                animate={{
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </div>

          <div className="relative z-10 text-center">
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex justify-center mb-4"
            >
              <Trophy className="w-16 h-16 text-yellow-300 drop-shadow-glow" />
            </motion.div>

            <motion.h2
              className="text-4xl font-bold text-white mb-6 drop-shadow-glow"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              {winners.length === 1 ? "Winner!" : "It's a Tie!"}
            </motion.h2>

            <div className="space-y-4">
              {winners.map((winner, index) => (
                <motion.div
                  key={winner.id}
                  className="bg-white/20 backdrop-blur-sm rounded-lg p-4 flex items-center gap-3"
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.9 + index * 0.2 }}
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-yellow-600 flex items-center justify-center text-white font-bold">
                      {winner.name.charAt(0).toUpperCase()}
                    </div>
                    <Star className="absolute -top-1 -right-1 w-5 h-5 text-yellow-300" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-white">{winner.name}</div>
                    <div className="text-yellow-200 text-sm">
                      {winner.type === "human" ? "Human Player" : "AI Player"}
                    </div>
                  </div>
                  <div className="text-white font-bold text-xl">${winner.chips}</div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="mt-8"
            >
              <Button
                onClick={onNewGame}
                className="bg-white text-yellow-700 hover:bg-yellow-100 font-bold text-lg px-8 py-6"
                size="lg"
              >
                Play Again
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
