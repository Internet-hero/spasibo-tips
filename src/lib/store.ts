import { useSyncExternalStore } from 'react'
import { createSeedState, DEMO_ACCOUNTS } from '@/lib/demo'
import { isCleanMessage } from '@/lib/domain'
import type { DemoState, PaymentInput, Role, StaffGoal, StaffMember, Tip, Venue } from '@/types'

const STORAGE_KEY = 'spasibo-demo-state-v1'
const GUEST_KEY = 'spasibo-guest-id'
const listeners = new Set<() => void>()
let state: DemoState | null = null

const uid = () => typeof crypto !== 'undefined' && crypto.randomUUID
  ? crypto.randomUUID()
  : `${Date.now()}-${Math.random().toString(36).slice(2)}`

const loadState = (): DemoState => {
  if (typeof window === 'undefined') return createSeedState()
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as DemoState
      if (parsed.version === 1) return parsed
    }
  } catch {
    // A broken local draft should never block the demo.
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
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }
  listeners.forEach((listener) => listener())
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        state = JSON.parse(event.newValue) as DemoState
        listeners.forEach((listener) => listener())
      } catch {
        // Ignore malformed values from other tabs.
      }
    }
  })
}

export const useDemoState = () => useSyncExternalStore(subscribe, getState, getState)

export const getGuestId = () => {
  if (typeof window === 'undefined') return 'server-guest'
  const saved = window.localStorage.getItem(GUEST_KEY)
  if (saved) return saved
  const id = uid()
  window.localStorage.setItem(GUEST_KEY, id)
  return id
}

export function createPaymentInState(current: DemoState, input: PaymentInput): { state: DemoState; tip: Tip } {
  const duplicate = current.tips.find((tip) => tip.idempotencyKey === input.idempotencyKey)
  if (duplicate) return { state: current, tip: duplicate }
  const token = current.qrTokens.find((item) => item.token === input.qrToken && item.active)
  if (!token) throw new Error('QR-код недействителен')
  const staffId = token.staffId ?? input.staffId
  const member = current.staff.find((item) => item.id === staffId && item.active)
  if (!member) throw new Error('Получатель недоступен')
  if (!Number.isInteger(input.amount) || input.amount < 1000 || input.amount > 1_000_000) {
    throw new Error('Сумма должна быть от 10 до 10 000 ₽')
  }
  if (input.message.length > 140) throw new Error('Послание не должно быть длиннее 140 символов')
  if (input.showOnWall && !isCleanMessage(input.message)) throw new Error('Переформулируйте послание для публичной стены')
  const tip: Tip = {
    id: uid(),
    publicId: `pay-${uid()}`,
    qrToken: input.qrToken,
    venueId: token.venueId,
    staffId: member.id,
    guestId: input.guestId,
    amount: input.amount,
    currency: 'RUB',
    status: 'pending',
    displayName: input.isAnonymous ? '' : input.displayName.trim().slice(0, 30),
    isAnonymous: input.isAnonymous,
    message: input.message.trim(),
    showOnWall: input.showOnWall && Boolean(input.message.trim()),
    isGoalTopup: input.isGoalTopup,
    idempotencyKey: input.idempotencyKey,
    createdAt: new Date().toISOString(),
  }
  return { state: { ...current, tips: [tip, ...current.tips] }, tip }
}

export function confirmPaymentInState(current: DemoState, publicId: string, shouldFail = false): DemoState {
  const payment = current.tips.find((tip) => tip.publicId === publicId)
  if (!payment || payment.status !== 'pending') return current
  if (shouldFail) {
    return { ...current, tips: current.tips.map((tip) => tip.id === payment.id ? { ...tip, status: 'failed' as const } : tip) }
  }
  const paidAt = new Date().toISOString()
  return {
    ...current,
    tips: current.tips.map((tip) => tip.id === payment.id ? { ...tip, status: 'succeeded' as const, paidAt } : tip),
    staff: current.staff.map((member) => member.id === payment.staffId ? {
      ...member,
      goal: { ...member.goal, currentAmount: member.goal.currentAmount + payment.amount },
    } : member),
  }
}

