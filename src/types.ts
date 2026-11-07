export type Role = 'staff' | 'manager' | 'admin'
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded'
export type QrType = 'staff' | 'venue' | 'table'

export interface Venue {
  id: string
  name: string
  type: string
  address: string
  splitPercent: number
  active: boolean
}

export interface StaffGoal {
  title: string
  targetAmount: number
  currentAmount: number
  deadline: string
  isActive: boolean
}

export interface StaffMember {
  id: string
  venueId: string
  name: string
  position: string
  avatar: string
  active: boolean
  inviteCode: string
  goal: StaffGoal
}

export interface QrToken {
  token: string
  type: QrType
  venueId: string
  staffId?: string
  tableLabel?: string
  expectedGuests?: number
  active: boolean
}

export interface Tip {
  id: string
  publicId: string
  qrToken: string
  venueId: string
  staffId: string
  guestId: string
  amount: number
  currency: 'RUB'
  status: PaymentStatus
  displayName: string
  isAnonymous: boolean
  message: string
  showOnWall: boolean
  isGoalTopup: boolean
  idempotencyKey: string
  createdAt: string
  paidAt?: string
}

export interface Session {
  role: Role
  venueId?: string
  staffId?: string
}

export interface DemoState {
  version: number
  venues: Venue[]
  staff: StaffMember[]
  qrTokens: QrToken[]
  tips: Tip[]
  session: Session | null
}

export interface PaymentInput {
  qrToken: string
  staffId?: string
  amount: number
  displayName: string
  isAnonymous: boolean
  message: string
  showOnWall: boolean
  isGoalTopup: boolean
  idempotencyKey: string
  guestId: string
}
