import { Target } from 'lucide-react'
import { formatMoney } from '@/lib/domain'
import type { StaffGoal } from '@/types'

export function GoalProgress({ goal, staffName, compact = false }: { goal: StaffGoal; staffName?: string; compact?: boolean }) {
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount)
  const progress = Math.min(100, Math.round(goal.currentAmount / goal.targetAmount * 100))
  const reached = remaining === 0
  return (
    <section aria-label={`Цель: ${goal.title}`} className={compact ? '' : 'rounded-3xl bg-secondary/65 p-5'}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-card text-primary"><Target className="size-5" /></span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Цель смены</p>
            <h3 className="truncate text-base font-extrabold">{goal.title}</h3>
          </div>
        </div>
        {reached && <span className="tag shrink-0 bg-primary text-primary-foreground">Цель достигнута</span>}
      </div>
      <div className="mt-5 flex items-end justify-between gap-3">
        <p className="text-xl font-extrabold tracking-tight">{formatMoney(goal.currentAmount)} <span className="text-sm font-medium text-muted-foreground">из {formatMoney(goal.targetAmount)}</span></p>
        <span className="text-sm font-extrabold text-primary">{progress}%</span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-card" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Прогресс цели">
        <div className="h-full rounded-full bg-accent transition-transform duration-200" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {reached ? `${staffName ?? 'Сотрудник'} уже благодарит за поддержку` : remaining <= 20_000 && staffName ? `${staffName} в ${formatMoney(remaining)} от цели` : `Осталось ${formatMoney(remaining)}`}
      </p>
    </section>
  )
}
