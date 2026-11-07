import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { ArrowLeft, Expand, Heart, Pause, Play, QrCode, Shrink } from 'lucide-react'
import { toast } from 'sonner'
import { Logo } from '@/components/Logo'
import { StaffAvatar } from '@/components/StaffAvatar'
import { Button } from '@/components/ui/button'
import { displayGuestName, wallTips } from '@/lib/domain'
import { useDemoState } from '@/lib/store'
import Unavailable from '@/pages/Unavailable'

export default function Wall() {
  const { venueId = '' } = useParams()
  const state = useDemoState()
  const [searchParams, setSearchParams] = useSearchParams()
  const tv = searchParams.get('tv') === '1'
  const [paused, setPaused] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const venue = state.venues.find((item) => item.id === venueId && item.active)
  const venueQr = state.qrTokens.find((item) => item.type === 'venue' && item.venueId === venueId && item.active)
  const messages = useMemo(() => wallTips(state, venueId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [state, venueId])
  useEffect(() => {
    if (!tv || paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => {
      const element = scrollRef.current
      if (!element || element.scrollHeight <= element.clientHeight + 10) return
      if (element.scrollTop + element.clientHeight >= element.scrollHeight - 20) element.scrollTo({ top: 0, behavior: 'smooth' })
      else element.scrollBy({ top: 250, behavior: 'smooth' })
    }, 3500)
    return () => window.clearInterval(timer)
  }, [tv, paused, messages.length])
  useEffect(() => {
    if (!tv) return
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setSearchParams({}) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [tv, setSearchParams])
  if (!venue) return <Unavailable title="Стена недоступна" text="Заведение отключено или ссылка устарела." />
  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Ссылка на стену скопирована')
    } catch {
      toast.error('Не удалось скопировать автоматически. Скопируйте адрес из строки браузера.')
    }
  }
  return (
    <div className={tv ? 'h-[100dvh] overflow-hidden bg-primary text-primary-foreground' : 'min-h-[100dvh] bg-background'}>
      <header className={`${tv ? 'px-5 py-4 sm:px-8' : 'page-container py-3'} flex items-center justify-between gap-3`}>
        {tv ? <Logo inverse /> : <Logo />}
        <div className="flex items-center gap-2">
          <Button variant={tv ? 'secondary' : 'outline'} size="sm" onClick={() => setSearchParams(tv ? {} : { tv: '1' })} className="rounded-full">{tv ? <Shrink /> : <Expand />}<span className="hidden sm:inline">{tv ? 'Выйти из TV' : 'TV-режим'}</span></Button>
          {tv && <Button variant="secondary" size="icon" onClick={() => setPaused((value) => !value)} aria-label={paused ? 'Возобновить автоскролл' : 'Приостановить автоскролл'}>{paused ? <Play /> : <Pause />}</Button>}
        </div>
      </header>
      <main className={tv ? 'mx-auto flex h-[calc(100dvh-80px)] max-w-6xl flex-col px-5 pb-6 sm:px-8' : 'page-container max-w-4xl py-6 sm:py-10'}>
        <div className={tv ? 'mb-5 flex items-end justify-between gap-5' : 'mb-8'}>
          <div><p className={`text-sm font-bold ${tv ? 'text-primary-foreground/65' : 'text-muted-foreground'}`}>{venue.name} · {venue.address}</p><h1 className={`display-font mt-2 font-semibold leading-tight ${tv ? 'text-2xl sm:text-4xl' : 'text-3xl sm:text-5xl'}`}>Стена<br className="sm:hidden" /> благодарностей</h1>{!tv && <p className="mt-4 max-w-xl text-muted-foreground">Слова гостей, которые сделали чья-то смену добрее.</p>}</div>
          {!tv && venueQr && <Button asChild className="hidden rounded-full sm:inline-flex"><Link to={`/p/${venueQr.token}/select`}><Heart />Сказать спасибо</Link></Button>}
        </div>
        <div ref={scrollRef} className={tv ? 'tv-scroll min-h-0 flex-1 overflow-y-auto rounded-3xl bg-white/5 p-4 sm:p-6' : 'space-y-4'} aria-live="polite">
          <div className={tv ? 'grid gap-4 md:grid-cols-2' : 'grid gap-4 sm:grid-cols-2'}>
            {messages.map((tip) => {
              const member = state.staff.find((item) => item.id === tip.staffId)
              if (!member) return null
              return (
                <article key={tip.id} className={tv ? 'flex min-h-52 flex-col rounded-3xl bg-[#f8faf5] p-6 text-[#173d30]' : 'surface flex min-h-52 flex-col p-5 sm:p-6'}>
                  <blockquote className={tv ? 'text-xl font-bold leading-relaxed sm:text-2xl' : 'text-lg font-bold leading-relaxed'}>«{tip.message}»</blockquote>
                  <footer className="mt-auto flex items-center gap-3 pt-6">
                    <StaffAvatar member={member} size="sm" />
                    <div className="min-w-0"><p className="truncate text-sm font-extrabold">{displayGuestName(tip)} → {member.name}</p><p className="text-xs text-muted-foreground">{member.position} · {new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date(tip.createdAt))}</p></div>
                    <Heart className="ml-auto size-5 shrink-0 fill-accent text-accent" />
                  </footer>
                </article>
              )
            })}
          </div>
          {messages.length === 0 && <div className="grid min-h-52 place-items-center p-6 text-center"><div><Heart className="mx-auto size-8 opacity-50" /><p className="mt-3 font-bold">Здесь появится первая благодарность</p></div></div>}
        </div>
        <div className={`flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between ${tv ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
          <p className="text-xs">Публикуются только послания с согласия гостя · модерация включена</p>
          <div className="flex gap-2">
            <Button variant={tv ? 'secondary' : 'outline'} size="sm" onClick={share} className="rounded-full"><QrCode />Поделиться</Button>
            {!tv && <Button asChild variant="ghost" size="sm" className="rounded-full"><Link to="/"><ArrowLeft />На главную</Link></Button>}
          </div>
        </div>
      </main>
    </div>
  )
}
