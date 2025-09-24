import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AppleHealthParser } from '@/lib/apple-health-parser'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string

    if (!file || !userId) {
      return NextResponse.json(
        { error: 'File and user ID are required' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.name.endsWith('.xml') && !file.name.endsWith('.zip')) {
      return NextResponse.json(
        { error: 'Only XML and ZIP files are supported' },
        { status: 400 }
      )
    }

    // Read file content
    const fileContent = await file.text()
    
    // Create import record
    const appleHealthImport = await prisma.appleHealthImport.create({
      data: {
        userId,
        fileName: file.name,
        fileSize: file.size,
        recordsCount: 0,
      },
    })

    // Create import log
    const importLog = await prisma.importLog.create({
      data: {
        userId,
        sourceType: 'apple_health',
        sourceId: appleHealthImport.id,
        status: 'processing',
      },
    })

    try {
      // Parse Apple Health XML
      const parser = new AppleHealthParser()
      
      if (!parser.validateXMLStructure(fileContent)) {
        throw new Error('Invalid Apple Health XML structure')
      }

      const healthData = await parser.parseXMLFile(fileContent)
      let recordsProcessed = 0

      // Process sleep sessions
      for (const sleepData of healthData.sleepSessions) {
        await prisma.sleepSession.upsert({
          where: {
            userId_startAt: {
              userId,
              startAt: sleepData.startAt,
            },
          },
          update: {
            endAt: sleepData.endAt,
            source: 'apple_health',
            sourceId: appleHealthImport.id,
          },
          create: {
            userId,
            startAt: sleepData.startAt,
            endAt: sleepData.endAt,
            source: 'apple_health',
            sourceId: appleHealthImport.id,
          },
        })
        recordsProcessed++
      }

      // Process activities
      for (const activityData of healthData.activities) {
        if (activityData.durationMin > 0) {
          await prisma.activity.upsert({
            where: {
              userId_startAt: {
                userId,
                startAt: activityData.startAt,
              },
            },
            update: {
              type: activityData.type,
              durationMin: activityData.durationMin,
              calories: activityData.calories,
              source: 'apple_health',
              sourceId: appleHealthImport.id,
            },
            create: {
              userId,
              type: activityData.type,
              startAt: activityData.startAt,
              durationMin: activityData.durationMin,
              calories: activityData.calories,
              source: 'apple_health',
              sourceId: appleHealthImport.id,
            },
          })
          recordsProcessed++
        }
      }

      // Update records count
      await prisma.appleHealthImport.update({
        where: { id: appleHealthImport.id },
        data: { recordsCount: recordsProcessed },
      })

      // Update import log as completed
      await prisma.importLog.update({
        where: { id: importLog.id },
        data: {
          status: 'completed',
          recordsProcessed,
          completedAt: new Date(),
        },
      })

      return NextResponse.json({
        success: true,
        recordsProcessed,
        importId: appleHealthImport.id,
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
    console.error('Error processing Apple Health import:', error)
    return NextResponse.json(
      { error: 'Failed to process Apple Health data' },
      { status: 500 }
    )
  }
}