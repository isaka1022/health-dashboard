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

    // Create import log
    const importLog = await prisma.importLog.create({
      data: {
        userId: source.userId,
        sourceType: 'google_sheet',
        sourceId: source.id,
        status: 'processing',
      },
    })

    try {
      // Fetch and parse sheet data
      const importer = new GoogleSheetsImporter()
      const sheetData = await importer.fetchSheetData(source.url)
      const healthData = importer.convertToHealthData(sheetData)

      let recordsProcessed = 0

      // Process sleep sessions
      for (const sleepData of healthData.sleepSessions) {
        if (sleepData.bedtime && sleepData.wakeTime && sleepData.date) {
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

      // Process activities
      for (const activityData of healthData.activities) {
        if (activityData.exerciseType && activityData.exerciseDuration && activityData.date) {
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
              durationMin: Math.round(activityData.exerciseDuration * 60), // Convert hours to minutes
              source: 'google_sheet',
              sourceId: source.id,
            },
            create: {
              userId: source.userId,
              type: activityData.exerciseType,
              startAt,
              durationMin: Math.round(activityData.exerciseDuration * 60),
              source: 'google_sheet',
              sourceId: source.id,
            },
          })
          recordsProcessed++
        }
      }

      // Update import log as completed
      await prisma.importLog.update({
        where: { id: importLog.id },
        data: {
          status: 'completed',
          recordsProcessed,
          completedAt: new Date(),
        },
      })

      // Update source last sync
      await prisma.googleSheetSource.update({
        where: { id: source.id },
        data: { lastSync: new Date() },
      })

      return NextResponse.json({
        success: true,
        recordsProcessed,
        importLogId: importLog.id,
      })

    } catch (error) {
      // Update import log as failed
      await prisma.importLog.update({
        where: { id: importLog.id },
        data: {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        },
      })

      throw error
    }

  } catch (error) {
    console.error('Error syncing sheet source:', error)
    return NextResponse.json(
      { error: 'Failed to sync sheet data' },
      { status: 500 }
    )
  }
}