'use client'

import { useEffect, useRef, useState } from 'react'
import { exerciseById, type Exercise } from '../data/exercises'
import { planFor, programme, sportBlocks, type Sport } from '../data/programme'
import { addDays, effectiveLog, itemKey, localDate, progress, validateImport, type DayLog, type Logs } from '../lib/training'

type Tab = 'today' | 'history' | 'programme' | 'settings'
const storageKey = 'fountain-of-cali:v1'
const sportNames: Record<Sport, string> = { football: 'Football', golf: 'Golf', bouldering: 'Bouldering' }
const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const formatDate = (date: string) => new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${date}T12:00:00`))

export function App() {
  const [today, setToday] = useState('')
  const [selected, setSelected] = useState('')
  const [tab, setTab] = useState<Tab>('today')
  const [logs, setLogs] = useState<Logs>({})
  const [ready, setReady] = useState(false)
  const [detail, setDetail] = useState<Exercise | null>(null)
  const [month, setMonth] = useState('')
  const [message, setMessage] = useState('')
  const [light, setLight] = useState(false)
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
      if (saved) setLogs(validateImport(JSON.parse(saved)))
    } catch { setMessage('Saved data could not be read. Import a backup if you have one.') }
    setLight(localStorage.getItem('fountain-of-cali:light') === 'true')
    setReady(true)
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => { if (ready) localStorage.setItem(storageKey, JSON.stringify(logs)) }, [logs, ready])
  useEffect(() => { if (ready) localStorage.setItem('fountain-of-cali:light', String(light)) }, [light, ready])
  useEffect(() => {
    if (!detail) return
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setDetail(null) }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [detail])

  if (!ready || !today || !selected) return <main className="loading">Loading your plan…</main>

  const log = effectiveLog(logs, selected)
  const plan = planFor(selected, log.sportFlags)
  const tally = progress(selected, log)
  const isFuture = selected > today
  const update = (change: Partial<DayLog>) => setLogs(current => ({ ...current, [selected]: { ...effectiveLog(current, selected), ...change } }))
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
  const monthComplete = monthDates.filter(date => date <= today && progress(date, effectiveLog(logs, date)).status === 'complete').length
  const exportData = () => {
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' }))
    link.download = `fountain-of-cali-backup-${today}.json`
    link.click()
    URL.revokeObjectURL(link.href)
  }
  const importData = async (file?: File) => {
    if (!file) return
    try {
      const imported = validateImport(JSON.parse(await file.text()))
      if (!window.confirm(`Replace your current logs with ${Object.keys(imported).length} days from this backup?`)) return
      setLogs(imported)
      setMessage('Backup imported.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Invalid backup.') }
    if (importRef.current) importRef.current.value = ''
  }

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
            <div className="eyebrow"><span className="eyebrow-line" /> DAILY PRACTICE <span className="phase-pill">{programme.phase}</span></div>
            <div className="hero-heading"><div><p className="hero-date">{formatDate(selected)}</p><h1>{plan.title}<span className="accent-dot">.</span></h1><p className="hero-subtitle">{plan.subtitle}</p></div><div className={`status-stamp ${tally.status}`}>{isFuture ? 'UPCOMING' : tally.status.toUpperCase()}</div></div>
            <div className="progress-wrap"><div className="progress-copy"><strong>{tally.done} <span>/ {tally.total}</span></strong><span>movements complete</span></div><div className="progress-track" role="progressbar" aria-valuenow={tally.done} aria-valuemin={0} aria-valuemax={tally.total} aria-label="Daily progress"><span style={{ width: `${tally.total ? tally.done / tally.total * 100 : 0}%` }} /></div></div>
          </section>

          <div className="content-grid"><div className="main-column">
            <div className="section-head"><div><span className="small-label">YOUR SESSION</span><h2>Today’s plan</h2></div><span className="duration">{plan.rest ? '15–20' : selected === today && (log.sportFlags.includes('football')) ? '20–25' : '40–55'} min</span></div>
            {plan.sections.map((section) => <section className={`plan-section ${section.kind}`} key={section.name}>
              <div className="plan-section-header"><span className="section-icon">{section.kind === 'strength' ? '↗' : section.kind === 'mobility' ? '◌' : section.kind === 'cooldown' ? '☾' : '✳'}</span><div><h3>{section.name}</h3><p>{section.optional ? 'Optional · after activity' : section.kind === 'strength' ? 'Controlled reps. Rest between sets.' : section.kind === 'warmup' ? 'Ease into the session.' : 'Move gently. Never stretch into sharp pain.'}</p></div><span className="item-count">{section.items.length} moves</span></div>
              <div className="items">{section.items.map((item, index) => {
                const exercise = exerciseById[item.exerciseId]
                const key = itemKey(section.name, index, item.exerciseId)
                const done = log.completed.includes(key)
                const target = [item.sets ? `${item.sets} ×` : '', item.reps ?? (item.holdSeconds ? `${item.holdSeconds}s hold` : '')].filter(Boolean).join(' ')
                return <div className={`exercise-row ${done ? 'done' : ''}`} key={key}>
                  <button className="check" type="button" role="checkbox" aria-checked={done} aria-label={`${done ? 'Mark incomplete' : 'Mark complete'}: ${exercise.name}`} onClick={() => toggle(key)} disabled={isFuture}>{done ? '✓' : ''}</button>
                  <button className="exercise-info" onClick={() => setDetail(exercise)}><span className="exercise-thumb" aria-hidden="true" style={{ backgroundImage: `url(https://i.ytimg.com/vi/${exercise.media[0].src}/mqdefault.jpg)` }} /><span className="exercise-copy"><span className="exercise-name">{exercise.name}</span><span className="exercise-meta">{target}{item.restSeconds ? `  ·  ${item.restSeconds}s rest` : ''}</span></span></button>
                  <button className="view-exercise" onClick={() => setDetail(exercise)} aria-label={`View ${exercise.name} guidance`}>↗</button>
                </div>
              })}</div>
            </section>)}
          </div>

          <aside className="side-column">
            <section className="card sport-card"><span className="small-label">DAY SETUP</span><h3>What’s on today?</h3><p>Sport adds a primer and optional cooldown. Golf and bouldering keep strength lighter.</p><div className="sport-options">{(['football', 'golf', 'bouldering'] as Sport[]).map(sport => <button key={sport} className={log.sportFlags.includes(sport) ? 'sport-chip active' : 'sport-chip'} onClick={() => switchSport(sport)} aria-pressed={log.sportFlags.includes(sport)}>{sportNames[sport]}</button>)}</div>{log.sportFlags.map(sport => <p className="sport-note" key={sport}>↳ {sportBlocks[sport].note}</p>)}</section>
            <section className="card timing-card"><span className="small-label">FLEXIBLE TIMING</span><h3>Train when it fits.</h3><p>Your checklist stays the same whether you start early or near lunch.</p><label htmlFor="session-time">Session time</label><select id="session-time" value={log.sessionTime ?? ''} onChange={event => update({ sessionTime: event.target.value as DayLog['sessionTime'] || undefined })}><option value="">Not set</option><option value="morning">Morning</option><option value="late-morning">Late morning</option><option value="lunchtime">Lunchtime</option></select>{log.sportFlags.includes('golf') && <><label htmlFor="golf-start">Golf start</label><select id="golf-start" value={log.golfStart ?? ''} onChange={event => update({ golfStart: event.target.value as DayLog['golfStart'] || undefined })}><option value="">Not set</option><option value="afternoon">Afternoon</option><option value="weekend-midday">Weekend midday</option></select></>}</section>
            <div className="tip-card"><span>✦</span><p>Build the habit first. Good form and recovery beat chasing extra reps.</p></div>
          </aside></div>
        </>}

        {tab === 'history' && <section className="page-panel"><div className="page-title"><span className="small-label">YOUR CONSISTENCY</span><h1>History<span className="accent-dot">.</span></h1><p>Look back at the work you’ve put in, one day at a time.</p></div><div className="history-grid"><div className="card calendar-card"><div className="calendar-top"><div><h2>{monthName}</h2><p><strong>{monthComplete}</strong> completed days this month</p></div><div className="calendar-arrows"><button onClick={() => setMonth(localDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1)).slice(0, 7))} aria-label="Previous month">‹</button><button onClick={() => setMonth(localDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)).slice(0, 7))} aria-label="Next month">›</button></div></div><div className="calendar-grid">{['M','T','W','T','F','S','S'].map((day, index) => <span className="calendar-weekday" key={index}>{day}</span>)}{Array.from({ length: calendarOffset }, (_, index) => <span key={`blank-${index}`} />)}{monthDates.map(date => { const status = date > today ? 'future' : progress(date, effectiveLog(logs, date)).status; return <button key={date} className={`calendar-day ${status} ${selected === date ? 'selected' : ''}`} onClick={() => setSelected(date)} aria-label={`${formatDate(date)}: ${status}`} aria-current={date === today ? 'date' : undefined}>{Number(date.slice(-2))}</button> })}</div><div className="calendar-legend"><span><i className="legend-complete" /> Complete</span><span><i className="legend-partial" /> Partial</span><span><i className="legend-missed" /> Missed</span><span><i className="legend-rest" /> Rest</span></div></div><div className="card history-detail"><span className="small-label">DAY DETAIL</span><h2>{formatDate(selected)}</h2><p>{plan.title} · {tally.done} / {tally.total} done</p><div className={`history-status ${tally.status}`}>{selected > today ? 'Upcoming' : tally.status}</div>{plan.sections.map(section => <div className="history-section" key={section.name}><h3>{section.name}</h3>{section.items.map((item, index) => <div key={index} className="history-item"><span className={log.completed.includes(itemKey(section.name, index, item.exerciseId)) ? 'history-tick yes' : 'history-tick'}>{log.completed.includes(itemKey(section.name, index, item.exerciseId)) ? '✓' : '·'}</span>{exerciseById[item.exerciseId].name}</div>)}</div>)}<button className="text-link" onClick={() => setTab('today')}>Open this day’s checklist →</button></div></div></section>}

        {tab === 'programme' && <section className="page-panel"><div className="page-title"><span className="small-label">THE ROUTINE</span><h1>Programme<span className="accent-dot">.</span></h1><p>{programme.description}</p></div><div className="programme-heading"><div><span className="small-label">CURRENT PHASE</span><h2>{programme.phase}</h2></div><span>Repeat weekly</span></div><div className="week-cards">{programme.days.map(day => <button className="week-card" key={day.weekday} onClick={() => { const date = addDays(today, (day.weekday - new Date(`${today}T12:00:00`).getDay() + 7) % 7); setSelected(date); setTab('today') }}><span>{weekdays[day.weekday].slice(0, 3).toUpperCase()}</span><h3>{day.title}</h3><p>{day.subtitle}</p><small>{day.sections.reduce((sum, section) => sum + section.items.length, 0)} movements ↗</small></button>)}</div><div className="programme-note"><strong>Progress at your pace.</strong> Start with the listed regressions. Add reps or time only when every set feels controlled. Football stays light on Monday and Tuesday; Sunday is recovery.</div></section>}

        {tab === 'settings' && <section className="page-panel settings-page"><div className="page-title"><span className="small-label">YOUR DATA</span><h1>Settings<span className="accent-dot">.</span></h1><p>Keep a copy of your training history.</p></div><div className="card backup-card"><div className="backup-icon">⇩</div><div><h2>Back up your progress</h2><p>Logs live in this browser. Export a JSON file regularly; you can restore it here or in another browser.</p><div className="backup-actions"><button className="primary-button" onClick={exportData}>Export JSON</button><button className="secondary-button" onClick={() => importRef.current?.click()}>Import JSON</button><input ref={importRef} type="file" accept="application/json,.json" hidden onChange={event => void importData(event.target.files?.[0])} /></div></div></div><div className="card preferences-card"><h2>Appearance</h2><p>Choose the theme that feels right for your session.</p><button className="secondary-button" onClick={() => setLight(value => !value)}>{light ? 'Use dark mode' : 'Use light mode'}</button></div><p className="safety-note">Stretch only to mild tension. Stop if anything hurts sharply; seek professional advice if a problem persists.</p></section>}
      </main>

      <nav className="bottom-nav" aria-label="Main navigation">{([['today', '◉', 'Today'], ['history', '▦', 'History'], ['programme', '▤', 'Programme'], ['settings', '⚙', 'Settings']] as const).map(([key, icon, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => chooseTab(key)} aria-current={tab === key ? 'page' : undefined}><span className="nav-icon">{icon}</span><span>{label}</span></button>)}</nav>
    </div>

    {message && <div className="toast" role="status">{message}<button onClick={() => setMessage('')} aria-label="Dismiss message">×</button></div>}
    {detail && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setDetail(null) }}><section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title"><button ref={closeRef} className="modal-close" onClick={() => setDetail(null)} aria-label="Close exercise guide">×</button><span className="small-label">MOVEMENT GUIDE</span><h2 id="detail-title">{detail.name}</h2><p className="detail-muscles">{detail.muscles.join(' · ')}</p><div className="video-frame"><iframe src={`https://www.youtube-nocookie.com/embed/${detail.media[0].src}`} title={detail.media[0].label} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen loading="lazy" /></div><p className="video-label">{detail.media[0].label} · <a href={`https://www.youtube.com/watch?v=${detail.media[0].src}`} target="_blank" rel="noreferrer">Open on YouTube ↗</a></p><div className="guide-grid"><div><h3>How to do it</h3><ul>{detail.cues.map(cue => <li key={cue}>{cue}</li>)}</ul></div><div><h3>Watch out for</h3><ul>{detail.commonMistakes.map(mistake => <li key={mistake}>{mistake}</li>)}</ul>{detail.tallPersonNotes && <p className="tall-tip"><strong>For taller bodies:</strong> {detail.tallPersonNotes}</p>}</div></div>{(detail.easier || detail.harder) && <div className="variations">{detail.easier && <button onClick={() => setDetail(exerciseById[detail.easier!])}>← Easier: {exerciseById[detail.easier].name}</button>}{detail.harder && <button onClick={() => setDetail(exerciseById[detail.harder!])}>Harder: {exerciseById[detail.harder].name} →</button>}</div>}</section></div>}
  </div>
}
