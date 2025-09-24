'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CADTrendData {
  date: string
  cadScore: number
  sleepScore: number
  mealTimingScore: number
  activityScore: number
}

interface CADTrendChartProps {
  data: CADTrendData[]
  timeRange?: '7d' | '30d' | '90d'
}

export function CADTrendChart({ data, timeRange = '7d' }: CADTrendChartProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{formatDate(label)}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const getTimeRangeTitle = () => {
    switch (timeRange) {
      case '7d': return 'Last 7 Days'
      case '30d': return 'Last 30 Days'
      case '90d': return 'Last 90 Days'
      default: return 'Trend'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>CAD Score Trend - {getTimeRangeTitle()}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                className="text-sm"
              />
              <YAxis 
                domain={[0, 100]} 
                className="text-sm"
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Reference line for goal */}
              <ReferenceLine 
                y={80} 
                stroke="#ef4444" 
                strokeDasharray="5 5" 
                label={{ value: "Goal (80)", position: "right" }}
              />
              
              <Line 
                type="monotone" 
                dataKey="cadScore" 
                stroke="#2563eb" 
                strokeWidth={3}
                name="CAD Score"
                dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
              
              <Line 
                type="monotone" 
                dataKey="sleepScore" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Sleep"
                dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                strokeDasharray="5 5"
              />
              
              <Line 
                type="monotone" 
                dataKey="mealTimingScore" 
                stroke="#f59e0b" 
                strokeWidth={2}
                name="Meal Timing"
                dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3 }}
                strokeDasharray="5 5"
              />
              
              <Line 
                type="monotone" 
                dataKey="activityScore" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                name="Activity"
                dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 3 }}
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-600 rounded"></div>
            <span>CAD Score</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-green-500 rounded"></div>
            <span>Sleep</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-yellow-500 rounded"></div>
            <span>Meal Timing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-purple-500 rounded"></div>
            <span>Activity</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}