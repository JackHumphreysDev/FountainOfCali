'use client'

import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { cloud } from '../lib/cloud'

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
function keyBytes(key: string) { const binary = atob(key.replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(binary, char => char.charCodeAt(0)) }

export function Reminders({ user, onMessage }: { user: User | null; onMessage: (message: string) => void }) {
  const [busy, setBusy] = useState(false)
  const available = Boolean(user && cloud && publicKey && typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window)
  const enable = async () => {
    if (!cloud || !user || !publicKey) return
    setBusy(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') throw new Error('Notifications were not allowed.')
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) })
      const { error } = await cloud.from('push_subscriptions').upsert({ user_id: user.id, endpoint: subscription.endpoint, subscription: subscription.toJSON(), hour_utc: 9 })
      if (error) throw error
      onMessage('Daily reminder enabled for around 09:00 UTC.')
    } catch (error) { onMessage(error instanceof Error ? error.message : 'Could not enable reminder.') }
    setBusy(false)
  }
  const disable = async () => {
    if (!cloud || !user) return
    setBusy(true)
    try {
      const subscription = await (await navigator.serviceWorker.ready).pushManager.getSubscription()
      if (subscription) {
        const { error } = await cloud.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint).eq('user_id', user.id)
        if (error) throw error
        await subscription.unsubscribe()
      }
      onMessage('Reminder disabled.')
    } catch (error) { onMessage(error instanceof Error ? error.message : 'Could not disable reminder.') }
    setBusy(false)
  }
  return <div className="card preferences-card"><h2>Daily reminder</h2><p>Get a training reminder around 09:00 UTC, even when the app is closed. Sign in to enable it. On iPhone, install the app to your Home Screen first.</p><div className="backup-actions"><button className="primary-button" disabled={!available || busy} onClick={() => void enable()}>Enable reminder</button><button className="secondary-button" disabled={!available || busy} onClick={() => void disable()}>Disable</button></div></div>
}
