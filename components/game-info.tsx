import type { GameState } from "@/types/poker"
import { Badge } from "@/components/ui/badge"

interface GameInfoProps {
  gameState: GameState
}

export default function GameInfo({ gameState }: GameInfoProps) {
  const roundNames = {
    "pre-flop": "Pre-Flop",
    flop: "Flop",
    turn: "Turn",
    river: "River",
    showdown: "Showdown",
  }

  return (
    <div className="flex items-center space-x-4">
      <Badge variant="outline" className="text-white border-white">
        Round: {roundNames[gameState.currentRound]}
      </Badge>

      <Badge variant="outline" className="text-white border-white">
        Small Blind: ${gameState.smallBlindAmount}
      </Badge>

      <Badge variant="outline" className="text-white border-white">
        Big Blind: ${gameState.bigBlindAmount}
      </Badge>
    </div>
  )
}
