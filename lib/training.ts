import { defaultSports, phaseFor, phases, planFor, weekday, type Difficulty, type Sport } from '../data/programme'
import { defaultStepTarget, validStepTarget, validateBodyLogs, validateEdits, type BodyLogs, type ProgrammeEdits } from './phase3'

export type DayLog = {
  sportFlags: Sport[]
  completed: string[]
  sessionTime?: 'morning' | 'late-morning' | 'lunchtime'
  golfStart?: 'afternoon' | 'weekend-midday'
  phaseId?: string
  actuals?: Record<string, { reps?: number; seconds?: number }>
  sectionDifficulty?: Record<string, Difficulty>
}
export type Logs = Record<string, DayLog>

export function localDate(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDays(date: string, amount: number): string {
  const [year, month, day] = date.split('-').map(Number)
  return localDate(new Date(year, month - 1, day + amount))
}

export function effectiveLog(logs: Logs, date: string): DayLog {
  return logs[date] ?? { sportFlags: defaultSports(date), completed: [] }
}

export function phaseIdFor(logs: Logs, date: string, startDate: string): string {
  return logs[date]?.phaseId ?? (logs[date] ? 'foundation' : phaseFor(startDate, date).id)
}

export function itemKey(sectionName: string, itemIndex: number, exerciseId: string): string {
  return `${sectionName}:${itemIndex}:${exerciseId}`
}

export function progress(date: string, log: DayLog, phaseId = 'foundation', edits: ProgrammeEdits = {}) {
  const plan = planFor(date, log.sportFlags, phaseId, edits, log.sectionDifficulty)
  const keys = plan.sections.flatMap(section => section.optional ? [] : section.items.map((item, itemIndex) => itemKey(section.name, itemIndex, item.exerciseId)))
  const done = keys.filter(key => log.completed.includes(key)).length
  return { done, total: keys.length, rest: Boolean(plan.rest), status: plan.rest && done === 0 ? 'rest' : done === keys.length ? 'complete' : done ? 'partial' : 'missed' }
}

export function statusFor(logs: Logs, date: string, startDate: string, today: string, edits: ProgrammeEdits = {}) {
  if (date < startDate) return 'not-started'
  if (date > today) return 'future'
  return progress(date, effectiveLog(logs, date), phaseIdFor(logs, date, startDate), edits).status
}

export function streaks(logs: Logs, startDate: string, today: string, edits: ProgrammeEdits = {}) {
  let current = 0
  let longest = 0
  for (let date = startDate; date <= today; date = addDays(date, 1)) {
    const status = statusFor(logs, date, startDate, today, edits)
    if (status === 'complete') current++
    else if (status !== 'rest' && date !== today) current = 0
    longest = Math.max(longest, current)
  }
  return { current, longest }
}

export function weeklySummary(logs: Logs, startDate: string, today: string, edits: ProgrammeEdits = {}) {
  const monday = addDays(today, -((weekday(today) + 6) % 7))
  const first = monday > startDate ? monday : startDate
  let scheduled = 0
  let sessionsDone = 0
  let strengthSessionsDone = 0
  let stretchSeconds = 0
  for (let date = first; date <= today; date = addDays(date, 1)) {
    const log = effectiveLog(logs, date)
    const plan = planFor(date, log.sportFlags, phaseIdFor(logs, date, startDate), edits, log.sectionDifficulty)
    if (!plan.rest) {
      scheduled++
      if (progress(date, log, phaseIdFor(logs, date, startDate), edits).status === 'complete') sessionsDone++
    }
    if (plan.sections.some(section => section.kind === 'strength') && plan.sections.filter(section => section.kind === 'strength').every(section => section.items.every((item, index) => log.completed.includes(itemKey(section.name, index, item.exerciseId))))) strengthSessionsDone++
    for (const section of plan.sections) {
      if (section.kind !== 'mobility' && section.kind !== 'cooldown') continue
      section.items.forEach((item, index) => {
        const key = itemKey(section.name, index, item.exerciseId)
        if (log.completed.includes(key)) stretchSeconds += log.actuals?.[key]?.seconds ?? item.holdSeconds ?? 45
      })
    }
  }
  return { scheduled, sessionsDone, strengthSessionsDone, completionPercent: scheduled ? Math.round(sessionsDone / scheduled * 100) : 0, stretchMinutes: Math.round(stretchSeconds / 60) }
}

function validDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const [year, month, day] = date.split('-').map(Number)
  return localDate(new Date(year, month - 1, day)) === date
}

