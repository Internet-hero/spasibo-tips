import { useSyncExternalStore } from 'react'
import { createSeedState } from '@/lib/demo'
import { calcAmounts, emulateGateway, signQrPayload, verifyQrSignature } from '@/lib/qr'
import type { AuditAction, AuditEvent, DemoState, Employee, Merchant, Payment, PaymentInput, PaymentStatus, QrGenerationInput, QrLink, Role } from '@/types'

const STORAGE_KEY = 'spasibo-demo-state-v3'
const listeners = new Set<() => void>()
let state: DemoState | null = null
const attempts = new Map<string, number[]>()

const uid = () => typeof crypto !== 'undefined' && crypto.randomUUID
  ? crypto.randomUUID()
  : `${Date.now()}-${Math.random().toString(36).slice(2)}`

export class DemoError extends Error {
  readonly code: string
  readonly httpStatus: number
  readonly retryable: boolean

  constructor(code: string, message: string, httpStatus = 422, retryable = false) {
    super(message)
    this.name = 'DemoError'
    this.code = code
    this.httpStatus = httpStatus
    this.retryable = retryable
  }
}

const loadState = (): DemoState => {
  if (typeof window === 'undefined') return createSeedState()
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as DemoState
      if (parsed.version === 3) return parsed
    }
  } catch {
    // Повреждённый локальный черновик не блокирует демо.
  }
  return createSeedState()
}

const getState = () => {
  if (!state) state = loadState()
  return state
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const commit = (next: DemoState) => {
  state = next
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  listeners.forEach((listener) => listener())
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        state = JSON.parse(event.newValue) as DemoState
        listeners.forEach((listener) => listener())
      } catch {
        // Игнорируем повреждённые значения из других вкладок.
      }
    }
  })
}

export const useDemoState = () => useSyncExternalStore(subscribe, getState, getState)

function nextNumericId(values: string[], prefix: string, width: number) {
  const maximum = values.reduce((max, value) => Math.max(max, Number(value.replace(prefix, '')) || 0), 0)
  return `${prefix}${String(maximum + 1).padStart(width, '0')}`
}

function audit(events: AuditEvent[], payment: Payment, action: AuditAction, from: PaymentStatus | null, to: PaymentStatus, actor: AuditEvent['actor']): AuditEvent {
  return {
    event_id: nextNumericId(events.map((event) => event.event_id), 'evt_', 4),
    payment_id: payment.payment_id,
    qr_id: payment.qr_id,
    action,
    from_status: from,
    to_status: to,
    amount_total: Math.round((payment.amount + payment.tip) * 100) / 100,
    actor,
    at: new Date().toISOString(),
  }
}

export function validateQr(current: DemoState, qrId: string, receiptId?: string, now = new Date()) {
  const qr = current.qr_links.find((item) => item.qr_id === qrId)
  if (!qr || !verifyQrSignature(qr)) throw new DemoError('INVALID_QR', 'QR-код недействителен или его подпись повреждена')
  if (new Date(qr.exp).getTime() < now.getTime()) throw new DemoError('QR_EXPIRED', 'Срок действия QR истёк. Запросите новый QR на чек', 410, true)
  if (qr.used) throw new DemoError('QR_USED', 'Этот одноразовый QR уже использован', 409)
  const merchant = current.merchants.find((item) => item.merchant_id === qr.merchant_id)
  if (!merchant || merchant.status === 'BLOCKED') throw new DemoError('MERCHANT_BLOCKED', 'Заведение заблокировано', 403)
  if (merchant.status !== 'ACTIVE') throw new DemoError('MERCHANT_NOT_ACTIVE', 'Заведение ожидает проверки администратора', 403)
  const employee = current.employees.find((item) => item.employee_id === qr.employee_id && item.merchant_id === qr.merchant_id)
  if (!employee || !employee.active) throw new DemoError('INVALID_QR', 'Сотрудник из QR не найден или отключён')
  if (receiptId !== undefined && receiptId !== qr.receipt_id) throw new DemoError('RECEIPT_MISMATCH', 'QR не соответствует этому чеку')
  return { qr, merchant, employee }
}

