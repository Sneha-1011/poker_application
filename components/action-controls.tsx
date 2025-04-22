"use client"

import type React from "react"
import { useState } from "react"
import type { ActionType } from "@/types/poker"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { motion } from "framer-motion"

interface ActionControlsProps {
  validActions: {
    type: ActionType
    minAmount?: number
    maxAmount?: number
  }[]
  onAction: (action: ActionType, amount?: number) => void
}

export default function ActionControls({ validActions, onAction }: ActionControlsProps) {
  const [betAmount, setBetAmount] = useState<number | undefined>(
    validActions.find((a) => a.type === "bet" || a.type === "raise")?.minAmount,
  )

  const canCheck = validActions.some((a) => a.type === "check")
  const canCall = validActions.some((a) => a.type === "call")
  const canBet = validActions.some((a) => a.type === "bet")
  const canRaise = validActions.some((a) => a.type === "raise")

  const callAction = validActions.find((a) => a.type === "call")
  const betAction = validActions.find((a) => a.type === "bet")
  const raiseAction = validActions.find((a) => a.type === "raise")

  const handleBetAmountChange = (value: number[]) => {
    setBetAmount(value[0])
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseInt(e.target.value)
    if (!isNaN(value)) {
      const min = (betAction || raiseAction)?.minAmount || 0
      const max = (betAction || raiseAction)?.maxAmount || 0
      setBetAmount(Math.min(Math.max(value, min), max))
    }
  }

  return (
    <motion.div
      className="bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-gray-800"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex space-x-2 mb-4">
        <motion.div className="flex-1" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button variant="destructive" onClick={() => onAction("fold")} className="w-full">
            Fold
          </Button>
        </motion.div>

        {canCheck && (
          <motion.div className="flex-1" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="secondary"
              onClick={() => onAction("check")}
              className="w-full bg-gray-700 hover:bg-gray-600"
            >
              Check
            </Button>
          </motion.div>
        )}

        {canCall && callAction && (
          <motion.div className="flex-1" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="default"
              onClick={() => onAction("call", callAction.minAmount)}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Call ${callAction.minAmount}
            </Button>
          </motion.div>
        )}
      </div>

      {(canBet || canRaise) && (
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-grow">
              <Slider
                value={betAmount ? [betAmount] : [0]}
                min={(betAction || raiseAction)?.minAmount || 0}
                max={(betAction || raiseAction)?.maxAmount || 100}
                step={1}
                onValueChange={handleBetAmountChange}
              />
            </div>
            <div className="w-20">
              <Input
                type="number"
                value={betAmount || 0}
                onChange={handleInputChange}
                min={(betAction || raiseAction)?.minAmount || 0}
                max={(betAction || raiseAction)?.maxAmount || 100}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>

          <div className="flex space-x-2">
            {canBet && (
              <motion.div className="flex-1" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="default"
                  onClick={() => onAction("bet", betAmount)}
                  disabled={!betAmount}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  Bet ${betAmount}
                </Button>
              </motion.div>
            )}

            {canRaise && (
              <motion.div className="flex-1" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="default"
                  onClick={() => onAction("raise", betAmount)}
                  disabled={!betAmount}
                  className="w-full bg-yellow-600 hover:bg-yellow-700"
                >
                  Raise to ${betAmount}
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}
