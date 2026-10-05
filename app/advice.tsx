'use client'

import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { cloud } from '../lib/cloud'
import type { Snapshot } from './cloud-panel'

export function Advice({ user, snapshot, onMessage }: { user: User | null; snapshot: Snapshot; onMessage: (message: string) => void }) {
  const [advice, setAdvice] = useState('')
  const [busy, setBusy] = useState(false)
  const getAdvice = async () => {
    if (!cloud || !user) return
    setBusy(true)
    try {
      const { data } = await cloud.auth.getSession()
      if (!data.session) throw new Error('Sign in to request advice.')
      const response = await fetch('/api/advice', { method: 'POST', headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(snapshot) })
      if (!response.ok) throw new Error(await response.text())
      setAdvice((await response.json()).advice)
    } catch (error) { onMessage(error instanceof Error ? error.message : 'Could not get advice.') }
    setBusy(false)
  }
  return <div className="card preferences-card"><h2>Optional AI adjustment</h2><p>Ask for a brief training suggestion. Clicking sends your recent training totals and weight trend to OpenAI. Photos and notes are never sent. One suggestion is saved per day.</p><button className="secondary-button" disabled={!user || busy} onClick={() => void getAdvice()}>{busy ? 'Thinking…' : 'Suggest an adjustment'}</button>{advice && <p className="advice-result">{advice}</p>}</div>
}
