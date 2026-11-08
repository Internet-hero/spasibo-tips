import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { ArrowRight, Check, Clock3, CreditCard, FileKey, ReceiptText, ShieldCheck, X } from 'lucide-react'
import { PublicHeader } from '@/components/PublicHeader'
import { StaffAvatar } from '@/components/StaffAvatar'
import { Button } from '@/components/ui/button'
import { formatMoney } from '@/lib/domain'
import { calcAmounts } from '@/lib/qr'
import { DemoError, demoActions, useDemoState, validateQr } from '@/lib/store'
import Unavailable from '@/pages/Unavailable'

const tipOptions = [10, 15]
type Step = 'welcome' | 'choose' | 'confirm'

export default function PaymentPage() {
  const { qrToken: pathQrToken = '' } = useParams()
  const [searchParams] = useSearchParams()
  const qrToken = pathQrToken || searchParams.get('qr') || ''
  const navigate = useNavigate()
  const state = useDemoState()
  const initialTipParam = searchParams.get('tip')
  const initialTip = initialTipParam === null ? 10 : Number(initialTipParam)
  const [step, setStep] = useState<Step>('welcome')
  const [tipPct, setTipPct] = useState(Number.isFinite(initialTip) && initialTip >= 0 ? initialTip : 10)
  const [customTip, setCustomTip] = useState('')
  const [paymentId, setPaymentId] = useState('')
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const idempotencyKey = useRef('')
  const qr = state.qr_links.find((item) => item.qr_id === qrToken)
  const merchant = state.merchants.find((item) => item.merchant_id === qr?.merchant_id)
  const employee = state.employees.find((item) => item.employee_id === qr?.employee_id)
  let loadError: DemoError | null = null
  if (!paymentId) {
    try { validateQr(state, qrToken) } catch (caught) {
      loadError = caught instanceof DemoError ? caught : new DemoError('INVALID_QR', 'QR-код недействителен')
    }
  }
  if (loadError) return <Unavailable title={loadError.message} text="Попросите сотрудника сформировать новый QR на ваш чек." code={loadError.code} />
  if (!qr || !merchant || !employee) return <Unavailable title="QR-код недействителен" text="Данные сотрудника или заведения не найдены." code="INVALID_QR" />

  const effectivePct = customTip !== '' ? Number(customTip) / qr.base_amount * 100 : tipPct
  const safePct = Number.isFinite(effectivePct) ? effectivePct : 0
  const amounts = calcAmounts(qr.base_amount, safePct)
  const stepNumber = step === 'welcome' ? 1 : step === 'choose' ? 2 : 3

  const openConfirmation = (event: FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      if (!Number.isFinite(effectivePct) || effectivePct < 0) throw new DemoError('TIP_OUT_OF_RANGE', 'Укажите неотрицательную сумму чаевых')
      if (!idempotencyKey.current) idempotencyKey.current = `tip-${qr.qr_id}-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const payment = demoActions.createPayment({
        qr_id: qr.qr_id,
        receipt_id: qr.receipt_id,
        base_amount: qr.base_amount,
        tip_pct: effectivePct,
        idempotency_key: idempotencyKey.current,
      })
      setPaymentId(payment.payment_id)
      setStep('confirm')
    } catch (caught) {
      setError(caught instanceof DemoError ? `${caught.code}: ${caught.message}` : 'Не удалось создать платёж')
    }
  }

  const confirm = async () => {
    setProcessing(true)
    setError('')
    try {
      await new Promise((resolve) => setTimeout(resolve, 650))
      demoActions.confirmPayment(paymentId)
      navigate(`/pay/${paymentId}/status`)
    } catch (caught) {
      setError(caught instanceof DemoError ? `${caught.code}: ${caught.message}` : 'Не удалось подтвердить платёж')
      setProcessing(false)
    }
  }

  const cancel = () => {
    try {
      demoActions.cancelPayment(paymentId)
      navigate(`/pay/${paymentId}/status`)
    } catch (caught) {
      setError(caught instanceof DemoError ? `${caught.code}: ${caught.message}` : 'Не удалось отменить платёж')
    }
  }

  return (
    <div className="min-h-[100dvh] bg-background pb-[env(safe-area-inset-bottom)]">
      <PublicHeader backTo="/" backLabel="На главную" />
      <main className="page-container max-w-2xl py-3 sm:py-7">
        <ol className="mb-6 grid grid-cols-4 gap-2" aria-label="Этапы оплаты">
          {['Чек', 'Чаевые', 'Оплата', 'Итог'].map((label, index) => <li key={label} className={`min-w-0 rounded-xl px-1 py-2 text-center text-[10px] font-bold sm:px-2 sm:text-xs ${index + 1 === stepNumber ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`} aria-current={index + 1 === stepNumber ? 'step' : undefined}>{index + 1}. {label}</li>)}
        </ol>
        <section className="mb-5 flex items-center gap-4 sm:gap-5">
          <StaffAvatar member={employee} size="lg" />
          <div><p className="text-sm font-semibold text-muted-foreground">{merchant.name}</p><h1 className="display-font mt-1 text-2xl font-semibold sm:text-3xl">{employee.name}</h1><p className="font-semibold text-primary">{employee.position}</p></div>
        </section>
        <div className="mb-5 flex items-start gap-3 rounded-2xl border bg-card p-4 text-sm"><FileKey className="mt-0.5 size-5 shrink-0 text-primary" /><p className="text-muted-foreground">QR <strong className="text-foreground">{qr.qr_id}</strong> привязан к чеку <strong className="text-foreground">{qr.receipt_id}</strong>. Подпись и срок действия проверены.</p></div>

        {step === 'welcome' && <section className="surface p-5 sm:p-7" aria-labelledby="welcome-title">
          <ReceiptText className="size-8 text-accent" />
          <h2 id="welcome-title" className="display-font mt-5 text-2xl font-semibold">Ваш чек</h2>
          <p className="mt-2 text-muted-foreground">Проверьте заведение, сотрудника и сумму перед выбором чаевых.</p>
          <div className="my-6 soft-divider" />
          <div className="flex items-end justify-between gap-4"><span className="font-bold">Сумма чека</span><span className="display-font text-3xl font-semibold">{formatMoney(qr.base_amount)}</span></div>
          <Button size="lg" className="mt-7 w-full rounded-2xl" onClick={() => setStep('choose')}>Продолжить<ArrowRight /></Button>
        </section>}

        {step === 'choose' && <form onSubmit={openConfirmation} className="surface p-5 sm:p-7" noValidate>
          <h2 className="text-xl font-extrabold">Выберите чаевые</h2>
          <p className="mt-1 text-sm text-muted-foreground">Выберите процент или укажите любую сумму в рублях</p>
          <div className="mt-5 grid grid-cols-3 gap-2" role="group" aria-label="Размер чаевых">
            {tipOptions.map((pct) => <button key={pct} type="button" data-testid={`tip-${pct}`} onClick={() => { setTipPct(pct); setCustomTip(''); setError('') }} aria-pressed={customTip === '' && tipPct === pct} className={`min-h-12 cursor-pointer rounded-2xl border-2 text-base font-extrabold transition ${customTip === '' && tipPct === pct ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary'}`}>{pct}%</button>)}
            <button type="button" data-testid="tip-custom" onClick={() => document.getElementById('custom-tip')?.focus()} aria-pressed={customTip !== ''} className={`min-h-12 cursor-pointer rounded-2xl border-2 text-sm font-extrabold transition ${customTip !== '' ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary'}`}>Другая сумма</button>
          </div>
          <label className="field-label mt-5" htmlFor="custom-tip">Другая сумма чаевых, ₽</label>
          <input id="custom-tip" type="number" inputMode="decimal" min="0" step="0.01" value={customTip} onChange={(event) => { setCustomTip(event.target.value); setError('') }} className="field-input" placeholder="Например, 250" />
          <div className="mt-6 space-y-3 rounded-2xl bg-secondary/55 p-5">
            <div className="flex justify-between gap-4 text-sm"><span>Чек</span><strong>{formatMoney(qr.base_amount)}</strong></div>
            <div className="flex justify-between gap-4 text-sm"><span>Чаевые{customTip === '' ? ` · ${safePct.toFixed(0)}%` : ''}</span><strong data-testid="tip-amount">{formatMoney(amounts.tip)}</strong></div>
            <div className="soft-divider" />
            <div className="flex items-end justify-between gap-4"><span className="font-extrabold">Итого</span><strong className="display-font text-2xl" data-testid="amount-total">{formatMoney(amounts.total)}</strong></div>
          </div>
          {error && <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
          <Button type="submit" size="lg" className="mt-6 w-full rounded-2xl bg-accent text-accent-foreground">Оплатить<ArrowRight /></Button>
        </form>}

        {step === 'confirm' && <section className="surface p-5 sm:p-7" aria-labelledby="confirm-title">
          <CreditCard className="size-8 text-accent" />
          <h2 id="confirm-title" className="display-font mt-5 text-2xl font-semibold">Подтверждение</h2>
          <p className="mt-2 text-sm text-muted-foreground">Проверьте сумму чека и чаевых перед подтверждением.</p>
          <dl className="mt-6 space-y-4 rounded-2xl bg-muted p-5">
            <div className="flex justify-between gap-4"><dt>Сумма чека</dt><dd className="font-bold">{formatMoney(qr.base_amount)}</dd></div>
            <div className="flex justify-between gap-4"><dt>Чаевые</dt><dd className="font-bold">{formatMoney(amounts.tip)}</dd></div>
            <div className="soft-divider" />
            <div className="flex items-end justify-between gap-4"><dt className="font-extrabold">Итого</dt><dd className="display-font text-2xl font-semibold">{formatMoney(amounts.total)}</dd></div>
          </dl>
          <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4" />ID платежа: {paymentId} · повтор ключа не создаст дубль</p>
          {error && <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
          <Button size="lg" disabled={processing} className="mt-6 w-full rounded-2xl" onClick={confirm}>{processing ? <><Clock3 className="animate-pulse" />Подтверждаем…</> : <><Check />Подтвердить оплату</>}</Button>
          <Button variant="ghost" disabled={processing} className="mt-2 w-full rounded-2xl text-red-800" onClick={cancel}><X />Отменить платёж</Button>
        </section>}
      </main>
    </div>
  )
}
