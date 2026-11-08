import { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { ArrowRight, BarChart3, Check, FileKey, QrCode, ReceiptText, ShieldCheck, Users } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { StaffAvatar } from '@/components/StaffAvatar'
import { Button } from '@/components/ui/button'
import { calcAmounts } from '@/lib/qr'
import { formatMoney } from '@/lib/domain'
import { useDemoState } from '@/lib/store'
import type { Role } from '@/types'

export default function Home() {
  const state = useDemoState()
  const navigate = useNavigate()
  const employee = state.employees.find((member) => member.employee_id === 'e_001') ?? state.employees[0]
  const [tipPct, setTipPct] = useState(10)
  const baseAmount = 637
  const amounts = calcAmounts(baseAmount, tipPct)
  const openRole = (role: Role) => navigate(`/login?role=${role}`)
  return (
    <div className="min-h-[100dvh] overflow-hidden bg-background">
      <header className="page-container flex min-h-20 items-center justify-between gap-4">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex" aria-label="Навигация">
          <a href="#features" className="inline-flex min-h-11 items-center text-sm font-bold text-muted-foreground transition hover:text-primary">Возможности</a>
          <Link to="/p/qr_001" className="inline-flex min-h-11 items-center text-sm font-bold text-muted-foreground transition hover:text-primary">Демо чека</Link>
          <Link to="/login" className="inline-flex min-h-11 items-center text-sm font-bold text-muted-foreground transition hover:text-primary">Войти</Link>
        </nav>
        <Button asChild variant="outline" className="rounded-full"><Link to="/register">Для бизнеса</Link></Button>
      </header>
      <main>
        <section className="page-container grid items-center gap-12 py-10 sm:py-16 lg:grid-cols-[1.05fr_.95fr] lg:py-20">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-secondary/55 px-4 py-2 text-sm font-bold text-primary"><QrCode className="size-4 text-accent" />Онлайн-чаевые для сети «Вкус-Сервис»</div>
            <h1 className="display-font text-[2.2rem] font-semibold leading-[1.15] sm:text-5xl lg:text-[3.7rem]">Чаевые по QR <span className="relative whitespace-nowrap text-primary">на чеке<svg className="absolute -bottom-3 left-0 w-full text-accent" viewBox="0 0 260 16" fill="none" aria-hidden="true"><path d="M4 11C65 3 158 4 256 8" stroke="currentColor" strokeWidth="5" strokeLinecap="round" /></svg></span></h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground">Клиент сканирует одноразовый QR, выбирает процент чаевых и подтверждает оплату. Мерчант получает отчёты, официант — только свои чаевые.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="rounded-full text-base"><Link to="/p/qr_001">Открыть демо-чек<ArrowRight /></Link></Button>
              <Button asChild size="lg" variant="ghost" className="rounded-full text-base"><Link to="/login">Войти в кабинет<Users /></Link></Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-muted-foreground">
              <span className="inline-flex items-center gap-2"><Check className="size-4 text-primary" />HMAC-SHA256</span>
              <span className="inline-flex items-center gap-2"><Check className="size-4 text-primary" />TTL 24 часа</span>
              <span className="inline-flex items-center gap-2"><Check className="size-4 text-primary" />Без реальных платежей</span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md lg:mr-4">
            <div className="absolute -right-8 -top-8 size-36 rounded-full bg-accent/15" aria-hidden="true" />
            <div className="surface relative overflow-hidden p-5 sm:p-7">
              <div className="flex items-center gap-4">{employee && <StaffAvatar member={employee} size="lg" />}<div><p className="text-sm text-muted-foreground">Ваш сотрудник</p><h2 className="text-2xl font-extrabold">{employee?.name}</h2><p className="text-sm font-semibold text-primary">Вкус-Сервис Тверская</p></div></div>
              <div className="my-6 soft-divider" />
              <div className="flex items-end justify-between gap-4"><div><p className="field-label">Чек r_1001</p><p className="display-font text-3xl font-semibold">{formatMoney(baseAmount)}</p></div><ReceiptText className="size-8 text-accent" /></div>
              <p className="field-label mt-6">Чаевые</p>
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Выбор процента чаевых">
                {[5, 10, 15].map((pct) => <button key={pct} type="button" data-testid={`home-tip-${pct}`} onClick={() => setTipPct(pct)} aria-pressed={tipPct === pct} className={`min-h-12 cursor-pointer rounded-2xl border text-base font-extrabold shadow-sm transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 ${tipPct === pct ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary'}`}>{pct}%</button>)}
              </div>
              <div className="mt-5 rounded-2xl bg-secondary/60 p-4 text-sm"><div className="flex justify-between gap-4"><span>Чаевые</span><strong>{formatMoney(amounts.tip)}</strong></div><div className="mt-2 flex justify-between gap-4 text-base"><span>Итого</span><strong>{formatMoney(amounts.total)}</strong></div></div>
              <Link data-testid="home-open-qr" to={`/p/qr_001?tip=${tipPct}`} className="mt-5 flex min-h-12 items-center justify-center rounded-2xl bg-accent font-extrabold text-accent-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-accent/90">Продолжить по QR<ArrowRight className="ml-2 size-5" /></Link>
            </div>
          </div>
        </section>
        <section id="features" className="scroll-mt-6 border-y bg-card py-14 sm:py-20">
          <div className="page-container">
            <div className="max-w-2xl"><h2 className="display-font text-2xl font-semibold leading-tight sm:text-4xl">От подписанного QR<br />до понятного отчёта.</h2><p className="mt-4 text-muted-foreground">Реализованы обязательные правила кейса, без реального платёжного шлюза.</p></div>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              <article className="border-t-2 border-primary pt-5"><FileKey className="size-7 text-accent" /><h3 className="mt-4 text-xl font-extrabold">Защищённый QR</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Шесть полей payload, подпись HMAC-SHA256, срок действия 24 часа и одноразовый nonce.</p></article>
              <article className="border-t-2 border-primary pt-5"><BarChart3 className="size-7 text-accent" /><h3 className="mt-4 text-xl font-extrabold">Три разреза отчётов</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">По мерчанту, по официанту и по дням: суммы, средний процент и доля успешных платежей.</p></article>
              <article className="border-t-2 border-primary pt-5"><ShieldCheck className="size-7 text-accent" /><h3 className="mt-4 text-xl font-extrabold">Контроль и аудит</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Идемпотентность, отмена до подтверждения, маскирование реквизитов и журнал переходов.</p></article>
            </div>
          </div>
        </section>
        <section className="page-container py-14 sm:py-20">
          <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div><p className="text-sm font-bold text-muted-foreground">Три кабинета и гостевой сценарий</p><h2 className="display-font mt-3 text-2xl font-semibold sm:text-3xl">Выберите роль для входа</h2></div>
            <div className="grid gap-3 sm:grid-cols-3">
              <button onClick={() => openRole('staff')} className="group rounded-3xl border bg-card p-5 text-left transition hover:-translate-y-1 hover:border-primary"><ReceiptText className="size-6 text-accent" /><span className="mt-5 block font-extrabold">Официант</span><span className="mt-1 block text-sm text-muted-foreground">Свои чаевые и QR на чек</span><span className="mt-4 flex items-center gap-2 text-sm font-bold text-primary">Войти<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span></button>
              <button onClick={() => openRole('manager')} className="group rounded-3xl border bg-card p-5 text-left transition hover:-translate-y-1 hover:border-primary"><BarChart3 className="size-6 text-accent" /><span className="mt-5 block font-extrabold">Мерчант</span><span className="mt-1 block text-sm text-muted-foreground">Команда, QR и отчётность</span><span className="mt-4 flex items-center gap-2 text-sm font-bold text-primary">Войти<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span></button>
              <button onClick={() => openRole('admin')} className="group rounded-3xl border bg-card p-5 text-left transition hover:-translate-y-1 hover:border-primary"><ShieldCheck className="size-6 text-accent" /><span className="mt-5 block font-extrabold">Администратор</span><span className="mt-1 block text-sm text-muted-foreground">Мерчанты, доступ и аудит</span><span className="mt-4 flex items-center gap-2 text-sm font-bold text-primary">Войти<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span></button>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t"><div className="page-container flex flex-col gap-3 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><Logo /><p>Демо кейса · локальные CSV и localStorage · без реальных платежей</p></div></footer>
    </div>
  )
}
