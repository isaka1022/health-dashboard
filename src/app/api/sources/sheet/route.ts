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
          { error: 'No data found in the sheet' },
          { status: 400 }
        )
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Unable to access the sheet. Please ensure it is publicly viewable.' },
        { status: 400 }
      )
    }

    // Create the source in database
    const source = await prisma.googleSheetSource.create({
      data: {
        name,
        url,
        userId,
        lastSync: null,
      },
    })

    // Create initial import log
    await prisma.importLog.create({
      data: {
        userId,
        sourceType: 'google_sheet',
        sourceId: source.id,
        status: 'pending',
      },
    })

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

    return NextResponse.json(
      { error: 'Internal server error' },
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