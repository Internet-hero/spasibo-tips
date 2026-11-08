import { describe, expect, it } from 'vitest'
import { createSeedState } from '@/lib/demo'
import { employeeReport, maskPaymentDetails, merchantReport } from '@/lib/domain'
import { calcAmounts, gatewayHash, signQrPayload, verifyQrSignature } from '@/lib/qr'
import { cancelPaymentInState, confirmPaymentInState, createPaymentInState, resolvePaymentInState, validateQr } from '@/lib/store'
import type { PaymentInput } from '@/types'

const input = (patch: Partial<PaymentInput> = {}): PaymentInput => ({
  qr_id: 'qr_001',
  receipt_id: 'r_1001',
  base_amount: 637,
  tip_pct: 5,
  idempotency_key: 'test-payment-key',
  ...patch,
})

describe('T3: QR и платёжный контур', () => {
  it('T3-1: считает qr_001 и подтверждает SUCCESS', () => {
    const seed = createSeedState()
    expect(calcAmounts(637, 5)).toEqual({ tip: 31.85, total: 668.85 })
    const created = createPaymentInState(seed, input())
    const paid = confirmPaymentInState(created.state, created.payment.payment_id)
    const payment = paid.payments.find((item) => item.payment_id === created.payment.payment_id)
    expect(payment?.status).toBe('SUCCESS')
    expect(payment?.tip).toBe(31.85)
    expect(paid.qr_links.find((item) => item.qr_id === 'qr_001')?.used).toBe(true)
    expect(paid.audit.slice(-2).map((event) => event.to_status)).toEqual(['PENDING', 'SUCCESS'])
  })

  it('T3-2: qr_003 возвращает DECLINED и CARD_DECLINED', () => {
    const created = createPaymentInState(createSeedState(), input({ qr_id: 'qr_003', receipt_id: 'r_1003', base_amount: 911, tip_pct: 15 }))
    const declined = confirmPaymentInState(created.state, created.payment.payment_id)
    const payment = declined.payments.find((item) => item.payment_id === created.payment.payment_id)
    expect(created.payment.tip).toBe(136.65)
    expect(payment?.status).toBe('DECLINED')
    expect(payment?.error_code).toBe('CARD_DECLINED')
  })

  it('T3-3: испорченная подпись не создаёт платёж', () => {
    const seed = createSeedState()
    seed.qr_links = seed.qr_links.map((qr) => qr.qr_id === 'qr_001' ? { ...qr, signature: '0000000000000000' } : qr)
    expect(() => createPaymentInState(seed, input())).toThrowError(expect.objectContaining({ code: 'INVALID_QR' }))
    expect(seed.payments).toHaveLength(100)
  })

  it('T3-4: повтор idempotency_key возвращает тот же payment_id и не меняет состояние', () => {
    const first = createPaymentInState(createSeedState(), input())
    const second = createPaymentInState(first.state, input())
    expect(second.payment.payment_id).toBe(first.payment.payment_id)
    expect(second.state).toBe(first.state)
    expect(second.state.payments.filter((payment) => payment.idempotency_key === 'test-payment-key')).toHaveLength(1)
  })

  it('T3-5: CREATED отменяется, а отмена из PENDING запрещена', () => {
    const created = createPaymentInState(createSeedState(), input())
    const canceled = cancelPaymentInState(created.state, created.payment.payment_id)
    expect(canceled.payments.find((payment) => payment.payment_id === created.payment.payment_id)?.status).toBe('CANCELED')
    const pending = { ...created.state, payments: created.state.payments.map((payment) => payment.payment_id === created.payment.payment_id ? { ...payment, status: 'PENDING' as const } : payment) }
    expect(() => cancelPaymentInState(pending, created.payment.payment_id)).toThrowError(expect.objectContaining({ code: 'CANCEL_NOT_ALLOWED', httpStatus: 409 }))
    const successful = confirmPaymentInState(created.state, created.payment.payment_id)
    expect(() => cancelPaymentInState(successful, created.payment.payment_id)).toThrowError(expect.objectContaining({ code: 'CANCEL_NOT_ALLOWED', httpStatus: 409 }))
  })
})

