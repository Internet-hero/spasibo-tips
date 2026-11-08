import { describe, expect, it } from 'vitest'
import { createSeedState } from '@/lib/demo'
import { chartSeries, employeeReport, maskPaymentDetails, merchantReport, paymentRange, reportId } from '@/lib/domain'
import { calcAmounts, gatewayHash, signQrPayload, verifyQrSignature } from '@/lib/qr'
import { cancelPaymentInState, checkRateLimit, confirmPaymentInState, createPaymentInState, isValidState, resetRateLimit, resolvePaymentInState, submitReviewInState, validateQr } from '@/lib/store'
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

  it('отклоняет истёкший QR и неверный receipt_id, а QR сжигает только успешная оплата', () => {
    const seed = createSeedState()
    expect(() => validateQr(seed, 'qr_004')).toThrowError(expect.objectContaining({ code: 'QR_EXPIRED' }))
    expect(() => validateQr(seed, 'qr_001', 'r_9999')).toThrowError(expect.objectContaining({ code: 'RECEIPT_MISMATCH' }))
    // Связь QR → Payment = 1:N: попыток может быть несколько, пока одна не закончится SUCCESS.
    const first = createPaymentInState(seed, input())
    const second = createPaymentInState(first.state, input({ idempotency_key: 'another-key' }))
    expect(second.payment.payment_id).not.toBe(first.payment.payment_id)
    const paid = confirmPaymentInState(second.state, first.payment.payment_id)
    expect(paid.qr_links.find((qr) => qr.qr_id === 'qr_001')?.used).toBe(true)
    expect(() => createPaymentInState(paid, input({ idempotency_key: 'third-key' }))).toThrowError(expect.objectContaining({ code: 'QR_USED' }))
  })

  it('ограничивает чаевые 50% и отклоняет подмену суммы чека', () => {
    const seed = createSeedState()
    expect(() => createPaymentInState(seed, input({ tip_pct: 150 }))).toThrowError(expect.objectContaining({ code: 'TIP_OUT_OF_RANGE' }))
    expect(() => createPaymentInState(seed, input({ base_amount: 1 }))).toThrowError(expect.objectContaining({ code: 'AMOUNT_OUT_OF_RANGE' }))
  })

  it('использует заданную hash-формулу вне обязательных демо-сценариев', () => {
    expect(gatewayHash('qr_001', 'c82561')).toBe(9)
    expect(gatewayHash('qr_003', '4443ae')).toBe(7)
  })

  it('допускает 0% и 50%, но не отрицательные или большие чаевые', () => {
    expect(calcAmounts(637, 0)).toEqual({ tip: 0, total: 637 })
    expect(calcAmounts(637, 50)).toEqual({ tip: 318.5, total: 955.5 })
    expect(createPaymentInState(createSeedState(), input({ tip_pct: 50 })).payment.tip).toBe(318.5)
    expect(() => createPaymentInState(createSeedState(), input({ tip_pct: -1 }))).toThrowError(expect.objectContaining({ code: 'TIP_OUT_OF_RANGE' }))
    expect(() => createPaymentInState(createSeedState(), input({ tip_pct: 50.01 }))).toThrowError(expect.objectContaining({ code: 'TIP_OUT_OF_RANGE' }))
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
    expect(report).toEqual({ report_id: expect.stringMatching(/^rep_\d{4}$/), merchant_id: 'm_001', period: '2025-11', tips_total: 1031.25, payments_count: 6, avg_tip_pct: 23.54, success_rate: 0.833 })
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

describe('Отзыв, суммы и диапазон отчёта', () => {
  it('сохраняет отзыв только по успешному платежу', () => {
    const seed = createSeedState()
    const created = createPaymentInState(seed, input())
    expect(() => submitReviewInState(created.state, created.payment.payment_id, 'Отличный сервис')).toThrowError(expect.objectContaining({ code: 'REVIEW_NOT_ALLOWED' }))
    const paid = confirmPaymentInState(created.state, created.payment.payment_id)
    const reviewed = submitReviewInState(paid, created.payment.payment_id, '  Отличный сервис  ')
    expect(reviewed.payments.find((payment) => payment.payment_id === created.payment.payment_id)).toMatchObject({ review: 'Отличный сервис' })
    expect(reviewed.payments.find((payment) => payment.payment_id === created.payment.payment_id)?.reviewed_at).toBeTruthy()
    expect(() => submitReviewInState(reviewed, created.payment.payment_id, 'ок')).toThrowError(expect.objectContaining({ code: 'REVIEW_TOO_SHORT' }))
  })

  it('пишет в платёж amount_total и tip_amount по схеме API', () => {
    const seed = createSeedState()
    const created = createPaymentInState(seed, input({ tip_pct: 10 }))
    expect(created.payment).toMatchObject({ amount: 637, tip: 63.7, tip_amount: 63.7, amount_total: 700.7 })
  })

  it('считает диапазон отчёта по фактическим платежам', () => {
    const seed = createSeedState()
    const range = paymentRange(seed.payments)
    expect(range.from).toMatch(/^2025-11-0[1-4]$/)
    expect(range.to).toMatch(/^2025-11-0[1-4]$/)
    expect(paymentRange([]).from).toBe(paymentRange([]).to)
  })

  it('даёт детерминированный report_id формата rep_NNNN', () => {
    expect(reportId('m_001', '2025-11')).toMatch(/^rep_\d{4}$/)
    expect(reportId('m_001', '2025-11')).toBe(reportId('m_001', '2025-11'))
    expect(reportId('m_001', '2025-11')).not.toBe(reportId('m_002', '2025-11'))
  })
})

describe('Правила NFR-5 и целостность состояния', () => {
  it('пропускает 10 попыток в минуту и отклоняет одиннадцатую', () => {
    resetRateLimit()
    const started = 1_700_000_000_000
    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect(() => checkRateLimit('qr_rate', started + attempt)).not.toThrow()
    }
    expect(() => checkRateLimit('qr_rate', started + 11)).toThrowError(expect.objectContaining({ code: 'RATE_LIMITED', httpStatus: 429, retryable: true }))
    expect(() => checkRateLimit('qr_rate', started + 61_000)).not.toThrow()
    resetRateLimit()
  })

  it('не сжигает QR при отмене, но сжигает после успешной оплаты', () => {
    const seed = createSeedState()
    const created = createPaymentInState(seed, input())
    const canceled = cancelPaymentInState(created.state, created.payment.payment_id)
    expect(canceled.qr_links.find((qr) => qr.qr_id === 'qr_001')?.used).toBe(false)
    const paid = confirmPaymentInState(created.state, created.payment.payment_id)
    expect(paid.qr_links.find((qr) => qr.qr_id === 'qr_001')?.used).toBe(true)
  })

  it('отличает валидное состояние от повреждённого', () => {
    expect(isValidState(createSeedState())).toBe(true)
    expect(isValidState({ version: 3 })).toBe(false)
    expect(isValidState({ ...createSeedState(), merchants: {} })).toBe(false)
    expect(isValidState(null)).toBe(false)
    expect(isValidState({ ...createSeedState(), version: 2 })).toBe(false)
  })
})

describe('Совместимость с исходными данными и прототипом', () => {
  it('подпись из qr_links.csv совпадает с HMAC веб-приложения', () => {
    // Строки взяты из case_3_tips/qr_links.csv: тот же payload должен давать ту же подпись,
    // что в CSV и в CLI-прототипе, иначе контракт QR разъедется.
    const rows = [
      { merchant_id: 'm_001', employee_id: 'e_001', receipt_id: 'r_1001', nonce: 'c82561', exp: '2025-11-01T23:59:00Z', signature: '68d0f361ac38c12b' },
      { merchant_id: 'm_001', employee_id: 'e_002', receipt_id: 'r_1002', nonce: 'a6bbc9', exp: '2025-11-01T23:59:00Z', signature: '651b504dbe897c0e' },
      { merchant_id: 'm_001', employee_id: 'e_003', receipt_id: 'r_1003', nonce: '4443ae', exp: '2025-11-01T23:59:00Z', signature: 'e42db7c2c59521c8' },
    ]
    for (const row of rows) {
      expect(signQrPayload(row)).toBe(row.signature)
    }
  })

  it('seed пересчитывает подпись, когда обновляет срок действия демо-QR', () => {
    const seed = createSeedState()
    for (const qrId of ['qr_001', 'qr_002', 'qr_003']) {
      const qr = seed.qr_links.find((item) => item.qr_id === qrId)!
      expect(verifyQrSignature(qr)).toBe(true)
      expect(new Date(qr.exp).getTime()).toBeGreaterThan(Date.now())
    }
  })
})

describe('График отчёта', () => {
  const day = (index: number, tip: number) => ({
    date: new Date(Date.UTC(2025, 0, 1 + index)).toISOString().slice(0, 10),
    day: String(index + 1),
    tips_total: tip,
    payments_count: tip > 0 ? 1 : 0,
    avg_tip_pct: tip > 0 ? 10 : 0,
  })

  it('рисует длинный период по месяцам, а не по дням', () => {
    const days = Array.from({ length: 365 }, (_, index) => day(index, index === 0 ? 100 : 0))
    const series = chartSeries(days)
    expect(series.granularity).toBe('month')
    expect(series.points).toHaveLength(12)
    expect(series.points[0].tips_total).toBe(100)
    expect(series.points.reduce((sum, point) => sum + point.tips_total, 0)).toBe(100)
  })

  it('сворачивает средний период по неделям и оставляет короткий по дням', () => {
    const month = Array.from({ length: 60 }, (_, index) => day(index, 10))
    expect(chartSeries(month).granularity).toBe('week')
    expect(chartSeries(month).points.reduce((sum, point) => sum + point.tips_total, 0)).toBe(600)
    const week = Array.from({ length: 7 }, (_, index) => day(index, 10))
    expect(chartSeries(week).granularity).toBe('day')
    expect(chartSeries(week).points).toHaveLength(7)
  })
})
