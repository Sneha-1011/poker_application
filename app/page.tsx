"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import Image from "next/image"

// Define available avatars with actual image paths
const AVATARS = [
  { id: "you", src: "/assets/you.png", alt: "Avatar 1" },
  { id: "ai1", src: "/assets/ai1.png", alt: "Avatar 2" },
]

// Define AI avatars with actual image paths
const AI_AVATARS = [
  { id: "ai2", src: "/assets/ai2.png", alt: "AI 1" },
  { id: "avatar7", src: "/assets/avatar7.png", alt: "AI 2" },
  { id: "ai3", src: "/assets/ai3.png", alt: "AI 3" },
  { id: "ai4", src: "/assets/ai4.png", alt: "AI 4" },
  { id: "ai5", src: "/assets/ai5.png", alt: "AI 5" },
]

export default function LobbyPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [aiPlayerCount, setAiPlayerCount] = useState(5)
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].id)

  const handleStartGame = () => {
    // Generate random guest name if username is blank
    const finalUsername = username.trim() || `Guest${Math.floor(Math.random() * 10000)}`

    // Store game settings in localStorage
    localStorage.setItem(
      "pokerGameSettings",
      JSON.stringify({
        username: finalUsername,
        aiPlayerCount,
        avatarId: selectedAvatar,
        aiAvatars: AI_AVATARS.slice(0, aiPlayerCount).map((avatar) => avatar.id),
      }),
    )

    // Navigate to the game page
    router.push("/game")
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-gray-700">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-white">Texas Hold'em Poker</CardTitle>
          <CardDescription className="text-gray-300">Configure your game settings</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-white">
              Your Name
            </Label>
            <Input
              id="username"
              placeholder="Enter your name or leave blank for random guest name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white">Number of AI Players: {aiPlayerCount}</Label>
            <Slider
              value={[aiPlayerCount]}
              min={1}
              max={5}
              step={1}
              onValueChange={(value) => setAiPlayerCount(value[0])}
              className="py-4"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
            </div>
            <div className="text-sm text-gray-400 mt-1">
              Total players: {aiPlayerCount + 1} (You + {aiPlayerCount} AI)
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Choose Your Avatar</Label>
            <RadioGroup value={selectedAvatar} onValueChange={setSelectedAvatar} className="flex justify-center gap-6">
              {AVATARS.map((avatar) => (
                <div key={avatar.id} className="flex flex-col items-center gap-2">
                  <div
                    className={`relative rounded-full overflow-hidden border-4 ${selectedAvatar === avatar.id ? "border-yellow-500" : "border-transparent"}`}
                  >
                    <Image
                      src={avatar.src || "/placeholder.svg"}
                      alt={avatar.alt}
                      width={80}
                      height={80}
                      className="rounded-full"
                    />
                    <RadioGroupItem value={avatar.id} id={avatar.id} className="sr-only" />
                  </div>
                  <Label htmlFor={avatar.id} className="text-gray-300 cursor-pointer">
                    {avatar.id === "avatar1" ? "Player 1" : "Player 2"}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </CardContent>

        <CardFooter>
          <Button onClick={handleStartGame} className="w-full bg-green-600 hover:bg-green-700 text-white">
            Start Game
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
