import type { DemoState, Tip } from '@/types'

export const formatMoney = (kopecks: number, withCurrency = true) => {
  const value = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(kopecks / 100)
  return withCurrency ? `${value} ₽` : value
}

export const displayGuestName = (tip: Tip) => tip.isAnonymous ? 'Аноним' : tip.displayName || 'Гость'

export const isCleanMessage = (message: string) => {
  const banned = ['бля', 'хуй', 'пизд', 'сука', 'ебат']
  const normalized = message.toLocaleLowerCase('ru-RU')
  return !banned.some((word) => normalized.includes(word))
}

export const wallTips = (state: DemoState, venueId: string) => state.tips.filter((tip) =>
  tip.venueId === venueId && tip.status === 'succeeded' && tip.showOnWall && tip.message.trim() && isCleanMessage(tip.message),
)

export const tableProgress = (state: DemoState, qrToken: string) => {
  const token = state.qrTokens.find((item) => item.token === qrToken)
  const today = new Date().toDateString()
  const guests = new Set(state.tips.filter((tip) =>
    tip.qrToken === qrToken && tip.status === 'succeeded' && new Date(tip.createdAt).toDateString() === today,
  ).map((tip) => tip.guestId))
  return { tipped: guests.size, expected: token?.expectedGuests ?? 5 }
}

export const isSameDay = (date: Date, value: string) => date.toDateString() === new Date(value).toDateString()

export const venueStats = (state: DemoState, venueId: string, days = 7) => {
  const cutoff = new Date()
  cutoff.setHours(0, 0, 0, 0)
  cutoff.setDate(cutoff.getDate() - (days - 1))
  const succeeded = state.tips.filter((tip) => tip.venueId === venueId && tip.status === 'succeeded' && new Date(tip.createdAt) >= cutoff)
  const total = succeeded.reduce((sum, tip) => sum + tip.amount, 0)
  const anonymous = succeeded.filter((tip) => tip.isAnonymous).length
  const topups = succeeded.filter((tip) => tip.isGoalTopup).length
  const chart = Array.from({ length: days }, (_, index) => {
    const date = new Date(cutoff)
    date.setDate(cutoff.getDate() + index)
    const dayTips = succeeded.filter((tip) => isSameDay(date, tip.createdAt))
    return {
      day: new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(date).replace('.', ''),
      date: date.toISOString(),
      amount: dayTips.reduce((sum, tip) => sum + tip.amount, 0) / 100,
      count: dayTips.length,
    }
  })
  const top = state.staff.filter((member) => member.venueId === venueId).map((member) => {
    const memberTips = succeeded.filter((tip) => tip.staffId === member.id)
    return { ...member, total: memberTips.reduce((sum, tip) => sum + tip.amount, 0), count: memberTips.length }
  }).sort((a, b) => b.total - a.total)
  return {
    tips: succeeded,
    total,
    count: succeeded.length,
    average: succeeded.length ? Math.round(total / succeeded.length) : 0,
    anonymousPercent: succeeded.length ? Math.round(anonymous / succeeded.length * 100) : 0,
    topups,
    chart,
    top,
  }
}
