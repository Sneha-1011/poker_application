"use client"

import { Suspense } from "react"
import PokerTable from "@/components/poker-table"

export default function GamePage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <PokerTable />
    </Suspense>
  )
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4 text-white">Loading Poker Game...</h2>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
      </div>
    </div>
  )
}