export function createPaymentInState(current: DemoState, input: PaymentInput): { state: DemoState; payment: Payment } {
  const duplicate = current.payments.find((payment) => payment.idempotency_key === input.idempotency_key)
  if (duplicate) return { state: current, payment: duplicate }
  const { qr } = validateQr(current, input.qr_id, input.receipt_id)
  if (!Number.isFinite(input.base_amount) || input.base_amount <= 0 || input.base_amount > 1_000_000 || Math.abs(input.base_amount - qr.base_amount) > 0.001) {
    throw new DemoError('AMOUNT_OUT_OF_RANGE', 'Сумма чека должна быть больше 0 и не больше 1 000 000 ₽')
  }
  if (!Number.isFinite(input.tip_pct) || input.tip_pct < 0 || input.tip_pct > 50) {
    throw new DemoError('TIP_OUT_OF_RANGE', 'Чаевые должны быть от 0% до 50% суммы чека')
  }
  const { tip } = calcAmounts(qr.base_amount, input.tip_pct)
  const payment: Payment = {
    payment_id: nextNumericId(current.payments.map((item) => item.payment_id), 'p_', 4),
    merchant_id: qr.merchant_id,
    employee_id: qr.employee_id,
    qr_id: qr.qr_id,
    amount: qr.base_amount,
    tip,
    status: 'CREATED',
    timestamp: new Date().toISOString(),
    idempotency_key: input.idempotency_key,
    confirm_token: uid(),
  }
  const event = audit(current.audit, payment, 'payment_created', null, 'CREATED', 'client')
  return {
    state: {
      ...current,
      payments: [payment, ...current.payments],
      qr_links: current.qr_links.map((item) => item.qr_id === qr.qr_id ? { ...item, used: true } : item),
      audit: [...current.audit, event],
    },
    payment,
  }
}

export function confirmPaymentInState(current: DemoState, paymentId: string): DemoState {
  const payment = current.payments.find((item) => item.payment_id === paymentId)
  if (!payment) throw new DemoError('PAYMENT_NOT_FOUND', 'Платёж не найден', 404)
  if (payment.status !== 'CREATED') throw new DemoError('PAYMENT_NOT_CONFIRMABLE', 'Подтвердить можно только созданный платёж', 409)
  const qr = current.qr_links.find((item) => item.qr_id === payment.qr_id)
  if (!qr) throw new DemoError('INVALID_QR', 'QR платежа не найден')
  const pending: Payment = { ...payment, status: 'PENDING' }
  const pendingEvent = audit(current.audit, pending, 'payment_pending', 'CREATED', 'PENDING', 'client')
  const result = emulateGateway(qr)
  const confirmed: Payment = { ...pending, status: result.status, error_code: result.errorCode }
  const events = [...current.audit, pendingEvent]
  if (result.status === 'SUCCESS') events.push(audit(events, confirmed, 'payment_confirmed', 'PENDING', 'SUCCESS', 'system'))
  if (result.status === 'DECLINED') events.push(audit(events, confirmed, 'payment_declined', 'PENDING', 'DECLINED', 'system'))
  return {
    ...current,
    payments: current.payments.map((item) => item.payment_id === paymentId ? confirmed : item),
    audit: events,
  }
}

export function resolvePaymentInState(current: DemoState, paymentId: string): DemoState {
  const payment = current.payments.find((item) => item.payment_id === paymentId)
  if (!payment) throw new DemoError('PAYMENT_NOT_FOUND', 'Платёж не найден', 404)
  if (payment.status !== 'PENDING') return current
  const resolved: Payment = { ...payment, status: 'SUCCESS', error_code: undefined }
  const event = audit(current.audit, resolved, 'payment_confirmed', 'PENDING', 'SUCCESS', 'system')
  return {
    ...current,
    payments: current.payments.map((item) => item.payment_id === paymentId ? resolved : item),
    audit: [...current.audit, event],
  }
}

export function cancelPaymentInState(current: DemoState, paymentId: string): DemoState {
  const payment = current.payments.find((item) => item.payment_id === paymentId)
  if (!payment) throw new DemoError('PAYMENT_NOT_FOUND', 'Платёж не найден', 404)
  if (payment.status !== 'CREATED') throw new DemoError('CANCEL_NOT_ALLOWED', 'Отменить можно только платёж до начала подтверждения', 409)
  const canceled: Payment = { ...payment, status: 'CANCELED' }
  const event = audit(current.audit, canceled, 'payment_canceled', 'CREATED', 'CANCELED', 'client')
  return {
    ...current,
    payments: current.payments.map((item) => item.payment_id === paymentId ? canceled : item),
    audit: [...current.audit, event],
  }
}

function checkRateLimit(qrId: string) {
  const now = Date.now()
  const recent = (attempts.get(qrId) ?? []).filter((timestamp) => now - timestamp < 60_000)
  if (recent.length >= 10) throw new DemoError('RATE_LIMITED', 'Слишком много попыток. Повторите через минуту', 429, true)
  attempts.set(qrId, [...recent, now])
}

