import type { PaymentStatus } from '@/types'

const labels: Record<PaymentStatus, string> = { pending: 'Ожидает', succeeded: 'Успех', failed: 'Ошибка', refunded: 'Возврат' }
const styles: Record<PaymentStatus, string> = {
  pending: 'bg-amber-100 text-amber-900',
  succeeded: 'bg-emerald-100 text-emerald-900',
  failed: 'bg-red-100 text-red-900',
  refunded: 'bg-slate-200 text-slate-800',
}
export function StatusBadge({ status }: { status: PaymentStatus }) {
  return <span className={`inline-flex min-h-8 items-center rounded-full px-3 text-xs font-bold ${styles[status]}`}>{labels[status]}</span>
}
