export type Sport = 'football' | 'golf' | 'bouldering'
export type PlanItem = { exerciseId: string; sets?: number; reps?: string; holdSeconds?: number; restSeconds?: number }
export type Section = { name: string; kind: 'warmup' | 'strength' | 'mobility' | 'cooldown'; items: PlanItem[]; optional?: boolean }
export type DayTemplate = { weekday: number; title: string; subtitle: string; sections: Section[]; rest?: boolean }

const item = (exerciseId: string, sets?: number, reps?: string, holdSeconds?: number, restSeconds?: number): PlanItem => ({ exerciseId, sets, reps, holdSeconds, restSeconds })
const warmup = (): Section => ({ name: 'Warm-up', kind: 'warmup', items: [item('march', 1, '2 min'), item('cat-cow', 1, '8'), item('glute-bridge', 1, '10')] })
const mobility = (items: PlanItem[]): Section => ({ name: 'Stretch & mobility', kind: 'mobility', items })
const strength = (items: PlanItem[]): Section => ({ name: 'Strength & core', kind: 'strength', items })

export const programme: { phase: string; description: string; days: DayTemplate[] } = {
  phase: 'Foundation · weeks 1–4',
  description: 'Start with clean, comfortable reps. Leave 2–3 reps in reserve and increase only when form stays steady.',
  days: [
    { weekday: 0, title: 'Gentle reset', subtitle: 'Rest day · 15–20 min easy movement', rest: true, sections: [mobility([item('cat-cow', 1, '8'), item('child-pose', 1, undefined, 60), item('90-90', 1, '8 / side'), item('hamstring', 1, undefined, 45), item('open-book', 1, '6 / side')])] },
    { weekday: 1, title: 'Football prep', subtitle: 'Short session · keep legs fresh for tonight', sections: [warmup(), strength([item('dead-bug', 2, '8 / side', undefined, 45), item('side-plank', 2, undefined, 20, 45)]), mobility([item('90-90', 1, '8 / side'), item('adductor-rock', 1, '8 / side'), item('hip-flexor', 1, undefined, 40), item('wall-slide', 1, '8')])] },
    { weekday: 2, title: 'Football prep', subtitle: 'Light core and range · no heavy legs', sections: [warmup(), strength([item('bird-dog', 2, '8 / side', undefined, 45), item('glute-bridge', 2, '12', undefined, 45)]), mobility([item('adductor-rock', 1, '8 / side'), item('open-book', 1, '6 / side'), item('hamstring', 1, undefined, 40), item('wall-slide', 1, '8')])] },
    { weekday: 3, title: 'Pull & climbing base', subtitle: 'Back, grip and trunk · controlled effort', sections: [warmup(), strength([item('dead-hang', 3, undefined, 15, 75), item('scapular-pull', 3, '5', undefined, 75), item('negative-pullup', 2, '3', undefined, 90), item('hollow-hold', 2, undefined, 15, 60)]), mobility([item('open-book', 1, '8 / side'), item('90-90', 1, '8 / side'), item('forearm-stretch', 1, undefined, 30), item('child-pose', 1, undefined, 45)])] },
    { weekday: 4, title: 'Push, legs & core', subtitle: 'Steady strength · quality over volume', sections: [warmup(), strength([item('incline-pushup', 3, '6–10', undefined, 75), item('squat', 3, '10–12', undefined, 75), item('reverse-lunge', 2, '8 / side', undefined, 60), item('plank', 2, undefined, 25, 60)]), mobility([item('open-book', 1, '8 / side'), item('hip-flexor', 1, undefined, 45), item('hamstring', 1, undefined, 45)])] },
    { weekday: 5, title: 'Full-body flow', subtitle: 'Moderate full body · easy pull volume', sections: [warmup(), strength([item('incline-pushup', 2, '8–12', undefined, 60), item('scapular-pull', 2, '5', undefined, 75), item('squat', 2, '12', undefined, 60), item('dead-bug', 2, '8 / side', undefined, 45)]), mobility([item('down-dog', 1, undefined, 45), item('child-pose', 1, undefined, 45), item('90-90', 1, '8 / side'), item('hamstring', 1, undefined, 45)])] },
    { weekday: 6, title: 'Climbing support', subtitle: 'Pull, core and hips · leave plenty in reserve', sections: [warmup(), strength([item('dead-hang', 3, undefined, 20, 75), item('scapular-pull', 2, '6', undefined, 75), item('negative-pullup', 2, '3', undefined, 90), item('side-plank', 2, undefined, 25, 45)]), mobility([item('forearm-stretch', 1, undefined, 30), item('90-90', 1, '8 / side'), item('adductor-rock', 1, '8 / side'), item('child-pose', 1, undefined, 45)])] },
  ],
}

export const sportBlocks: Record<Sport, { primer: PlanItem[]; cooldown: PlanItem[]; note: string; strengthMultiplier: number }> = {
  football: { primer: [item('adductor-rock', 1, '8 / side'), item('glute-bridge', 1, '10'), item('shoulder-circles', 1, '30 sec')], cooldown: [item('hip-flexor', 1, undefined, 45), item('hamstring', 1, undefined, 45)], note: 'Evening match: keep today’s strength light; stretch gently afterwards.', strengthMultiplier: 1 },
  golf: { primer: [item('open-book', 1, '8 / side'), item('90-90', 1, '8 / side'), item('glute-bridge', 1, '10')], cooldown: [item('hip-flexor', 1, undefined, 45), item('child-pose', 1, undefined, 45)], note: 'Finish the main session before your round. Weekend rounds call for a morning session.', strengthMultiplier: 0.6 },
  bouldering: { primer: [item('shoulder-circles', 1, '30 sec'), item('scapular-pull', 1, '5'), item('forearm-stretch', 1, undefined, 20)], cooldown: [item('forearm-stretch', 1, undefined, 40), item('child-pose', 1, undefined, 45)], note: 'Keep pulling easy today and stop before grip fatigue.', strengthMultiplier: 0.6 },
}

export function defaultSports(date: string): Sport[] {
  const day = weekday(date)
  return day === 1 || day === 2 ? ['football'] : []
}

export function weekday(date: string): number {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day).getDay()
}

export function planFor(date: string, sports: Sport[]): DayTemplate {
  const base = programme.days[weekday(date)]
  const multiplier = Math.min(1, ...sports.map(sport => sportBlocks[sport].strengthMultiplier))
  const sections = base.sections.map(section => ({
    ...section,
    items: section.kind === 'strength' && multiplier < 1
      ? section.items.map(planItem => ({ ...planItem, sets: planItem.sets ? Math.max(1, Math.ceil(planItem.sets * multiplier)) : undefined }))
      : section.items,
  }))
  for (const sport of sports) {
    sections.splice(1, 0, { name: `${sport} primer`, kind: 'warmup', items: sportBlocks[sport].primer })
    sections.push({ name: `${sport} cooldown`, kind: 'cooldown', items: sportBlocks[sport].cooldown, optional: true })
  }
  return { ...base, sections }
}
