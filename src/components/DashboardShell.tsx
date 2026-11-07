import type { ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router'
import { BarChart3, Heart, Home, LogOut, QrCode, RotateCcw, ShieldCheck, Users, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { demoActions, useDemoState } from '@/lib/store'
import type { Role } from '@/types'

const navByRole: Record<Role, { to: string; label: string; icon: typeof Home; end?: boolean }[]> = {
  staff: [
    { to: '/staff', label: 'Моя смена', icon: Wallet, end: true },
    { to: '/wall/venue-coffee', label: 'Стена', icon: Heart },
  ],
  manager: [
    { to: '/manager', label: 'Обзор', icon: BarChart3, end: true },
    { to: '/manager/staff', label: 'Команда', icon: Users },
    { to: '/manager/qr', label: 'QR-коды', icon: QrCode },
  ],
  admin: [{ to: '/admin', label: 'Платформа', icon: ShieldCheck, end: true }],
}

export function DashboardShell({ role, title, subtitle, children }: { role: Role; title: string; subtitle: string; children: ReactNode }) {
  const state = useDemoState()
  const navigate = useNavigate()
  const venue = state.venues.find((item) => item.id === state.session?.venueId)
  const nav = navByRole[role].map((item) => role === 'staff' && item.label === 'Стена'
    ? { ...item, to: `/wall/${state.session?.venueId ?? 'venue-coffee'}` }
    : item)
  const logout = () => { demoActions.logout(); navigate('/') }
  const reset = () => {
    if (window.confirm('Вернуть исходные демо-данные? Добавленные платежи и сотрудники будут удалены.')) {
      demoActions.resetDemo()
      toast.success('Демо-данные восстановлены')
    }
  }
  return (
    <div className="min-h-[100dvh] bg-background lg:flex">
      <aside className="hidden w-64 shrink-0 flex-col bg-primary p-5 text-primary-foreground lg:fixed lg:inset-y-0 lg:flex">
        <Logo inverse />
        <div className="mt-8 rounded-2xl bg-white/7 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-primary-foreground/60">{role === 'admin' ? 'Администрирование' : 'Заведение'}</p>
          <p className="mt-1 font-bold">{role === 'admin' ? 'Вся платформа' : venue?.name ?? 'Просто кофе'}</p>
          <p className="mt-1 text-sm text-primary-foreground/65">{role === 'staff' ? 'Кабинет сотрудника' : role === 'manager' ? 'Кабинет управляющего' : 'Режим демо'}</p>
        </div>
        <nav className="mt-6 space-y-2" aria-label="Основная навигация">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-bold transition ${isActive ? 'bg-accent text-accent-foreground' : 'text-primary-foreground/75 hover:bg-white/7 hover:text-primary-foreground'}`}>
              <Icon className="size-5" />{label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-2 pt-6">
          <button onClick={reset} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-primary-foreground/65 transition hover:bg-white/7 hover:text-primary-foreground"><RotateCcw className="size-4" />Сбросить демо</button>
          <Link to="/" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-primary-foreground/65 transition hover:bg-white/7 hover:text-primary-foreground"><Home className="size-4" />На главную</Link>
          <button onClick={logout} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-primary-foreground/65 transition hover:bg-white/7 hover:text-primary-foreground"><LogOut className="size-4" />Выйти</button>
        </div>
      </aside>
      <div className="min-w-0 flex-1 lg:ml-64">
        <header className="border-b bg-card lg:hidden">
          <div className="flex items-center justify-between px-4 py-2">
            <Logo />
            <Button variant="ghost" size="icon" onClick={logout} aria-label="Выйти"><LogOut /></Button>
          </div>
          <nav className={`grid gap-1 px-3 pb-3 ${nav.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`} aria-label="Основная навигация">
            {nav.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 text-xs font-bold ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                <Icon className="size-4" />{label}
              </NavLink>
            ))}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-1 text-sm font-bold text-muted-foreground">{subtitle}</p>
              <h1 className="display-font text-2xl font-semibold leading-tight sm:text-3xl">{title}</h1>
            </div>
            <div className="hidden items-center gap-2 lg:flex">
              <span className="tag"><span className="size-2 rounded-full bg-emerald-600" />Демо-данные</span>
              <Button variant="outline" size="sm" onClick={reset}><RotateCcw />Сбросить</Button>
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}
