'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface HealthMetricsProps {
  rawMetrics: {
    sleepDuration?: number
    sleepEfficiency?: number
    bedtime?: string
    wakeTime?: string
    firstMealTime?: string
    lastMealTime?: string
    eatingWindowHours?: number
  }
}

export function HealthMetrics({ rawMetrics }: HealthMetricsProps) {
  const formatTime = (timeString?: string) => {
    if (!timeString) return 'No data'
    try {
      const date = new Date(timeString)
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    } catch {
      return 'Invalid time'
    }
  }

  const formatDuration = (hours?: number) => {
    if (!hours) return 'No data'
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return `${h}h ${m}m`
  }

  const metrics = [
    {
      category: 'Sleep',
      items: [
        {
          label: 'Duration',
          value: formatDuration(rawMetrics.sleepDuration),
          target: '7-9 hours'
        },
        {
          label: 'Bedtime',
          value: formatTime(rawMetrics.bedtime),
          target: '9-11 PM'
        },
        {
          label: 'Wake Time',
          value: formatTime(rawMetrics.wakeTime),
          target: '6-8 AM'
        },
        {
          label: 'Efficiency',
          value: rawMetrics.sleepEfficiency ? `${Math.round(rawMetrics.sleepEfficiency)}%` : 'No data',
          target: '85%+'
        }
      ]
    },
    {
      category: 'Meals',
      items: [
        {
          label: 'First Meal',
          value: formatTime(rawMetrics.firstMealTime),
          target: '6-10 AM'
        },
        {
          label: 'Last Meal',
          value: formatTime(rawMetrics.lastMealTime),
          target: 'Before 7 PM'
        },
        {
          label: 'Eating Window',
          value: formatDuration(rawMetrics.eatingWindowHours),
          target: '10-12 hours'
        }
      ]
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {metrics.map((category) => (
            <div key={category.category} className="space-y-3">
              <h4 className="font-medium text-sm text-gray-900 uppercase tracking-wide">
                {category.category}
              </h4>
              <div className="grid grid-cols-1 gap-3">
                {category.items.map((item) => (
                  <div key={item.label} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-sm">{item.label}</div>
                      <div className="text-xs text-gray-500">Target: {item.target}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}