export function validateImport(value: unknown): Logs {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Backup must be an object of dated logs.')
  const logs: Logs = {}
  for (const [date, log] of Object.entries(value)) {
    if (!validDate(date) || typeof log !== 'object' || log === null || Array.isArray(log)) throw new Error('Backup contains an invalid day.')
    const entry = log as Record<string, unknown>
    if (!Array.isArray(entry.sportFlags) || !entry.sportFlags.every(sport => ['football', 'golf', 'bouldering'].includes(String(sport))) || !Array.isArray(entry.completed) || !entry.completed.every(key => typeof key === 'string')) throw new Error(`Invalid log for ${date}.`)
    if (entry.sessionTime !== undefined && !['morning', 'late-morning', 'lunchtime'].includes(String(entry.sessionTime))) throw new Error(`Invalid session time for ${date}.`)
    if (entry.golfStart !== undefined && !['afternoon', 'weekend-midday'].includes(String(entry.golfStart))) throw new Error(`Invalid golf start for ${date}.`)
    if (entry.phaseId !== undefined && !phases.some(phase => phase.id === entry.phaseId)) throw new Error(`Invalid phase for ${date}.`)
    if (entry.sectionDifficulty !== undefined) {
      if (!entry.sectionDifficulty || typeof entry.sectionDifficulty !== 'object' || Array.isArray(entry.sectionDifficulty)) throw new Error(`Invalid difficulty for ${date}.`)
      for (const [name, level] of Object.entries(entry.sectionDifficulty)) if (!name || name.length > 80 || !['easier', 'planned', 'harder'].includes(String(level))) throw new Error(`Invalid difficulty for ${date}.`)
    }
    if (entry.actuals !== undefined) {
      if (typeof entry.actuals !== 'object' || entry.actuals === null || Array.isArray(entry.actuals)) throw new Error(`Invalid results for ${date}.`)
      for (const result of Object.values(entry.actuals)) {
        if (typeof result !== 'object' || result === null || Array.isArray(result)) throw new Error(`Invalid result for ${date}.`)
        for (const value of Object.values(result)) if (!Number.isInteger(value) || Number(value) < 0 || Number(value) > 9999) throw new Error(`Invalid result for ${date}.`)
      }
    }
    logs[date] = entry as DayLog
  }
  return logs
}

export function validateBackup(value: unknown, fallbackStartDate: string): { startDate: string; logs: Logs; bodyLogs: BodyLogs; edits: ProgrammeEdits; stepTarget: number } {
  if (typeof value === 'object' && value !== null && 'version' in value) {
    const backup = value as Record<string, unknown>
    if (![2, 3, 4].includes(Number(backup.version)) || typeof backup.startDate !== 'string' || !validDate(backup.startDate)) throw new Error('Backup has an invalid version or start date.')
    if (backup.version === 4 && !validStepTarget(backup.stepTarget)) throw new Error('Backup has an invalid step target.')
    return { startDate: backup.startDate, logs: validateImport(backup.logs), bodyLogs: Number(backup.version) >= 3 ? validateBodyLogs(backup.bodyLogs ?? {}) : {}, edits: Number(backup.version) >= 3 ? validateEdits(backup.edits ?? {}) : {}, stepTarget: backup.version === 4 ? Number(backup.stepTarget) : defaultStepTarget }
  }
  const logs = validateImport(value)
  return { startDate: Object.keys(logs).sort()[0] ?? fallbackStartDate, logs, bodyLogs: {}, edits: {}, stepTarget: defaultStepTarget }
}
