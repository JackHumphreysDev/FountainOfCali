import { defaultSports, planFor, type Sport } from '../data/programme'

export type DayLog = {
  sportFlags: Sport[]
  completed: string[]
  sessionTime?: 'morning' | 'late-morning' | 'lunchtime'
  golfStart?: 'afternoon' | 'weekend-midday'
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

export function itemKey(sectionName: string, itemIndex: number, exerciseId: string): string {
  return `${sectionName}:${itemIndex}:${exerciseId}`
}

export function progress(date: string, log: DayLog) {
  const plan = planFor(date, log.sportFlags)
  const keys = plan.sections.flatMap(section => section.optional ? [] : section.items.map((item, itemIndex) => itemKey(section.name, itemIndex, item.exerciseId)))
  const done = keys.filter(key => log.completed.includes(key)).length
  return { done, total: keys.length, rest: Boolean(plan.rest), status: plan.rest && done === 0 ? 'rest' : done === keys.length ? 'complete' : done ? 'partial' : 'missed' }
}

export function validateImport(value: unknown): Logs {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Backup must be an object of dated logs.')
  const logs: Logs = {}
  for (const [date, log] of Object.entries(value)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || typeof log !== 'object' || log === null || Array.isArray(log)) throw new Error('Backup contains an invalid day.')
    const entry = log as Record<string, unknown>
    if (!Array.isArray(entry.sportFlags) || !entry.sportFlags.every(sport => ['football', 'golf', 'bouldering'].includes(String(sport))) || !Array.isArray(entry.completed) || !entry.completed.every(key => typeof key === 'string')) throw new Error(`Invalid log for ${date}.`)
    if (entry.sessionTime !== undefined && !['morning', 'late-morning', 'lunchtime'].includes(String(entry.sessionTime))) throw new Error(`Invalid session time for ${date}.`)
    if (entry.golfStart !== undefined && !['afternoon', 'weekend-midday'].includes(String(entry.golfStart))) throw new Error(`Invalid golf start for ${date}.`)
    logs[date] = entry as DayLog
  }
  return logs
}
