import { useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { CreditCard, Heart, Info, LockKeyhole, MessageCircleHeart, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { GoalProgress } from '@/components/GoalProgress'
import { PublicHeader } from '@/components/PublicHeader'
import { StaffAvatar } from '@/components/StaffAvatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatMoney, isCleanMessage, tableProgress } from '@/lib/domain'
import { demoActions, getGuestId, useDemoState } from '@/lib/store'
import Unavailable from '@/pages/Unavailable'

const presets = [200, 300, 500]

export default function PaymentPage() {
  const { qrToken = '' } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const state = useDemoState()
  const token = state.qrTokens.find((item) => item.token === qrToken && item.active)
  const staffId = token?.staffId ?? searchParams.get('staff') ?? undefined
  const member = state.staff.find((item) => item.id === staffId && item.venueId === token?.venueId)
  const venue = state.venues.find((item) => item.id === token?.venueId && item.active)
  const initialAmount = Number(searchParams.get('amount'))
  const [amount, setAmount] = useState(() => Number.isInteger(initialAmount) && initialAmount >= 10 && initialAmount <= 10_000 ? initialAmount : 300)
  const [customAmount, setCustomAmount] = useState('')
  const [name, setName] = useState(() => localStorage.getItem('spasibo-guest-name') ?? '')
  const [anonymous, setAnonymous] = useState(false)
  const [message, setMessage] = useState('')
  const [showOnWall, setShowOnWall] = useState(true)
  const [goalTopup, setGoalTopup] = useState(false)
  const [error, setError] = useState('')
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [card, setCard] = useState('4242 4242 4242 4242')
  const [expiry, setExpiry] = useState('12/29')
  const [cvc, setCvc] = useState('123')
  const [cardError, setCardError] = useState('')
  const [processing, setProcessing] = useState(false)
  const idempotencyKey = useRef('')
  const successfulVenueTips = useMemo(() => state.tips.filter((tip) => tip.venueId === token?.venueId && tip.status === 'succeeded'), [state.tips, token?.venueId])

  if (token && (token.type === 'table' || token.type === 'venue') && !staffId) return <Navigate to={`/p/${qrToken}/select`} replace />
  if (!token || !venue) return <Unavailable title="QR-код недействителен" text="Попросите сотрудника показать актуальный QR-код заведения." />
  if (!member || !member.active) return <Unavailable />
  const remaining = Math.max(0, member.goal.targetAmount - member.goal.currentAmount)
  const average = successfulVenueTips.length ? Math.round(successfulVenueTips.reduce((sum, tip) => sum + tip.amount, 0) / successfulVenueTips.length) : 0
  const popularAmount = (() => {
    const counts = new Map<number, number>()
    successfulVenueTips.forEach((tip) => counts.set(tip.amount, (counts.get(tip.amount) ?? 0) + 1))
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 30_000
  })()
  const progress = token.type === 'table' ? tableProgress(state, token.token) : null
  const backTo = token.type === 'staff' ? '/' : `/p/${token.token}/select`

  const chooseAmount = (value: number) => {
    setAmount(value)
    setCustomAmount('')
    setGoalTopup(false)
    setError('')
  }
  const topupGoal = () => {
    if (remaining > 0) {
      setAmount(Math.ceil(remaining / 100))
      setCustomAmount(String(Math.ceil(remaining / 100)))
      setGoalTopup(true)
      setError('')
    }
  }
  const openPayment = (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!Number.isFinite(amount) || amount < 10 || amount > 10_000) return setError('Укажите сумму от 10 до 10 000 ₽')
    if (!anonymous && name.trim().length < 2) return setError('Представьтесь или выберите анонимную благодарность')
    if (message.length > 140) return setError('Послание не должно быть длиннее 140 символов')
    if (showOnWall && message && !isCleanMessage(message)) return setError('Переформулируйте послание для публичной стены')
    setPaymentOpen(true)
  }
  const pay = async (event: FormEvent) => {
    event.preventDefault()
    setCardError('')
    if (card.replace(/\D/g, '').length !== 16) return setCardError('Введите 16 цифр номера тестовой карты')
    if (!/^\d{2}\/\d{2}$/.test(expiry)) return setCardError('Срок действия в формате ММ/ГГ')
    if (cvc.replace(/\D/g, '').length !== 3) return setCardError('Введите три цифры CVC')
    setProcessing(true)
    try {
      if (!idempotencyKey.current) idempotencyKey.current = `guest-payment-${Date.now()}-${Math.random().toString(36).slice(2)}`
      await new Promise((resolve) => setTimeout(resolve, 650))
      const payment = demoActions.createPayment({
        qrToken: token.token,
        staffId: member.id,
        amount: Math.round(amount * 100),
        displayName: name,
        isAnonymous: anonymous,
        message,
        showOnWall,
        isGoalTopup: goalTopup && Math.round(amount * 100) === remaining,
        idempotencyKey: idempotencyKey.current,
        guestId: getGuestId(),
      })
      demoActions.confirmPayment(payment.publicId, card)
      if (!anonymous) localStorage.setItem('spasibo-guest-name', name.trim())
      navigate(`/pay/${payment.publicId}/status`)
    } catch (paymentError) {
      setCardError(paymentError instanceof Error ? paymentError.message : 'Не удалось выполнить демо-оплату')
      setProcessing(false)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-background pb-[env(safe-area-inset-bottom)]">
      <PublicHeader venueId={venue.id} backTo={backTo} backLabel={token.type === 'staff' ? 'На главную' : 'Выбор сотрудника'} />
      <main className="page-container max-w-2xl py-3 sm:py-7">
        <section className="mb-5 flex items-center gap-4 sm:gap-5">
          <StaffAvatar member={member} size="xl" />
          <div><p className="text-sm font-semibold text-muted-foreground">Благодарим в {venue.name}</p><h1 className="display-font mt-1 text-2xl font-semibold sm:text-3xl">{member.name}</h1><p className="font-semibold text-primary">{member.position}</p></div>
        </section>
        {progress && <div className="mb-4 flex items-center gap-3 rounded-2xl border bg-card p-4 text-sm font-bold"><Users className="size-5 shrink-0 text-accent" /><span>{progress.tipped} из {progress.expected} за этим столом уже сказали спасибо</span></div>}
        {member.goal.isActive && (
          <div className="mb-5 rounded-3xl bg-secondary/65 p-5">
            <GoalProgress goal={member.goal} staffName={member.name} compact />
            {remaining > 0 && <Button onClick={topupGoal} variant="outline" className="mt-4 w-full rounded-2xl border-primary/25 bg-card"><Sparkles className="text-accent" />Добить до цели · {formatMoney(remaining)}</Button>}
          </div>
        )}
        <form onSubmit={openPayment} className="surface p-5 sm:p-7" noValidate>
          <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-extrabold">Сумма благодарности</h2>{average > 0 && <span className="text-xs font-semibold text-muted-foreground">В среднем здесь: {formatMoney(average)}</span>}</div>
          <div className="mt-4 grid grid-cols-3 gap-2" role="group" aria-label="Быстрый выбор суммы">
            {presets.map((preset) => {
              const selected = amount === preset && !customAmount
              const isPopular = popularAmount === preset * 100
              return (
                <button
                  key={preset}
                  type="button"
                  data-testid={`amount-${preset}`}
                  onClick={() => chooseAmount(preset)}
                  aria-pressed={selected}
                  aria-label={isPopular ? `${preset} рублей, чаще всего` : `${preset} рублей`}
                  className={`relative min-h-14 cursor-pointer rounded-2xl border-2 text-lg font-extrabold shadow-sm transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ${selected ? 'border-primary bg-primary text-primary-foreground shadow-primary/20' : 'border-border bg-card text-foreground hover:border-primary hover:bg-secondary/40'}`}
                >
                  <span aria-hidden="true">{preset} ₽</span>
                  {isPopular && <span aria-hidden="true" className={`absolute -top-3 left-1/2 w-max -translate-x-1/2 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm ${selected ? 'bg-accent text-accent-foreground' : 'bg-secondary text-secondary-foreground'}`}>чаще всего</span>}
                </button>
              )
            })}
          </div>
          <label className="field-label mt-5" htmlFor="custom-amount">Или своя сумма</label>
          <div className="relative"><input id="custom-amount" type="number" inputMode="decimal" min="10" max="10000" step="1" value={customAmount} onChange={(event) => { setCustomAmount(event.target.value); setAmount(Number(event.target.value)); setGoalTopup(false) }} className="field-input pr-10 text-xl font-extrabold" placeholder="Например, 700" /><span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">₽</span></div>

          <div className="my-6 soft-divider" />
          <div className="flex items-center justify-between gap-4"><label htmlFor="guest-name" className="field-label mb-0">Представьтесь</label><label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} className="size-5 accent-[hsl(var(--primary))]" />Анонимно</label></div>
          {!anonymous && <input id="guest-name" value={name} onChange={(event) => setName(event.target.value)} className="field-input mt-2" placeholder="Только имя" autoComplete="given-name" maxLength={30} />}
          <p className="mt-2 flex items-start gap-2 text-xs text-muted-foreground"><Info className="mt-0.5 size-4 shrink-0" />{member.name} увидит только ваше имя — без профиля и контактов</p>

          <label htmlFor="warm-message" className="field-label mt-6">Тёплые слова <span className="font-medium text-muted-foreground">· необязательно</span></label>
          <textarea id="warm-message" value={message} onChange={(event) => setMessage(event.target.value)} className="field-input min-h-28 resize-none" maxLength={140} placeholder={member.name === 'Анна' ? 'Спасибо за утро и за раф…' : 'Что вы хотите сказать?'} />
          <div className="mt-1 flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>Послание увидит {member.name}</span><span>{message.length}/140</span></div>
          {message && <label className="mt-3 flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl bg-secondary/50 px-4 text-sm font-semibold"><input type="checkbox" checked={showOnWall} onChange={(event) => setShowOnWall(event.target.checked)} className="size-5 shrink-0 accent-[hsl(var(--primary))]" /><MessageCircleHeart className="size-5 shrink-0 text-primary" />Показать на стене благодарностей</label>}
          {error && <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
          <Button type="submit" size="lg" className="mt-6 w-full rounded-2xl bg-accent text-base font-extrabold text-accent-foreground hover:bg-accent/90"><Heart />Сказать спасибо · {formatMoney(Math.round(amount * 100))}</Button>
          <p className="mt-3 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground"><ShieldCheck className="size-4" />Чаевые идут {member.name} напрямую · комиссия заведения {venue.splitPercent}%</p>
        </form>
      </main>

      <Dialog open={paymentOpen} onOpenChange={(open) => { if (!processing) setPaymentOpen(open) }}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-3xl p-5 sm:p-7">
          <DialogHeader><div className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-secondary text-primary"><CreditCard className="size-6" /></div><DialogTitle className="text-2xl">Мок-касса</DialogTitle><DialogDescription>Демо-оплата {formatMoney(Math.round(amount * 100))} для {member.name}. Деньги не списываются.</DialogDescription></DialogHeader>
          <form onSubmit={pay} className="mt-2 space-y-4" noValidate>
            <div><label className="field-label" htmlFor="card-number">Номер тестовой карты</label><input id="card-number" inputMode="numeric" autoComplete="cc-number" value={card} onChange={(event) => setCard(event.target.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim())} className="field-input tracking-wider" /></div>
            <div className="grid grid-cols-2 gap-3"><div><label className="field-label" htmlFor="card-expiry">Срок</label><input id="card-expiry" inputMode="numeric" autoComplete="cc-exp" value={expiry} onChange={(event) => { const digits = event.target.value.replace(/\D/g, '').slice(0, 4); setExpiry(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits) }} className="field-input" /></div><div><label className="field-label" htmlFor="card-cvc">CVC</label><input id="card-cvc" inputMode="numeric" autoComplete="cc-csc" type="password" value={cvc} onChange={(event) => setCvc(event.target.value.replace(/\D/g, '').slice(0, 3))} className="field-input" /></div></div>
            <div className="rounded-2xl bg-muted p-3 text-xs text-muted-foreground">Для успеха подойдёт любая карта. Чтобы проверить ошибку, используйте номер, заканчивающийся на 0000.</div>
            {cardError && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-800">{cardError}</p>}
            <Button type="submit" size="lg" disabled={processing} className="w-full rounded-2xl bg-primary">{processing ? <><span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />Подтверждаем…</> : <><LockKeyhole />Оплатить {formatMoney(Math.round(amount * 100))}</>}</Button>
            <p className="text-center text-xs text-muted-foreground">PAYMENTS_MODE=mock · повторный клик не создаст дубль</p>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
