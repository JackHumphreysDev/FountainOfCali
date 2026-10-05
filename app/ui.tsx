'use client'

import { useEffect, useRef, useState } from 'react'
import { exerciseById, type Exercise } from '../data/exercises'
import { phaseFor, phases, planFor, programme, sportBlocks, type Sport } from '../data/programme'
import { addDays, effectiveLog, itemKey, localDate, phaseIdFor, progress, statusFor, streaks, validateBackup, validateImport, weeklySummary, type DayLog, type Logs } from '../lib/training'
import { defaultStepTarget, validStepTarget, validateBodyLogs, validateEdits, type BodyLogs, type ProgrammeEdits } from '../lib/phase3'
import { ProgressView } from './progress'
import { CloudPanel, type Snapshot } from './cloud-panel'
import { Reminders } from './reminders'
import { Advice } from './advice'
import { cloud } from '../lib/cloud'
import type { User } from '@supabase/supabase-js'

type Tab = 'today' | 'history' | 'progress' | 'programme' | 'settings'
const storageKey = 'fountain-of-cali:v1'
const startDateKey = 'fountain-of-cali:start-date'
const ownerUserId = '2bf23e90-05ae-4dbe-b8c0-446cb83d816a'
type Timer = { label: string; duration: number; remaining: number; running: boolean; endAt: number }
const sportNames: Record<Sport, string> = { football: 'Football', golf: 'Golf', bouldering: 'Bouldering' }
const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const formatDate = (date: string) => new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${date}T12:00:00`))

export function App() {
  const [today, setToday] = useState('')
  const [selected, setSelected] = useState('')
  const [tab, setTab] = useState<Tab>('today')
  const [logs, setLogs] = useState<Logs>({})
  const [bodyLogs, setBodyLogs] = useState<BodyLogs>({})
  const [edits, setEdits] = useState<ProgrammeEdits>({})
  const [stepTarget, setStepTarget] = useState(defaultStepTarget)
  const [cloudUser, setCloudUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(!cloud)
  const [ready, setReady] = useState(false)
  const [detail, setDetail] = useState<Exercise | null>(null)
  const [month, setMonth] = useState('')
  const [message, setMessage] = useState('')
  const [light, setLight] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [openLog, setOpenLog] = useState('')
  const [editDay, setEditDay] = useState(1)
  const [timer, setTimer] = useState<Timer | null>(null)
  const [offline, setOffline] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  // Initial browser state must be read after hydration so the local date wins over server time.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const now = localDate()
    setToday(now)
    setSelected(now)
    setMonth(now.slice(0, 7))
    try {
      const saved = localStorage.getItem(storageKey)
      const restored = saved ? validateImport(JSON.parse(saved)) : {}
      setLogs(restored)
      setBodyLogs(validateBodyLogs(JSON.parse(localStorage.getItem('fountain-of-cali:body') ?? '{}')))
      setEdits(validateEdits(JSON.parse(localStorage.getItem('fountain-of-cali:edits') ?? '{}')))
      const savedTarget = Number(localStorage.getItem('fountain-of-cali:step-target'))
      if (validStepTarget(savedTarget)) setStepTarget(savedTarget)
      setStartDate(localStorage.getItem(startDateKey) ?? Object.keys(restored).sort()[0] ?? now)
    } catch { setStartDate(now); setMessage('Saved data could not be read. Import a backup if you have one.') }
    setLight(localStorage.getItem('fountain-of-cali:light') === 'true')
    setOffline(!navigator.onLine)
    setReady(true)
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => { if (ready) localStorage.setItem(storageKey, JSON.stringify(logs)) }, [logs, ready])
  useEffect(() => { if (ready) localStorage.setItem('fountain-of-cali:body', JSON.stringify(bodyLogs)) }, [bodyLogs, ready])
  useEffect(() => { if (ready) localStorage.setItem('fountain-of-cali:edits', JSON.stringify(edits)) }, [edits, ready])
  useEffect(() => { if (ready) localStorage.setItem('fountain-of-cali:step-target', String(stepTarget)) }, [stepTarget, ready])
  useEffect(() => { if (ready && startDate) localStorage.setItem(startDateKey, startDate) }, [ready, startDate])
  useEffect(() => { if (ready) localStorage.setItem('fountain-of-cali:light', String(light)) }, [light, ready])
  useEffect(() => {
    if (!cloud) return
    void cloud.auth.getSession().then(({ data }) => { setCloudUser(data.session?.user ?? null); setAuthReady(true) }).catch(() => setAuthReady(true))
    const { data } = cloud.auth.onAuthStateChange((_event, session) => setCloudUser(session?.user ?? null))
    return () => data.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    const onConnection = () => setOffline(!navigator.onLine)
    window.addEventListener('online', onConnection)
    window.addEventListener('offline', onConnection)
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js')
    return () => { window.removeEventListener('online', onConnection); window.removeEventListener('offline', onConnection) }
  }, [])
  useEffect(() => {
    if (!timer?.running) return
    const tick = window.setInterval(() => setTimer(current => {
      if (!current?.running) return current
      const remaining = Math.max(0, Math.ceil((current.endAt - Date.now()) / 1000))
      return remaining === current.remaining ? current : { ...current, remaining, running: remaining > 0 }
    }), 250)
    return () => window.clearInterval(tick)
  }, [timer?.running])
  useEffect(() => {
    if (!detail) return
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setDetail(null) }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [detail])

  if (!ready || !today || !selected || !startDate) return <main className="loading">Loading your plan…</main>
  if (process.env.NODE_ENV === 'production' && (!cloud || !authReady)) return <main className="loading">{cloud ? 'Checking sign-in…' : 'Sign-in is unavailable.'}</main>
  if (process.env.NODE_ENV === 'production' && cloudUser?.id !== ownerUserId) return <div className="app"><main className="login-shell"><div className="brand"><span className="brand-mark">✳</span><span>FOUNTAIN<span className="brand-sub"> OF CALI</span></span></div><h1>Owner sign-in</h1><p>This private training app is available to its owner only.</p><CloudPanel snapshot={{ version: 4, startDate, logs, bodyLogs, edits, stepTarget }} user={null} onLoad={() => {}} onMessage={setMessage} />{message && <p role="status">{message}</p>}</main></div>

  const log = effectiveLog(logs, selected)
  const phaseId = phaseIdFor(logs, selected, startDate)
  const phase = phases.find(value => value.id === phaseId) ?? phases[0]
  const currentPhase = phaseFor(startDate, today)
  const plan = planFor(selected, log.sportFlags, phaseId, edits, log.sectionDifficulty)
  const tally = progress(selected, log, phaseId, edits)
  const streak = streaks(logs, startDate, today, edits)
  const week = weeklySummary(logs, startDate, today, edits)
  const isFuture = selected > today
  const update = (change: Partial<DayLog>) => setLogs(current => ({ ...current, [selected]: { ...effectiveLog(current, selected), phaseId: phaseIdFor(current, selected, startDate), ...change } }))
  const setResult = (key: string, field: 'reps' | 'seconds', value: string) => {
    if (value !== '' && (!/^\d+$/.test(value) || Number(value) > 9999)) return
    const result = { ...log.actuals?.[key], [field]: value === '' ? undefined : Number(value) }
    update({ actuals: { ...log.actuals, [key]: result } })
  }
  // Called only by a click handler; the clock must start at the user's tap.
  // eslint-disable-next-line react-hooks/purity
  const startTimer = (label: string, duration: number) => setTimer({ label, duration, remaining: duration, running: true, endAt: Date.now() + duration * 1000 })
  const switchSport = (sport: Sport) => {
    const sportFlags = log.sportFlags.includes(sport) ? log.sportFlags.filter(value => value !== sport) : [...log.sportFlags, sport]
    update({ sportFlags })
  }
  const toggle = (key: string) => update({ completed: log.completed.includes(key) ? log.completed.filter(value => value !== key) : [...log.completed, key] })
  const chooseTab = (next: Tab) => { setTab(next); if (next === 'today') setSelected(today) }
  const monthDate = new Date(Number(month.slice(0, 4)), Number(month.slice(5)) - 1, 1)
  const monthLength = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate()
  const calendarOffset = (monthDate.getDay() + 6) % 7
  const monthName = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(monthDate)
  const monthDates = Array.from({ length: monthLength }, (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`)
  const monthComplete = monthDates.filter(date => statusFor(logs, date, startDate, today, edits) === 'complete').length
  const exportData = () => {
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([JSON.stringify({ version: 4, startDate, logs, bodyLogs, edits, stepTarget }, null, 2)], { type: 'application/json' }))
    link.download = `fountain-of-cali-backup-${today}.json`
    link.click()
    URL.revokeObjectURL(link.href)
  }
  const importData = async (file?: File) => {
    if (!file) return
    try {
      const imported = validateBackup(JSON.parse(await file.text()), today)
      if (!window.confirm(`Replace your current logs with ${Object.keys(imported.logs).length} days from this backup?`)) return
      setLogs(imported.logs)
      setBodyLogs(imported.bodyLogs)
      setEdits(imported.edits)
      setStepTarget(imported.stepTarget)
      setStartDate(imported.startDate)
      setMessage('Backup imported.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Invalid backup.') }
    if (importRef.current) importRef.current.value = ''
  }
  const loadSnapshot = (value: Snapshot) => { setLogs(value.logs); setBodyLogs(value.bodyLogs); setEdits(value.edits); setStepTarget(value.stepTarget); setStartDate(value.startDate) }

  return <div className={light ? 'app light' : 'app'}>
    <div className="shell">
      <header className="topbar">
        <button className="brand" onClick={() => chooseTab('today')} aria-label="Go to today"><span className="brand-mark">✳</span><span>FOUNTAIN<span className="brand-sub"> OF CALI</span></span></button>
        <span className="top-date">{formatDate(today)}</span>
        <button className="theme-button" onClick={() => setLight(value => !value)} aria-label={`Switch to ${light ? 'dark' : 'light'} mode`}>{light ? '☾' : '☀'}</button>
      </header>

      <main>
        {tab === 'today' && <>
          <section className="hero">
            <div className="eyebrow"><span className="eyebrow-line" /> DAILY PRACTICE <span className="phase-pill">{phase.name}</span></div>
            <div className="hero-heading"><div><p className="hero-date">{formatDate(selected)}</p><h1>{plan.title}<span className="accent-dot">.</span></h1><p className="hero-subtitle">{plan.subtitle}</p></div><div className={`status-stamp ${tally.status}`}>{isFuture ? 'UPCOMING' : selected < startDate ? 'NOT STARTED' : tally.status.toUpperCase()}</div></div>
            <div className="progress-wrap"><div className="progress-copy"><strong>{tally.done} <span>/ {tally.total}</span></strong><span>movements complete</span></div><div className="progress-track" role="progressbar" aria-valuenow={tally.done} aria-valuemin={0} aria-valuemax={tally.total} aria-label="Daily progress"><span style={{ width: `${tally.total ? tally.done / tally.total * 100 : 0}%` }} /></div></div>
          </section>

          <div className="content-grid"><div className="main-column">
            <div className="section-head"><div><span className="small-label">YOUR SESSION</span><h2>Today’s plan</h2></div><span className="duration">{plan.rest ? '15–20' : selected === today && (log.sportFlags.includes('football')) ? '20–25' : '40–55'} min</span></div>
            {plan.sections.map((section) => <section className={`plan-section ${section.kind}`} key={section.name}>
              <div className="plan-section-header"><span className="section-icon">{section.kind === 'strength' ? '↗' : section.kind === 'mobility' ? '◌' : section.kind === 'cooldown' ? '☾' : '✳'}</span><div><h3>{section.name}</h3><p>{section.optional ? 'Optional · after activity' : section.kind === 'strength' ? 'Controlled reps. Rest between sets.' : section.kind === 'warmup' ? 'Ease into the session.' : 'Move gently. Never stretch into sharp pain.'}</p></div><label className="difficulty-control">Difficulty<select aria-label={`${section.name} difficulty`} value={log.sectionDifficulty?.[section.name] ?? 'planned'} onChange={event => update({ sectionDifficulty: { ...log.sectionDifficulty, [section.name]: event.target.value as 'easier' | 'planned' | 'harder' } })}><option value="easier">Easier</option><option value="planned">Planned</option><option value="harder">Harder</option></select></label></div>
              <div className="items">{section.items.map((item, index) => {
                const exercise = exerciseById[item.exerciseId]
                const key = itemKey(section.name, index, item.exerciseId)
                const done = log.completed.includes(key)
                const target = [item.sets ? `${item.sets} ×` : '', item.reps ?? (item.holdSeconds ? `${item.holdSeconds}s hold` : '')].filter(Boolean).join(' ')
                return <div className={`exercise-entry ${done ? 'done' : ''}`} key={key}><div className="exercise-row">
                  <button className="check" type="button" role="checkbox" aria-checked={done} aria-label={`${done ? 'Mark incomplete' : 'Mark complete'}: ${exercise.name}`} onClick={() => toggle(key)} disabled={isFuture}>{done ? '✓' : ''}</button>
                  <button className="exercise-info" onClick={() => setDetail(exercise)}><span className="exercise-thumb" aria-hidden="true" style={offline ? undefined : { backgroundImage: `url(https://i.ytimg.com/vi/${exercise.media[0].src}/mqdefault.jpg)` }} /><span className="exercise-copy"><span className="exercise-name">{exercise.name}</span><span className="exercise-meta">{target}{item.restSeconds ? `  ·  ${item.restSeconds}s rest` : ''}</span></span></button>
                  <button className="view-exercise" onClick={() => setDetail(exercise)} aria-label={`View ${exercise.name} guidance`}>↗</button>
                </div><div className="exercise-tools">
                  <button className="tool-button" onClick={() => setOpenLog(openLog === key ? '' : key)} aria-expanded={openLog === key}> {log.actuals?.[key]?.reps !== undefined || log.actuals?.[key]?.seconds !== undefined ? 'Edit result' : 'Log result'} </button>
                  {item.holdSeconds && <button className="tool-button" onClick={() => startTimer(`${exercise.name} hold`, item.holdSeconds!)}>▶ {item.holdSeconds}s hold</button>}
                  {item.restSeconds && <button className="tool-button" onClick={() => startTimer(`${exercise.name} rest`, item.restSeconds!)}>⏱ {item.restSeconds}s rest</button>}
                  {openLog === key && <div className="result-fields">
                    {item.reps && <label>Total reps<input type="number" min="0" max="9999" inputMode="numeric" value={log.actuals?.[key]?.reps ?? ''} onChange={event => setResult(key, 'reps', event.target.value)} /></label>}
                    {item.holdSeconds && <label>Total hold seconds<input type="number" min="0" max="9999" inputMode="numeric" value={log.actuals?.[key]?.seconds ?? ''} onChange={event => setResult(key, 'seconds', event.target.value)} /></label>}
                    {!item.reps && !item.holdSeconds && <label>Total seconds<input type="number" min="0" max="9999" inputMode="numeric" value={log.actuals?.[key]?.seconds ?? ''} onChange={event => setResult(key, 'seconds', event.target.value)} /></label>}
                  </div>}
                </div></div>
              })}</div>
            </section>)}
          </div>

          <aside className="side-column">
            <section className="card sport-card"><span className="small-label">DAY SETUP</span><h3>What’s on today?</h3><p>Sport adds a primer and optional cooldown. Golf and bouldering keep strength lighter.</p><div className="sport-options">{(['football', 'golf', 'bouldering'] as Sport[]).map(sport => <button key={sport} className={log.sportFlags.includes(sport) ? 'sport-chip active' : 'sport-chip'} onClick={() => switchSport(sport)} aria-pressed={log.sportFlags.includes(sport)}>{sportNames[sport]}</button>)}</div>{log.sportFlags.map(sport => <p className="sport-note" key={sport}>↳ {sportBlocks[sport].note}</p>)}</section>
            <section className="card timing-card"><span className="small-label">FLEXIBLE TIMING</span><h3>Train when it fits.</h3><p>Your checklist stays the same whether you start early or near lunch.</p><label htmlFor="session-time">Session time</label><select id="session-time" value={log.sessionTime ?? ''} onChange={event => update({ sessionTime: event.target.value as DayLog['sessionTime'] || undefined })}><option value="">Not set</option><option value="morning">Morning</option><option value="late-morning">Late morning</option><option value="lunchtime">Lunchtime</option></select>{log.sportFlags.includes('golf') && <><label htmlFor="golf-start">Golf start</label><select id="golf-start" value={log.golfStart ?? ''} onChange={event => update({ golfStart: event.target.value as DayLog['golfStart'] || undefined })}><option value="">Not set</option><option value="afternoon">Afternoon</option><option value="weekend-midday">Weekend midday</option></select></>}</section>
            <div className="tip-card"><span>✦</span><p>Build the habit first. Good form and recovery beat chasing extra reps.</p></div>
          </aside></div>
        </>}

        {tab === 'history' && <section className="page-panel"><div className="page-title"><span className="small-label">YOUR CONSISTENCY</span><h1>History<span className="accent-dot">.</span></h1><p>Look back at the work you’ve put in, one day at a time.</p></div><div className="summary-grid"><div className="card summary-card"><span className="small-label">CURRENT STREAK</span><strong>{streak.current}</strong><span>days · longest {streak.longest}</span></div><div className="card summary-card"><span className="small-label">THIS WEEK</span><strong>{week.completionPercent}%</strong><span>{week.sessionsDone} / {week.scheduled} sessions</span></div><div className="card summary-card"><span className="small-label">MOBILITY TIME</span><strong>{week.stretchMinutes}</strong><span>minutes this week</span></div></div><div className="history-grid"><div className="card calendar-card"><div className="calendar-top"><div><h2>{monthName}</h2><p><strong>{monthComplete}</strong> completed days this month</p></div><div className="calendar-arrows"><button onClick={() => setMonth(localDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1)).slice(0, 7))} aria-label="Previous month">‹</button><button onClick={() => setMonth(localDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)).slice(0, 7))} aria-label="Next month">›</button></div></div><div className="calendar-grid">{['M','T','W','T','F','S','S'].map((day, index) => <span className="calendar-weekday" key={index}>{day}</span>)}{Array.from({ length: calendarOffset }, (_, index) => <span key={`blank-${index}`} />)}{monthDates.map(date => { const status = statusFor(logs, date, startDate, today, edits); return <button key={date} className={`calendar-day ${status} ${selected === date ? 'selected' : ''}`} onClick={() => setSelected(date)} aria-label={`${formatDate(date)}: ${status}`} aria-current={date === today ? 'date' : undefined}>{Number(date.slice(-2))}</button> })}</div><div className="calendar-legend"><span><i className="legend-complete" /> Complete</span><span><i className="legend-partial" /> Partial</span><span><i className="legend-missed" /> Missed</span><span><i className="legend-rest" /> Rest</span></div></div><div className="card history-detail"><span className="small-label">DAY DETAIL</span><h2>{formatDate(selected)}</h2><p>{plan.title} · {tally.done} / {tally.total} done</p><div className={`history-status ${tally.status}`}>{statusFor(logs, selected, startDate, today, edits).replace('-', ' ')}</div>{plan.sections.map(section => <div className="history-section" key={section.name}><h3>{section.name}</h3>{section.items.map((item, index) => <div key={index} className="history-item"><span className={log.completed.includes(itemKey(section.name, index, item.exerciseId)) ? 'history-tick yes' : 'history-tick'}>{log.completed.includes(itemKey(section.name, index, item.exerciseId)) ? '✓' : '·'}</span><span>{exerciseById[item.exerciseId].name}{log.actuals?.[itemKey(section.name, index, item.exerciseId)]?.reps !== undefined && ` · ${log.actuals[itemKey(section.name, index, item.exerciseId)].reps} reps`}{log.actuals?.[itemKey(section.name, index, item.exerciseId)]?.seconds !== undefined && ` · ${log.actuals[itemKey(section.name, index, item.exerciseId)].seconds}s`}</span></div>)}</div>)}<button className="text-link" onClick={() => setTab('today')}>Open this day’s checklist →</button></div></div></section>}

        {tab === 'progress' && <ProgressView today={today} entries={bodyLogs} stepTarget={stepTarget} onStepTarget={setStepTarget} week={week} user={cloudUser} onSave={entry => setBodyLogs(current => ({ ...current, [entry.date]: entry }))} onDelete={date => setBodyLogs(current => { const next = { ...current }; delete next[date]; return next })} onMessage={setMessage} />}

        {tab === 'programme' && <section className="page-panel"><div className="page-title"><span className="small-label">THE ROUTINE</span><h1>Programme<span className="accent-dot">.</span></h1><p>{programme.description}</p></div><div className="programme-heading"><div><span className="small-label">CURRENT PHASE</span><h2>{currentPhase.name}</h2></div><span>Repeat weekly</span></div><div className="phase-roadmap">{phases.map(value => <div className={`card phase-card ${value.id === currentPhase.id ? 'active' : ''}`} key={value.id}><span className="small-label">{value.id === currentPhase.id ? 'NOW' : 'PHASE'}</span><h3>{value.name}</h3><p>{value.description}</p></div>)}</div><div className="week-cards">{programme.days.map(day => <button className="week-card" key={day.weekday} onClick={() => { const date = addDays(today, (day.weekday - new Date(`${today}T12:00:00`).getDay() + 7) % 7); setSelected(date); setTab('today') }}><span>{weekdays[day.weekday].slice(0, 3).toUpperCase()}</span><h3>{day.title}</h3><p>{day.subtitle}</p><small>{day.sections.reduce((sum, section) => sum + section.items.length, 0)} movements ↗</small></button>)}</div><div className="card programme-editor"><h2>Edit your weekly plan</h2><p>Changes apply to this weekday from now on. Exercise swaps can change how older checklists display.</p><label className="field">Weekday<select value={editDay} onChange={event => setEditDay(Number(event.target.value))}>{weekdays.map((name, index) => <option value={index} key={name}>{name}</option>)}</select></label>{programme.days[editDay].sections.map(section => <div className="edit-section" key={section.name}><h3>{section.name}</h3>{section.items.map((item, index) => { const key = `${editDay}:${section.name}:${index}`; const edit = edits[key] ?? {}; const change = (field: 'exerciseId' | 'sets' | 'reps' | 'holdSeconds', value: string) => { if ((field === 'sets' || field === 'holdSeconds') && value && (!/^\d+$/.test(value) || Number(value) > (field === 'sets' ? 20 : 3600))) return; setEdits(current => ({ ...current, [key]: field === 'exerciseId' ? { ...current[key], exerciseId: value, reps: '', holdSeconds: 0 } : { ...current[key], [field]: field === 'reps' ? value : value ? Number(value) : 0 } })) };  return <div className="edit-row" key={key}><label className="field">Exercise<select value={edit.exerciseId ?? item.exerciseId} onChange={event => change('exerciseId', event.target.value)}>{Object.values(exerciseById).map(exercise => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}</select></label><label className="field">Sets<input type="number" min="1" max="20" value={edit.sets === 0 ? '' : edit.sets ?? item.sets ?? ''} onChange={event => change('sets', event.target.value)} /></label><label className="field">Reps<input maxLength={30} value={edit.reps ?? item.reps ?? ''} onChange={event => change('reps', event.target.value)} /></label><label className="field">Hold sec<input type="number" min="1" max="3600" value={edit.holdSeconds === 0 ? '' : edit.holdSeconds ?? item.holdSeconds ?? ''} onChange={event => change('holdSeconds', event.target.value)} /></label><button className="tool-button" onClick={() => setEdits(current => { const next = { ...current }; delete next[key]; return next })}>Reset</button></div> })}</div>)}</div><div className="programme-note"><strong>Progress at your pace.</strong> Start with the listed regressions. Add reps or time only when every set feels controlled. Football stays light on Monday and Tuesday; Sunday is recovery.</div></section>}

        {tab === 'settings' && <section className="page-panel settings-page"><div className="page-title"><span className="small-label">YOUR DATA</span><h1>Settings<span className="accent-dot">.</span></h1><p>Keep a copy of your training history.</p></div><CloudPanel snapshot={{ version: 4, startDate, logs, bodyLogs, edits, stepTarget }} onLoad={loadSnapshot} onMessage={setMessage} user={cloudUser} /><Reminders user={cloudUser} onMessage={setMessage} /><Advice user={cloudUser} snapshot={{ version: 4, startDate, logs, bodyLogs, edits, stepTarget }} onMessage={setMessage} /><div className="card preferences-card"><h2>Programme start</h2><p>Phases advance automatically every four weeks. Changing this date keeps days already logged in their original phase.</p><label htmlFor="programme-start">Start date</label><input id="programme-start" type="date" max={today} value={startDate} onChange={event => { if (event.target.value) setStartDate(event.target.value) }} /></div><div className="card backup-card"><div className="backup-icon">⇩</div><div><h2>Back up your progress</h2><p>JSON includes logs, measurements and programme edits. Photos are backed up separately from Cloud sync.</p><div className="backup-actions"><button className="primary-button" onClick={exportData}>Export JSON</button><button className="secondary-button" onClick={() => importRef.current?.click()}>Import JSON</button><input ref={importRef} type="file" accept="application/json,.json" hidden onChange={event => void importData(event.target.files?.[0])} /></div></div></div><div className="card preferences-card"><h2>Install on your phone</h2><p>Use your browser’s Add to Home Screen or Install app menu. After your first online visit, the plan and saved logs remain available offline. Exercise videos need a connection.</p></div><div className="card preferences-card"><h2>Appearance</h2><p>Choose the theme that feels right for your session.</p><button className="secondary-button" onClick={() => setLight(value => !value)}>{light ? 'Use dark mode' : 'Use light mode'}</button></div><p className="safety-note">Stretch only to mild tension. Stop if anything hurts sharply; seek professional advice if a problem persists.</p></section>}
      </main>

      <nav className="bottom-nav" aria-label="Main navigation">{([['today', '◉', 'Today'], ['history', '▦', 'History'], ['progress', '◌', 'Progress'], ['programme', '▤', 'Programme'], ['settings', '⚙', 'Settings']] as const).map(([key, icon, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => chooseTab(key)} aria-current={tab === key ? 'page' : undefined}><span className="nav-icon">{icon}</span><span>{label}</span></button>)}</nav>
    </div>

    {timer && <div className="timer-panel" role="timer" aria-label={timer.label}><div><span className="small-label">{timer.label}</span><strong>{Math.floor(timer.remaining / 60)}:{String(timer.remaining % 60).padStart(2, '0')}</strong></div><div className="timer-actions"><button onClick={() => setTimer(current => current && (current.running ? { ...current, running: false } : { ...current, running: true, endAt: Date.now() + current.remaining * 1000 }))}>{timer.running ? 'Pause' : 'Resume'}</button><button onClick={() => setTimer(current => current && { ...current, remaining: current.duration, running: false })}>Reset</button><button onClick={() => setTimer(null)} aria-label="Close timer">×</button></div></div>}
    {message && <div className="toast" role="status">{message}<button onClick={() => setMessage('')} aria-label="Dismiss message">×</button></div>}
    {detail && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setDetail(null) }}><section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title"><button ref={closeRef} className="modal-close" onClick={() => setDetail(null)} aria-label="Close exercise guide">×</button><span className="small-label">MOVEMENT GUIDE</span><h2 id="detail-title">{detail.name}</h2><p className="detail-muscles">{detail.muscles.join(' · ')}</p><div className="video-frame">{offline ? <p className="offline-video">Video needs a connection. Follow the cues below while offline.</p> : <iframe src={`https://www.youtube-nocookie.com/embed/${detail.media[0].src}`} title={detail.media[0].label} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen loading="lazy" />}</div><p className="video-label">{detail.media[0].label} · <a href={`https://www.youtube.com/watch?v=${detail.media[0].src}`} target="_blank" rel="noreferrer">Open on YouTube ↗</a></p><div className="guide-grid"><div><h3>How to do it</h3><ul>{detail.cues.map(cue => <li key={cue}>{cue}</li>)}</ul></div><div><h3>Watch out for</h3><ul>{detail.commonMistakes.map(mistake => <li key={mistake}>{mistake}</li>)}</ul>{detail.tallPersonNotes && <p className="tall-tip"><strong>For taller bodies:</strong> {detail.tallPersonNotes}</p>}</div></div>{(detail.easier || detail.harder) && <div className="variations">{detail.easier && <button onClick={() => setDetail(exerciseById[detail.easier!])}>← Easier: {exerciseById[detail.easier].name}</button>}{detail.harder && <button onClick={() => setDetail(exerciseById[detail.harder!])}>Harder: {exerciseById[detail.harder].name} →</button>}</div>}</section></div>}
  </div>
}
