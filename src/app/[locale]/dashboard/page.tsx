'use client'

import { useState, useEffect } from 'react'
import { CADScoreCircle } from '@/components/cad-score-circle'
import { ScoreBreakdown } from '@/components/score-breakdown'
import { HealthMetrics } from '@/components/health-metrics'
import { WeeklySummary } from '@/components/weekly-summary'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Navigation } from '@/components/navigation'
import { Link } from '@/navigation'

interface DashboardData {
  cadScore: number
  breakdown: {
    sleepScore: number
    mealTimingScore: number
    activityScore: number
    consistencyScore: number
  }
  rawMetrics: {
    sleepDuration?: number
    sleepEfficiency?: number
    bedtime?: string
    wakeTime?: string
    firstMealTime?: string
    lastMealTime?: string
    eatingWindowHours?: number
  }
  trends?: {
    sleepScore: number
    mealTimingScore: number
    activityScore: number
    cadScore: number
  }
  weekly: {
    average: number
    cadAlignedDays: number
    totalDays: number
  }
  lastUpdated: string
  hasData: boolean
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  // Mock user ID - in real app this would come from authentication
  const mockUserId = 'user_123'

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/dashboard?userId=${mockUserId}&date=${selectedDate}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [selectedDate])

  const handleRefresh = () => {
    fetchDashboardData()
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={handleRefresh} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">No data available</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Circadian AI Dashboard</h1>
                <p className="text-sm text-gray-600">{formatDate(selectedDate)}</p>
              </div>
              <Navigation />
            </div>
            <div className="flex items-center space-x-4">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button onClick={handleRefresh} variant="outline" size="sm">
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!data.hasData ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="mb-4">
                <div className="mx-auto w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📊</span>
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
              <p className="text-gray-600 mb-4">
                Connect your data sources to start tracking your circadian rhythm.
              </p>
              <Link href="/sources">
                <Button>Connect Data Source</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Score */}
            <div className="lg:col-span-1">
              <Card className="text-center p-6">
                <CardContent className="pt-6">
                  <CADScoreCircle score={data.cadScore} size="lg" />
                  <div className="mt-4 space-y-2">
                    <p className="text-sm text-gray-600">
                      Your circadian alignment for today
                    </p>
                    {data.cadScore >= 80 && (
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        🎯 Goal Achieved!
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Score Breakdown */}
            <div className="lg:col-span-2">
              <ScoreBreakdown breakdown={data.breakdown} trends={data.trends} />
            </div>

            {/* Health Metrics */}
            <div className="lg:col-span-2">
              <HealthMetrics rawMetrics={data.rawMetrics} />
            </div>

            {/* Weekly Summary */}
            <div className="lg:col-span-1">
              <WeeklySummary weekly={data.weekly} lastUpdated={data.lastUpdated} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}