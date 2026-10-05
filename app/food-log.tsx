'use client'

import { useEffect, useState } from 'react'
import { addDays } from '../lib/training'
import { validCalorieTarget, type BodyEntry, type BodyLogs, type FoodEntry } from '../lib/phase3'

type Props = { today: string; entries: BodyLogs; calorieTarget?: number; onTarget: (value?: number) => void; onSave: (entry: BodyEntry) => void; onMessage: (message: string) => void }
const total = (foods: FoodEntry[] = []) => foods.reduce((sum, food) => sum + food.calories, 0)

export function FoodLog({ today, entries, calorieTarget, onTarget, onSave, onMessage }: Props) {
  const [date, setDate] = useState(today)
  const [name, setName] = useState('')
  const [calories, setCalories] = useState('')
  const [editing, setEditing] = useState('')
  const [targetDraft, setTargetDraft] = useState(String(calorieTarget ?? ''))
  // Cloud and backup loads can change the saved reference while this view stays open.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { setTargetDraft(String(calorieTarget ?? '')) }, [calorieTarget])
  /* eslint-enable react-hooks/set-state-in-effect */
  const foods = entries[date]?.foodEntries ?? []
  const days = Array.from({ length: 14 }, (_, index) => addDays(today, index - 13))
  const lastWeek = days.slice(-7).map(day => entries[day]?.foodEntries).filter((items): items is FoodEntry[] => Boolean(items?.length))
  const average = lastWeek.length ? Math.round(lastWeek.reduce((sum, items) => sum + total(items), 0) / lastWeek.length) : null
  const scale = Math.max(calorieTarget ?? 0, ...days.map(day => total(entries[day]?.foodEntries)), 1)

  const saveFoods = (next: FoodEntry[]) => onSave({ ...entries[date], date, foodEntries: next })
  const saveFood = () => {
    const kcal = Number(calories)
    if (!date || date > today || !name.trim() || name.trim().length > 100 || calories.trim() === '' || !Number.isInteger(kcal) || kcal < 0 || kcal > 5000) { onMessage('Enter a food or drink name and calories from 0 to 5,000.'); return }
    if (!editing && foods.length >= 100) { onMessage('This day has reached the 100-entry limit.'); return }
    const food = { id: editing || crypto.randomUUID(), name: name.trim(), calories: kcal }
    saveFoods(editing ? foods.map(item => item.id === editing ? food : item) : [...foods, food])
    setName(''); setCalories(''); setEditing('')
    onMessage('Food entry saved.')
  }
  const saveTarget = () => {
    if (!targetDraft.trim()) { onTarget(undefined); return }
    const value = Number(targetDraft)
    if (!validCalorieTarget(value)) { setTargetDraft(String(calorieTarget ?? '')); onMessage('Choose a daily reference between 1,200 and 6,000 kcal, or leave it blank.'); return }
    onTarget(value)
  }

  return <section className="card food-card"><h2>Food & calorie diary</h2><p>Record food and drinks using label or portion estimates. Start with your usual intake; the reference target is optional and does not calculate what you should eat.</p>
    <div className="food-summary"><strong>{foods.length ? total(foods).toLocaleString() : '—'}</strong><span>kcal logged for {date}</span>{calorieTarget && foods.length > 0 && <span>· {Math.abs(total(foods) - calorieTarget).toLocaleString()} {total(foods) > calorieTarget ? 'above' : 'below'} your reference</span>}</div>
    <div className="food-fields"><label className="field">Date<input type="date" max={today} value={date} onChange={event => { setDate(event.target.value); setEditing(''); setName(''); setCalories('') }} /></label><label className="field">Optional daily reference (kcal)<input type="number" min="1200" max="6000" step="1" inputMode="numeric" value={targetDraft} onChange={event => setTargetDraft(event.target.value)} onBlur={saveTarget} /></label></div>
    <div className="food-fields"><label className="field">Food or drink<input type="text" maxLength={100} placeholder="e.g. lunch, coffee, beer" value={name} onChange={event => setName(event.target.value)} /></label><label className="field">Calories (kcal)<input type="number" min="0" max="5000" step="1" inputMode="numeric" value={calories} onChange={event => setCalories(event.target.value)} /></label></div>
    <div className="backup-actions"><button className="primary-button" onClick={saveFood}>{editing ? 'Save change' : 'Add item'}</button>{editing && <button className="secondary-button" onClick={() => { setEditing(''); setName(''); setCalories('') }}>Cancel</button>}</div>
    {foods.length > 0 && <ul className="food-list">{foods.map(food => <li key={food.id}><span>{food.name}</span><strong>{food.calories.toLocaleString()} kcal</strong><button onClick={() => { setEditing(food.id); setName(food.name); setCalories(String(food.calories)) }}>Edit</button><button onClick={() => { saveFoods(foods.filter(item => item.id !== food.id)); if (editing === food.id) { setEditing(''); setName(''); setCalories('') } }}>Delete</button></li>)}</ul>}
    <div className="food-trend"><h3>Recent intake</h3><p>{average?.toLocaleString() ?? '—'} kcal average on {lastWeek.length} logged day{lastWeek.length === 1 ? '' : 's'} in the past week</p><div className="steps-chart" aria-label="Calories logged over the past 14 days">{days.map(day => { const items = entries[day]?.foodEntries; const kcal = total(items); return <button className="step-day" key={day} aria-label={`${day}: ${items?.length ? `${kcal.toLocaleString()} kcal` : 'not logged'}`} aria-pressed={date === day} onClick={() => { setDate(day); setEditing(''); setName(''); setCalories('') }}><span className="step-track"><span className={calorieTarget && kcal > calorieTarget ? 'above-target' : ''} style={{ height: `${items?.length ? kcal / scale * 100 : 0}%` }} /></span><small>{day.slice(-2)}</small></button> })}</div><p className="chart-caption">Past 14 days · tap a day to see its entries · blank days are unlogged · bars show estimated intake, not calories burned</p></div>
    <p className="chart-caption">Include drinks, cooking oils and sauces where possible. Compare intake with your weight and waist trend over several weeks, rather than judging one day. <a href="https://www.nhs.uk/better-health/lose-weight/calorie-counting/" target="_blank" rel="noreferrer">NHS calorie-counting guidance</a></p>
  </section>
}