export const demoActions = {
  createPayment(input: PaymentInput) {
    const result = createPaymentInState(getState(), input)
    if (result.state !== getState()) commit(result.state)
    return result.tip
  },
  confirmPayment(publicId: string, cardNumber: string) {
    const digits = cardNumber.replace(/\D/g, '')
    commit(confirmPaymentInState(getState(), publicId, digits.endsWith('0000')))
  },
  loginAs(role: Role) {
    const session: DemoState['session'] = role === 'staff'
      ? { role, staffId: 'staff-anna', venueId: 'venue-coffee' }
      : role === 'manager' ? { role, venueId: 'venue-coffee' } : { role }
    commit({ ...getState(), session })
  },
  login(email: string, password: string, inviteCode: string): { ok: true; role: Role } | { ok: false; error: string } {
    const current = getState()
    const invite = current.staff.find((member) => member.inviteCode === inviteCode.trim().toUpperCase() && member.active)
    if (invite) {
      commit({ ...current, session: { role: 'staff', staffId: invite.id, venueId: invite.venueId } })
      return { ok: true, role: 'staff' as const }
    }
    const entry = (Object.keys(DEMO_ACCOUNTS) as Role[]).find((role) =>
      DEMO_ACCOUNTS[role].email === email.trim().toLowerCase() && DEMO_ACCOUNTS[role].password === password,
    )
    if (!entry) return { ok: false, error: 'Проверьте email и пароль или используйте демо-вход' }
    const session: DemoState['session'] = entry === 'staff'
      ? { role: entry, staffId: 'staff-anna', venueId: 'venue-coffee' }
      : entry === 'manager' ? { role: entry, venueId: 'venue-coffee' } : { role: entry }
    commit({ ...current, session })
    return { ok: true, role: entry }
  },
  logout() {
    commit({ ...getState(), session: null })
  },
  addStaff(input: Pick<StaffMember, 'name' | 'position'> & { goal?: StaffGoal }) {
    const current = getState()
    const venueId = current.session?.venueId ?? 'venue-coffee'
    const id = `staff-${uid()}`
    const name = input.name.trim().split(' ')[0]
    const member: StaffMember = {
      id,
      venueId,
      name,
      position: input.position.trim(),
      avatar: '/avatars/anna.jpg',
      active: true,
      inviteCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
      goal: input.goal ?? { title: 'Маленькая мечта', targetAmount: 100_000, currentAmount: 0, deadline: '', isActive: true },
    }
    commit({
      ...current,
      staff: [...current.staff, member],
      qrTokens: [...current.qrTokens, { token: id.slice(-10), type: 'staff', venueId, staffId: id, active: true }],
    })
    return member
  },
  updateStaff(id: string, patch: Partial<StaffMember>) {
    const current = getState()
    commit({ ...current, staff: current.staff.map((member) => member.id === id ? { ...member, ...patch } : member) })
  },
  setStaffActive(id: string, active: boolean) {
    demoActions.updateStaff(id, { active })
  },
  setGoal(id: string, goal: StaffGoal) {
    demoActions.updateStaff(id, { goal })
  },
  addTableQr(label: string, expectedGuests: number) {
    const current = getState()
    const token = uid().replaceAll('-', '').slice(0, 10)
    const qr = { token, type: 'table' as const, venueId: current.session?.venueId ?? 'venue-coffee', tableLabel: label.trim(), expectedGuests, active: true }
    commit({ ...current, qrTokens: [...current.qrTokens, qr] })
    return qr
  },
  registerVenue(input: Pick<Venue, 'name' | 'address' | 'type'>) {
    const current = getState()
    const venue: Venue = { ...input, id: `venue-${uid()}`, splitPercent: 0, active: true }
    const token = uid().replaceAll('-', '').slice(0, 10)
    commit({
      ...current,
      venues: [...current.venues, venue],
      qrTokens: [...current.qrTokens, { token, type: 'venue', venueId: venue.id, active: true }],
      session: { role: 'manager', venueId: venue.id },
    })
    return venue
  },
  toggleVenue(id: string) {
    const current = getState()
    commit({ ...current, venues: current.venues.map((venue) => venue.id === id ? { ...venue, active: !venue.active } : venue) })
  },
  resetDemo() {
    const fresh = createSeedState()
    fresh.session = getState().session
    commit(fresh)
  },
}
