import { Link, useParams } from 'react-router'
import { ArrowRight, Check, Heart, RotateCcw, X } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { StaffAvatar } from '@/components/StaffAvatar'
import { Button } from '@/components/ui/button'
import { displayGuestName, formatMoney, tableProgress } from '@/lib/domain'
import { useDemoState } from '@/lib/store'

export default function PaymentStatus() {
  const { paymentId = '' } = useParams()
  const state = useDemoState()
  const payment = state.tips.find((tip) => tip.publicId === paymentId)
  const member = state.staff.find((item) => item.id === payment?.staffId)
  const token = state.qrTokens.find((item) => item.token === payment?.qrToken)
  if (!payment || !member) return (
    <div className="grid min-h-[100dvh] place-items-center p-5 text-center"><div><h1 className="display-font text-2xl">Платёж не найден</h1><Button asChild className="mt-5 rounded-full"><Link to="/">На главную</Link></Button></div></div>
  )
  const success = payment.status === 'succeeded'
  const pending = payment.status === 'pending'
  const progress = token?.type === 'table' ? tableProgress(state, token.token) : null
  const againUrl = `/p/${payment.qrToken}${token?.type === 'staff' ? '' : `?staff=${member.id}`}`
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background pb-[env(safe-area-inset-bottom)]">
      <header className="page-container py-3"><Logo /></header>
      <main className="page-container grid max-w-xl place-items-center py-6 sm:py-12">
        <section className="success-pop surface relative w-full overflow-hidden p-6 text-center sm:p-10" aria-live="polite">
          <div className="absolute left-6 top-8 size-3 rounded-full bg-accent/60" aria-hidden="true" /><div className="absolute right-10 top-16 size-2 rounded-full bg-primary/40" aria-hidden="true" /><div className="absolute bottom-24 left-10 size-2 rounded-full bg-accent/40" aria-hidden="true" />
          <span className={`mx-auto grid size-20 place-items-center rounded-full ${success ? 'bg-primary text-primary-foreground' : pending ? 'bg-amber-100 text-amber-900' : 'bg-red-100 text-red-800'}`}>
            {success ? <Check className="size-10" strokeWidth={2.5} /> : pending ? <span className="size-8 animate-spin rounded-full border-4 border-amber-800/20 border-t-amber-800" /> : <X className="size-10" />}
          </span>
          <p className="mt-6 text-sm font-bold text-muted-foreground">{formatMoney(payment.amount)} · {displayGuestName(payment)}</p>
          <h1 className="display-font mt-2 text-2xl font-semibold leading-tight sm:text-3xl">{success ? 'Спасибо уже в пути' : pending ? 'Подтверждаем оплату' : 'Оплата не прошла'}</h1>
          <p className="mx-auto mt-3 max-w-sm text-muted-foreground">{success ? `${member.name} уже видит ваше спасибо${payment.message ? ' и тёплые слова' : ''}.` : pending ? 'Обычно это занимает несколько секунд. Обновите страницу через мгновение.' : 'Деньги не списаны. Проверьте данные карты или попробуйте ещё раз.'}</p>
          {success && <div className="my-6 flex items-center justify-center gap-3"><StaffAvatar member={member} size="md" /><div className="text-left"><p className="font-extrabold">{member.name}</p><p className="text-sm text-muted-foreground">{member.position}</p></div></div>}
          {success && progress && <div className="mb-5 rounded-2xl bg-secondary/65 p-4 text-sm font-bold text-primary">Вы {progress.tipped}-й из {progress.expected} за этим столом{progress.expected - progress.tipped === 1 ? ' — стол почти собрался!' : ' — спасибо, что присоединились!'}</div>}
          {success && payment.isGoalTopup && <div className="mb-5 rounded-2xl border border-accent/30 bg-accent/10 p-4 text-sm font-bold"><Heart className="mr-2 inline size-5 text-accent" />Вы помогли закрыть цель «{member.goal.title}»</div>}
          <div className="grid gap-3">
            {success ? <Button asChild size="lg" className="rounded-2xl bg-accent text-accent-foreground"><Link to={againUrl}>Оставить ещё<ArrowRight /></Link></Button> : <Button asChild size="lg" className="rounded-2xl"><Link to={againUrl}><RotateCcw />Попробовать снова</Link></Button>}
            {success && payment.showOnWall && <Button asChild variant="outline" className="rounded-2xl"><Link to={`/wall/${payment.venueId}`}>Посмотреть на стене</Link></Button>}
            {!success && <Button asChild variant="ghost" className="rounded-2xl"><Link to="/">Вернуться на главную</Link></Button>}
          </div>
        </section>
      </main>
    </div>
  )
}
