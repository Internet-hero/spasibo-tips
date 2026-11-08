import type { PaymentStatus } from '@/types'

const labels: Record<PaymentStatus, string> = { CREATED: 'Создан', PENDING: 'Обрабатывается', SUCCESS: 'Успех', DECLINED: 'Отказ', CANCELED: 'Отменён' }
const styles: Record<PaymentStatus, string> = {
  CREATED: 'bg-slate-200 text-slate-800',
  PENDING: 'bg-amber-100 text-amber-900',
  SUCCESS: 'bg-emerald-100 text-emerald-900',
  DECLINED: 'bg-red-100 text-red-900',
  CANCELED: 'bg-slate-200 text-slate-800',
}
export function StatusBadge({ status }: { status: PaymentStatus }) {
  return <span className={`inline-flex min-h-8 items-center rounded-full px-3 text-xs font-bold ${styles[status]}`}>{labels[status]}</span>
}
