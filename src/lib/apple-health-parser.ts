import { XMLParser } from 'fast-xml-parser'

export interface AppleHealthRecord {
  type: string
  value?: string
  unit?: string
  startDate: string
  endDate: string
  sourceName?: string
}

export interface ParsedAppleHealthData {
  sleepSessions: Array<{
    startAt: Date
    endAt: Date
    source: string
  }>
  activities: Array<{
    type: string
    startAt: Date
    durationMin: number
    calories?: number
    source: string
  }>
  heartRate: Array<{
    value: number
    recordedAt: Date
    source: string
  }>
  steps: Array<{
    value: number
    date: string
    source: string
  }>
}

export class AppleHealthParser {
  private parser: XMLParser

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseAttributeValue: true,
    })
  }

  async parseXMLFile(xmlContent: string): Promise<ParsedAppleHealthData> {
    try {
      const parsed = this.parser.parse(xmlContent)
      const healthData = parsed.HealthData || {}
      
      const records: AppleHealthRecord[] = []
      
      // Handle single record or array of records
      if (healthData.Record) {
        const recordArray = Array.isArray(healthData.Record) 
          ? healthData.Record 
          : [healthData.Record]
        
        records.push(...recordArray.map(this.normalizeRecord))
      }

      // Handle workout records
      if (healthData.Workout) {
        const workoutArray = Array.isArray(healthData.Workout)
          ? healthData.Workout
          : [healthData.Workout]
        
        records.push(...workoutArray.map(this.normalizeWorkoutRecord))
      }

      return this.categorizeRecords(records)
    } catch (error) {
      throw new Error(`Failed to parse Apple Health XML: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private normalizeRecord(record: any): AppleHealthRecord {
    return {
      type: record['@_type'] || '',
      value: record['@_value'] || '',
      unit: record['@_unit'] || '',
      startDate: record['@_startDate'] || record['@_creationDate'] || '',
      endDate: record['@_endDate'] || record['@_creationDate'] || '',
      sourceName: record['@_sourceName'] || 'Apple Health',
    }
  }

  private normalizeWorkoutRecord(workout: any): AppleHealthRecord {
    return {
      type: `Workout_${workout['@_workoutActivityType'] || 'Unknown'}`,
      value: workout['@_duration'] || '',
      unit: 'min',
      startDate: workout['@_startDate'] || '',
      endDate: workout['@_endDate'] || '',
      sourceName: workout['@_sourceName'] || 'Apple Health',
    }
  }

  private categorizeRecords(records: AppleHealthRecord[]): ParsedAppleHealthData {
    const result: ParsedAppleHealthData = {
      sleepSessions: [],
      activities: [],
      heartRate: [],
      steps: [],
    }

    records.forEach(record => {
      try {
        const startDate = new Date(record.startDate)
        const endDate = new Date(record.endDate)

        // Sleep data
        if (record.type.includes('SleepAnalysis') || record.type.includes('Sleep')) {
          result.sleepSessions.push({
            startAt: startDate,
            endAt: endDate,
            source: 'apple_health',
          })
        }

        // Activity/Workout data
        else if (record.type.includes('Workout_') || record.type.includes('ActiveEnergyBurned')) {
          const durationMin = record.value ? parseFloat(record.value) : 
                            (endDate.getTime() - startDate.getTime()) / (1000 * 60)
          
          result.activities.push({
            type: record.type.replace('Workout_', '').replace('HKWorkoutActivityType', ''),
            startAt: startDate,
            durationMin: Math.round(durationMin),
            calories: record.type.includes('ActiveEnergyBurned') ? parseFloat(record.value || '0') : undefined,
            source: 'apple_health',
          })
        }

        // Heart rate data
        else if (record.type.includes('HeartRate')) {
          if (record.value) {
            result.heartRate.push({
              value: parseFloat(record.value),
              recordedAt: startDate,
              source: 'apple_health',
            })
          }
        }

        // Steps data
        else if (record.type.includes('StepCount')) {
          if (record.value) {
            result.steps.push({
              value: parseInt(record.value),
              date: startDate.toISOString().split('T')[0],
              source: 'apple_health',
            })
          }
        }
      } catch (error) {
        console.warn('Error processing record:', record, error)
      }
    })

    // Consolidate sleep sessions
    result.sleepSessions = this.consolidateSleepSessions(result.sleepSessions)
    
    // Consolidate daily steps
    result.steps = this.consolidateDailySteps(result.steps)

    return result
  }

  private consolidateSleepSessions(sessions: any[]): any[] {
    // Group sleep sessions by date and merge overlapping sessions
    const grouped = new Map<string, any[]>()
    
    sessions.forEach(session => {
      const date = session.startAt.toISOString().split('T')[0]
      if (!grouped.has(date)) {
        grouped.set(date, [])
      }
      grouped.get(date)!.push(session)
    })

    const consolidated: any[] = []
    
    grouped.forEach(dailySessions => {
      // Sort by start time
      dailySessions.sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
      
      // Merge overlapping or consecutive sessions
      let currentSession = dailySessions[0]
      
      for (let i = 1; i < dailySessions.length; i++) {
        const nextSession = dailySessions[i]
        const gap = nextSession.startAt.getTime() - currentSession.endAt.getTime()
        
        // If gap is less than 30 minutes, merge sessions
        if (gap < 30 * 60 * 1000) {
          currentSession.endAt = new Date(Math.max(currentSession.endAt.getTime(), nextSession.endAt.getTime()))
        } else {
          consolidated.push(currentSession)
          currentSession = nextSession
        }
      }
      
      consolidated.push(currentSession)
    })

    return consolidated
  }

  private consolidateDailySteps(steps: any[]): any[] {
    // Sum steps by date
    const dailySteps = new Map<string, { value: number, source: string }>()
    
    steps.forEach(step => {
      const existing = dailySteps.get(step.date)
      if (existing) {
        existing.value += step.value
      } else {
        dailySteps.set(step.date, { value: step.value, source: step.source })
      }
    })

    return Array.from(dailySteps.entries()).map(([date, data]) => ({
      date,
      value: data.value,
      source: data.source,
    }))
  }

  validateXMLStructure(xmlContent: string): boolean {
    try {
      const parsed = this.parser.parse(xmlContent)
      return !!(parsed.HealthData && (parsed.HealthData.Record || parsed.HealthData.Workout))
    } catch {
      return false
    }
  }
}