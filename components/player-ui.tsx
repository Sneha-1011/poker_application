// Update the PlayerUI component to handle missing avatars
import type { Player } from "@/types/poker"
import PlayingCard from "./playing-card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface PlayerUIProps {
  player: Player
  isCurrentPlayer: boolean
  isDealer: boolean
  isSmallBlind: boolean
  isBigBlind: boolean
  isWinner: boolean
  showdown: boolean
  isHuman?: boolean
}

export default function PlayerUI({
  player,
  isCurrentPlayer,
  isDealer,
  isSmallBlind,
  isBigBlind,
  isWinner,
  showdown,
  isHuman = false,
}: PlayerUIProps) {
  if (!player) return null

  // Get avatar color based on player type
  const getAvatarColor = () => {
    if (isHuman) return "bg-blue-600"
    return "bg-red-600"
  }

  // Get player initials for avatar fallback
  const getInitials = () => {
    return player.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center p-4 rounded-lg transition-all duration-300",
        isCurrentPlayer ? "bg-yellow-300/20" : "bg-black/20",
        isWinner ? "ring-4 ring-yellow-400" : "",
        player.folded ? "opacity-50" : "",
      )}
    >
      <div className="flex items-center justify-center mb-2">
        <div className="relative">
          <div
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center text-white font-bold",
              getAvatarColor(),
            )}
          >
            {getInitials()}
          </div>

          {isDealer && <Badge className="absolute -top-2 -right-2 bg-white text-black">D</Badge>}
          {isSmallBlind && <Badge className="absolute -top-2 -right-2 bg-white text-black">SB</Badge>}
          {isBigBlind && <Badge className="absolute -top-2 -right-2 bg-white text-black">BB</Badge>}
        </div>
      </div>

      <div className="text-white font-medium mb-2">{player.name}</div>
      <div className="text-white mb-2">Chips: ${player.chips}</div>

      {player.bet > 0 && (
        <div className="bg-yellow-400 text-black px-2 py-1 rounded-full text-sm font-bold mb-2">Bet: ${player.bet}</div>
      )}

      {player.folded && <div className="text-red-400 font-bold mb-2">FOLDED</div>}
      {player.isAllIn && <div className="text-yellow-400 font-bold mb-2">ALL IN</div>}
      {isWinner && <div className="text-yellow-400 font-bold mb-2">WINNER!</div>}

      <div className="flex space-x-2 mt-2">
        {player.hand.map((card, index) => (
          <PlayingCard key={index} card={card} faceUp={card.faceUp || showdown} width={60} height={84} />
        ))}
      </div>
    </div>
  )
}
