import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { GoogleSheetsImporter } from '@/lib/google-sheets'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sourceId = params.id

    // Get the sheet source
    const source = await prisma.googleSheetSource.findUnique({
      where: { id: sourceId },
    })

    if (!source) {
      return NextResponse.json(
        { error: 'Sheet source not found' },
        { status: 404 }
      )
    }

    // Skip import log creation due to foreign key constraints
    // Process data directly without logging for now
    let recordsProcessed = 0

    try {
      // Fetch and parse sheet data
      const importer = new GoogleSheetsImporter()
      const sheetData = await importer.fetchSheetData(source.url)
      console.log('Sample sheet data:', sheetData.slice(0, 3))
      
      const healthData = importer.convertToHealthData(sheetData)
      console.log('Converted health data:', {
        sleepSessions: healthData.sleepSessions.length,
        meals: healthData.meals.length,
        activities: healthData.activities.length
      })

      // Process sleep sessions - handle Apple Health data format
      for (const sleepData of healthData.sleepSessions) {
        console.log('Processing sleep data:', sleepData)
        
        if (sleepData.duration && sleepData.date) {
          // For Apple Health data without specific bedtime/wake time, create approximate times
          const date = new Date(sleepData.date)
          const startAt = new Date(date)
          startAt.setHours(22, 0, 0, 0) // Default bedtime 10 PM
          
          const endAt = new Date(startAt)
          endAt.setHours(startAt.getHours() + Math.round(sleepData.duration))

          await prisma.sleepSession.upsert({
            where: {
              userId_startAt: {
                userId: source.userId,
                startAt,
              },
            },
            update: {
              endAt,
              quality: sleepData.quality,
              source: 'google_sheet',
              sourceId: source.id,
            },
            create: {
              userId: source.userId,
              startAt,
              endAt,
              quality: sleepData.quality,
              source: 'google_sheet',
              sourceId: source.id,
            },
          })
          recordsProcessed++
          console.log('Sleep session saved:', { startAt, endAt, duration: sleepData.duration })
        } else if (sleepData.bedtime && sleepData.wakeTime && sleepData.date) {
          // Original logic for explicit bedtime/wake time
          const startAt = new Date(`${sleepData.date}T${sleepData.bedtime}:00`)
          const endAt = new Date(`${sleepData.date}T${sleepData.wakeTime}:00`)
          
          // If wake time is earlier than bedtime, it's next day
          if (endAt < startAt) {
            endAt.setDate(endAt.getDate() + 1)
          }

          await prisma.sleepSession.upsert({
            where: {
              userId_startAt: {
                userId: source.userId,
                startAt,
              },
            },
            update: {
              endAt,
              quality: sleepData.quality,
              source: 'google_sheet',
              sourceId: source.id,
            },
            create: {
              userId: source.userId,
              startAt,
              endAt,
              quality: sleepData.quality,
              source: 'google_sheet',
              sourceId: source.id,
            },
          })
          recordsProcessed++
        }
      }

      // Process meals
      for (const mealData of healthData.meals) {
        if (mealData.firstMeal && mealData.date) {
          const occurredAt = new Date(`${mealData.date}T${mealData.firstMeal}:00`)
          
          await prisma.meal.upsert({
            where: {
              userId_occurredAt: {
                userId: source.userId,
                occurredAt,
              },
            },
            update: {
              label: 'First meal',
              source: 'google_sheet',
              sourceId: source.id,
            },
            create: {
              userId: source.userId,
              occurredAt,
              label: 'First meal',
              source: 'google_sheet',
              sourceId: source.id,
            },
          })
          recordsProcessed++
        }

        if (mealData.lastMeal && mealData.date) {
          const occurredAt = new Date(`${mealData.date}T${mealData.lastMeal}:00`)
          
          await prisma.meal.upsert({
            where: {
              userId_occurredAt: {
                userId: source.userId,
                occurredAt,
              },
            },
            update: {
              label: 'Last meal',
              source: 'google_sheet',
              sourceId: source.id,
            },
            create: {
              userId: source.userId,
              occurredAt,
              label: 'Last meal',
              source: 'google_sheet',
              sourceId: source.id,
            },
          })
          recordsProcessed++
        }
      }

      // Process activities - handle steps data as daily activity
      for (const activityData of healthData.activities) {
        console.log('Processing activity data:', activityData)
        
        if (activityData.steps && activityData.date) {
          // Create a daily steps activity
          const startAt = new Date(`${activityData.date}T12:00:00`)
          
          await prisma.activity.upsert({
            where: {
              userId_startAt: {
                userId: source.userId,
                startAt,
              },
            },
            update: {
              type: 'walking',
              durationMin: 60, // Assume 1 hour of walking for steps
              source: 'google_sheet',
              sourceId: source.id,
            },
            create: {
              userId: source.userId,
              type: 'walking',
              startAt,
              durationMin: 60,
              source: 'google_sheet',
              sourceId: source.id,
            },
          })
          recordsProcessed++
          console.log('Steps activity saved:', { date: activityData.date, steps: activityData.steps })
        } else if (activityData.exerciseType && activityData.exerciseDuration && activityData.date) {
          // Original exercise data logic
          const startAt = new Date(`${activityData.date}T12:00:00`) // Default to noon if no time specified
          
          await prisma.activity.upsert({
            where: {
              userId_startAt: {
                userId: source.userId,
                startAt,
              },
            },
            update: {
              type: activityData.exerciseType,
              durationMin: Math.round(activityData.exerciseDuration), // Already in minutes
              source: 'google_sheet',
              sourceId: source.id,
            },
            create: {
              userId: source.userId,
              type: activityData.exerciseType,
              startAt,
              durationMin: Math.round(activityData.exerciseDuration),
              source: 'google_sheet',
              sourceId: source.id,
            },
          })
          recordsProcessed++
        }
      }

      // Skip import log update

      // Update source last sync
      await prisma.googleSheetSource.update({
        where: { id: source.id },
        data: { lastSync: new Date() },
      })

      return NextResponse.json({
        success: true,
        recordsProcessed,
      })

    } catch (error) {
      // Skip import log update on failure
      console.error('Sync error:', error)
      throw error
    }

  } catch (error) {
    console.error('Error syncing sheet source:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      { 
        error: 'Failed to sync sheet data',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}