import { useMemo, useState } from 'react'
import { CalendarDays, ReceiptText, ShieldCheck, TrendingUp, Wallet } from 'lucide-react'
import { DashboardShell } from '@/components/DashboardShell'
import { QrGenerator } from '@/components/QrGenerator'
import { StaffAvatar } from '@/components/StaffAvatar'
import { StatusBadge } from '@/components/StatusBadge'
import { employeeReport, formatMoney, paymentRange, paymentTotal } from '@/lib/domain'
import { useDemoState } from '@/lib/store'

export default function StaffDashboard() {
  const state = useDemoState()
  const employee = state.employees.find((item) => item.employee_id === state.session?.employee_id)
  const defaultRange = useMemo(() => paymentRange(state.payments.filter((payment) => payment.employee_id === state.session?.employee_id)), [state.payments, state.session?.employee_id])
  const [from, setFrom] = useState(defaultRange.from)
  const [to, setTo] = useState(defaultRange.to)
  const report = useMemo(() => employee ? employeeReport(state, employee.employee_id, from, to) : null, [state, employee, from, to])
  if (!employee || !report) return null
  const payments = state.payments.filter((payment) => payment.employee_id === employee.employee_id).sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  return (
    <DashboardShell role="staff" title={`Мои чаевые, ${employee.name}`} subtitle="Только ваши платежи · данные коллег недоступны">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3"><StaffAvatar member={employee} size="md" /><div><p className="font-extrabold">{employee.employee_id}</p><p className="text-sm text-muted-foreground">Реквизиты: <span className="font-mono font-bold text-foreground">{employee.payment_details}</span></p></div></div>
        <div className="flex flex-col gap-2 sm:flex-row"><label className="text-xs font-bold">С<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="field-input mt-1" /></label><label className="text-xs font-bold">По<input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="field-input mt-1" /></label></div>
      </div>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Отчёт официанта">
        <Stat title="Сумма чаевых" value={formatMoney(report.tips_total)} icon={Wallet} featured />
        <Stat title="Платежей" value={String(report.payments_count)} icon={ReceiptText} />
        <Stat title="Средние чаевые" value={formatMoney(report.avg_tip_amount)} note="за заказ" icon={TrendingUp} />
        <Stat title="Лучший день" value={report.top_day} icon={CalendarDays} />
      </section>
      <section className="surface mt-6 overflow-hidden">
        <div className="p-5 sm:p-6"><h2 className="text-lg font-extrabold">Мои платежи</h2><p className="text-sm text-muted-foreground">Сумма чека, чаевые, итог и статус оплаты</p></div>
        <div className="overflow-x-auto"><table className="admin-table min-w-[680px]"><thead><tr><th>Дата</th><th>Платёж / чек</th><th>Чаевые</th><th>Итого</th><th>Статус</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.payment_id}><td>{new Date(payment.timestamp).toLocaleString('ru-RU')}</td><td><p className="font-bold">{payment.payment_id}</p><p className="text-xs text-muted-foreground">{payment.qr_id}</p>{payment.review && <p className="mt-1 max-w-56 text-xs font-semibold text-primary">«{payment.review}»</p>}</td><td className="font-extrabold">{formatMoney(payment.tip)}</td><td>{formatMoney(paymentTotal(payment))}</td><td><StatusBadge status={payment.status} /></td></tr>)}</tbody></table></div>
        {payments.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Ваши платежи появятся после первого клиента.</p>}
      </section>
      <section className="mt-8"><div className="mb-4 flex items-start gap-3"><ShieldCheck className="mt-1 size-5 text-primary" /><div><h2 className="text-xl font-extrabold">QR на новый чек</h2><p className="text-sm text-muted-foreground">QR будет привязан только к вам и указанному receipt_id.</p></div></div><QrGenerator fixedEmployeeId={employee.employee_id} /></section>
    </DashboardShell>
  )
}

function Stat({ title, value, note, icon: Icon, featured = false }: { title: string; value: string; note?: string; icon: typeof Wallet; featured?: boolean }) {
  return <article className={`surface p-5 ${featured ? 'bg-primary text-primary-foreground' : ''}`}><div className="flex items-center justify-between"><p className={`text-sm font-bold ${featured ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{title}</p><Icon className={`size-5 ${featured ? 'text-accent' : 'text-primary'}`} /></div><p className="display-font mt-4 break-words text-xl font-semibold tracking-tight">{value}</p>{note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}</article>
}
