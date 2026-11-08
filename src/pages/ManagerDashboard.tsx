import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { ArrowRight, Download, Percent, ReceiptText, ShieldAlert, TrendingUp, Wallet } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'
import { DashboardShell } from '@/components/DashboardShell'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { dailyReport, formatMoney, merchantReport, paymentTotal } from '@/lib/domain'
import { useDemoState } from '@/lib/store'

export default function ManagerDashboard() {
  const state = useDemoState()
  const location = useLocation()
  const merchantId = state.session?.merchant_id ?? 'm_001'
  const merchant = state.merchants.find((item) => item.merchant_id === merchantId)
  const [from, setFrom] = useState('2025-11-01')
  const [to, setTo] = useState('2025-11-30')
  const report = useMemo(() => merchantReport(state, merchantId, from, to), [state, merchantId, from, to])
  const daily = useMemo(() => dailyReport(state, merchantId, from, to), [state, merchantId, from, to])
  const notice = (location.state as { notice?: string } | null)?.notice
  const payments = state.payments.filter((payment) => payment.merchant_id === merchantId && payment.timestamp.slice(0, 10) >= from && payment.timestamp.slice(0, 10) <= to).sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  const latest = payments.slice(0, 8)
  const exportCsv = () => {
    const rows = [['payment_id', 'merchant_id', 'employee_id', 'amount', 'tip', 'status', 'timestamp'], ...payments.map((payment) => [payment.payment_id, payment.merchant_id, payment.employee_id, payment.amount.toFixed(2), payment.tip.toFixed(2), payment.status, payment.timestamp])]
    const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')}`
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `tips-${merchantId}-${from}-${to}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
    toast.success('CSV-отчёт сформирован')
  }
  return (
    <DashboardShell role="manager" title="Отчёт по чаевым" subtitle={`${merchant?.name ?? 'Заведение'} · ${merchantId}`}>
      {notice && <p role="status" className="mb-5 rounded-2xl bg-amber-100 p-4 text-sm font-semibold text-amber-900">{notice}</p>}
      {merchant?.status !== 'ACTIVE' && <div className="mb-5 flex items-start gap-3 rounded-2xl border bg-card p-4 text-sm"><ShieldAlert className="mt-0.5 size-5 text-accent" /><p>Текущий статус: <strong>{merchant?.status}</strong>. Генерация QR доступна только после активации администратором.</p></div>}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-2 sm:flex-row"><label className="text-xs font-bold">С<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="field-input mt-1" /></label><label className="text-xs font-bold">По<input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="field-input mt-1" /></label></div>
        <div className="flex gap-2"><Button variant="outline" onClick={exportCsv}><Download />CSV</Button><Button asChild className="rounded-xl"><Link to="/manager/qr">QR на чек<ArrowRight /></Link></Button></div>
      </div>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Отчёт мерчанта">
        <Stat title="Сумма чаевых" value={formatMoney(report.tips_total)} note="По SUCCESS" icon={Wallet} featured />
        <Stat title="Платежей" value={String(report.payments_count)} note="Все статусы за период" icon={ReceiptText} />
        <Stat title="Средний %" value={`${report.avg_tip_pct.toFixed(2)}%`} note="Среднее tip / amount" icon={TrendingUp} />
        <Stat title="Успешных" value={`${Math.round(report.success_rate * 100)}%`} note="SUCCESS / все платежи" icon={Percent} />
      </section>
      <section className="surface mt-6 min-w-0 p-4 sm:p-6">
        <div><h2 className="text-lg font-extrabold">Отчёт по дням</h2><p className="text-sm text-muted-foreground">Сумма чаевых SUCCESS, ₽</p></div>
        <div className="mt-6 h-64 w-full" aria-label="График чаевых по дням"><ResponsiveContainer width="100%" height="100%"><BarChart data={daily} margin={{ top: 4, right: 0, left: -22, bottom: 0 }}><CartesianGrid vertical={false} stroke="#dce5dc" strokeDasharray="3 3" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#52675f', fontSize: 10 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#52675f', fontSize: 12 }} /><Tooltip cursor={{ fill: '#eef3ec' }} formatter={(value) => [`${value} ₽`, 'Чаевые']} /><Bar dataKey="tips_total" fill="#ee8666" radius={[7, 7, 2, 2]} isAnimationActive={false} /></BarChart></ResponsiveContainer></div>
      </section>
      <section className="surface mt-6 overflow-hidden">
        <div className="p-5 sm:p-6"><h2 className="text-lg font-extrabold">Платежи за период</h2><p className="text-sm text-muted-foreground">Полный журнал мерчанта со статусами</p></div>
        <div className="overflow-x-auto"><table className="admin-table min-w-[760px]"><thead><tr><th>Дата</th><th>Платёж</th><th>Сотрудник</th><th>Чаевые</th><th>Итого</th><th>Статус</th></tr></thead><tbody>{latest.map((payment) => <tr key={payment.payment_id}><td>{new Date(payment.timestamp).toLocaleString('ru-RU')}</td><td className="font-bold">{payment.payment_id}</td><td>{state.employees.find((employee) => employee.employee_id === payment.employee_id)?.name ?? payment.employee_id}</td><td className="font-extrabold">{formatMoney(payment.tip)}</td><td>{formatMoney(paymentTotal(payment))}</td><td><StatusBadge status={payment.status} /></td></tr>)}</tbody></table></div>
        {latest.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">За выбранный период платежей нет.</p>}
      </section>
    </DashboardShell>
  )
}

function Stat({ title, value, note, icon: Icon, featured = false }: { title: string; value: string; note: string; icon: typeof Wallet; featured?: boolean }) {
  return <article className={`surface p-5 ${featured ? 'bg-primary text-primary-foreground' : ''}`}><div className="flex items-center justify-between"><p className={`text-sm font-bold ${featured ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{title}</p><Icon className={`size-5 ${featured ? 'text-accent' : 'text-primary'}`} /></div><p className="display-font mt-4 text-2xl font-semibold tracking-tight">{value}</p><p className={`mt-1 text-xs ${featured ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>{note}</p></article>
}
