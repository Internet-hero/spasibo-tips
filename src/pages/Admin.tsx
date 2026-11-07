import { useState } from 'react'
import { Building2, CreditCard, HeartHandshake, ShieldCheck, UserX, Users } from 'lucide-react'
import { toast } from 'sonner'
import { DashboardShell } from '@/components/DashboardShell'
import { StaffAvatar } from '@/components/StaffAvatar'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { displayGuestName, formatMoney } from '@/lib/domain'
import { demoActions, useDemoState } from '@/lib/store'
import type { PaymentStatus } from '@/types'

type Tab = 'venues' | 'payments' | 'users'

export default function Admin() {
  const state = useDemoState()
  const [tab, setTab] = useState<Tab>('venues')
  const [status, setStatus] = useState<'all' | PaymentStatus>('all')
  const succeeded = state.tips.filter((tip) => tip.status === 'succeeded')
  const payments = state.tips.filter((tip) => status === 'all' || tip.status === status).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return (
    <DashboardShell role="admin" title="Платформа" subtitle="Администратор сервиса · контроль и журнал">
      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <AdminStat icon={Building2} label="Заведений" value={String(state.venues.length)} />
        <AdminStat icon={HeartHandshake} label="Успешных чаевых" value={formatMoney(succeeded.reduce((sum, tip) => sum + tip.amount, 0))} />
        <AdminStat icon={Users} label="Сотрудников" value={String(state.staff.length)} />
      </section>
      <div className="mb-5 grid w-full grid-cols-3 gap-1 rounded-2xl bg-muted p-1 sm:w-max">
        {([['venues', 'Заведения'], ['payments', 'Платежи'], ['users', 'Блокировки']] as const).map(([value, label]) => <button key={value} onClick={() => setTab(value)} aria-pressed={tab === value} className={`min-h-11 rounded-xl px-2 text-xs font-bold transition sm:px-5 sm:text-sm ${tab === value ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>{label}</button>)}
      </div>
      {tab === 'venues' && <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{state.venues.map((venue) => {
        const tips = state.tips.filter((tip) => tip.venueId === venue.id && tip.status === 'succeeded')
        return <article key={venue.id} className="surface p-5"><div className="flex items-start justify-between gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-secondary text-primary"><Building2 className="size-5" /></span><span className={`tag ${venue.active ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'}`}>{venue.active ? 'Активно' : 'Заблокировано'}</span></div><h2 className="mt-4 text-xl font-extrabold">{venue.name}</h2><p className="text-sm text-muted-foreground">{venue.type}</p><p className="mt-2 text-sm text-muted-foreground">{venue.address}</p><div className="mt-5 flex items-end justify-between border-t pt-4"><div><p className="text-xs text-muted-foreground">Успешных платежей</p><p className="font-extrabold">{tips.length} · {formatMoney(tips.reduce((sum, tip) => sum + tip.amount, 0))}</p></div><Button variant={venue.active ? 'outline' : 'default'} size="sm" onClick={() => { demoActions.toggleVenue(venue.id); toast.success(venue.active ? 'Заведение заблокировано' : 'Заведение разблокировано') }}>{venue.active ? 'Блокировать' : 'Включить'}</Button></div></article>
      })}</section>}
      {tab === 'payments' && <section className="surface overflow-hidden"><div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-extrabold">Журнал платежей</h2><p className="text-sm text-muted-foreground">Публичные ID, статусы и получатели</p></div><label className="flex items-center gap-2 text-sm font-bold"><CreditCard className="size-4" /><span className="sr-only">Фильтр по статусу</span><select value={status} onChange={(event) => setStatus(event.target.value as 'all' | PaymentStatus)} className="field-input min-w-44"><option value="all">Все статусы</option><option value="succeeded">Успех</option><option value="pending">Ожидает</option><option value="failed">Ошибка</option><option value="refunded">Возврат</option></select></label></div><div className="overflow-x-auto"><table className="admin-table min-w-[760px]"><thead><tr><th>Платёж</th><th>Заведение / сотрудник</th><th>Гость</th><th>Сумма</th><th>Статус</th></tr></thead><tbody>{payments.map((tip) => <tr key={tip.id}><td><p className="max-w-36 truncate font-mono text-xs">{tip.publicId}</p><p className="text-xs text-muted-foreground">{new Date(tip.createdAt).toLocaleString('ru-RU')}</p></td><td><p className="font-bold">{state.venues.find((venue) => venue.id === tip.venueId)?.name}</p><p className="text-xs text-muted-foreground">{state.staff.find((member) => member.id === tip.staffId)?.name}</p></td><td>{displayGuestName(tip)}</td><td className="font-extrabold">{formatMoney(tip.amount)}</td><td><StatusBadge status={tip.status} /></td></tr>)}</tbody></table></div>{payments.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Платежей с таким статусом нет.</p>}</section>}
      {tab === 'users' && <section className="surface overflow-hidden"><div className="p-5"><h2 className="text-lg font-extrabold">Доступ сотрудников</h2><p className="text-sm text-muted-foreground">Блокировка сразу отключает персональный QR и вход по приглашению.</p></div><div className="divide-y">{state.staff.map((member) => <div key={member.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center"><div className="flex min-w-0 flex-1 items-center gap-3"><StaffAvatar member={member} size="sm" /><div className="min-w-0"><p className="truncate font-extrabold">{member.name} <span className="font-medium text-muted-foreground">· {member.position}</span></p><p className="truncate text-sm text-muted-foreground">{state.venues.find((venue) => venue.id === member.venueId)?.name}</p></div></div><span className={`tag w-max ${member.active ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'}`}>{member.active ? 'Доступ разрешён' : 'Заблокирован'}</span><Button variant={member.active ? 'outline' : 'default'} size="sm" onClick={() => { demoActions.setStaffActive(member.id, !member.active); toast.success(member.active ? 'Пользователь заблокирован' : 'Доступ восстановлен') }}><UserX />{member.active ? 'Заблокировать' : 'Разблокировать'}</Button></div>)}</div></section>}
      <div className="mt-6 flex items-start gap-3 rounded-2xl border bg-secondary/35 p-4 text-sm text-muted-foreground"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" /><p>Гостевые записи не содержат телефона, email или ссылок на профили. В журнале отображается только имя либо «Аноним».</p></div>
    </DashboardShell>
  )
}

function AdminStat({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return <article className="surface flex items-center gap-4 p-5"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-secondary text-primary"><Icon className="size-6" /></span><div><p className="text-sm text-muted-foreground">{label}</p><p className="text-xl font-extrabold">{value}</p></div></article>
}
