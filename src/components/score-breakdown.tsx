'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ScoreBreakdownProps {
  breakdown: {
    sleepScore: number
    mealTimingScore: number
    activityScore: number
    consistencyScore: number
  }
  trends?: {
    sleepScore: number
    mealTimingScore: number
    activityScore: number
    cadScore: number
  }
}

export function ScoreBreakdown({ breakdown, trends }: ScoreBreakdownProps) {
  const categories = [
    {
      name: 'Sleep',
      score: breakdown.sleepScore,
      trend: trends?.sleepScore || 0,
      description: 'Duration, timing & quality',
      weight: '40%'
    },
    {
      name: 'Meal Timing',
      score: breakdown.mealTimingScore,
      trend: trends?.mealTimingScore || 0,
      description: 'Eating window & schedule',
      weight: '30%'
    },
    {
      name: 'Activity',
      score: breakdown.activityScore,
      trend: trends?.activityScore || 0,
      description: 'Exercise timing & duration',
      weight: '20%'
    },
    {
      name: 'Consistency',
      score: breakdown.consistencyScore,
      trend: trends?.cadScore || 0,
      description: 'Day-to-day regularity',
      weight: '10%'
    }
  ]

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-yellow-500'
    if (score >= 40) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return '↗'
    if (trend < 0) return '↘'
    return '→'
  }

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-600'
    if (trend < 0) return 'text-red-600'
    return 'text-gray-500'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Score Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {categories.map((category) => (
            <div key={category.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{category.name}</span>
                    <span className="text-xs text-gray-500">({category.weight})</span>
                    {trends && (
                      <span className={`text-xs ${getTrendColor(category.trend)}`}>
                        {getTrendIcon(category.trend)} {Math.abs(category.trend)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{category.description}</p>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">{category.score}</div>
                  <div className="text-xs text-gray-500">/ 100</div>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${getScoreColor(category.score)}`}
                  style={{ width: `${category.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}