import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { ArrowRight, Check, Clock3, Home, MessageSquareText, RotateCcw, Send, X } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { StaffAvatar } from '@/components/StaffAvatar'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { formatMoney, paymentTotal } from '@/lib/domain'
import { demoActions, useDemoState } from '@/lib/store'

export default function PaymentStatus() {
  const { paymentId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const state = useDemoState()
  const reviewRequested = searchParams.get('review') === '1'
  const [reviewOpen, setReviewOpen] = useState(reviewRequested)
  const [review, setReview] = useState('')
  const [reviewSent, setReviewSent] = useState(false)
  const payment = state.payments.find((item) => item.payment_id === paymentId)
  const employee = state.employees.find((item) => item.employee_id === payment?.employee_id)
  if (!payment || !employee) return <div className="grid min-h-[100dvh] place-items-center p-5 text-center"><div><h1 className="display-font text-2xl">Платёж не найден</h1><Button asChild className="mt-5 rounded-full"><Link to="/">На главную</Link></Button></div></div>
  const success = payment.status === 'SUCCESS'
  const pending = payment.status === 'PENDING'
  const declined = payment.status === 'DECLINED'
  const canceled = payment.status === 'CANCELED'
  const title = success ? 'Спасибо! Чаевые отправлены' : pending ? 'Обрабатываем, проверьте через минуту' : declined ? 'Оплата не прошла, попробуйте другой способ' : canceled ? 'Платёж отменён' : 'Платёж создан'
  const description = success ? `${employee.name} получит ваши чаевые. Спасибо за поддержку команды!` : pending ? 'Операция обрабатывается. Нажмите «Проверить статус», чтобы завершить обработку.' : declined ? 'Шлюз отклонил операцию. Деньги не списаны.' : canceled ? 'Платёж отменён до подтверждения, списания не было.' : 'Платёж ожидает подтверждения клиентом.'
  const submitReview = (event: FormEvent) => {
    event.preventDefault()
    if (review.trim()) setReviewSent(true)
  }
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background pb-[env(safe-area-inset-bottom)]">
      <header className="page-container py-3"><Logo /></header>
      <main className="page-container grid max-w-xl place-items-center py-6 sm:py-12">
        <section className="surface w-full p-6 text-center sm:p-10" aria-live="polite">
          <span className={`mx-auto grid size-20 place-items-center rounded-full ${success ? 'bg-primary text-primary-foreground' : pending ? 'bg-amber-100 text-amber-900' : 'bg-red-100 text-red-800'}`}>
            {success ? <Check className="size-10" /> : pending ? <Clock3 className="size-10" /> : <X className="size-10" />}
          </span>
          <div className="mt-5 flex justify-center"><StatusBadge status={payment.status} /></div>
          <h1 className="display-font mt-4 text-2xl font-semibold leading-tight sm:text-3xl">{title}</h1>
          <p className="mx-auto mt-3 max-w-sm text-muted-foreground">{description}</p>
          {payment.error_code && <p className="mt-3 font-mono text-xs font-bold text-red-800">{payment.error_code}</p>}
          <dl className="my-6 space-y-3 rounded-2xl bg-muted p-5 text-left">
            <div className="flex justify-between gap-4 text-sm"><dt>Чек</dt><dd className="font-bold">{formatMoney(payment.amount)}</dd></div>
            <div className="flex justify-between gap-4 text-sm"><dt>Чаевые</dt><dd className="font-bold">{formatMoney(payment.tip)}</dd></div>
            <div className="soft-divider" />
            <div className="flex justify-between gap-4"><dt>Итого</dt><dd className="font-extrabold">{formatMoney(paymentTotal(payment))}</dd></div>
          </dl>
          {success && <div className="mb-6 flex items-center justify-center gap-3"><StaffAvatar member={employee} size="md" /><div className="text-left"><p className="font-extrabold">{employee.name}</p><p className="text-sm text-muted-foreground">{employee.position}</p></div></div>}
          {success && !reviewOpen && !reviewSent && <Button variant="outline" size="lg" className="mb-3 w-full rounded-2xl" onClick={() => setReviewOpen(true)}><MessageSquareText />Оставить отзыв о работе</Button>}
          {success && reviewOpen && !reviewSent && <form onSubmit={submitReview} className="mb-4 rounded-2xl border bg-card p-4 text-left">
            {reviewRequested && <p className="mb-3 text-sm text-muted-foreground">Вы выбрали больше 50%, поэтому чаевые установлены на максимум. Расскажите, что именно понравилось!</p>}
            <label htmlFor="employee-review" className="field-label">Ваш отзыв о работе {employee.name}</label>
            <textarea id="employee-review" value={review} onChange={(event) => setReview(event.target.value)} required minLength={3} className="min-h-24 w-full rounded-2xl border bg-background p-3 text-sm outline-none focus:border-primary" placeholder="Что вам понравилось?" />
            <Button type="submit" className="mt-3 w-full rounded-2xl"><Send />Отправить отзыв</Button>
          </form>}
          {success && reviewSent && <p className="mb-4 rounded-2xl bg-secondary/60 p-4 text-sm font-bold text-primary" role="status">Спасибо! Ваш отзыв отправлен.</p>}
          <div className="grid gap-3">
            {pending && <Button size="lg" className="rounded-2xl" onClick={() => demoActions.resolvePayment(payment.payment_id)}><RotateCcw />Проверить статус</Button>}
            {payment.status === 'CREATED' && <Button size="lg" variant="outline" className="rounded-2xl" onClick={() => demoActions.cancelPayment(payment.payment_id)}>Отменить платёж</Button>}
            <Button asChild size="lg" variant={success || pending ? 'outline' : 'default'} className="rounded-2xl"><Link to="/"><Home />На главную</Link></Button>
          </div>
          <p className="mt-5 break-all font-mono text-xs text-muted-foreground">{payment.payment_id} · {payment.qr_id}<ArrowRight className="ml-1 inline size-3" />{payment.status}</p>
        </section>
      </main>
    </div>
  )
}
