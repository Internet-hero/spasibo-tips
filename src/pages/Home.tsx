import { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { ArrowRight, Check, Heart, MessageCircleHeart, QrCode, ShieldCheck, Sparkles, Target, Users } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { StaffAvatar } from '@/components/StaffAvatar'
import { GoalProgress } from '@/components/GoalProgress'
import { Button } from '@/components/ui/button'
import { demoActions, useDemoState } from '@/lib/store'
import type { Role } from '@/types'

export default function Home() {
  const state = useDemoState()
  const navigate = useNavigate()
  const anna = state.staff.find((member) => member.id === 'staff-anna') ?? state.staff[0]
  const [demoAmount, setDemoAmount] = useState(300)
  const openRole = (role: Role) => {
    demoActions.loginAs(role)
    navigate(role === 'staff' ? '/staff' : role === 'manager' ? '/manager' : '/admin')
  }
  return (
    <div className="min-h-[100dvh] overflow-hidden bg-background">
      <header className="page-container flex min-h-20 items-center justify-between gap-4">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex" aria-label="Навигация">
          <a href="#features" className="inline-flex min-h-11 items-center text-sm font-bold text-muted-foreground transition hover:text-primary">Возможности</a>
          <Link to="/wall/venue-coffee" className="inline-flex min-h-11 items-center text-sm font-bold text-muted-foreground transition hover:text-primary">Стена</Link>
          <Link to="/login" className="inline-flex min-h-11 items-center text-sm font-bold text-muted-foreground transition hover:text-primary">Войти</Link>
        </nav>
        <Button asChild variant="outline" className="rounded-full"><Link to="/login">Для бизнеса</Link></Button>
      </header>

      <main>
        <section className="page-container grid items-center gap-12 py-10 sm:py-16 lg:grid-cols-[1.05fr_.95fr] lg:py-20">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-secondary/55 px-4 py-2 text-sm font-bold text-primary">
              <Sparkles className="size-4 text-accent" />Не просто чаевые. Живая благодарность.
            </div>
            <h1 className="display-font text-[2.2rem] font-semibold leading-[1.15] sm:text-5xl lg:text-[3.7rem]">
              Спасибо, которое <span className="relative whitespace-nowrap text-primary">доходит<svg className="absolute -bottom-3 left-0 w-full text-accent" viewBox="0 0 260 16" fill="none" aria-hidden="true"><path d="M4 11C65 3 158 4 256 8" stroke="currentColor" strokeWidth="5" strokeLinecap="round" /></svg></span>
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground">Чаевые по QR за три касания — с личным посланием, целью сотрудника и местом для ваших тёплых слов.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="rounded-full bg-primary text-base"><Link to="/p/table7/select">Попробовать как гость<ArrowRight /></Link></Button>
              <Button asChild size="lg" variant="ghost" className="rounded-full text-base"><Link to="/wall/venue-coffee">Посмотреть стену<Heart /></Link></Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-muted-foreground">
              <span className="inline-flex items-center gap-2"><Check className="size-4 text-primary" />Без регистрации</span>
              <span className="inline-flex items-center gap-2"><Check className="size-4 text-primary" />Можно анонимно</span>
              <span className="inline-flex items-center gap-2"><Check className="size-4 text-primary" />Демо-оплата</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:mr-4">
            <div className="absolute -right-8 -top-8 size-36 rounded-full bg-accent/15" aria-hidden="true" />
            <div className="surface relative overflow-hidden p-5 sm:p-7">
              <div className="flex items-center gap-4">
                {anna && <StaffAvatar member={anna} size="lg" />}
                <div><p className="text-sm text-muted-foreground">Ваш бариста</p><h2 className="text-2xl font-extrabold">{anna?.name}</h2><p className="text-sm font-semibold text-primary">Просто кофе</p></div>
              </div>
              <div className="mt-6">{anna && <GoalProgress goal={anna.goal} staffName={anna.name} compact />}</div>
              <div className="my-6 soft-divider" />
              <p className="field-label">Сумма благодарности</p>
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Выбор демо-суммы">
                {[200, 300, 500].map((amount) => {
                  const selected = demoAmount === amount
                  return (
                    <button
                      key={amount}
                      type="button"
                      data-testid={`home-amount-${amount}`}
                      onClick={() => setDemoAmount(amount)}
                      aria-pressed={selected}
                      aria-label={`Сумма ${amount} рублей`}
                      className={`min-h-12 cursor-pointer rounded-2xl border text-base font-extrabold shadow-sm transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ${selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary hover:bg-secondary/40'}`}
                    >
                      {amount} ₽
                    </button>
                  )
                })}
              </div>
              <div className="mt-5 flex items-start gap-3 rounded-2xl bg-secondary/60 p-4">
                <MessageCircleHeart className="mt-0.5 size-5 shrink-0 text-accent" />
                <p className="text-sm font-semibold">«Спасибо за утро и за раф» — ваши слова увидит Анна.</p>
              </div>
              <Link data-testid="home-pay-anna" to={`/p/anna?amount=${demoAmount}`} className="mt-5 flex min-h-12 items-center justify-center rounded-2xl bg-accent font-extrabold text-accent-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-accent/90 active:translate-y-0 active:scale-95">Сказать спасибо · {demoAmount} ₽</Link>
            </div>
            <div className="surface absolute -bottom-7 -left-3 hidden items-center gap-3 rounded-2xl p-3 pr-5 sm:flex">
              <span className="grid size-10 place-items-center rounded-full bg-secondary text-primary"><Users className="size-5" /></span>
              <p className="text-sm font-bold">3 из 5 за столом<br /><span className="font-medium text-muted-foreground">уже сказали спасибо</span></p>
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-6 border-y bg-card py-14 sm:py-20">
          <div className="page-container">
            <div className="max-w-2xl"><h2 className="display-font text-2xl font-semibold leading-tight sm:text-4xl">Маленький жест.<br />Большой след.</h2><p className="mt-4 text-muted-foreground">Всё, что превращает платёж в человеческое «спасибо».</p></div>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              <article className="border-t-2 border-primary pt-5"><Target className="size-7 text-accent" /><h3 className="mt-4 text-xl font-extrabold">Цель, а не просто сумма</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Гость видит мечту сотрудника и может закрыть недостающую сумму одним касанием.</p></article>
              <article className="border-t-2 border-primary pt-5"><MessageCircleHeart className="size-7 text-accent" /><h3 className="mt-4 text-xl font-extrabold">Слова остаются</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Лучшие послания попадают на публичную стену и в TV-режим для экрана заведения.</p></article>
              <article className="border-t-2 border-primary pt-5"><ShieldCheck className="size-7 text-accent" /><h3 className="mt-4 text-xl font-extrabold">Комфортная анонимность</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Только имя или полностью анонимно. Никаких профилей, контактов и лишних данных.</p></article>
            </div>
          </div>
        </section>

        <section className="page-container py-14 sm:py-20">
          <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div><p className="text-sm font-bold text-muted-foreground">Демо для всей команды</p><h2 className="display-font mt-3 text-2xl font-semibold sm:text-3xl">Выберите свою роль</h2></div>
            <div className="grid gap-3 sm:grid-cols-3">
              <button onClick={() => openRole('staff')} className="group rounded-3xl border bg-card p-5 text-left transition hover:-translate-y-1 hover:border-primary"><Heart className="size-6 text-accent" /><span className="mt-5 block font-extrabold">Сотрудник</span><span className="mt-1 block text-sm text-muted-foreground">Смена, цель и мой QR</span><span className="mt-4 flex items-center gap-2 text-sm font-bold text-primary">Открыть<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span></button>
              <button onClick={() => openRole('manager')} className="group rounded-3xl border bg-card p-5 text-left transition hover:-translate-y-1 hover:border-primary"><QrCode className="size-6 text-accent" /><span className="mt-5 block font-extrabold">Управляющий</span><span className="mt-1 block text-sm text-muted-foreground">Команда, аналитика и QR</span><span className="mt-4 flex items-center gap-2 text-sm font-bold text-primary">Открыть<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span></button>
              <button onClick={() => openRole('admin')} className="group rounded-3xl border bg-card p-5 text-left transition hover:-translate-y-1 hover:border-primary"><ShieldCheck className="size-6 text-accent" /><span className="mt-5 block font-extrabold">Администратор</span><span className="mt-1 block text-sm text-muted-foreground">Заведения и платежи</span><span className="mt-4 flex items-center gap-2 text-sm font-bold text-primary">Открыть<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span></button>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t"><div className="page-container flex flex-col gap-3 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><Logo /><p>Хакатон · Демо с мок-кассой, без реальных платежей</p></div></footer>
    </div>
  )
}
