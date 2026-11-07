import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ArrowRight, KeyRound, Mail, ShieldCheck, UserRound, Users } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { demoActions } from '@/lib/store'
import type { Role } from '@/types'

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialInvite = searchParams.get('invite') ?? ''
  const [mode, setMode] = useState<'email' | 'invite'>(initialInvite ? 'invite' : 'email')
  const [email, setEmail] = useState('manager@spasibo.demo')
  const [password, setPassword] = useState('demo')
  const [invite, setInvite] = useState(initialInvite)
  const [error, setError] = useState('')
  const destination = (role: Role) => role === 'staff' ? '/staff' : role === 'manager' ? '/manager' : '/admin'
  const submit = (event: FormEvent) => {
    event.preventDefault()
    setError('')
    const result = demoActions.login(email, password, invite)
    if (!result.ok) return setError(result.error ?? 'Не удалось войти')
    navigate(destination(result.role))
  }
  const quick = (role: Role) => { demoActions.loginAs(role); navigate(destination(role)) }
  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="page-container py-3"><Logo /></header>
      <main className="page-container grid items-center gap-10 py-8 lg:grid-cols-2 lg:py-16">
        <section className="hidden lg:block">
          <p className="text-sm font-bold text-muted-foreground">Один сервис · три кабинета</p>
          <h1 className="display-font mt-4 max-w-lg text-4xl font-semibold leading-tight">Всё важное —<br />в одном месте.</h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">Сотрудник видит благодарности и цель. Управляющий — команду и динамику. Администратор — всю платформу.</p>
          <div className="mt-8 flex items-center gap-3 text-sm font-semibold text-primary"><ShieldCheck className="size-5" />Ролевой доступ в демо-контуре</div>
        </section>
        <section className="surface mx-auto w-full max-w-lg p-5 sm:p-8">
          <h2 className="display-font text-2xl font-semibold">Вход в кабинет</h2>
          <p className="mt-2 text-sm text-muted-foreground">Используйте демо-данные или код приглашения.</p>
          <div className="mt-6 grid grid-cols-2 rounded-2xl bg-muted p-1">
            <button onClick={() => { setMode('email'); setError('') }} aria-pressed={mode === 'email'} className={`min-h-11 rounded-xl text-sm font-bold transition ${mode === 'email' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>Email и пароль</button>
            <button onClick={() => { setMode('invite'); setError('') }} aria-pressed={mode === 'invite'} className={`min-h-11 rounded-xl text-sm font-bold transition ${mode === 'invite' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>Код приглашения</button>
          </div>
          <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
            {mode === 'email' ? <>
              <div><label htmlFor="login-email" className="field-label">Email</label><div className="relative"><Mail className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" /><input id="login-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="field-input pl-12" autoComplete="email" /></div></div>
              <div><label htmlFor="login-password" className="field-label">Пароль</label><div className="relative"><KeyRound className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" /><input id="login-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="field-input pl-12" autoComplete="current-password" /></div></div>
            </> : <div><label htmlFor="invite-code" className="field-label">Одноразовый код сотрудника</label><input id="invite-code" value={invite} onChange={(event) => setInvite(event.target.value.toUpperCase())} className="field-input uppercase tracking-widest" placeholder="ANNA2026" /><p className="mt-2 text-xs text-muted-foreground">Для демо подойдёт ANNA2026</p></div>}
            {error && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
            <Button type="submit" size="lg" className="w-full rounded-2xl">Войти<ArrowRight /></Button>
          </form>
          <div className="my-6 flex items-center gap-3 text-xs font-bold text-muted-foreground"><span className="h-px flex-1 bg-border" />БЫСТРЫЙ ДЕМО-ВХОД<span className="h-px flex-1 bg-border" /></div>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => quick('staff')} className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border px-2 text-xs font-bold transition hover:border-primary hover:bg-secondary/40"><UserRound className="size-5 text-accent" />Сотрудник</button>
            <button onClick={() => quick('manager')} className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border px-2 text-xs font-bold transition hover:border-primary hover:bg-secondary/40"><Users className="size-5 text-accent" />Управляющий</button>
            <button onClick={() => quick('admin')} className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border px-2 text-xs font-bold transition hover:border-primary hover:bg-secondary/40"><ShieldCheck className="size-5 text-accent" />Админ</button>
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">Новое заведение? <Link to="/register" className="inline-flex min-h-11 items-center font-bold text-primary underline-offset-4 hover:underline">Зарегистрировать</Link></p>
        </section>
      </main>
    </div>
  )
}
