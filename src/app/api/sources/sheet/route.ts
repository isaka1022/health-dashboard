import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { GoogleSheetsImporter, GoogleSheetUrlSchema } from '@/lib/google-sheets'
import { z } from 'zod'

const CreateSheetSourceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  url: z.string().url('Must be a valid URL'),
  userId: z.string(), // In real app, get from session
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, url, userId } = CreateSheetSourceSchema.parse(body)

    // Validate Google Sheets URL
    GoogleSheetUrlSchema.parse({ url })

    // Test import to validate access
    const importer = new GoogleSheetsImporter()
    try {
      const testData = await importer.fetchSheetData(url)
      if (testData.length === 0) {
        return NextResponse.json(
          { error: 'シートにデータが見つかりません。日付列（Date）があることを確認してください。' },
          { status: 400 }
        )
      }
      
      // Check if we can convert any data
      const convertedData = importer.convertToHealthData(testData.slice(0, 10)) // Test first 10 rows
      const hasAnyData = convertedData.sleepSessions.length > 0 || 
                         convertedData.meals.length > 0 || 
                         convertedData.activities.length > 0
      
      if (!hasAnyData) {
        console.log('Sample row data:', testData[0])
        return NextResponse.json(
          { 
            error: 'データ形式が認識できません。以下のカラムのいずれかが必要です：\n' +
                   '• 睡眠: Sleep Duration, 睡眠分析 [Total] (hr)\n' +
                   '• 活動: Steps, 歩数 (count)\n' +
                   '• 心拍数: Heart Rate, 心拍数 [avg] (count/min)',
            hint: 'Apple Healthデータの場合、XMLファイルを直接アップロードすることもできます。'
          },
          { status: 400 }
        )
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Check for specific error types
      if (errorMessage.includes('Failed to fetch')) {
        return NextResponse.json(
          { 
            error: 'シートにアクセスできません。以下を確認してください：\n' +
                   '1. シートの共有設定を「リンクを知っている全員が閲覧可能」に設定\n' +
                   '2. URLに正しいgidパラメータが含まれている（複数シートの場合）\n' +
                   '3. シートが削除されていない',
            details: errorMessage
          },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { 
          error: 'シートの読み込みに失敗しました。共有設定を確認してください。',
          details: errorMessage 
        },
        { status: 400 }
      )
    }

    // Ensure user exists (for demo purposes, create if doesn't exist)
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: `${userId}@example.com`,
        name: 'Demo User',
      }
    })

    // Create the source in database
    const source = await prisma.googleSheetSource.create({
      data: {
        name,
        url,
        userId,
        lastSync: null,
      },
    })

    // Skip import log creation for now due to foreign key constraints
    // TODO: Fix import log foreign key relationships

    return NextResponse.json({ 
      success: true, 
      source: {
        id: source.id,
        name: source.name,
        url: source.url,
        createdAt: source.createdAt,
      }
    })

  } catch (error) {
    console.error('Error creating sheet source:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    // More detailed error information for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : 'No stack trace'
    
    console.error('Detailed error:', {
      message: errorMessage,
      stack: errorStack,
      type: typeof error
    })

    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') // In real app, get from session

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const sources = await prisma.googleSheetSource.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        importLogs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    return NextResponse.json({ sources })

  } catch (error) {
    console.error('Error fetching sheet sources:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}