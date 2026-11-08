import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { ArrowRight, BarChart3, KeyRound, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { demoActions } from '@/lib/store'
import type { Role } from '@/types'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const initialInvite = searchParams.get('invite') ?? ''
  const stateRole = (location.state as { role?: Role } | null)?.role
  const requestedRole = searchParams.get('role') ?? stateRole
  const initialRole: Role = requestedRole === 'staff' || requestedRole === 'admin' ? requestedRole : 'manager'
  const [selectedRole, setSelectedRole] = useState<Role>(initialRole)
  const [mode, setMode] = useState<'email' | 'invite'>(initialInvite ? 'invite' : 'email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [invite, setInvite] = useState(initialInvite)
  const [error, setError] = useState('')
  const destination = (role: Role) => role === 'staff' ? '/staff' : role === 'manager' ? '/manager' : '/admin'
  const submit = (event: FormEvent) => {
    event.preventDefault()
    setError('')
    const result = demoActions.login(email, password, mode === 'invite' ? invite : '', selectedRole)
    if (!result.ok) return setError(result.error)
    navigate(destination(result.role))
  }
  const chooseRole = (role: Role) => { setSelectedRole(role); setMode('email'); setError('') }
  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="page-container py-3"><Logo /></header>
      <main className="page-container grid items-center gap-10 py-8 lg:grid-cols-2 lg:py-16">
        <section className="hidden lg:block">
          <p className="text-sm font-bold text-muted-foreground">Мерчант · официант · администратор</p>
          <h1 className="display-font mt-4 max-w-lg text-4xl font-semibold leading-tight">У каждой роли —<br />свой контур доступа.</h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">Официант видит только свои чаевые. Мерчант управляет заведением. Администратор подтверждает регистрацию и контролирует платформу.</p>
          <div className="mt-8 flex items-center gap-3 text-sm font-semibold text-primary"><ShieldCheck className="size-5" />Визуальная авторизация без серверной проверки</div>
        </section>
        <section className="surface mx-auto w-full max-w-lg p-5 sm:p-8">
          <h2 className="display-font text-2xl font-semibold">Вход в кабинет</h2>
          <p className="mt-2 text-sm text-muted-foreground">Для демо введите любые непустые логин и пароль.</p>
          <div className="mt-6 grid grid-cols-2 rounded-2xl bg-muted p-1">
            <button onClick={() => { setMode('email'); setError('') }} aria-pressed={mode === 'email'} className={`min-h-11 rounded-xl text-sm font-bold transition ${mode === 'email' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>Логин и пароль</button>
            <button onClick={() => { setMode('invite'); setError('') }} aria-pressed={mode === 'invite'} className={`min-h-11 rounded-xl text-sm font-bold transition ${mode === 'invite' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>Приглашение</button>
          </div>
          <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
            {mode === 'email' ? <>
              <div><label htmlFor="login-email" className="field-label">Логин или email</label><div className="relative"><Mail className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" /><input id="login-email" type="text" value={email} onChange={(event) => setEmail(event.target.value)} className="field-input pl-12" autoComplete="username" placeholder="Любой логин" /></div></div>
              <div><label htmlFor="login-password" className="field-label">Пароль</label><div className="relative"><KeyRound className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" /><input id="login-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="field-input pl-12" autoComplete="current-password" placeholder="Любой пароль" /></div></div>
            </> : <div><label htmlFor="invite-code" className="field-label">Код приглашения сотрудника</label><input id="invite-code" value={invite} onChange={(event) => setInvite(event.target.value.toUpperCase())} className="field-input uppercase tracking-widest" placeholder="ANNA2026" /><p className="mt-2 text-xs text-muted-foreground">Для демо подойдёт ANNA2026</p></div>}
            {error && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
            <Button type="submit" size="lg" className="w-full rounded-2xl">Войти<ArrowRight /></Button>
          </form>
          <div className="my-6 flex items-center gap-3 text-xs font-bold text-muted-foreground"><span className="h-px flex-1 bg-border" />РЕЖИМ ДЛЯ ВХОДА<span className="h-px flex-1 bg-border" /></div>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => chooseRole('staff')} aria-pressed={selectedRole === 'staff' && mode === 'email'} className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border px-2 text-xs font-bold transition hover:border-primary hover:bg-secondary/40 ${selectedRole === 'staff' && mode === 'email' ? 'border-primary bg-secondary/50' : ''}`}><UserRound className="size-5 text-accent" />Официант</button>
            <button onClick={() => chooseRole('manager')} aria-pressed={selectedRole === 'manager' && mode === 'email'} className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border px-2 text-xs font-bold transition hover:border-primary hover:bg-secondary/40 ${selectedRole === 'manager' && mode === 'email' ? 'border-primary bg-secondary/50' : ''}`}><BarChart3 className="size-5 text-accent" />Мерчант</button>
            <button onClick={() => chooseRole('admin')} aria-pressed={selectedRole === 'admin' && mode === 'email'} className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border px-2 text-xs font-bold transition hover:border-primary hover:bg-secondary/40 ${selectedRole === 'admin' && mode === 'email' ? 'border-primary bg-secondary/50' : ''}`}><ShieldCheck className="size-5 text-accent" />Админ</button>
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">Новое заведение? <Link to="/register" className="inline-flex min-h-11 items-center font-bold text-primary underline-offset-4 hover:underline">Зарегистрировать</Link></p>
        </section>
      </main>
    </div>
  )
}
