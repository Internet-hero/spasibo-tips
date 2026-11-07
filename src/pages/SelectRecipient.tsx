import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { ArrowRight, Search, Users } from 'lucide-react'
import { PublicHeader } from '@/components/PublicHeader'
import { StaffAvatar } from '@/components/StaffAvatar'
import { useDemoState } from '@/lib/store'
import { isSameDay, tableProgress } from '@/lib/domain'
import Unavailable from '@/pages/Unavailable'

export default function SelectRecipient() {
  const { qrToken = '' } = useParams()
  const state = useDemoState()
  const [query, setQuery] = useState('')
  const token = state.qrTokens.find((item) => item.token === qrToken && item.active)
  const venue = state.venues.find((item) => item.id === token?.venueId && item.active)
  const members = useMemo(() => state.staff.filter((member) => member.venueId === token?.venueId && member.active && `${member.name} ${member.position}`.toLowerCase().includes(query.trim().toLowerCase())), [state.staff, token?.venueId, query])
  if (token?.type === 'staff') return <Navigate to={`/p/${qrToken}`} replace />
  if (!token || !venue) return <Unavailable title="QR-код недействителен" text="Попросите сотрудника показать актуальный QR-код заведения." />
  const progress = token.type === 'table' ? tableProgress(state, token.token) : null
  const today = new Date()
  const popular = state.staff.filter((member) => member.venueId === venue.id && member.active).map((member) => ({
    member,
    count: state.tips.filter((tip) => tip.staffId === member.id && tip.status === 'succeeded' && isSameDay(today, tip.createdAt)).length,
  })).sort((a, b) => b.count - a.count)[0]
  return (
    <div className="min-h-[100dvh] bg-background">
      <PublicHeader venueId={venue.id} />
      <main className="page-container max-w-3xl py-5 sm:py-10">
        <div className="mb-7">
          <p className="text-sm font-bold text-muted-foreground">{venue.name}{token.tableLabel ? ` · ${token.tableLabel}` : ''}</p>
          <h1 className="display-font mt-2 text-2xl font-semibold leading-tight sm:text-4xl">Кому скажем спасибо?</h1>
          <p className="mt-3 text-muted-foreground">Выберите человека, который сделал ваш визит особенным.</p>
        </div>
        {progress && (
          <div className="mb-5 flex items-center gap-4 rounded-3xl bg-primary p-5 text-primary-foreground">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/10"><Users className="size-5" /></span>
            <p className="font-bold"><span className="text-accent">{progress.tipped} из {progress.expected}</span> за этим столом уже сказали спасибо</p>
          </div>
        )}
        {popular && popular.count > 0 && <p className="mb-5 text-sm font-semibold text-muted-foreground">Сегодня чаще выбирают: {popular.member.name} · {popular.count} чаевых</p>}
        <label className="relative block">
          <span className="sr-only">Найти сотрудника</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="field-input pl-12" placeholder="Имя или должность" type="search" />
        </label>
        <div className="mt-5 grid gap-3 sm:grid-cols-2" aria-live="polite">
          {members.map((member) => {
            const count = state.tips.filter((tip) => tip.staffId === member.id && tip.status === 'succeeded' && isSameDay(today, tip.createdAt)).length
            return (
              <Link key={member.id} to={`/p/${token.token}?staff=${member.id}`} className="surface group flex min-h-28 items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:border-primary sm:p-5">
                <StaffAvatar member={member} size="lg" />
                <span className="min-w-0 flex-1"><span className="block truncate text-xl font-extrabold">{member.name}</span><span className="block text-sm text-muted-foreground">{member.position}</span><span className="mt-2 block text-xs font-bold text-primary">{count > 0 ? `${count} благодарностей сегодня` : 'Можно стать первым сегодня'}</span></span>
                <ArrowRight className="size-5 shrink-0 text-primary transition-transform group-hover:translate-x-1" />
              </Link>
            )
          })}
        </div>
        {members.length === 0 && <div className="surface mt-5 p-8 text-center"><p className="font-bold">Никого не нашли</p><p className="mt-1 text-sm text-muted-foreground">Проверьте имя или выберите другую должность.</p><button onClick={() => setQuery('')} className="mt-4 min-h-11 rounded-xl px-4 font-bold text-primary hover:bg-secondary">Сбросить поиск</button></div>}
        <p className="mt-8 text-center text-xs text-muted-foreground">Оплата защищена · В демо используется мок-касса</p>
      </main>
    </div>
  )
}
