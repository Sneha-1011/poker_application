"use client"

import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"

// Chip denominations and colors
const CHIP_TYPES = [
  { value: 100, color: "black", image: "/assets/chip-black.png" },
  { value: 25, color: "green", image: "/assets/chip-green.png" },
  { value: 10, color: "blue", image: "/assets/chip-blue.png" },
  { value: 5, color: "red", image: "/assets/chip-red.png" },
  { value: 1, color: "white", image: "/assets/chip-white.png" },
]

interface Chip {
  id: number
  value: number
  image: string
}

interface ChipAnimationProps {
  fromPosition: { x: number; y: number }
  toPosition: { x: number; y: number }
  amount: number
  onComplete?: () => void
  isVisible: boolean
}

export default function ChipAnimation({
  fromPosition,
  toPosition,
  amount,
  onComplete,
  isVisible,
}: ChipAnimationProps) {
  const [chips, setChips] = useState<Chip[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Helper: Break down amount into chip objects
  const generateChips = (amount: number): Chip[] => {
    const chipArray: Chip[] = []
    let remaining = amount

    for (const chip of CHIP_TYPES) {
      const count = Math.floor(remaining / chip.value)
      if (count > 0) {
        const chipCount = Math.min(count, 3) // Max 3 chips of each type
        for (let i = 0; i < chipCount; i++) {
          chipArray.push({
            id: Date.now() + Math.random(),
            value: chip.value,
            image: chip.image,
          })
        }
        remaining -= chip.value * chipCount
      }
    }

    // If nothing generated, show at least one chip
    if (chipArray.length === 0) {
      chipArray.push({
        id: Date.now(),
        value: 1,
        image: "/assets/chip-white.png",
      })
    }

    return chipArray
  }

  useEffect(() => {
    if (typeof window !== "undefined" && !audioRef.current) {
      audioRef.current = new Audio("/assets/chip-sound.mp3")
    }

    if (isVisible && amount > 0) {
      const newChips = generateChips(amount)
      setChips(newChips)

      // Play chip sound
      audioRef.current?.play().catch((err) => console.error("Audio error:", err))

      // Call onComplete after animation
      const cleanup = setTimeout(() => {
        onComplete?.()
      }, 1000)

      return () => clearTimeout(cleanup)
    }
  }, [isVisible, amount, onComplete])

  if (!isVisible || chips.length === 0) return null

  return (
    <AnimatePresence>
      {chips.map((chip, index) => (
        <motion.div
          key={chip.id}
          className="absolute z-50 pointer-events-none"
          initial={{
            x: fromPosition.x + (Math.random() * 16 - 8),
            y: fromPosition.y + (Math.random() * 16 - 8),
            scale: 0.5,
            opacity: 0,
            rotate: Math.random() * 90 - 45,
          }}
          animate={{
            x: toPosition.x + (Math.random() * 30 - 15),
            y: toPosition.y + (Math.random() * 30 - 15),
            scale: 1,
            opacity: [0, 1, 1, 0],
            rotate: Math.random() * 180 - 90,
          }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{
            type: "tween", // ✅ FIX: Use tween to support multi-keyframe animations
            duration: 0.8,
            delay: index * 0.05,
            ease: "easeInOut",
          }}
          
        >
          <div className="w-12 h-12 relative">
            <img
              src={chip.image}
              alt={`${chip.value} chip`}
              className="w-full h-full object-contain"
            />
            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-sm">
              {chip.value}
            </div>
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
  )
}
