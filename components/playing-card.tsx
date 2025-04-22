import type { Card as CardType } from "@/types/poker"
import { cn } from "@/lib/utils"

interface PlayingCardProps {
  card: CardType
  faceUp: boolean
  width?: number
  height?: number
  className?: string
}

export default function PlayingCard({ card, faceUp, width = 80, height = 112, className }: PlayingCardProps) {
  const suitSymbol = {
    hearts: "♥",
    diamonds: "♦",
    clubs: "♣",
    spades: "♠",
  }[card.suit]

  const suitColor = card.suit === "hearts" || card.suit === "diamonds" ? "text-red-600" : "text-black"

  return (
    <div
      className={cn(
        "relative rounded-md shadow-md flex items-center justify-center",
        faceUp ? "bg-white" : "bg-blue-800",
        className,
      )}
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      {faceUp ? (
        <>
          <div className={cn("absolute top-1 left-1 font-bold", suitColor)}>{card.rank}</div>
          <div className={cn("text-2xl font-bold", suitColor)}>{suitSymbol}</div>
          <div className={cn("absolute bottom-1 right-1 font-bold rotate-180", suitColor)}>{card.rank}</div>
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-3/4 h-3/4 rounded border-2 border-white"></div>
        </div>
      )}
    </div>
  )
}