describe('QR: подпись, TTL, чек и границы', () => {
  it('проверяет HMAC-SHA256 быстрее 50 мс', () => {
    const qr = createSeedState().qr_links[0]
    const started = performance.now()
    expect(verifyQrSignature(qr)).toBe(true)
    expect(performance.now() - started).toBeLessThan(50)
  })

  it('отклоняет истёкший QR, неверный receipt_id и использованный nonce', () => {
    const seed = createSeedState()
    expect(() => validateQr(seed, 'qr_004')).toThrowError(expect.objectContaining({ code: 'QR_EXPIRED' }))
    expect(() => validateQr(seed, 'qr_001', 'r_9999')).toThrowError(expect.objectContaining({ code: 'RECEIPT_MISMATCH' }))
    const created = createPaymentInState(seed, input())
    expect(() => createPaymentInState(created.state, input({ idempotency_key: 'another-key' }))).toThrowError(expect.objectContaining({ code: 'QR_USED' }))
  })

  it('не ограничивает чаевые 50% и отклоняет подмену суммы чека', () => {
    const seed = createSeedState()
    const created = createPaymentInState(seed, input({ tip_pct: 150 }))
    expect(created.payment.tip).toBe(955.5)
    expect(() => createPaymentInState(seed, input({ base_amount: 1 }))).toThrowError(expect.objectContaining({ code: 'AMOUNT_OUT_OF_RANGE' }))
  })

  it('использует заданную hash-формулу вне обязательных демо-сценариев', () => {
    expect(gatewayHash('qr_001', 'c82561')).toBe(9)
    expect(gatewayHash('qr_003', '4443ae')).toBe(7)
  })

  it('допускает 0%, 50% и большие суммы, но не отрицательные чаевые', () => {
    expect(calcAmounts(637, 0)).toEqual({ tip: 0, total: 637 })
    expect(calcAmounts(637, 50)).toEqual({ tip: 318.5, total: 955.5 })
    expect(calcAmounts(637, 150)).toEqual({ tip: 955.5, total: 1592.5 })
    expect(() => createPaymentInState(createSeedState(), input({ tip_pct: -1 }))).toThrowError(expect.objectContaining({ code: 'TIP_OUT_OF_RANGE' }))
  })

  it('не пропускает QR заблокированного мерчанта', () => {
    const seed = createSeedState()
    seed.merchants = seed.merchants.map((merchant) => merchant.merchant_id === 'm_001' ? { ...merchant, status: 'BLOCKED' } : merchant)
    expect(() => validateQr(seed, 'qr_001')).toThrowError(expect.objectContaining({ code: 'MERCHANT_BLOCKED', httpStatus: 403 }))
  })

  it('переводит TIMEOUT в PENDING и завершает платёж при повторной проверке', async () => {
    const { emulateGateway } = await import('@/lib/qr')
    const seed = createSeedState()
    const source = seed.qr_links[0]
    let nonce = ''
    for (let index = 0; index < 100; index += 1) {
      const candidate = index.toString(16).padStart(6, '0')
      if (gatewayHash('qr_custom', candidate) === 9) { nonce = candidate; break }
    }
    expect(nonce).not.toBe('')
    const qr = { ...source, qr_id: 'qr_custom', receipt_id: 'r_9999', nonce, used: false, signature: '' }
    qr.signature = signQrPayload(qr)
    expect(emulateGateway(qr)).toEqual({ status: 'PENDING', errorCode: 'GATEWAY_TIMEOUT' })
    seed.qr_links = [qr, ...seed.qr_links]
    const created = createPaymentInState(seed, input({ qr_id: 'qr_custom', receipt_id: 'r_9999' }))
    const pending = confirmPaymentInState(created.state, created.payment.payment_id)
    expect(pending.payments.find((payment) => payment.payment_id === created.payment.payment_id)).toMatchObject({ status: 'PENDING', error_code: 'GATEWAY_TIMEOUT' })
    const resolved = resolvePaymentInState(pending, created.payment.payment_id)
    expect(resolved.payments.find((payment) => payment.payment_id === created.payment.payment_id)).toMatchObject({ status: 'SUCCESS', error_code: undefined })
    expect(resolved.audit.at(-1)).toMatchObject({ action: 'payment_confirmed', from_status: 'PENDING', to_status: 'SUCCESS' })
    expect(resolvePaymentInState(resolved, created.payment.payment_id)).toBe(resolved)
  })
})

describe('Отчётность, ИБ и аудит', () => {
  it('отчёт мерчанта учитывает увеличенные демонстрационные чаевые', () => {
    const report = merchantReport(createSeedState(), 'm_001', '2025-11-01', '2025-11-30')
    expect(report).toEqual({ merchant_id: 'm_001', period: '2025-11', tips_total: 1031.25, payments_count: 6, avg_tip_pct: 23.54, success_rate: 0.833 })
  })

  it('отчёт официанта содержит только его платежи и средний чек 350 ₽', () => {
    const report = employeeReport(createSeedState(), 'e_001', '2025-11-01', '2025-11-30')
    expect(report).toEqual({ employee_id: 'e_001', period: '2025-11', tips_total: 700, payments_count: 2, avg_tip_amount: 350, top_day: '2025-11-03' })
  })

  it('хранит только маску реквизитов', () => {
    expect(maskPaymentDetails('1234 5678 9012 3456')).toBe('****3456')
    expect(maskPaymentDetails('****1001')).toBe('****1001')
    expect(() => maskPaymentDetails('123')).toThrow('четыре')
  })

  it('событие аудита содержит все обязательные поля', () => {
    const event = createSeedState().audit[0]
    expect(Object.keys(event)).toEqual(['event_id', 'payment_id', 'qr_id', 'action', 'from_status', 'to_status', 'amount_total', 'actor', 'at'])
  })
})
