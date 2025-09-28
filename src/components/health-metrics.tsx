'use client'

import { useTranslations } from 'next-intl'
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
  const t = useTranslations('dashboard.healthMetrics')
  
  const formatTime = (timeString?: string) => {
    if (!timeString) return t('noData')
    try {
      const date = new Date(timeString)
      return date.toLocaleTimeString('ja-JP', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: false
      })
    } catch {
      return t('noData')
    }
  }

  const formatDuration = (hours?: number) => {
    if (!hours) return t('noData')
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return `${h}時間${m}分`
  }

  const metrics = [
    {
      category: t('sleep'),
      items: [
        {
          label: t('duration'),
          value: formatDuration(rawMetrics.sleepDuration),
          target: t('targets.sleepDuration')
        },
        {
          label: t('bedtime'),
          value: formatTime(rawMetrics.bedtime),
          target: t('targets.bedtime')
        },
        {
          label: t('wakeTime'),
          value: formatTime(rawMetrics.wakeTime),
          target: t('targets.wakeTime')
        },
        {
          label: t('efficiency'),
          value: rawMetrics.sleepEfficiency ? `${Math.round(rawMetrics.sleepEfficiency)}%` : t('noData'),
          target: t('targets.efficiency')
        }
      ]
    },
    {
      category: t('meals'),
      items: [
        {
          label: t('firstMeal'),
          value: formatTime(rawMetrics.firstMealTime),
          target: t('targets.firstMeal')
        },
        {
          label: t('lastMeal'),
          value: formatTime(rawMetrics.lastMealTime),
          target: t('targets.lastMeal')
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
        <CardTitle>Today&apos;s Metrics</CardTitle>
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