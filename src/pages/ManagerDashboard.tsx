import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Download, HeartHandshake, Percent, ReceiptText, TrendingUp, Users, Wallet } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'
import { DashboardShell } from '@/components/DashboardShell'
import { StaffAvatar } from '@/components/StaffAvatar'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { displayGuestName, formatMoney, venueStats } from '@/lib/domain'
import { useDemoState } from '@/lib/store'

export default function ManagerDashboard() {
  const state = useDemoState()
  const venueId = state.session?.venueId ?? 'venue-coffee'
  const venue = state.venues.find((item) => item.id === venueId)
  const [period, setPeriod] = useState<7 | 30>(7)
  const stats = useMemo(() => venueStats(state, venueId, period), [state, venueId, period])
  const latest = state.tips.filter((tip) => tip.venueId === venueId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6)
  const exportCsv = () => {
    const rows = [['Дата', 'Сотрудник', 'Сумма ₽', 'Гость', 'Статус', 'Послание', 'Добил цель'], ...state.tips.filter((tip) => tip.venueId === venueId).map((tip) => [
      new Date(tip.createdAt).toLocaleString('ru-RU'),
      state.staff.find((member) => member.id === tip.staffId)?.name ?? '—',
      (tip.amount / 100).toString(), displayGuestName(tip), tip.status, tip.message, tip.isGoalTopup ? 'да' : 'нет',
    ])]
    const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(';')).join('\n')}`
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `spasibo-${venueId}.csv`; anchor.click(); URL.revokeObjectURL(url)
    toast.success('CSV-выгрузка готова')
  }
  return (
    <DashboardShell role="manager" title="Пульс заведения" subtitle={`${venue?.name ?? 'Заведение'} · аналитика благодарностей`}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-2xl bg-muted p-1" aria-label="Период статистики">{([7, 30] as const).map((days) => <button key={days} onClick={() => setPeriod(days)} aria-pressed={period === days} className={`min-h-11 rounded-xl px-5 text-sm font-bold transition ${period === days ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>{days} дней</button>)}</div>
        <div className="flex gap-2"><Button variant="outline" onClick={exportCsv}><Download />CSV</Button><Button asChild className="rounded-xl"><Link to="/manager/qr">QR-коды<ArrowRight /></Link></Button></div>
      </div>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ключевые показатели">
        <Stat title="Сумма чаевых" value={formatMoney(stats.total)} note={`За ${period} дней`} icon={Wallet} featured />
        <Stat title="Платежей" value={String(stats.count)} note={`${stats.topups} добили цель`} icon={ReceiptText} />
        <Stat title="Средний чек" value={formatMoney(stats.average)} note="По успешным платежам" icon={TrendingUp} />
        <Stat title="Анонимных" value={`${stats.anonymousPercent}%`} note="Без имени и контактов" icon={Percent} />
      </section>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_.8fr]">
        <section className="surface min-w-0 p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-extrabold">Динамика по дням</h2><p className="text-sm text-muted-foreground">Сумма успешных чаевых, ₽</p></div><span className="tag"><TrendingUp className="size-4" />{period} дней</span></div>
          <div className="mt-6 h-64 w-full" aria-label="График чаевых по дням">
            <ResponsiveContainer width="100%" height="100%"><BarChart data={stats.chart} margin={{ top: 4, right: 0, left: -22, bottom: 0 }}><CartesianGrid vertical={false} stroke="#dce5dc" strokeDasharray="3 3" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#52675f', fontSize: 12, fontFamily: 'Manrope' }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#52675f', fontSize: 12, fontFamily: 'Manrope' }} /><Tooltip cursor={{ fill: '#eef3ec' }} contentStyle={{ borderRadius: 16, border: '1px solid #d2ded3', fontFamily: 'Manrope' }} formatter={(value) => [`${value} ₽`, 'Чаевые']} /><Bar dataKey="amount" fill="#ee8666" radius={[7, 7, 2, 2]} isAnimationActive={false} /></BarChart></ResponsiveContainer>
          </div>
        </section>
        <section className="surface p-5 sm:p-6">
          <div className="flex items-center justify-between"><div><h2 className="text-lg font-extrabold">Топ команды</h2><p className="text-sm text-muted-foreground">По сумме за период</p></div><Users className="size-5 text-accent" /></div>
          <div className="mt-5 space-y-4">
            {stats.top.map((member, index) => <div key={member.id} className="flex items-center gap-3"><span className="w-4 text-sm font-extrabold text-muted-foreground">{index + 1}</span><StaffAvatar member={member} size="sm" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold">{member.name}</p><p className="text-xs text-muted-foreground">{member.count} платежей</p></div><p className="text-sm font-extrabold">{formatMoney(member.total)}</p></div>)}
            {stats.top.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Добавьте сотрудников, чтобы увидеть рейтинг.</p>}
          </div>
          <Button asChild variant="outline" className="mt-6 w-full rounded-xl"><Link to="/manager/staff">Управлять командой<ArrowRight /></Link></Button>
        </section>
      </div>
      <section className="surface mt-6 overflow-hidden">
        <div className="flex items-center justify-between gap-4 p-5 sm:p-6"><div><h2 className="text-lg font-extrabold">Последние платежи</h2><p className="text-sm text-muted-foreground">Все статусы мок-кассы</p></div><HeartHandshake className="size-6 text-accent" /></div>
        <div className="overflow-x-auto"><table className="admin-table min-w-[680px]"><thead><tr><th>Дата</th><th>Получатель</th><th>Гость</th><th>Сумма</th><th>Статус</th></tr></thead><tbody>{latest.map((tip) => <tr key={tip.id}><td>{new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(tip.createdAt))}</td><td className="font-bold">{state.staff.find((member) => member.id === tip.staffId)?.name ?? '—'}</td><td>{displayGuestName(tip)}</td><td className="font-extrabold">{formatMoney(tip.amount)}</td><td><StatusBadge status={tip.status} /></td></tr>)}</tbody></table></div>
        {latest.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Платежи появятся после первого гостя.</p>}
      </section>
    </DashboardShell>
  )
}

function Stat({ title, value, note, icon: Icon, featured = false }: { title: string; value: string; note: string; icon: typeof Wallet; featured?: boolean }) {
  return <article className={`surface p-5 ${featured ? 'bg-primary text-primary-foreground' : ''}`}><div className="flex items-center justify-between"><p className={`text-sm font-bold ${featured ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{title}</p><Icon className={`size-5 ${featured ? 'text-accent' : 'text-primary'}`} /></div><p className="display-font mt-4 text-2xl font-semibold tracking-tight">{value}</p><p className={`mt-1 text-xs ${featured ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>{note}</p></article>
}
