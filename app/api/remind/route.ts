import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return new Response('Unauthorized', { status: 401 })
  const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SECRET_KEY: key, NEXT_PUBLIC_VAPID_PUBLIC_KEY: vapidPublic, VAPID_PRIVATE_KEY: vapidPrivate } = process.env
  if (!url || !key || !vapidPublic || !vapidPrivate) return new Response('Not configured', { status: 503 })
  const client = createClient(url, key, { auth: { persistSession: false } })
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await client.from('push_subscriptions').select('endpoint,subscription,last_sent').eq('hour_utc', 9).limit(1000)
  if (error) {
    console.error('Subscription lookup failed', error.code, error.message)
    return new Response(`Subscription lookup failed (${error.code})`, { status: 500 })
  }
  webpush.setVapidDetails('https://fountain-of-cali.vercel.app', vapidPublic, vapidPrivate)
  let sent = 0
  for (const row of data ?? []) {
    if (row.last_sent === today) continue
    try {
      await webpush.sendNotification(row.subscription, JSON.stringify({ title: 'Fountain of Cali', body: 'Your daily practice is ready.', url: '/' }))
      await client.from('push_subscriptions').update({ last_sent: today }).eq('endpoint', row.endpoint)
      sent++
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) await client.from('push_subscriptions').delete().eq('endpoint', row.endpoint)
    }
  }
  return Response.json({ sent })
}
