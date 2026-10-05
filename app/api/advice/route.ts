import { createClient } from '@supabase/supabase-js'
import { validateBackup } from '../../../lib/training'

export async function POST(request: Request) {
  const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key, OPENAI_API_KEY: apiKey, OWNER_EMAIL: owner } = process.env
  if (!url || !key || !apiKey || !owner) return new Response('AI advice is not configured.', { status: 503 })
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '')
  if (!token) return new Response('Sign in first.', { status: 401 })
  const client = createClient(url, key, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } })
  const { data: { user }, error: userError } = await client.auth.getUser(token)
  if (userError || !user || user.email?.toLowerCase() !== owner.toLowerCase()) return new Response('Forbidden', { status: 403 })
  const today = new Date().toISOString().slice(0, 10)
  const { data: cached } = await client.from('ai_suggestions').select('advice').eq('user_id', user.id).eq('requested_on', today).maybeSingle()
  if (cached?.advice) return Response.json({ advice: cached.advice, cached: true })
  const { error: reserved } = await client.from('ai_suggestions').insert({ user_id: user.id, requested_on: today, advice: '' })
  if (reserved) return new Response('Advice was already requested today. Try again shortly.', { status: 429 })
  try {
    const body = await request.json()
    const backup = validateBackup(body, today)
    const recent = Object.entries(backup.logs).sort(([a], [b]) => b.localeCompare(a)).slice(0, 14).map(([date, log]) => ({ date, completed: log.completed.length, actuals: log.actuals ?? {} }))
    const weights = Object.values(backup.bodyLogs).filter(entry => entry.weightKg).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4).map(entry => ({ date: entry.date, weightKg: entry.weightKg }))
    const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'gpt-5.6-luna', store: false, max_output_tokens: 350, reasoning: { effort: 'low' }, instructions: 'You are a cautious calisthenics coach. Give 1-3 brief, practical adjustments based only on the supplied training trend. Focus on form, recovery and manageable progression. Do not give medical or nutrition prescriptions. Say when data is insufficient. No markdown headings.', input: JSON.stringify({ recent, weights }) }) })
    if (!response.ok) throw new Error(`Advice service returned ${response.status}.`)
    const result = await response.json()
    const advice = (result.output ?? []).flatMap((item: { content?: { type: string; text?: string }[] }) => item.content ?? []).filter((part: { type: string }) => part.type === 'output_text').map((part: { text?: string }) => part.text ?? '').join('\n').trim()
    if (!advice) throw new Error('Advice service returned no text.')
    const { error } = await client.from('ai_suggestions').update({ advice }).eq('user_id', user.id).eq('requested_on', today)
    if (error) throw error
    return Response.json({ advice, cached: false })
  } catch (error) {
    await client.from('ai_suggestions').delete().eq('user_id', user.id).eq('requested_on', today)
    return new Response(error instanceof Error ? error.message : 'Could not get advice.', { status: 400 })
  }
}
