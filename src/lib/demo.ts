import type { DemoState, StaffMember, Tip } from '@/types'

const minutesAgo = (minutes: number) => {
  const now = Date.now()
  const start = new Date()
  start.setHours(0, 5, 0, 0)
  return new Date(Math.max(start.getTime(), now - minutes * 60_000)).toISOString()
}

const daysAgo = (days: number, hour = 14) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(hour, 20, 0, 0)
  return date.toISOString()
}

const staff: StaffMember[] = [
  {
    id: 'staff-anna', venueId: 'venue-coffee', name: 'Анна', position: 'Бариста',
    avatar: '/avatars/anna.jpg', active: true, inviteCode: 'ANNA2026',
    goal: { title: 'Новая кофемолка', targetAmount: 500_000, currentAmount: 485_000, deadline: '2026-11-14', isActive: true },
  },
  {
    id: 'staff-mikhail', venueId: 'venue-coffee', name: 'Михаил', position: 'Официант',
    avatar: '/avatars/mikhail.jpg', active: true, inviteCode: 'MIKHAIL2026',
    goal: { title: 'Ужин с семьёй', targetAmount: 300_000, currentAmount: 105_000, deadline: '2026-11-10', isActive: true },
  },
  {
    id: 'staff-sofia', venueId: 'venue-coffee', name: 'София', position: 'Кондитер',
    avatar: '/avatars/sofia.jpg', active: true, inviteCode: 'SOFIA2026',
    goal: { title: 'Курс по десертам', targetAmount: 400_000, currentAmount: 100_000, deadline: '2026-11-20', isActive: true },
  },
]

const tip = (
  id: string,
  staffId: string,
  amount: number,
  createdAt: string,
  options: Partial<Tip> = {},
): Tip => ({
  id: `tip-${id}`,
  publicId: `pay-${id}`,
  qrToken: options.qrToken ?? staffId.replace('staff-', ''),
  venueId: 'venue-coffee',
  staffId,
  guestId: options.guestId ?? `guest-${id}`,
  amount: amount * 100,
  currency: 'RUB',
  status: 'succeeded',
  displayName: options.displayName ?? 'Гость',
  isAnonymous: options.isAnonymous ?? false,
  message: options.message ?? '',
  showOnWall: options.showOnWall ?? false,
  isGoalTopup: options.isGoalTopup ?? false,
  idempotencyKey: `seed-${id}`,
  createdAt,
  paidAt: createdAt,
  ...options,
})

const tips: Tip[] = [
  tip('01', 'staff-anna', 500, minutesAgo(18), { qrToken: 'table7', guestId: 'table-guest-1', displayName: 'Мария', message: 'Раф — как маленький праздник. Спасибо!', showOnWall: true }),
  tip('02', 'staff-anna', 300, minutesAgo(42), { qrToken: 'table7', guestId: 'table-guest-2', displayName: 'Илья', message: 'Очень тёплый сервис и вкусный кофе.', showOnWall: true }),
  tip('03', 'staff-anna', 450, minutesAgo(68), { qrToken: 'table7', guestId: 'table-guest-3', isAnonymous: true, displayName: '', message: 'Спасибо, что начинаете наше утро с улыбки.', showOnWall: true }),
  tip('04', 'staff-anna', 300, minutesAgo(96), { displayName: 'Ольга', message: 'Лучший флэт уайт в городе!', showOnWall: true }),
  tip('05', 'staff-anna', 2200, minutesAgo(125), { displayName: 'Алексей', message: 'Спасибо за заботу и идеальный эспрессо.', showOnWall: true }),
  tip('06', 'staff-anna', 1100, minutesAgo(154), { isAnonymous: true, displayName: '', message: 'Пусть новая кофемолка скорее появится!', showOnWall: true }),
  tip('07', 'staff-mikhail', 700, minutesAgo(35), { displayName: 'Дмитрий', message: 'Спасибо за рекомендацию десерта — попали в точку.', showOnWall: true }),
  tip('08', 'staff-mikhail', 350, minutesAgo(90), { isAnonymous: true, displayName: '', message: 'Всё было очень душевно.', showOnWall: true }),
  tip('09', 'staff-sofia', 400, minutesAgo(52), { displayName: 'Ева', message: 'Эклеры невероятные. Вы волшебница!', showOnWall: true }),
  tip('10', 'staff-sofia', 600, minutesAgo(140), { displayName: 'Никита', message: 'Спасибо за праздничный торт, всем очень понравился.', showOnWall: true }),
  tip('11', 'staff-anna', 700, daysAgo(1), { displayName: 'Вера', message: 'С вами даже понедельник добрый.', showOnWall: true }),
  tip('12', 'staff-mikhail', 500, daysAgo(2), { displayName: 'Григорий', message: 'Отличный вечер, спасибо!', showOnWall: true }),
  tip('13', 'staff-sofia', 850, daysAgo(3), { isAnonymous: true, displayName: '', message: 'Десерты, которые хочется запомнить.', showOnWall: true }),
  tip('14', 'staff-anna', 200, daysAgo(4), { displayName: 'Лев', message: 'Быстро, вкусно, с улыбкой.' }),
  tip('15', 'staff-anna', 300, daysAgo(5), { status: 'refunded', displayName: 'Гость' }),
  tip('16', 'staff-mikhail', 400, daysAgo(1), { status: 'failed', paidAt: undefined, displayName: 'Гость' }),
]

export const createSeedState = (): DemoState => ({
  version: 1,
  venues: [
    { id: 'venue-coffee', name: 'Просто кофе', type: 'Кафе', address: 'Москва, Никольская, 10', splitPercent: 0, active: true },
    { id: 'venue-north', name: 'Север', type: 'Ресторан', address: 'Санкт-Петербург, Рубинштейна, 18', splitPercent: 0, active: true },
  ],
  staff,
  qrTokens: [
    { token: 'anna', type: 'staff', venueId: 'venue-coffee', staffId: 'staff-anna', active: true },
    { token: 'mikhail', type: 'staff', venueId: 'venue-coffee', staffId: 'staff-mikhail', active: true },
    { token: 'sofia', type: 'staff', venueId: 'venue-coffee', staffId: 'staff-sofia', active: true },
    { token: 'coffee', type: 'venue', venueId: 'venue-coffee', active: true },
    { token: 'table7', type: 'table', venueId: 'venue-coffee', tableLabel: 'Стол 7', expectedGuests: 5, active: true },
  ],
  tips,
  session: null,
})

export const DEMO_ACCOUNTS = {
  staff: { email: 'anna@spasibo.demo', password: 'demo' },
  manager: { email: 'manager@spasibo.demo', password: 'demo' },
  admin: { email: 'admin@spasibo.demo', password: 'demo' },
}
