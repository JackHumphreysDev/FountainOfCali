'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { deletePhoto, listPhotos, preparePhoto, savePhoto, type Photo } from '../lib/photos'
import type { BodyEntry, BodyLogs } from '../lib/phase3'
import type { User } from '@supabase/supabase-js'
import { cloud } from '../lib/cloud'
import { addDays, type weeklySummary } from '../lib/training'
import { validStepTarget } from '../lib/phase3'
import { FoodLog } from './food-log'

type Props = { today: string; entries: BodyLogs; stepTarget: number; onStepTarget: (target: number) => void; calorieTarget?: number; onCalorieTarget: (target?: number) => void; week: ReturnType<typeof weeklySummary>; user: User | null; onSave: (entry: BodyEntry) => void; onDelete: (date: string) => void; onMessage: (message: string) => void }
const metrics = [['weightKg', 'Weight (kg)'], ['waistCm', 'Waist (cm)'], ['hipsCm', 'Hips (cm)'], ['chestCm', 'Chest (cm)'], ['balanceLeftSeconds', 'Left balance (sec)'], ['balanceRightSeconds', 'Right balance (sec)'], ['movementEase', 'Movement ease (1–5)']] as const

export function ProgressView({ today, entries, stepTarget, onStepTarget, calorieTarget, onCalorieTarget, week, user, onSave, onDelete, onMessage }: Props) {
  const [date, setDate] = useState(today)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [photos, setPhotos] = useState<(Photo & { url: string })[]>([])
  const [metric, setMetric] = useState<(typeof metrics)[number][0]>('weightKg')
  const [busy, setBusy] = useState(false)
  const selected = entries[date]
  const days = Array.from({ length: 14 }, (_, index) => addDays(today, index - 13))
  const lastWeek = days.slice(-7).map(day => entries[day]?.steps).filter((value): value is number => value !== undefined)
  const stepAverage = lastWeek.length ? Math.round(lastWeek.reduce((sum, value) => sum + value, 0) / lastWeek.length) : null
  const values = Object.values(entries).filter(entry => entry[metric] !== undefined).sort((a, b) => a.date.localeCompare(b.date))
  const plotted = values.slice(-16)
  const nums = plotted.map(value => value[metric]!)
  const low = nums.length ? Math.min(...nums) : 0
  const high = nums.length ? Math.max(...nums) : 1
  const points = plotted.map((entry, index) => `${20 + index * 320 / Math.max(1, plotted.length - 1)},${110 - (entry[metric]! - low) / (high - low || 1) * 90}`).join(' ')

  useEffect(() => {
    let cancelled = false
    const refresh = () => { void listPhotos().then(items => { if (!cancelled) setPhotos(items.sort((a, b) => b.date.localeCompare(a.date)).map(item => ({ ...item, url: URL.createObjectURL(item.blob) }))) }).catch(() => onMessage('Photos could not be opened on this device.')) }
    refresh()
    window.addEventListener('fountain:photos-changed', refresh)
    return () => { cancelled = true; window.removeEventListener('fountain:photos-changed', refresh) }
  }, [onMessage])
  useEffect(() => () => { photos.forEach(photo => URL.revokeObjectURL(photo.url)) }, [photos])

  const chooseDate = (value: string) => {
    setDate(value)
    setDraft({})
  }
  const save = () => {
    const entry: BodyEntry = { ...selected, date }
    for (const [key] of metrics.slice(0, 4)) {
      const text = draft[key] ?? String(selected?.[key] ?? '')
      if (text === '') { delete entry[key]; continue }
      const number = Number(text)
      if (!Number.isFinite(number) || number <= 0 || number > 500) { onMessage('Measurements must be greater than 0 and below 500.'); return }
      entry[key] = number
    }
    for (const key of ['steps', 'balanceLeftSeconds', 'balanceRightSeconds', 'movementEase'] as const) {
      const text = draft[key] ?? String(selected?.[key] ?? '')
      if (text === '') { delete entry[key]; continue }
      const number = Number(text)
      const max = key === 'steps' ? 100000 : key === 'movementEase' ? 5 : 300
      const min = key === 'movementEase' ? 1 : 0
      if (!Number.isInteger(number) || number < min || number > max) { onMessage(`Enter a valid ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}.`); return }
      entry[key] = number
    }
    entry.notes = (draft.notes ?? selected?.notes ?? '').slice(0, 500)
    if (metrics.every(([key]) => entry[key] === undefined) && entry.steps === undefined && !entry.notes) { onMessage('Add steps, a measurement or a note first.'); return }
    onSave(entry)
    setDraft({})
    onMessage('Progress entry saved.')
  }
  const addPhoto = async (file?: File) => {
    if (!file) return
    setBusy(true)
    try {
      const photo = { id: crypto.randomUUID(), date, blob: await preparePhoto(file) }
      await savePhoto(photo)
      setPhotos(current => [{ ...photo, url: URL.createObjectURL(photo.blob) }, ...current])
      onMessage('Photo saved on this device.')
    } catch (error) { onMessage(error instanceof Error ? error.message : 'Photo could not be saved.') }
    setBusy(false)
  }
  const removePhoto = async (id: string) => {
    if (!window.confirm(user ? 'Delete this progress photo from this device and cloud?' : 'Delete this progress photo from this device?')) return
    try {
      const photo = photos.find(item => item.id === id)
      if (photo && cloud && user) {
        const { error } = await cloud.storage.from('progress-photos').remove([`${user.id}/${photo.date}_${id}.jpg`])
        if (error) throw error
      }
      await deletePhoto(id); setPhotos(current => current.filter(photo => photo.id !== id)); onMessage('Photo deleted.')
    }
    catch { onMessage('Photo could not be deleted.') }
  }

  return <section className="page-panel"><div className="page-title"><span className="small-label">YOUR PROGRESS</span><h1>Body & progress<span className="accent-dot">.</span></h1><p>Track strength, flexibility, mobility and waist change for golf and bouldering. Calories and steps support the fat-loss goal; trends matter more than any one day.</p></div>
    <div className="card steps-card"><div><h2>Daily steps</h2><p>Your current activity is already above 10,000 steps a day. Start with a maintainable target; there is no special step count that guarantees belly or face fat loss.</p></div><label className="field">Daily target<input type="number" min="1000" max="30000" step="500" inputMode="numeric" value={stepTarget} onChange={event => { const value = Number(event.target.value); if (validStepTarget(value)) onStepTarget(value) }} /></label><div className="steps-summary"><strong>{stepAverage?.toLocaleString() ?? '—'}</strong><span>average on {lastWeek.length} logged day{lastWeek.length === 1 ? '' : 's'} in the past week</span></div><div className="steps-chart" role="img" aria-label="Steps logged over the past 14 days against your daily target">{days.map(day => { const steps = entries[day]?.steps; return <div className="step-day" key={day} title={`${day}: ${steps === undefined ? 'not logged' : `${steps.toLocaleString()} steps`}`}><div className="step-track"><span style={{ height: `${steps === undefined ? 0 : Math.min(100, steps / stepTarget * 100)}%` }} /></div><small>{day.slice(-2)}</small></div> })}</div><p className="chart-caption">Past 14 days · each full bar meets your target · blank days are unlogged</p></div>
    <div className="goal-grid"><div className="card"><h2>Waist & body fat</h2><p>Use weekly waist and weight trends to see whether overall fat loss is moving toward your belly goal. Photos can show changes the scale misses; face fat cannot be tracked separately.</p></div><div className="card"><h2>Strength & physique</h2><p>{week.strengthSessionsDone} strength sessions completed this week. Log actual reps and holds in Today to see your strength improve for bouldering and golf.</p></div><div className="card"><h2>Flexibility & mobility</h2><p>{week.stretchMinutes} mobility minutes logged this week. Record balance holds and how easy movement feels after stretching, golf or bouldering.</p></div></div>
    <FoodLog today={today} entries={entries} calorieTarget={calorieTarget} onTarget={onCalorieTarget} onSave={onSave} onMessage={onMessage} />
    <div className="progress-layout"><div className="card"><h2>Log progress</h2><label className="field">Date<input type="date" max={today} value={date} onChange={event => chooseDate(event.target.value)} /></label><label className="field">Steps today<input type="number" min="0" max="100000" step="1" inputMode="numeric" value={draft.steps ?? selected?.steps ?? ''} onChange={event => setDraft(current => ({ ...current, steps: event.target.value }))} /></label><div className="metric-grid">{metrics.map(([key, label]) => <label className="field" key={key}>{label}<input type="number" min={key === 'movementEase' ? 1 : key.startsWith('balance') ? 0 : 0.1} max={key === 'movementEase' ? 5 : key.startsWith('balance') ? 300 : 500} step={key === 'movementEase' || key.startsWith('balance') ? 1 : 0.1} inputMode="decimal" value={draft[key] ?? selected?.[key] ?? ''} onChange={event => setDraft(current => ({ ...current, [key]: event.target.value }))} /></label>)}</div><p className="chart-caption">Balance: seconds standing on each leg; use nearby support and stop if unsteady. Movement ease: 1 = difficult, 5 = easy.</p><label className="field">Notes<textarea maxLength={500} value={draft.notes ?? selected?.notes ?? ''} onChange={event => setDraft(current => ({ ...current, notes: event.target.value }))} /></label><div className="backup-actions"><button className="primary-button" onClick={save}>Save entry</button>{selected && <button className="secondary-button" onClick={() => { if (window.confirm(`Clear steps, measurements and notes for ${date}? Food entries stay saved.`)) onDelete(date) }}>Clear progress entry</button>}</div></div>
      <div className="card"><h2>Trend</h2><label className="field">Metric<select value={metric} onChange={event => setMetric(event.target.value as typeof metric)}>{metrics.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>{plotted.length > 1 ? <><svg viewBox="0 0 360 130" role="img" aria-label={`${metric} trend from ${plotted[0].date} to ${plotted.at(-1)?.date}`} className="trend-chart"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />{points.split(' ').map((point, index) => { const [cx, cy] = point.split(','); return <circle key={index} cx={cx} cy={cy} r="4" fill="currentColor" /> })}</svg><p>{plotted[0][metric]} → {plotted.at(-1)?.[metric]} · {plotted[0].date} to {plotted.at(-1)?.date}</p></> : <p>Add two entries to see a trend.</p>}<div className="entry-list">{Object.values(entries).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map(entry => <button key={entry.date} onClick={() => chooseDate(entry.date)}>{entry.date} · {metrics.filter(([key]) => entry[key] !== undefined).map(([key, label]) => `${label.split(' ')[0]} ${entry[key]}`).join(' · ')}</button>)}</div></div></div>
    <div className="card photo-card"><h2>Progress photos</h2><p>Photos stay on this device until you upload them from Cloud sync.</p><label className="secondary-button photo-upload">{busy ? 'Saving…' : 'Add photo'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} hidden onChange={event => { void addPhoto(event.target.files?.[0]); event.target.value = '' }} /></label><div className="photo-grid">{photos.map(photo => <figure key={photo.id}><Image src={photo.url} alt={`Progress from ${photo.date}`} width={300} height={400} unoptimized /><figcaption>{photo.date} <button onClick={() => void removePhoto(photo.id)} aria-label={`Delete photo from ${photo.date}`}>Delete</button></figcaption></figure>)}</div></div>
  </section>
}