export const demoActions = {
  createPayment(input: PaymentInput) {
    const duplicate = getState().payments.find((payment) => payment.idempotency_key === input.idempotency_key)
    if (!duplicate) checkRateLimit(input.qr_id)
    const result = createPaymentInState(getState(), input)
    if (result.state !== getState()) commit(result.state)
    return result.payment
  },
  confirmPayment(paymentId: string) {
    commit(confirmPaymentInState(getState(), paymentId))
  },
  resolvePayment(paymentId: string) {
    commit(resolvePaymentInState(getState(), paymentId))
  },
  cancelPayment(paymentId: string) {
    commit(cancelPaymentInState(getState(), paymentId))
  },
  login(email: string, password: string, inviteCode: string, role: Role = 'manager'): { ok: true; role: Role } | { ok: false; error: string } {
    const current = getState()
    if (inviteCode.trim()) {
      const employee = current.employees.find((member) => member.invite_code === inviteCode.trim().toUpperCase() && member.active)
      if (!employee) return { ok: false, error: 'Проверьте код приглашения' }
      commit({ ...current, session: { role: 'staff', employee_id: employee.employee_id, merchant_id: employee.merchant_id } })
      return { ok: true, role: 'staff' }
    }
    if (!email.trim() || !password.trim()) return { ok: false, error: 'Введите любые непустые логин и пароль' }
    const session: DemoState['session'] = role === 'staff'
      ? { role, employee_id: 'e_001', merchant_id: 'm_001' }
      : role === 'manager' ? { role, merchant_id: 'm_001' } : { role }
    commit({ ...current, session })
    return { ok: true, role }
  },
  logout() {
    commit({ ...getState(), session: null })
  },
  addStaff(input: { name: string; payment_details: string }) {
    const current = getState()
    const merchantId = current.session?.merchant_id ?? 'm_001'
    const employee: Employee = {
      employee_id: nextNumericId(current.employees.map((item) => item.employee_id), 'e_', 3),
      merchant_id: merchantId,
      name: input.name.trim(),
      payment_details: input.payment_details,
      position: 'Официант',
      active: true,
      invite_code: Math.random().toString(36).slice(2, 8).toUpperCase(),
    }
    commit({ ...current, employees: [...current.employees, employee] })
    return employee
  },
  updateStaff(id: string, patch: Partial<Pick<Employee, 'name' | 'payment_details' | 'active'>>) {
    const current = getState()
    commit({ ...current, employees: current.employees.map((member) => member.employee_id === id ? { ...member, ...patch } : member) })
  },
  setStaffActive(id: string, active: boolean) {
    demoActions.updateStaff(id, { active })
  },
  addQr(input: QrGenerationInput) {
    const current = getState()
    const merchantId = current.session?.merchant_id ?? 'm_001'
    const merchant = current.merchants.find((item) => item.merchant_id === merchantId)
    const employee = current.employees.find((item) => item.employee_id === input.employee_id && item.merchant_id === merchantId && item.active)
    if (!merchant || merchant.status !== 'ACTIVE') throw new DemoError('MERCHANT_NOT_ACTIVE', 'QR может создать только активное заведение', 403)
    if (!employee) throw new DemoError('INVALID_QR', 'Выберите сотрудника своего заведения')
    if (!/^r_\d{4}$/.test(input.receipt_id)) throw new DemoError('INVALID_RECEIPT', 'Номер чека должен иметь формат r_1001')
    if (current.qr_links.some((item) => item.merchant_id === merchantId && item.receipt_id === input.receipt_id)) {
      throw new DemoError('RECEIPT_EXISTS', 'QR для этого чека уже существует', 409)
    }
    if (!Number.isFinite(input.base_amount) || input.base_amount <= 0 || input.base_amount > 1_000_000) {
      throw new DemoError('AMOUNT_OUT_OF_RANGE', 'Укажите сумму чека от 0,01 до 1 000 000 ₽')
    }
    const nonceBytes = new Uint8Array(3)
    crypto.getRandomValues(nonceBytes)
    const qr: QrLink = {
      qr_id: nextNumericId(current.qr_links.map((item) => item.qr_id), 'qr_', 3),
      merchant_id: merchantId,
      employee_id: employee.employee_id,
      receipt_id: input.receipt_id,
      nonce: [...nonceBytes].map((value) => value.toString(16).padStart(2, '0')).join(''),
      exp: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      signature: '',
      base_amount: Math.round(input.base_amount * 100) / 100,
      used: false,
    }
    qr.signature = signQrPayload(qr)
    commit({ ...current, qr_links: [qr, ...current.qr_links] })
    return qr
  },
  registerVenue(input: Pick<Merchant, 'name' | 'description'>) {
    const current = getState()
    const merchant: Merchant = {
      merchant_id: nextNumericId(current.merchants.map((item) => item.merchant_id), 'm_', 3),
      name: input.name.trim(),
      description: input.description.trim(),
      status: 'PENDING',
    }
    commit({ ...current, merchants: [...current.merchants, merchant], session: { role: 'manager', merchant_id: merchant.merchant_id } })
    return merchant
  },
  toggleVenue(id: string) {
    const current = getState()
    commit({
      ...current,
      merchants: current.merchants.map((merchant) => merchant.merchant_id === id
        ? { ...merchant, status: merchant.status === 'ACTIVE' ? 'BLOCKED' as const : 'ACTIVE' as const }
        : merchant),
    })
  },
  resetDemo() {
    const fresh = createSeedState()
    fresh.session = getState().session
    commit(fresh)
  },
}
