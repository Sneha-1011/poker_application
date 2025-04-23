import type React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Card } from "@/components/ui/card"
import Image from "next/image"

interface HandStrengthDialogProps {
  isOpen: boolean
  onClose: () => void
}

const HandStrengthDialog: React.FC<HandStrengthDialogProps> = ({ isOpen, onClose }) => {
  const handRankings = [
    {
      name: "Royal Flush",
      description: "A, K, Q, J, 10, all the same suit",
      strength: "Strongest",
    },
    {
      name: "Straight Flush",
      description: "Five cards in a sequence, all in the same suit",
      strength: "Very Strong",
    },
    {
      name: "Four of a Kind",
      description: "All four cards of the same rank",
      strength: "Very Strong",
    },
    {
      name: "Full House",
      description: "Three of a kind with a pair",
      strength: "Strong",
    },
    {
      name: "Flush",
      description: "Any five cards of the same suit, but not in a sequence",
      strength: "Strong",
    },
    {
      name: "Straight",
      description: "Five cards in a sequence, but not of the same suit",
      strength: "Medium",
    },
    {
      name: "Three of a Kind",
      description: "Three cards of the same rank",
      strength: "Medium",
    },
    {
      name: "Two Pair",
      description: "Two different pairs",
      strength: "Weak",
    },
    {
      name: "Pair",
      description: "Two cards of the same rank",
      strength: "Weak",
    },
    {
      name: "High Card",
      description: "When you haven't made any of the hands above, the highest card plays",
      strength: "Weakest",
    },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-gray-900 text-white border border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Poker Hand Rankings</DialogTitle>
          <DialogDescription className="text-gray-400">
            From strongest to weakest, these are the possible poker hands you can make.
          </DialogDescription>
        </DialogHeader>

        {/* Poker Hand Rankings Image */}
        <div className="my-4 rounded-lg overflow-hidden">
          <Image
            src="/assets/poker-hand-rankings.png"
            alt="Poker Hand Rankings Chart"
            width={800}
            height={450}
            className="w-full object-contain"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {handRankings.map((hand, index) => (
            <Card key={index} className="p-4 border border-gray-700 bg-gray-800 text-white">
              <h3 className="text-lg font-semibold">{hand.name}</h3>
              <p className="text-sm text-gray-300">{hand.description}</p>
              <div className="mt-2">
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    hand.strength === "Strongest" || hand.strength === "Very Strong"
                      ? "bg-green-900 text-green-100"
                      : hand.strength === "Strong"
                        ? "bg-blue-900 text-blue-100"
                        : hand.strength === "Medium"
                          ? "bg-yellow-900 text-yellow-100"
                          : "bg-red-900 text-red-100"
                  }`}
                >
                  {hand.strength}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default HandStrengthDialog
