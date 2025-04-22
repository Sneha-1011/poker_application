"use client"

import type { Card } from "@/types/poker"
import { motion } from "framer-motion"

interface CommunityCardsProps {
  cards: Card[]
}

export default function CommunityCards({ cards }: CommunityCardsProps) {
  // Create placeholders for missing cards
  const placeholders = Array(5 - cards.length).fill(null)

  return (
    <div className="flex justify-center space-x-2">
      {cards.map((card, index) => (
        <motion.div
          key={index}
          className="w-16 h-24 rounded-md bg-white text-black shadow-lg"
          initial={{ y: -50, opacity: 0, rotateY: 180, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, rotateY: 0, scale: 1 }}
          transition={{
            delay: index * 0.2,
            duration: 0.5,
            type: "spring",
            stiffness: 300,
            damping: 15,
          }}
        >
          <div className="h-full flex flex-col justify-between p-2">
            <div
              className={`text-sm font-bold ${
                card.suit === "hearts" || card.suit === "diamonds" ? "text-red-600" : "text-black"
              }`}
            >
              {card.rank}
            </div>
            <div
              className={`text-center text-xl ${
                card.suit === "hearts" || card.suit === "diamonds" ? "text-red-600" : "text-black"
              }`}
            >
              {card.suit === "hearts" ? "♥" : card.suit === "diamonds" ? "♦" : card.suit === "clubs" ? "♣" : "♠"}
            </div>
            <div
              className={`text-sm font-bold self-end transform rotate-180 ${
                card.suit === "hearts" || card.suit === "diamonds" ? "text-red-600" : "text-black"
              }`}
            >
              {card.rank}
            </div>
          </div>
        </motion.div>
      ))}

      {placeholders.map((_, index) => (
        <div key={`placeholder-${index}`} className="w-16 h-24 rounded-md border-2 border-white/20 bg-green-900/30" />
      ))}
    </div>
  )
}
