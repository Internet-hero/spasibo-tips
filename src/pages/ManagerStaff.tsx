import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { Copy, Edit3, Plus, QrCode, Search, UserRound, UserX } from 'lucide-react'
import { toast } from 'sonner'
import { DashboardShell } from '@/components/DashboardShell'
import { GoalProgress } from '@/components/GoalProgress'
import { StaffAvatar } from '@/components/StaffAvatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { publicTipUrl } from '@/lib/links'
import { demoActions, useDemoState } from '@/lib/store'
import type { StaffMember } from '@/types'

export default function ManagerStaff() {
  const state = useDemoState()
  const venueId = state.session?.venueId ?? 'venue-coffee'
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<StaffMember | null>(null)
  const [invited, setInvited] = useState<StaffMember | null>(null)
  const members = useMemo(() => state.staff.filter((member) => member.venueId === venueId && `${member.name} ${member.position}`.toLowerCase().includes(query.toLowerCase())), [state.staff, venueId, query])
  const openEdit = (member: StaffMember) => { setEditing(member); setOpen(true) }
  const copy = async (text: string, label = 'Скопировано') => {
    try { await navigator.clipboard.writeText(text); toast.success(label) } catch { toast.error('Не удалось скопировать автоматически') }
  }
  return (
    <DashboardShell role="manager" title="Команда" subtitle="Сотрудники, приглашения и цели смены">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full max-w-md"><span className="sr-only">Поиск сотрудника</span><Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} className="field-input pl-12" placeholder="Найти в команде" /></label>
        <Button onClick={() => { setEditing(null); setOpen(true) }} className="rounded-xl"><Plus />Добавить сотрудника</Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {members.map((member) => (
          <article key={member.id} className={`surface p-5 ${!member.active ? 'opacity-70' : ''}`}>
            <div className="flex items-start gap-4">
              <StaffAvatar member={member} size="lg" />
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-extrabold">{member.name}</h2><span className={`tag ${member.active ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-200 text-slate-700'}`}>{member.active ? 'Активен' : 'Отключён'}</span></div><p className="text-sm text-muted-foreground">{member.position}</p><p className="mt-2 text-xs font-semibold text-muted-foreground">Код приглашения: <button onClick={() => copy(member.inviteCode, 'Код приглашения скопирован')} className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 font-extrabold text-primary hover:bg-secondary">{member.inviteCode}<Copy className="size-3.5" /></button></p></div>
            </div>
            <div className="mt-5"><GoalProgress goal={member.goal} compact /></div>
            <div className="mt-5 flex flex-wrap gap-2 border-t pt-4">
              <Button variant="outline" size="sm" onClick={() => openEdit(member)}><Edit3 />Изменить и цель</Button>
              <Button asChild variant="outline" size="sm"><Link to={`/manager/qr?staff=${member.id}`}><QrCode />QR</Link></Button>
              <Button variant="ghost" size="sm" className={member.active ? 'text-red-800' : 'text-primary'} onClick={() => { demoActions.setStaffActive(member.id, !member.active); toast.success(member.active ? `${member.name} отключён: QR перестанет работать` : `${member.name} снова активен`) }}><UserX />{member.active ? 'Отключить' : 'Включить'}</Button>
            </div>
          </article>
        ))}
      </div>
      {members.length === 0 && <div className="surface p-10 text-center"><UserRound className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-extrabold">Сотрудники не найдены</p><p className="mt-1 text-sm text-muted-foreground">Измените запрос или добавьте нового человека.</p></div>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-3xl">
          <DialogHeader><DialogTitle className="text-2xl">{editing ? 'Профиль и цель' : 'Новый сотрудник'}</DialogTitle><DialogDescription>{editing ? 'Изменения сразу появятся на публичной странице.' : 'После сохранения вы получите код и ссылку-приглашение.'}</DialogDescription></DialogHeader>
          <StaffForm key={editing?.id ?? 'new'} member={editing} onCancel={() => setOpen(false)} onSave={(saved, isNew) => { setOpen(false); if (isNew) setInvited(saved); else toast.success('Профиль и цель обновлены') }} />
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(invited)} onOpenChange={(value) => { if (!value) setInvited(null) }}>
        <DialogContent className="rounded-3xl text-center">
          <DialogHeader><div className="mx-auto grid size-14 place-items-center rounded-full bg-secondary text-primary"><UserRound className="size-7" /></div><DialogTitle className="text-2xl">Приглашение готово</DialogTitle><DialogDescription>Передайте сотруднику код или ссылку. В демо код можно использовать многократно.</DialogDescription></DialogHeader>
          {invited && <div className="rounded-2xl bg-muted p-5"><p className="text-sm text-muted-foreground">{invited.name} · {invited.position}</p><p className="display-font mt-2 text-2xl font-semibold tracking-wider">{invited.inviteCode}</p><div className="mt-4 grid gap-2 sm:grid-cols-2"><Button variant="outline" onClick={() => copy(invited.inviteCode, 'Код скопирован')}><Copy />Код</Button><Button onClick={() => copy(publicTipUrl(`/login?invite=${invited.inviteCode}`), 'Ссылка скопирована')}><Copy />Ссылка</Button></div></div>}
          <Button variant="ghost" onClick={() => setInvited(null)}>Готово</Button>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  )
}

