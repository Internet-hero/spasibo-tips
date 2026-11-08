export type Role = 'staff' | 'manager' | 'admin'
export type MerchantStatus = 'ACTIVE' | 'BLOCKED' | 'PENDING'
export type PaymentStatus = 'CREATED' | 'PENDING' | 'SUCCESS' | 'DECLINED' | 'CANCELED'
export type AuditAction = 'payment_created' | 'payment_pending' | 'payment_confirmed' | 'payment_declined' | 'payment_canceled'

export interface Merchant {
  merchant_id: string
  name: string
  status: MerchantStatus
  description: string
}

export interface Employee {
  employee_id: string
  merchant_id: string
  name: string
  payment_details: string
  avatar?: string
  position?: string
  active: boolean
  invite_code?: string
}

export interface QrLink {
  qr_id: string
  merchant_id: string
  employee_id: string
  receipt_id: string
  nonce: string
  exp: string
  signature: string
  base_amount: number
  used: boolean
}

export interface Payment {
  payment_id: string
  merchant_id: string
  employee_id: string
  qr_id: string
  amount: number
  tip: number
  status: PaymentStatus
  timestamp: string
  idempotency_key?: string
  confirm_token?: string
  error_code?: string
}

export interface AuditEvent {
  event_id: string
  payment_id: string
  qr_id: string
  action: AuditAction
  from_status: PaymentStatus | null
  to_status: PaymentStatus
  amount_total: number
  actor: 'system' | 'client' | 'officer'
  at: string
}

export interface Session {
  role: Role
  merchant_id?: string
  employee_id?: string
}

export interface DemoState {
  version: 2
  merchants: Merchant[]
  employees: Employee[]
  payments: Payment[]
  qr_links: QrLink[]
  audit: AuditEvent[]
  session: Session | null
}

export interface PaymentInput {
  qr_id: string
  receipt_id: string
  base_amount: number
  tip_pct: number
  idempotency_key: string
}

export interface QrGenerationInput {
  employee_id: string
  receipt_id: string
  base_amount: number
}

export interface MerchantReport {
  merchant_id: string
  period: string
  tips_total: number
  payments_count: number
  avg_tip_pct: number
  success_rate: number
}

export interface EmployeeReport {
  employee_id: string
  period: string
  tips_total: number
  payments_count: number
  avg_tip_amount: number
  top_day: string
}
