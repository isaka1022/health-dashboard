import { z } from 'zod'

// Schema for validating Google Sheets URLs
export const GoogleSheetUrlSchema = z.object({
  url: z.string().url().refine(
    (url) => url.includes('docs.google.com/spreadsheets'),
    'Must be a valid Google Sheets URL'
  )
})

// Schema for parsed sheet data
export const SheetRowSchema = z.object({
  Date: z.string().optional(),
  // Sleep data
  'Sleep Duration': z.string().optional(),
  'Sleep Quality': z.string().optional(),
  'Bedtime': z.string().optional(),
  'Wake Time': z.string().optional(),
  // Meal data
  'First Meal': z.string().optional(),
  'Last Meal': z.string().optional(),
  'Meal Count': z.string().optional(),
  // Activity data
  'Exercise Duration': z.string().optional(),
  'Exercise Type': z.string().optional(),
  'Steps': z.string().optional(),
  // Heart rate / activity
  'Resting Heart Rate': z.string().optional(),
  'Active Heart Rate': z.string().optional(),
})

export type SheetRow = z.infer<typeof SheetRowSchema>

export class GoogleSheetsImporter {
  private getCSVUrl(sheetUrl: string): string {
    // Convert Google Sheets URL to CSV export URL
    const sheetId = this.extractSheetId(sheetUrl)
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`
  }

  private extractSheetId(url: string): string {
    const regex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/
    const match = url.match(regex)
    if (!match) {
      throw new Error('Invalid Google Sheets URL')
    }
    return match[1]
  }

  async fetchSheetData(sheetUrl: string): Promise<SheetRow[]> {
    try {
      // Validate URL
      GoogleSheetUrlSchema.parse({ url: sheetUrl })
      
      const csvUrl = this.getCSVUrl(sheetUrl)
      const response = await fetch(csvUrl)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch sheet data: ${response.statusText}`)
      }
      
      const csvText = await response.text()
      return this.parseCSV(csvText)
    } catch (error) {
      throw new Error(`Error importing sheet data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private parseCSV(csvText: string): SheetRow[] {
    const lines = csvText.split('\n').filter(line => line.trim())
    if (lines.length === 0) {
      throw new Error('Empty CSV data')
    }

    // Parse header row
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
    
    // Parse data rows
    const rows: SheetRow[] = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim())
      const row: Record<string, string> = {}
      
      headers.forEach((header, index) => {
        if (values[index]) {
          row[header] = values[index]
        }
      })
      
      // Validate and add row
      try {
        const validatedRow = SheetRowSchema.parse(row)
        rows.push(validatedRow)
      } catch (error) {
        console.warn(`Skipping invalid row ${i}:`, error)
      }
    }
    
    return rows
  }

  convertToHealthData(rows: SheetRow[]) {
    const meals: any[] = []
    const sleepSessions: any[] = []
    const activities: any[] = []

    rows.forEach(row => {
      if (!row.Date) return

      const date = new Date(row.Date)
      if (isNaN(date.getTime())) return

      // Process sleep data
      if (row['Sleep Duration'] || row['Bedtime'] || row['Wake Time']) {
        const sleepData: any = {
          date: date.toISOString().split('T')[0],
          duration: row['Sleep Duration'] ? parseFloat(row['Sleep Duration']) : null,
          quality: row['Sleep Quality'] ? parseFloat(row['Sleep Quality']) : null,
          bedtime: row['Bedtime'] || null,
          wakeTime: row['Wake Time'] || null,
        }
        sleepSessions.push(sleepData)
      }

      // Process meal data
      if (row['First Meal'] || row['Last Meal']) {
        const mealData: any = {
          date: date.toISOString().split('T')[0],
          firstMeal: row['First Meal'] || null,
          lastMeal: row['Last Meal'] || null,
          mealCount: row['Meal Count'] ? parseInt(row['Meal Count']) : null,
        }
        meals.push(mealData)
      }

      // Process activity data
      if (row['Exercise Duration'] || row['Exercise Type'] || row['Steps']) {
        const activityData: any = {
          date: date.toISOString().split('T')[0],
          exerciseDuration: row['Exercise Duration'] ? parseFloat(row['Exercise Duration']) : null,
          exerciseType: row['Exercise Type'] || null,
          steps: row['Steps'] ? parseInt(row['Steps']) : null,
          restingHeartRate: row['Resting Heart Rate'] ? parseFloat(row['Resting Heart Rate']) : null,
          activeHeartRate: row['Active Heart Rate'] ? parseFloat(row['Active Heart Rate']) : null,
        }
        activities.push(activityData)
      }
    })

    return { meals, sleepSessions, activities }
  }
}