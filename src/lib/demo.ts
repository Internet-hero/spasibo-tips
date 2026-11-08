import Papa from 'papaparse'
import merchantsCsv from '@/data/merchants.csv?raw'
import employeesCsv from '@/data/employees.csv?raw'
import paymentsCsv from '@/data/payments.csv?raw'
import qrLinksCsv from '@/data/qr_links.csv?raw'
import { signQrPayload } from '@/lib/qr'
import type { AuditAction, AuditEvent, DemoState, Employee, Merchant, Payment, PaymentStatus, QrLink } from '@/types'

type MerchantRow = Omit<Merchant, never>
type EmployeeRow = Pick<Employee, 'employee_id' | 'merchant_id' | 'name' | 'payment_details'>
type PaymentRow = Omit<Payment, 'qr_id'>
type QrRow = Omit<QrLink, 'base_amount' | 'used'>

function rows<T>(csv: string) {
  return Papa.parse<T>(csv, { header: true, skipEmptyLines: true }).data
}

const merchants = rows<MerchantRow>(merchantsCsv)
const employeeRows = rows<EmployeeRow>(employeesCsv)
const paymentRows = rows<PaymentRow>(paymentsCsv)
const qrRows = rows<QrRow>(qrLinksCsv)

const featured: Record<string, Pick<Employee, 'name' | 'avatar' | 'position' | 'invite_code'>> = {
  e_001: { name: 'Вероника', avatar: '/avatars/veronika.jpg', position: 'Бариста', invite_code: 'ANNA2026' },
  e_002: { name: 'Дмитрий', avatar: '/avatars/dmitry.jpg', position: 'Официант', invite_code: 'MIKHAIL2026' },
  e_003: { name: 'Антон', avatar: '/avatars/anton.jpg', position: 'Официант', invite_code: 'SOFIA2026' },
}

function historicalAudit(payment: Payment, index: number): AuditEvent {
  const actions: Record<PaymentStatus, AuditAction> = {
    CREATED: 'payment_created',
    PENDING: 'payment_pending',
    SUCCESS: 'payment_confirmed',
    DECLINED: 'payment_declined',
    CANCELED: 'payment_canceled',
  }
  const fromStatus: Record<PaymentStatus, PaymentStatus | null> = {
    CREATED: null,
    PENDING: 'CREATED',
    SUCCESS: 'PENDING',
    DECLINED: 'PENDING',
    CANCELED: 'CREATED',
  }
  return {
    event_id: `evt_${String(index + 1).padStart(4, '0')}`,
    payment_id: payment.payment_id,
    qr_id: payment.qr_id,
    action: actions[payment.status],
    from_status: fromStatus[payment.status],
    to_status: payment.status,
    amount_total: Math.round((payment.amount + payment.tip) * 100) / 100,
    actor: payment.status === 'CANCELED' ? 'client' : 'system',
    at: payment.timestamp,
  }
}

export const createSeedState = (): DemoState => {
  const payments: Payment[] = paymentRows.map((row, index) => ({
    ...row,
    amount: Number(row.amount),
    tip: Number(row.tip),
    qr_id: `qr_${String(index + 1).padStart(3, '0')}`,
  }))
  const freshExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const qrLinks: QrLink[] = qrRows.map((row, index) => {
    const qr = {
      ...row,
      exp: index < 3 ? freshExpiry : row.exp,
      base_amount: payments[index]?.amount ?? 1000,
      used: false,
    }
    return { ...qr, signature: index < 3 ? signQrPayload(qr) : row.signature }
  })
  return {
    version: 2,
    merchants: merchants.map((merchant) => ({ ...merchant })),
    employees: employeeRows.map((employee) => ({
      ...employee,
      ...featured[employee.employee_id],
      position: featured[employee.employee_id]?.position ?? 'Официант',
      active: true,
    })),
    payments,
    qr_links: qrLinks,
    audit: payments.map(historicalAudit),
    session: null,
  }
}
