import type { DemoState, EmployeeReport, MerchantReport, Payment } from '@/types'

export const formatMoney = (value: number, withCurrency = true) => {
  const formatted = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
  return withCurrency ? `${formatted} ₽` : formatted
}

export const paymentTotal = (payment: Pick<Payment, 'amount' | 'tip'> & { amount_total?: number }) =>
  payment.amount_total ?? Math.round((payment.amount + payment.tip) * 100) / 100

// Диапазон дат по фактическим платежам: отчёт по умолчанию должен показывать данные, а не фиксированный месяц.
export function paymentRange(payments: Payment[]): { from: string; to: string } {
  if (payments.length === 0) {
    const today = new Date().toISOString().slice(0, 10)
    return { from: today, to: today }
  }
  const dates = payments.map((payment) => payment.timestamp.slice(0, 10)).sort()
  return { from: dates[0], to: dates[dates.length - 1] }
}

// report_id по ТЗ имеет вид rep_NNNN; отчёт вычисляется на лету, поэтому id детерминированный.
export function reportId(merchantId: string, period: string) {
  let hash = 0
  for (const char of `${merchantId}|${period}`) hash = (hash * 31 + char.charCodeAt(0)) % 10000
  return `rep_${String(hash).padStart(4, '0')}`
}

export function maskPaymentDetails(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.length < 4) throw new Error('Укажите последние четыре цифры реквизитов')
  return `****${digits.slice(-4)}`
}

function inPeriod(payment: Payment, from: string, to: string) {
  const timestamp = payment.timestamp.slice(0, 10)
  return timestamp >= from && timestamp <= to
}

export function merchantReport(state: DemoState, merchantId: string, from: string, to: string): MerchantReport {
  const payments = state.payments.filter((payment) => payment.merchant_id === merchantId && inPeriod(payment, from, to))
  const successful = payments.filter((payment) => payment.status === 'SUCCESS')
  const tipsTotal = successful.reduce((sum, payment) => sum + payment.tip, 0)
  const avgTipPct = successful.length
    ? successful.reduce((sum, payment) => sum + payment.tip / payment.amount * 100, 0) / successful.length
    : 0
  const period = from.slice(0, 7) === to.slice(0, 7) ? from.slice(0, 7) : `${from} — ${to}`
  return {
    report_id: reportId(merchantId, period),
    merchant_id: merchantId,
    period,
    tips_total: Math.round(tipsTotal * 100) / 100,
    payments_count: payments.length,
    avg_tip_pct: Math.round(avgTipPct * 100) / 100,
    success_rate: payments.length ? Math.round(successful.length / payments.length * 1000) / 1000 : 0,
  }
}

export function employeeReport(state: DemoState, employeeId: string, from: string, to: string): EmployeeReport {
  const payments = state.payments.filter((payment) => payment.employee_id === employeeId && inPeriod(payment, from, to))
  const successful = payments.filter((payment) => payment.status === 'SUCCESS')
  const byDay = new Map<string, number>()
  successful.forEach((payment) => byDay.set(payment.timestamp.slice(0, 10), (byDay.get(payment.timestamp.slice(0, 10)) ?? 0) + payment.tip))
  const topDay = [...byDay.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? '—'
  const tipsTotal = successful.reduce((sum, payment) => sum + payment.tip, 0)
  return {
    employee_id: employeeId,
    period: from.slice(0, 7) === to.slice(0, 7) ? from.slice(0, 7) : `${from} — ${to}`,
    tips_total: Math.round(tipsTotal * 100) / 100,
    payments_count: payments.length,
    avg_tip_amount: successful.length ? Math.round(tipsTotal / successful.length * 100) / 100 : 0,
    top_day: topDay,
  }
}

export function dailyReport(state: DemoState, merchantId: string, from: string, to: string) {
  const start = new Date(`${from}T00:00:00Z`)
  const end = new Date(`${to}T00:00:00Z`)
  const days = []
  for (let date = start; date <= end; date = new Date(date.getTime() + 86_400_000)) {
    const key = date.toISOString().slice(0, 10)
    const payments = state.payments.filter((payment) => payment.merchant_id === merchantId && payment.status === 'SUCCESS' && payment.timestamp.slice(0, 10) === key)
    days.push({
      date: key,
      day: new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(date),
      tips_total: Math.round(payments.reduce((sum, payment) => sum + payment.tip, 0) * 100) / 100,
      payments_count: payments.length,
      avg_tip_pct: payments.length ? Math.round(payments.reduce((sum, payment) => sum + payment.tip / payment.amount * 100, 0) / payments.length * 100) / 100 : 0,
    })
  }
  return days
}
