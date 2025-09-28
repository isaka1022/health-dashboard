import { z } from 'zod'

// Schema for validating Google Sheets URLs
export const GoogleSheetUrlSchema = z.object({
  url: z.string().url().refine(
    (url) => url.includes('docs.google.com/spreadsheets'),
    'Must be a valid Google Sheets URL'
  )
})

// Schema for parsed sheet data - flexible to support both English and Japanese columns
export const SheetRowSchema = z.object({
  Date: z.string().optional(),
  // English Sleep data
  'Sleep Duration': z.string().optional(),
  'Sleep Quality': z.string().optional(),
  'Bedtime': z.string().optional(),
  'Wake Time': z.string().optional(),
  // Japanese Sleep data from Apple Health
  '睡眠分析 [Total] (hr)': z.string().optional(),
  '睡眠分析 [Asleep] (hr)': z.string().optional(),
  '睡眠分析 [In Bed] (hr)': z.string().optional(),
  '睡眠分析 [就寝時刻]': z.string().optional(),
  '睡眠分析 [起床時刻]': z.string().optional(),
  // English Meal data
  'First Meal': z.string().optional(),
  'Last Meal': z.string().optional(),
  'Meal Count': z.string().optional(),
  // English Activity data
  'Exercise Duration': z.string().optional(),
  'Exercise Type': z.string().optional(),
  'Steps': z.string().optional(),
  '歩数 (count)': z.string().optional(), // Japanese steps
  'ステップカウント (count)': z.string().optional(), // Japanese step count
  // Heart rate / activity
  'Resting Heart Rate': z.string().optional(),
  'Active Heart Rate': z.string().optional(),
  '心拍数 [resting] (count/min)': z.string().optional(),
  '心拍数 [avg] (count/min)': z.string().optional(),
  '安静時心拍数 (count/min)': z.string().optional(),
  '心拍数 [Avg] (count/min)': z.string().optional(),
  '心拍数 [Min] (count/min)': z.string().optional(),
  '心拍数 [Max] (count/min)': z.string().optional(),
  // Allow any other fields
}).passthrough()

export type SheetRow = z.infer<typeof SheetRowSchema>

export class GoogleSheetsImporter {
  private getCSVUrl(sheetUrl: string): string {
    // Convert Google Sheets URL to CSV export URL
    const sheetId = this.extractSheetId(sheetUrl)
    const gid = this.extractGid(sheetUrl)
    
    // Include gid parameter if present
    const gidParam = gid ? `&gid=${gid}` : ''
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gidParam}`
  }

  private extractSheetId(url: string): string {
    const regex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/
    const match = url.match(regex)
    if (!match) {
      throw new Error('Invalid Google Sheets URL')
    }
    return match[1]
  }

  private extractGid(url: string): string | null {
    // Extract gid from URL parameters
    const gidMatch = url.match(/[?&#]gid=(\d+)/)
    return gidMatch ? gidMatch[1] : null
  }

  async fetchSheetData(sheetUrl: string): Promise<SheetRow[]> {
    try {
      // Validate URL
      GoogleSheetUrlSchema.parse({ url: sheetUrl })
      
      const csvUrl = this.getCSVUrl(sheetUrl)
      console.log('Fetching CSV from:', csvUrl)
      
      const response = await fetch(csvUrl)
      console.log('Response status:', response.status)
      console.log('Response headers:', response.headers)
      
      if (!response.ok) {
        const responseText = await response.text()
        console.error('Response body:', responseText)
        throw new Error(`Failed to fetch sheet data: ${response.status} ${response.statusText}`)
      }
      
      const csvText = await response.text()
      console.log('CSV text length:', csvText.length)
      console.log('CSV preview:', csvText.substring(0, 200))
      
      return this.parseCSV(csvText)
    } catch (error) {
      console.error('Error in fetchSheetData:', error)
      throw new Error(`Error importing sheet data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private parseCSV(csvText: string): SheetRow[] {
    // Check if this is an HTML response (likely a Google login page)
    if (csvText.trim().startsWith('<!DOCTYPE html>') || csvText.trim().startsWith('<html')) {
      throw new Error('Received HTML instead of CSV. The sheet may not be publicly accessible.')
    }
    
    const lines = csvText.split('\n').filter(line => line.trim())
    if (lines.length === 0) {
      throw new Error('Empty CSV data')
    }

    // More robust CSV parsing to handle quoted values
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = []
      let current = ''
      let inQuotes = false
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        const nextChar = line[i + 1]
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            current += '"'
            i++ // Skip the next quote
          } else {
            inQuotes = !inQuotes
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      
      result.push(current.trim())
      return result
    }

    // Parse header row
    const headers = parseCSVLine(lines[0])
    console.log('CSV Headers:', headers)
    
    // Parse data rows
    const rows: SheetRow[] = []
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
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
    
    console.log(`Parsed ${rows.length} valid rows from CSV`)
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

      // Process sleep data - support both English and Japanese columns
      const sleepDuration = row['Sleep Duration'] || row['睡眠分析 [Total] (hr)'] || row['睡眠分析 [Asleep] (hr)']
      const bedtime = row['Bedtime'] || row['睡眠分析 [就寝時刻]']
      const wakeTime = row['Wake Time'] || row['睡眠分析 [起床時刻]']
      
      if (sleepDuration || bedtime || wakeTime) {
        const sleepData: any = {
          date: date.toISOString().split('T')[0],
          duration: sleepDuration ? parseFloat(sleepDuration) : null,
          quality: row['Sleep Quality'] ? parseFloat(row['Sleep Quality']) : null,
          bedtime: bedtime || null,
          wakeTime: wakeTime || null,
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

      // Process activity data - support both English and Japanese columns
      const steps = row['Steps'] || row['歩数 (count)'] || row['ステップカウント (count)']
      const restingHeartRate = row['Resting Heart Rate'] || row['心拍数 [resting] (count/min)'] || row['安静時心拍数 (count/min)']
      const activeHeartRate = row['Active Heart Rate'] || row['心拍数 [avg] (count/min)'] || row['心拍数 [Avg] (count/min)']
      
      if (row['Exercise Duration'] || row['Exercise Type'] || steps) {
        const activityData: any = {
          date: date.toISOString().split('T')[0],
          exerciseDuration: row['Exercise Duration'] ? parseFloat(row['Exercise Duration']) : null,
          exerciseType: row['Exercise Type'] || null,
          steps: steps ? parseInt(steps) : null,
          restingHeartRate: restingHeartRate ? parseFloat(restingHeartRate) : null,
          activeHeartRate: activeHeartRate ? parseFloat(activeHeartRate) : null,
        }
        activities.push(activityData)
      }
    })

    console.log(`Converted data: ${sleepSessions.length} sleep sessions, ${meals.length} meals, ${activities.length} activities`)
    return { meals, sleepSessions, activities }
  }
}