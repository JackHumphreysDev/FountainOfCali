import { exerciseById } from '../data/exercises'
import type { PlanItem } from '../data/programme'

export type BodyEntry = { date: string; weightKg?: number; waistCm?: number; hipsCm?: number; chestCm?: number; steps?: number; balanceLeftSeconds?: number; balanceRightSeconds?: number; movementEase?: number; notes?: string }
export type BodyLogs = Record<string, BodyEntry>
export type ProgrammeEdits = Record<string, Partial<PlanItem>>
export const defaultStepTarget = 10000
export function validStepTarget(value: unknown): value is number { return Number.isInteger(value) && Number(value) >= 1000 && Number(value) <= 30000 }

const isDate = (date: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const [year, month, day] = date.split('-').map(Number)
  const parsed = new Date(year, month - 1, day)
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day
}

export function validateBodyLogs(value: unknown): BodyLogs {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid measurements.')
  const result: BodyLogs = {}
  for (const [date, raw] of Object.entries(value)) {
    if (!isDate(date) || !raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid measurement date.')
    const entry = raw as Record<string, unknown>
    for (const key of ['weightKg', 'waistCm', 'hipsCm', 'chestCm']) {
      if (entry[key] !== undefined && (typeof entry[key] !== 'number' || !Number.isFinite(entry[key]) || Number(entry[key]) <= 0 || Number(entry[key]) > 500)) throw new Error(`Invalid ${key} for ${date}.`)
    }
    if (entry.steps !== undefined && (!Number.isInteger(entry.steps) || Number(entry.steps) < 0 || Number(entry.steps) > 100000)) throw new Error(`Invalid steps for ${date}.`)
    for (const key of ['balanceLeftSeconds', 'balanceRightSeconds']) if (entry[key] !== undefined && (!Number.isInteger(entry[key]) || Number(entry[key]) < 0 || Number(entry[key]) > 300)) throw new Error(`Invalid ${key} for ${date}.`)
    if (entry.movementEase !== undefined && (!Number.isInteger(entry.movementEase) || Number(entry.movementEase) < 1 || Number(entry.movementEase) > 5)) throw new Error(`Invalid movement ease for ${date}.`)
    if (entry.notes !== undefined && (typeof entry.notes !== 'string' || entry.notes.length > 500)) throw new Error(`Invalid note for ${date}.`)
    result[date] = { date, weightKg: entry.weightKg as number | undefined, waistCm: entry.waistCm as number | undefined, hipsCm: entry.hipsCm as number | undefined, chestCm: entry.chestCm as number | undefined, steps: entry.steps as number | undefined, balanceLeftSeconds: entry.balanceLeftSeconds as number | undefined, balanceRightSeconds: entry.balanceRightSeconds as number | undefined, movementEase: entry.movementEase as number | undefined, notes: entry.notes as string | undefined }
  }
  return result
}

export function validateEdits(value: unknown): ProgrammeEdits {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid programme edits.')
  const result: ProgrammeEdits = {}
  for (const [key, raw] of Object.entries(value)) {
    if (!/^[0-6]:[^:]+:\d+$/.test(key) || !raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid programme slot.')
    const edit = raw as Record<string, unknown>
    if (edit.exerciseId !== undefined && (typeof edit.exerciseId !== 'string' || !exerciseById[edit.exerciseId])) throw new Error('Unknown exercise in programme.')
    if (edit.sets !== undefined && (!Number.isInteger(edit.sets) || Number(edit.sets) < 0 || Number(edit.sets) > 20)) throw new Error('Invalid set target.')
    if (edit.reps !== undefined && (typeof edit.reps !== 'string' || edit.reps.length > 30)) throw new Error('Invalid rep target.')
    if (edit.holdSeconds !== undefined && (!Number.isInteger(edit.holdSeconds) || Number(edit.holdSeconds) < 0 || Number(edit.holdSeconds) > 3600)) throw new Error('Invalid hold target.')
    result[key] = { exerciseId: edit.exerciseId as string | undefined, sets: edit.sets as number | undefined, reps: edit.reps as string | undefined, holdSeconds: edit.holdSeconds as number | undefined }
  }
  return result
}
