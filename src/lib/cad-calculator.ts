import { prisma } from './prisma'

export interface CADInput {
  userId: string
  date: Date
}

export interface CADResult {
  cadScore: number
  sleepScore: number
  mealTimingScore: number
  activityScore: number
  consistencyScore: number
  rawMetrics: {
    sleepDuration?: number
    sleepEfficiency?: number
    bedtime?: Date
    wakeTime?: Date
    firstMealTime?: Date
    lastMealTime?: Date
    eatingWindowHours?: number
  }
}

export class CADCalculator {
  async calculateCAD(input: CADInput): Promise<CADResult> {
    const { userId, date } = input

    // Get date range for the calculation
    const startDate = new Date(date)
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date(date)
    endDate.setHours(23, 59, 59, 999)

    // Fetch health data for the day
    const [sleepSessions, meals, activities] = await Promise.all([
      prisma.sleepSession.findMany({
        where: {
          userId,
          startAt: {
            gte: new Date(startDate.getTime() - 24 * 60 * 60 * 1000), // Include previous day
            lte: endDate,
          },
        },
        orderBy: { startAt: 'asc' },
      }),
      prisma.meal.findMany({
        where: {
          userId,
          occurredAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { occurredAt: 'asc' },
      }),
      prisma.activity.findMany({
        where: {
          userId,
          startAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { startAt: 'asc' },
      }),
    ])

    // Calculate individual scores
    const sleepScore = this.calculateSleepScore(sleepSessions, date)
    const mealTimingScore = this.calculateMealTimingScore(meals)
    const activityScore = this.calculateActivityScore(activities)
    const consistencyScore = await this.calculateConsistencyScore(userId, date)

    // Calculate overall CAD score (weighted average)
    const cadScore = Math.round(
      sleepScore * 0.4 +
      mealTimingScore * 0.3 +
      activityScore * 0.2 +
      consistencyScore * 0.1
    )

    // Extract raw metrics
    const rawMetrics = this.extractRawMetrics(sleepSessions, meals, date)

    return {
      cadScore,
      sleepScore,
      mealTimingScore,
      activityScore,
      consistencyScore,
      rawMetrics,
    }
  }

  private calculateSleepScore(sleepSessions: any[], targetDate: Date): number {
    // Find the sleep session that covers the target date
    const relevantSleep = sleepSessions.find(session => {
      const sessionDate = new Date(session.startAt).toDateString()
      const targetDateStr = targetDate.toDateString()
      const dayBefore = new Date(targetDate)
      dayBefore.setDate(dayBefore.getDate() - 1)
      const dayBeforeStr = dayBefore.toDateString()
      
      return sessionDate === targetDateStr || sessionDate === dayBeforeStr
    })

    if (!relevantSleep) return 0

    let score = 0
    const duration = (new Date(relevantSleep.endAt).getTime() - new Date(relevantSleep.startAt).getTime()) / (1000 * 60 * 60)

    // Duration score (0-40 points)
    if (duration >= 7 && duration <= 9) {
      score += 40
    } else if (duration >= 6 && duration <= 10) {
      score += 30
    } else if (duration >= 5 && duration <= 11) {
      score += 20
    } else {
      score += 10
    }

    // Timing score (0-30 points) - bedtime between 9 PM and 11 PM is optimal
    const bedtimeHour = new Date(relevantSleep.startAt).getHours()
    if (bedtimeHour >= 21 && bedtimeHour <= 23) {
      score += 30
    } else if (bedtimeHour >= 20 || bedtimeHour <= 1) {
      score += 20
    } else {
      score += 10
    }

    // Quality score (0-30 points)
    if (relevantSleep.quality) {
      score += Math.round((relevantSleep.quality / 10) * 30)
    } else {
      score += 15 // Default if no quality data
    }

    return Math.min(score, 100)
  }

  private calculateMealTimingScore(meals: any[]): number {
    if (meals.length === 0) return 0

    let score = 0
    const sortedMeals = meals.sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime())
    
    const firstMeal = sortedMeals[0]
    const lastMeal = sortedMeals[sortedMeals.length - 1]

    // First meal timing (0-30 points) - optimal between 6-10 AM
    const firstMealHour = new Date(firstMeal.occurredAt).getHours()
    if (firstMealHour >= 6 && firstMealHour <= 10) {
      score += 30
    } else if (firstMealHour >= 5 && firstMealHour <= 12) {
      score += 20
    } else {
      score += 10
    }

    // Eating window (0-40 points) - optimal 10-12 hours
    const eatingWindow = (new Date(lastMeal.occurredAt).getTime() - new Date(firstMeal.occurredAt).getTime()) / (1000 * 60 * 60)
    if (eatingWindow >= 10 && eatingWindow <= 12) {
      score += 40
    } else if (eatingWindow >= 8 && eatingWindow <= 14) {
      score += 30
    } else if (eatingWindow >= 6 && eatingWindow <= 16) {
      score += 20
    } else {
      score += 10
    }

    // Last meal timing (0-30 points) - at least 3 hours before typical bedtime (10 PM)
    const lastMealHour = new Date(lastMeal.occurredAt).getHours()
    if (lastMealHour <= 19) { // 7 PM or earlier
      score += 30
    } else if (lastMealHour <= 20) {
      score += 20
    } else {
      score += 10
    }

    return Math.min(score, 100)
  }

  private calculateActivityScore(activities: any[]): number {
    if (activities.length === 0) return 30 // Neutral score for no recorded activity

    let score = 0
    const totalDuration = activities.reduce((sum, activity) => sum + activity.durationMin, 0)

    // Duration score (0-50 points) - optimal 30-90 minutes per day
    if (totalDuration >= 30 && totalDuration <= 90) {
      score += 50
    } else if (totalDuration >= 15 && totalDuration <= 120) {
      score += 35
    } else if (totalDuration > 0) {
      score += 20
    }

    // Timing score (0-50 points) - morning/afternoon activity is optimal
    const morningActivities = activities.filter(a => {
      const hour = new Date(a.startAt).getHours()
      return hour >= 6 && hour <= 12
    })
    
    const afternoonActivities = activities.filter(a => {
      const hour = new Date(a.startAt).getHours()
      return hour >= 12 && hour <= 18
    })

    if (morningActivities.length > 0 || afternoonActivities.length > 0) {
      score += 50
    } else {
      score += 25
    }

    return Math.min(score, 100)
  }

  private async calculateConsistencyScore(userId: string, date: Date): Promise<number> {
    // Get last 7 days of circadian metrics for consistency calculation
    const endDate = new Date(date)
    const startDate = new Date(date)
    startDate.setDate(startDate.getDate() - 6)

    const metrics = await prisma.circadianMetric.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: { date: 'asc' },
    })