function StaffForm({ member, onSave, onCancel }: { member: StaffMember | null; onSave: (member: StaffMember, isNew: boolean) => void; onCancel: () => void }) {
  const [name, setName] = useState(member?.name ?? '')
  const [position, setPosition] = useState(member?.position ?? '')
  const [goalTitle, setGoalTitle] = useState(member?.goal.title ?? '')
  const [target, setTarget] = useState(String((member?.goal.targetAmount ?? 100_000) / 100))
  const [deadline, setDeadline] = useState(member?.goal.deadline ?? '')
  const [error, setError] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (name.trim().length < 2 || position.trim().length < 2) return setError('Заполните имя и должность')
    if (!goalTitle.trim() || Number(target) < 100) return setError('Укажите название цели и сумму от 100 ₽')
    const goal = { title: goalTitle.trim(), targetAmount: Math.round(Number(target) * 100), currentAmount: member?.goal.currentAmount ?? 0, deadline, isActive: true }
    if (member) {
      const patch = { name: name.trim().split(' ')[0], position: position.trim(), goal }
      demoActions.updateStaff(member.id, patch)
      onSave({ ...member, ...patch }, false)
    } else {
      const created = demoActions.addStaff({ name, position, goal })
      onSave(created, true)
    }
  }
  return <form onSubmit={submit} className="space-y-4" noValidate>
    <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="staff-name" className="field-label">Имя</label><input id="staff-name" className="field-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Анна" /></div><div><label htmlFor="staff-position" className="field-label">Должность</label><input id="staff-position" className="field-input" value={position} onChange={(event) => setPosition(event.target.value)} placeholder="Бариста" /></div></div>
    <div className="soft-divider pt-4"><p className="font-extrabold">Цель смены</p><p className="text-sm text-muted-foreground">Её увидят гости на странице оплаты.</p></div>
    <div><label htmlFor="goal-title" className="field-label">Название цели</label><input id="goal-title" className="field-input" value={goalTitle} onChange={(event) => setGoalTitle(event.target.value)} placeholder="Новая кофемолка" /></div>
    <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="goal-target" className="field-label">Сумма, ₽</label><input id="goal-target" type="number" min="100" step="50" className="field-input" value={target} onChange={(event) => setTarget(event.target.value)} /></div><div><label htmlFor="goal-deadline" className="field-label">Дедлайн</label><input id="goal-deadline" type="date" className="field-input" value={deadline} onChange={(event) => setDeadline(event.target.value)} /></div></div>
    {error && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><Button type="button" variant="ghost" onClick={onCancel}>Отмена</Button><Button type="submit">{member ? 'Сохранить изменения' : 'Создать приглашение'}</Button></div>
  </form>
}
