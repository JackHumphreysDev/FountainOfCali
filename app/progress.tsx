'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { deletePhoto, listPhotos, preparePhoto, savePhoto, type Photo } from '../lib/photos'
import type { BodyEntry, BodyLogs } from '../lib/phase3'
import type { User } from '@supabase/supabase-js'
import { cloud } from '../lib/cloud'

type Props = { today: string; entries: BodyLogs; user: User | null; onSave: (entry: BodyEntry) => void; onDelete: (date: string) => void; onMessage: (message: string) => void }
const metrics = [['weightKg', 'Weight (kg)'], ['waistCm', 'Waist (cm)'], ['hipsCm', 'Hips (cm)'], ['chestCm', 'Chest (cm)']] as const

export function ProgressView({ today, entries, user, onSave, onDelete, onMessage }: Props) {
  const [date, setDate] = useState(today)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [photos, setPhotos] = useState<(Photo & { url: string })[]>([])
  const [metric, setMetric] = useState<(typeof metrics)[number][0]>('weightKg')
  const [busy, setBusy] = useState(false)
  const selected = entries[date]
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
    const entry: BodyEntry = { date }
    for (const [key] of metrics) {
      const text = draft[key] ?? String(selected?.[key] ?? '')
      if (text !== '') {
        const number = Number(text)
        if (!Number.isFinite(number) || number <= 0 || number > 500) { onMessage('Measurements must be greater than 0 and below 500.'); return }
        entry[key] = number
      }
    }
    entry.notes = (draft.notes ?? selected?.notes ?? '').slice(0, 500)
    if (metrics.every(([key]) => entry[key] === undefined) && !entry.notes) { onMessage('Add a measurement or note first.'); return }
    onSave(entry)
    setDraft({})
    onMessage('Measurement saved.')
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

  return <section className="page-panel"><div className="page-title"><span className="small-label">YOUR PROGRESS</span><h1>Body & progress<span className="accent-dot">.</span></h1><p>Log a weekly weigh-in and optional measurements. Trends matter more than any one day.</p></div>
    <div className="progress-layout"><div className="card"><h2>New entry</h2><label className="field">Date<input type="date" max={today} value={date} onChange={event => chooseDate(event.target.value)} /></label><div className="metric-grid">{metrics.map(([key, label]) => <label className="field" key={key}>{label}<input type="number" min="0.1" max="500" step="0.1" inputMode="decimal" value={draft[key] ?? selected?.[key] ?? ''} onChange={event => setDraft(current => ({ ...current, [key]: event.target.value }))} /></label>)}</div><label className="field">Notes<textarea maxLength={500} value={draft.notes ?? selected?.notes ?? ''} onChange={event => setDraft(current => ({ ...current, notes: event.target.value }))} /></label><div className="backup-actions"><button className="primary-button" onClick={save}>Save entry</button>{selected && <button className="secondary-button" onClick={() => { if (window.confirm(`Delete measurements for ${date}?`)) onDelete(date) }}>Delete entry</button>}</div></div>
      <div className="card"><h2>Trend</h2><label className="field">Metric<select value={metric} onChange={event => setMetric(event.target.value as typeof metric)}>{metrics.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>{plotted.length > 1 ? <><svg viewBox="0 0 360 130" role="img" aria-label={`${metric} trend from ${plotted[0].date} to ${plotted.at(-1)?.date}`} className="trend-chart"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />{points.split(' ').map((point, index) => { const [cx, cy] = point.split(','); return <circle key={index} cx={cx} cy={cy} r="4" fill="currentColor" /> })}</svg><p>{plotted[0][metric]} → {plotted.at(-1)?.[metric]} · {plotted[0].date} to {plotted.at(-1)?.date}</p></> : <p>Add two entries to see a trend.</p>}<div className="entry-list">{Object.values(entries).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map(entry => <button key={entry.date} onClick={() => chooseDate(entry.date)}>{entry.date} · {metrics.filter(([key]) => entry[key] !== undefined).map(([key, label]) => `${label.split(' ')[0]} ${entry[key]}`).join(' · ')}</button>)}</div></div></div>
    <div className="card photo-card"><h2>Progress photos</h2><p>Photos stay on this device until you upload them from Cloud sync.</p><label className="secondary-button photo-upload">{busy ? 'Saving…' : 'Add photo'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} hidden onChange={event => { void addPhoto(event.target.files?.[0]); event.target.value = '' }} /></label><div className="photo-grid">{photos.map(photo => <figure key={photo.id}><Image src={photo.url} alt={`Progress from ${photo.date}`} width={300} height={400} unoptimized /><figcaption>{photo.date} <button onClick={() => void removePhoto(photo.id)} aria-label={`Delete photo from ${photo.date}`}>Delete</button></figcaption></figure>)}</div></div>
  </section>
}
