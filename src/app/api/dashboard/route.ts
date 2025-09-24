import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CADCalculator } from '@/lib/cad-calculator'
import { z } from 'zod'

const DashboardQuerySchema = z.object({
  userId: z.string(),
  date: z.string().optional(), // YYYY-MM-DD format
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const dateParam = searchParams.get('date')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Use provided date or today
    const targetDate = dateParam ? new Date(dateParam) : new Date()
    targetDate.setHours(0, 0, 0, 0)

    // Check if we have existing CAD metrics for this date
    let cadMetrics = await prisma.circadianMetric.findUnique({
      where: {
        userId_date: {
          userId,
          date: targetDate,
        },
      },
    })

    // If no metrics exist or they're older than 1 hour, recalculate
    const shouldRecalculate = !cadMetrics || 
      (new Date().getTime() - new Date(cadMetrics.calculatedAt).getTime()) > 60 * 60 * 1000

    if (shouldRecalculate) {
      const calculator = new CADCalculator()
      const cadResult = await calculator.calculateCAD({
        userId,
        date: targetDate,
      })

      // Save the calculated metrics
      await calculator.saveCADMetrics(userId, targetDate, cadResult)

      // Fetch the saved metrics
      cadMetrics = await prisma.circadianMetric.findUnique({
        where: {
          userId_date: {
            userId,
            date: targetDate,
          },
        },
      })
    }

    if (!cadMetrics) {
      return NextResponse.json({
        cadScore: 0,
        breakdown: {
          sleepScore: 0,
          mealTimingScore: 0,
          activityScore: 0,
          consistencyScore: 0,
        },
        rawMetrics: {},
        lastUpdated: new Date().toISOString(),
        hasData: false,
      })
    }

    // Get recent trends (last 7 days)
    const endDate = new Date(targetDate)
    const startDate = new Date(targetDate)
    startDate.setDate(startDate.getDate() - 6)

    const recentMetrics = await prisma.circadianMetric.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    })

    // Calculate trends
    const trends = calculateTrends(recentMetrics)

    // Get weekly summary
    const weeklyAverage = recentMetrics.length > 0 
      ? Math.round(recentMetrics.reduce((sum: number, m: any) => sum + m.cadScore, 0) / recentMetrics.length)
      : 0

    const cadAlignedDays = recentMetrics.filter((m: any) => m.cadScore >= 80).length

    return NextResponse.json({
      cadScore: cadMetrics.cadScore,
      breakdown: {
        sleepScore: cadMetrics.sleepScore,
        mealTimingScore: cadMetrics.mealTimingScore,
        activityScore: cadMetrics.activityScore,
        consistencyScore: cadMetrics.consistencyScore,
      },
      rawMetrics: {
        sleepDuration: cadMetrics.sleepDuration,
        sleepEfficiency: cadMetrics.sleepEfficiency,
        bedtime: cadMetrics.bedtime,
        wakeTime: cadMetrics.wakeTime,
        firstMealTime: cadMetrics.firstMealTime,
        lastMealTime: cadMetrics.lastMealTime,
        eatingWindowHours: cadMetrics.eatingWindowHours,
      },
      trends,
      weekly: {
        average: weeklyAverage,
        cadAlignedDays,
        totalDays: recentMetrics.length,
      },
      lastUpdated: cadMetrics.calculatedAt.toISOString(),
      hasData: true,
    })

  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function calculateTrends(metrics: any[]): any {
  if (metrics.length < 2) {
    return {
      cadScore: 0,
      sleepScore: 0,
      mealTimingScore: 0,
      activityScore: 0,
    }
  }

  const recent = metrics.slice(-3) // Last 3 days
  const previous = metrics.slice(-6, -3) // Previous 3 days

  if (previous.length === 0) {
    return {
      cadScore: 0,
      sleepScore: 0,
      mealTimingScore: 0,
      activityScore: 0,
    }
  }

  const recentAvg = {
    cadScore: recent.reduce((sum: number, m: any) => sum + m.cadScore, 0) / recent.length,
    sleepScore: recent.reduce((sum: number, m: any) => sum + m.sleepScore, 0) / recent.length,
    mealTimingScore: recent.reduce((sum: number, m: any) => sum + m.mealTimingScore, 0) / recent.length,
    activityScore: recent.reduce((sum: number, m: any) => sum + m.activityScore, 0) / recent.length,
  }

  const previousAvg = {
    cadScore: previous.reduce((sum: number, m: any) => sum + m.cadScore, 0) / previous.length,
    sleepScore: previous.reduce((sum: number, m: any) => sum + m.sleepScore, 0) / previous.length,
    mealTimingScore: previous.reduce((sum: number, m: any) => sum + m.mealTimingScore, 0) / previous.length,
    activityScore: previous.reduce((sum: number, m: any) => sum + m.activityScore, 0) / previous.length,
  }

  return {
    cadScore: Math.round(recentAvg.cadScore - previousAvg.cadScore),
    sleepScore: Math.round(recentAvg.sleepScore - previousAvg.sleepScore),
    mealTimingScore: Math.round(recentAvg.mealTimingScore - previousAvg.mealTimingScore),
    activityScore: Math.round(recentAvg.activityScore - previousAvg.activityScore),
  }
}