    if (metrics.length < 3) return 50 // Need at least 3 days for consistency

    // Calculate consistency based on bedtime and wake time variance
    const bedtimes = metrics.filter((m: any) => m.bedtime).map((m: any) => new Date(m.bedtime!).getHours())
    const wakeTimes = metrics.filter((m: any) => m.wakeTime).map((m: any) => new Date(m.wakeTime!).getHours())

    let score = 0

    // Bedtime consistency (0-50 points)
    if (bedtimes.length >= 3) {
      const bedtimeVariance = this.calculateVariance(bedtimes)
      if (bedtimeVariance <= 1) score += 50
      else if (bedtimeVariance <= 2) score += 35
      else if (bedtimeVariance <= 3) score += 20
      else score += 10
    } else {
      score += 25
    }

    // Wake time consistency (0-50 points)
    if (wakeTimes.length >= 3) {
      const wakeTimeVariance = this.calculateVariance(wakeTimes)
      if (wakeTimeVariance <= 1) score += 50
      else if (wakeTimeVariance <= 2) score += 35
      else if (wakeTimeVariance <= 3) score += 20
      else score += 10
    } else {
      score += 25
    }

    return Math.min(score, 100)
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2))
    return Math.sqrt(squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length)
  }

  private extractRawMetrics(sleepSessions: any[], meals: any[], date: Date) {
    const relevantSleep = sleepSessions.find(session => {
      const sessionDate = new Date(session.startAt).toDateString()
      const targetDateStr = date.toDateString()
      const dayBefore = new Date(date)
      dayBefore.setDate(dayBefore.getDate() - 1)
      const dayBeforeStr = dayBefore.toDateString()
      
      return sessionDate === targetDateStr || sessionDate === dayBeforeStr
    })

    const sortedMeals = meals.sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime())

    const rawMetrics: any = {}

    if (relevantSleep) {
      const duration = (new Date(relevantSleep.endAt).getTime() - new Date(relevantSleep.startAt).getTime()) / (1000 * 60 * 60)
      rawMetrics.sleepDuration = Math.round(duration * 100) / 100
      rawMetrics.sleepEfficiency = relevantSleep.quality ? relevantSleep.quality * 10 : null
      rawMetrics.bedtime = new Date(relevantSleep.startAt)
      rawMetrics.wakeTime = new Date(relevantSleep.endAt)
    }

    if (sortedMeals.length > 0) {
      rawMetrics.firstMealTime = new Date(sortedMeals[0].occurredAt)
      rawMetrics.lastMealTime = new Date(sortedMeals[sortedMeals.length - 1].occurredAt)
      
      if (sortedMeals.length > 1) {
        const eatingWindow = (new Date(sortedMeals[sortedMeals.length - 1].occurredAt).getTime() - 
                            new Date(sortedMeals[0].occurredAt).getTime()) / (1000 * 60 * 60)
        rawMetrics.eatingWindowHours = Math.round(eatingWindow * 100) / 100
      }
    }

    return rawMetrics
  }

  async saveCADMetrics(userId: string, date: Date, result: CADResult): Promise<void> {
    await prisma.circadianMetric.upsert({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
      update: {
        cadScore: result.cadScore,
        sleepScore: result.sleepScore,
        mealTimingScore: result.mealTimingScore,
        activityScore: result.activityScore,
        consistencyScore: result.consistencyScore,
        sleepDuration: result.rawMetrics.sleepDuration,
        sleepEfficiency: result.rawMetrics.sleepEfficiency,
        bedtime: result.rawMetrics.bedtime,
        wakeTime: result.rawMetrics.wakeTime,
        firstMealTime: result.rawMetrics.firstMealTime,
        lastMealTime: result.rawMetrics.lastMealTime,
        eatingWindowHours: result.rawMetrics.eatingWindowHours,
        calculatedAt: new Date(),
      },
      create: {
        userId,
        date,
        cadScore: result.cadScore,
        sleepScore: result.sleepScore,
        mealTimingScore: result.mealTimingScore,
        activityScore: result.activityScore,
        consistencyScore: result.consistencyScore,
        sleepDuration: result.rawMetrics.sleepDuration,
        sleepEfficiency: result.rawMetrics.sleepEfficiency,
        bedtime: result.rawMetrics.bedtime,
        wakeTime: result.rawMetrics.wakeTime,
        firstMealTime: result.rawMetrics.firstMealTime,
        lastMealTime: result.rawMetrics.lastMealTime,
        eatingWindowHours: result.rawMetrics.eatingWindowHours,
      },
    })
  }
}