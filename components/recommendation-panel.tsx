"use client"

import type { Recommendation } from "@/types/poker"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"

interface RecommendationPanelProps {
  recommendation: Recommendation
}

export default function RecommendationPanel({ recommendation }: RecommendationPanelProps) {
  const getRiskColor = (risk: "low" | "medium" | "high") => {
    switch (risk) {
      case "low":
        return "bg-green-500"
      case "medium":
        return "bg-yellow-500"
      case "high":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const formatAction = (action: string, amount?: number) => {
    switch (action) {
      case "fold":
        return "Fold"
      case "check":
        return "Check"
      case "call":
        return `Call ${amount ? `$${amount}` : ""}`
      case "bet":
        return `Bet ${amount ? `$${amount}` : ""}`
      case "raise":
        return `Raise to ${amount ? `$${amount}` : ""}`
      default:
        return action
    }
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
      <Card className="bg-gray-900/90 backdrop-blur-sm text-white border-gray-700 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex justify-between items-center">
            <span>Recommendation</span>
            <Badge className={getRiskColor(recommendation.riskLevel)}>
              {recommendation.riskLevel.toUpperCase()} RISK
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="text-lg font-bold">{formatAction(recommendation.action, recommendation.amount)}</div>
              <div className="text-sm text-gray-400">Confidence: {Math.round(recommendation.confidence * 100)}%</div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="text-sm font-medium mb-1">Reasoning:</div>
              <div className="text-sm text-gray-300">{recommendation.reasoning}</div>
            </motion.div>

            {recommendation.alternativeActions.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <div className="text-sm font-medium mb-1">Alternatives:</div>
                <ul className="text-sm text-gray-300">
                  {recommendation.alternativeActions.map((alt, index) => (
                    <li key={index}>
                      {formatAction(alt.action, alt.amount)}
                      (EV: ${alt.expectedValue.toFixed(2)})
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <div className="text-sm text-gray-400">Expected Value: ${recommendation.expectedValue.toFixed(2)}</div>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
