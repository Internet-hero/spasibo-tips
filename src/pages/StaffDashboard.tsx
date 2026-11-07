import { useEffect, useMemo, useRef, useState } from 'react'
import { BellRing, Check, Copy, Download, Heart, MessageCircle, Printer, Sparkles, Wallet } from 'lucide-react'
import QRCode from 'qrcode'
import { toast } from 'sonner'
import { DashboardShell } from '@/components/DashboardShell'
import { GoalProgress } from '@/components/GoalProgress'
import { QrCode } from '@/components/QrCode'
import { Button } from '@/components/ui/button'
import { displayGuestName, formatMoney, isSameDay } from '@/lib/domain'
import { publicTipUrl } from '@/lib/links'
import { demoActions, useDemoState } from '@/lib/store'

export default function StaffDashboard() {
  const state = useDemoState()
  const member = state.staff.find((item) => item.id === state.session?.staffId)
  const [showAll, setShowAll] = useState(false)
  const previousLatest = useRef<string | undefined>(undefined)
  const tips = useMemo(() => state.tips.filter((tip) => tip.staffId === member?.id && tip.status === 'succeeded').sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [state.tips, member?.id])
  useEffect(() => {
    const latest = tips[0]
    if (previousLatest.current && latest && latest.id !== previousLatest.current) {
      toast.success(`Новое спасибо · ${formatMoney(latest.amount)}`, { description: `${displayGuestName(latest)}${latest.message ? `: «${latest.message}»` : ''}`, icon: <BellRing className="size-5" /> })
    }
    previousLatest.current = latest?.id
  }, [tips])
  if (!member) return null
  const today = new Date()
  const todayTips = tips.filter((tip) => isSameDay(today, tip.createdAt))
  const monthTips = tips.filter((tip) => { const date = new Date(tip.createdAt); return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear() })
  const todaySum = todayTips.reduce((sum, tip) => sum + tip.amount, 0)
  const monthSum = monthTips.reduce((sum, tip) => sum + tip.amount, 0)
  const named = todayTips.filter((tip) => !tip.isAnonymous).length
  const token = state.qrTokens.find((item) => item.staffId === member.id && item.active)
  const qrUrl = publicTipUrl(`/p/${token?.token ?? member.id}`)
  const copy = async () => {
    try { await navigator.clipboard.writeText(qrUrl); toast.success('Ссылка скопирована') } catch { toast.error('Не удалось скопировать. Выделите ссылку вручную.') }
  }
  const download = async () => {
    const url = await QRCode.toDataURL(qrUrl, { width: 800, margin: 3, color: { dark: '#173d30', light: '#fbfdf9' } })
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `spasibo-${member.name.toLowerCase()}-qr.png`; anchor.click()
    toast.success('QR-код скачан в PNG')
  }
  return (
    <DashboardShell role="staff" title={`Добрый день, ${member.name}`} subtitle="Ваша смена · обновляется в реальном времени">
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="grid gap-3 sm:grid-cols-2">
            <div className="surface bg-primary p-5 text-primary-foreground sm:p-6"><div className="flex items-center justify-between"><p className="text-sm font-bold text-primary-foreground/70">За смену</p><Wallet className="size-5 text-accent" /></div><p className="display-font mt-5 text-3xl font-semibold">{formatMoney(todaySum)}</p><p className="mt-2 text-sm text-primary-foreground/65">{todayTips.length} благодарностей · {named} поимённо</p></div>
            <div className="surface p-5 sm:p-6"><div className="flex items-center justify-between"><p className="text-sm font-bold text-muted-foreground">За месяц</p><Heart className="size-5 text-accent" /></div><p className="display-font mt-5 text-3xl font-semibold">{formatMoney(monthSum)}</p><p className="mt-2 text-sm text-muted-foreground">{monthTips.length} поступлений · без комиссии заведения</p></div>
          </section>
          <section className="surface p-5 sm:p-6"><GoalProgress goal={member.goal} staffName={member.name} compact />{member.goal.currentAmount >= member.goal.targetAmount && <p className="mt-4 flex items-center gap-2 rounded-2xl bg-secondary p-3 text-sm font-bold text-primary"><Check className="size-5" />Цель достигнута — можно гордиться!</p>}</section>
          <section>
            <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-xl font-extrabold">История благодарностей</h2><p className="text-sm text-muted-foreground">Имена, послания и важные моменты</p></div>{tips.length > 5 && <Button variant="ghost" size="sm" onClick={() => setShowAll((value) => !value)}>{showAll ? 'Свернуть' : 'Показать все'}</Button>}</div>
            <div className="space-y-3" aria-live="polite">
              {tips.slice(0, showAll ? tips.length : 5).map((tip) => (
                <article key={tip.id} className="surface p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <span className={`grid size-11 shrink-0 place-items-center rounded-full ${tip.isAnonymous ? 'bg-muted text-muted-foreground' : 'bg-secondary text-primary'}`}><Heart className="size-5" /></span>
                    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><p className="font-extrabold">{displayGuestName(tip)}</p><span className="text-xs text-muted-foreground">{new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(tip.createdAt))}</span>{tip.isGoalTopup && <span className="tag bg-accent/15 text-primary"><Sparkles className="size-3.5" />Добил цель</span>}</div>{tip.message && <p className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-muted-foreground"><MessageCircle className="mt-1 size-4 shrink-0" />«{tip.message}»</p>}</div>
                    <p className="shrink-0 text-lg font-extrabold text-primary">+{formatMoney(tip.amount)}</p>
                  </div>
                </article>
              ))}
              {tips.length === 0 && <div className="surface p-8 text-center text-muted-foreground">Первая благодарность появится здесь автоматически.</div>}
            </div>
          </section>
        </div>
        <aside className="space-y-5">
          <section className="surface p-5 text-center sm:p-6">
            <h2 className="text-left text-lg font-extrabold">Мой QR-код</h2><p className="mt-1 text-left text-sm text-muted-foreground">Для карточки, чека или бейджа</p>
            <div className="print-area mt-5 rounded-2xl border bg-[#fbfdf9] p-4"><QrCode value={qrUrl} label={`${member.name}, личный QR`} /><p className="mt-3 break-all text-center text-xs font-bold text-primary">spasibo.demo/p/{token?.token}</p></div>
            <div className="mt-4 grid grid-cols-2 gap-2"><Button variant="outline" size="sm" onClick={copy}><Copy />Копировать</Button><Button variant="outline" size="sm" onClick={download}><Download />PNG</Button></div>
            <Button variant="ghost" size="sm" onClick={() => window.print()} className="mt-2 w-full"><Printer />Печать карточки</Button>
          </section>
          <section className="rounded-3xl border bg-secondary/45 p-5"><div className="flex items-center gap-3"><StaffAvatarMini src={member.avatar} alt={member.name} /><div><p className="font-extrabold">{member.name}</p><p className="text-sm text-muted-foreground">{member.position}</p></div></div><p className="mt-4 text-xs leading-relaxed text-muted-foreground">Профиль виден гостю на странице оплаты. Личные контакты не публикуются.</p></section>
          <Button variant="outline" className="w-full" onClick={() => { demoActions.resetDemo(); toast.success('Демо обновлено') }}>Вернуть исходные данные</Button>
        </aside>
      </div>
    </DashboardShell>
  )
}

function StaffAvatarMini({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={`Фото сотрудника ${alt}`} className="size-11 rounded-full object-cover" />
}
