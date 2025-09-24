'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface WeeklySummaryProps {
  weekly: {
    average: number
    cadAlignedDays: number
    totalDays: number
  }
  lastUpdated: string
}

export function WeeklySummary({ weekly, lastUpdated }: WeeklySummaryProps) {
  const cadPercentage = weekly.totalDays > 0 
    ? Math.round((weekly.cadAlignedDays / weekly.totalDays) * 100) 
    : 0

  const getAverageColor = (avg: number) => {
    if (avg >= 80) return 'text-green-600'
    if (avg >= 60) return 'text-yellow-600'
    if (avg >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  const formatLastUpdated = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
      
      if (diffMinutes < 1) return 'Just now'
      if (diffMinutes < 60) return `${diffMinutes}m ago`
      
      const diffHours = Math.floor(diffMinutes / 60)
      if (diffHours < 24) return `${diffHours}h ago`
      
      return date.toLocaleDateString()
    } catch {
      return 'Unknown'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Weekly Summary</span>
          <span className="text-xs text-gray-500 font-normal">
            Updated {formatLastUpdated(lastUpdated)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Average Score */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium">Average CAD Score</div>
              <div className="text-sm text-gray-600">Last 7 days</div>
            </div>
            <div className={`text-2xl font-bold ${getAverageColor(weekly.average)}`}>
              {weekly.average}
            </div>
          </div>

          {/* CAD Aligned Days */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium">CAD Aligned Days</div>
              <div className="text-sm text-gray-600">Score ≥ 80</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {weekly.cadAlignedDays}/{weekly.totalDays}
              </div>
              <div className="text-sm text-gray-600">
                {cadPercentage}%
              </div>
            </div>
          </div>

          {/* Progress towards goal */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Weekly Goal Progress</span>
              <span>{cadPercentage}% of days</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(cadPercentage, 100)}%` }}
              />
            </div>
            <div className="text-xs text-gray-500">
              Target: 80% of days with CAD ≥ 80
            </div>
          </div>

          {/* Status message */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-sm">
              {cadPercentage >= 80 ? (
                <span className="text-green-700">🎉 Excellent! You're hitting your circadian rhythm goals.</span>
              ) : cadPercentage >= 60 ? (
                <span className="text-yellow-700">📈 Good progress! Focus on consistency to reach your goal.</span>
              ) : cadPercentage >= 40 ? (
                <span className="text-orange-700">💪 Keep working! Small improvements add up over time.</span>
              ) : (
                <span className="text-red-700">🎯 Let's build better habits! Start with consistent sleep timing.</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}