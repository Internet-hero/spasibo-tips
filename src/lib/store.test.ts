import { describe, expect, it } from 'vitest'
import { createSeedState } from '@/lib/demo'
import { displayGuestName, tableProgress, wallTips } from '@/lib/domain'
import { confirmPaymentInState, createPaymentInState } from '@/lib/store'
import type { PaymentInput } from '@/types'

const input = (patch: Partial<PaymentInput> = {}): PaymentInput => ({
  qrToken: 'anna',
  staffId: 'staff-anna',
  amount: 15_000,
  displayName: 'Дмитрий',
  isAnonymous: false,
  message: 'Спасибо за утро и за раф',
  showOnWall: true,
  isGoalTopup: true,
  idempotencyKey: 'test-payment-key',
  guestId: 'test-guest',
  ...patch,
})

describe('платёжный контур', () => {
  it('создаёт сумму в копейках и не дублирует платёж по idempotency_key', () => {
    const seed = createSeedState()
    const first = createPaymentInState(seed, input())
    const second = createPaymentInState(first.state, input())
    expect(first.tip.amount).toBe(15_000)
    expect(first.state.tips).toHaveLength(seed.tips.length + 1)
    expect(second.tip.id).toBe(first.tip.id)
    expect(second.state).toBe(first.state)
  })

  it('подтверждает платёж однократно и закрывает цель без двойного начисления', () => {
    const seed = createSeedState()
    const created = createPaymentInState(seed, input())
    const paid = confirmPaymentInState(created.state, created.tip.publicId)
    const confirmedAgain = confirmPaymentInState(paid, created.tip.publicId)
    const anna = paid.staff.find((member) => member.id === 'staff-anna')
    expect(anna?.goal.currentAmount).toBe(500_000)
    expect(anna?.goal.currentAmount).toBe(anna?.goal.targetAmount)
    expect(paid.tips.find((tip) => tip.id === created.tip.id)?.isGoalTopup).toBe(true)
    expect(confirmedAgain).toBe(paid)
  })

  it('не проводит повторное подтверждение после ошибки', () => {
    const seed = createSeedState()
    const created = createPaymentInState(seed, input())
    const failed = confirmPaymentInState(created.state, created.tip.publicId, true)
    const retried = confirmPaymentInState(failed, created.tip.publicId)
    expect(failed.tips.find((tip) => tip.id === created.tip.id)?.status).toBe('failed')
    expect(retried).toBe(failed)
  })

  it('не даёт оплатить отключённому сотруднику', () => {
    const seed = createSeedState()
    seed.staff = seed.staff.map((member) => member.id === 'staff-anna' ? { ...member, active: false } : member)
    expect(() => createPaymentInState(seed, input({ idempotencyKey: 'disabled' }))).toThrow('Получатель недоступен')
  })

  it('отклоняет некорректные суммы и нецензурные публичные послания', () => {
    const seed = createSeedState()
    expect(() => createPaymentInState(seed, input({ amount: 5, idempotencyKey: 'small' }))).toThrow('Сумма')
    expect(() => createPaymentInState(seed, input({ message: 'бля', idempotencyKey: 'bad-word' }))).toThrow('Переформулируйте')
  })
})

describe('приватность, стена и сплит', () => {
  it('не сохраняет имя анонимного гостя для отображения', () => {
    const created = createPaymentInState(createSeedState(), input({ isAnonymous: true, displayName: 'Секретное имя' }))
    expect(created.tip.displayName).toBe('')
    expect(displayGuestName(created.tip)).toBe('Аноним')
  })

  it('публикует на стене только успешные послания с согласия гостя', () => {
    const seed = createSeedState()
    const initialWall = wallTips(seed, 'venue-coffee').length
    const created = createPaymentInState(seed, input({ idempotencyKey: 'wall-test' }))
    expect(wallTips(created.state, 'venue-coffee')).toHaveLength(initialWall)
    const paid = confirmPaymentInState(created.state, created.tip.publicId)
    expect(wallTips(paid, 'venue-coffee')).toHaveLength(initialWall + 1)
    const hidden = createPaymentInState(paid, input({ idempotencyKey: 'wall-hidden', showOnWall: false }))
    const hiddenPaid = confirmPaymentInState(hidden.state, hidden.tip.publicId)
    expect(wallTips(hiddenPaid, 'venue-coffee')).toHaveLength(initialWall + 1)
  })

  it('считает уникальных гостей стола, а не количество платежей', () => {
    const seed = createSeedState()
    expect(tableProgress(seed, 'table7')).toEqual({ tipped: 3, expected: 5 })
    const fourth = createPaymentInState(seed, input({ qrToken: 'table7', idempotencyKey: 'table-fourth', guestId: 'new-table-guest' }))
    const paid = confirmPaymentInState(fourth.state, fourth.tip.publicId)
    expect(tableProgress(paid, 'table7').tipped).toBe(4)
    const sameGuest = createPaymentInState(paid, input({ qrToken: 'table7', idempotencyKey: 'same-guest-again', guestId: 'new-table-guest' }))
    const paidAgain = confirmPaymentInState(sameGuest.state, sameGuest.tip.publicId)
    expect(tableProgress(paidAgain, 'table7').tipped).toBe(4)
  })
})


describe('честность демо-данных', () => {
  it('цель Анны совпадает с суммой успешных чаевых за смену', () => {
    const seed = createSeedState()
    const today = new Date().toDateString()
    const sum = seed.tips.filter((tip) => tip.staffId === 'staff-anna' && tip.status === 'succeeded' && new Date(tip.createdAt).toDateString() === today).reduce((total, tip) => total + tip.amount, 0)
    const goal = seed.staff.find((member) => member.id === 'staff-anna')?.goal
    expect(sum).toBe(goal?.currentAmount)
    expect((goal?.targetAmount ?? 0) - (goal?.currentAmount ?? 0)).toBe(15_000)
  })
})
