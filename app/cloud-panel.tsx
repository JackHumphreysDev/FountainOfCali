'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { cloud } from '../lib/cloud'
import { listPhotos, savePhoto } from '../lib/photos'
import { validateBackup, type Logs } from '../lib/training'
import type { BodyLogs, ProgrammeEdits } from '../lib/phase3'

export type Snapshot = { version: 3; startDate: string; logs: Logs; bodyLogs: BodyLogs; edits: ProgrammeEdits }
type Props = { snapshot: Snapshot; user: User | null; onLoad: (value: Snapshot) => void; onMessage: (message: string) => void }

export function CloudPanel({ snapshot, user, onLoad, onMessage }: Props) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [cloudDate, setCloudDate] = useState('')

  useEffect(() => {
    if (!cloud || !user) return
    void cloud.from('user_data').select('updated_at').eq('user_id', user.id).maybeSingle().then(({ data }) => setCloudDate(data?.updated_at ?? ''))
  }, [user])

  const run = async (action: () => Promise<void>) => { setBusy(true); try { await action() } catch (error) { onMessage(error instanceof Error ? error.message : 'Cloud request failed.') } finally { setBusy(false) } }
  const sendLink = () => run(async () => {
    if (!cloud || !email.includes('@')) throw new Error('Enter a valid email address.')
    const { error } = await cloud.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin, shouldCreateUser: false } })
    if (error) throw error
    onMessage('Sign-in link sent. Open it on this device.')
  })
  const saveCloud = () => run(async () => {
    if (!cloud || !user) return
    const { data: latest, error: lookupError } = await cloud.from('user_data').select('updated_at').eq('user_id', user.id).maybeSingle()
    if (lookupError) throw lookupError
    if ((latest?.updated_at ?? '') !== cloudDate) { setCloudDate(latest?.updated_at ?? ''); throw new Error('Cloud copy changed on another device. Load or export it before saving here.') }
    if (latest && !window.confirm(`Replace the cloud copy last saved ${new Date(latest.updated_at).toLocaleString()} with this device’s data?`)) return
    const now = new Date().toISOString()
    const result = latest ? await cloud.from('user_data').update({ payload: snapshot, updated_at: now }).eq('user_id', user.id).eq('updated_at', latest.updated_at).select('user_id') : await cloud.from('user_data').insert({ user_id: user.id, payload: snapshot, updated_at: now }).select('user_id')
    const { data, error } = result
    if (error) throw error
    if (!data?.length) throw new Error('Cloud copy changed while saving. Reload it and try again.')
    setCloudDate(now)
    onMessage('This device’s training data saved to cloud.')
  })
  const loadCloud = () => run(async () => {
    if (!cloud || !user) return
    const { data, error } = await cloud.from('user_data').select('payload').eq('user_id', user.id).maybeSingle()
    if (error) throw error
    if (!data) throw new Error('There is no cloud copy yet.')
    const restored = validateBackup(data.payload, snapshot.startDate)
    if (!window.confirm(`Replace this device’s training data with the cloud copy (${Object.keys(restored.logs).length} logged days, ${Object.keys(restored.bodyLogs).length} measurements)? Export a backup first if you need both.`)) return
    onLoad({ version: 3, ...restored })
    onMessage('Cloud data loaded onto this device.')
  })
  const uploadPhotos = () => run(async () => {
    if (!cloud || !user) return
    const photos = await listPhotos()
    for (const photo of photos) {
      const { error } = await cloud.storage.from('progress-photos').upload(`${user.id}/${photo.date}_${photo.id}.jpg`, photo.blob, { contentType: 'image/jpeg', upsert: true })
      if (error) throw error
    }
    onMessage(`${photos.length} photos saved to private cloud storage.`)
  })
  const downloadPhotos = () => run(async () => {
    if (!cloud || !user) return
    const { data: files, error } = await cloud.storage.from('progress-photos').list(user.id, { limit: 1000 })
    if (error) throw error
    const existing = new Set((await listPhotos()).map(photo => photo.id))
    let count = 0
    for (const file of files ?? []) {
      const match = /^(\d{4}-\d{2}-\d{2})_([0-9a-f-]+)\.jpg$/.exec(file.name)
      if (!match || existing.has(match[2])) continue
      const { data: blob, error: downloadError } = await cloud.storage.from('progress-photos').download(`${user.id}/${file.name}`)
      if (downloadError) throw downloadError
      await savePhoto({ id: match[2], date: match[1], blob })
      count++
    }
    window.dispatchEvent(new Event('fountain:photos-changed'))
    onMessage(`${count} photos downloaded to this device.`)
  })

  return <div className="card preferences-card"><h2>Cloud sync</h2>{!cloud ? <p>Cloud connection is being configured.</p> : !user ? <><p>Sign in with an email link to sync privately across devices.</p><label className="field">Email<input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} /></label><button className="primary-button" disabled={busy} onClick={() => void sendLink()}>Send sign-in link</button></> : <><p>Owner account: {user.email}. Data stays on this device until you choose to save it.</p>{cloudDate && <p>Cloud copy: {new Date(cloudDate).toLocaleString()}</p>}<div className="backup-actions"><button className="primary-button" disabled={busy} onClick={() => void saveCloud()}>Save data to cloud</button><button className="secondary-button" disabled={busy} onClick={() => void loadCloud()}>Load cloud data</button></div><div className="backup-actions"><button className="secondary-button" disabled={busy} onClick={() => void uploadPhotos()}>Upload photos</button><button className="secondary-button" disabled={busy} onClick={() => void downloadPhotos()}>Download photos</button></div><button className="text-link" onClick={() => void cloud?.auth.signOut()}>Sign out</button></>}</div>
}
