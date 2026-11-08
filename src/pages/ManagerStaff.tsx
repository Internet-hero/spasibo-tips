import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Copy, Edit3, Plus, Search, UserRound, UserX } from 'lucide-react'
import { toast } from 'sonner'
import { DashboardShell } from '@/components/DashboardShell'
import { StaffAvatar } from '@/components/StaffAvatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { maskPaymentDetails } from '@/lib/domain'
import { publicTipUrl } from '@/lib/links'
import { demoActions, useDemoState } from '@/lib/store'
import type { Employee } from '@/types'

export default function ManagerStaff() {
  const state = useDemoState()
  const merchantId = state.session?.merchant_id ?? 'm_001'
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [invited, setInvited] = useState<Employee | null>(null)
  const members = useMemo(() => state.employees.filter((member) => member.merchant_id === merchantId && `${member.name} ${member.employee_id}`.toLowerCase().includes(query.toLowerCase())), [state.employees, merchantId, query])
  const copy = async (text: string, label = 'Скопировано') => {
    try { await navigator.clipboard.writeText(text); toast.success(label) } catch { toast.error('Не удалось скопировать автоматически') }
  }
  return (
    <DashboardShell role="manager" title="Сотрудники" subtitle="Приглашения, доступ и маскированные реквизиты для выплат">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full max-w-md"><span className="sr-only">Поиск сотрудника</span><Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} className="field-input pl-12" placeholder="Имя или employee_id" /></label>
        <Button onClick={() => { setEditing(null); setOpen(true) }} className="rounded-xl"><Plus />Добавить сотрудника</Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {members.map((member) => <article key={member.employee_id} className={`surface p-5 ${!member.active ? 'opacity-70' : ''}`}>
          <div className="flex items-start gap-4"><StaffAvatar member={member} size="lg" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-extrabold">{member.name}</h2><span className={`tag ${member.active ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-200 text-slate-700'}`}>{member.active ? 'Активен' : 'Отключён'}</span></div><p className="text-sm text-muted-foreground">{member.employee_id} · {member.position}</p><p className="mt-3 text-sm">Реквизиты для выплат: <strong className="font-mono">{member.payment_details}</strong></p>{member.invite_code && <p className="mt-2 text-xs font-semibold text-muted-foreground">Приглашение: <button onClick={() => copy(member.invite_code!, 'Код приглашения скопирован')} className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 font-extrabold text-primary hover:bg-secondary">{member.invite_code}<Copy className="size-3.5" /></button></p>}</div></div>
          <div className="mt-5 flex flex-wrap gap-2 border-t pt-4"><Button variant="outline" size="sm" onClick={() => { setEditing(member); setOpen(true) }}><Edit3 />Изменить</Button><Button variant="ghost" size="sm" className={member.active ? 'text-red-800' : 'text-primary'} onClick={() => { demoActions.setStaffActive(member.employee_id, !member.active); toast.success(member.active ? 'Доступ сотрудника отключён' : 'Сотрудник снова активен') }}><UserX />{member.active ? 'Отключить' : 'Включить'}</Button></div>
        </article>)}
      </div>
      {members.length === 0 && <div className="surface p-10 text-center"><UserRound className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-extrabold">Сотрудники не найдены</p></div>}
      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[92dvh] overflow-y-auto rounded-3xl"><DialogHeader><DialogTitle className="text-2xl">{editing ? 'Профиль сотрудника' : 'Новый сотрудник'}</DialogTitle><DialogDescription>Полные реквизиты не сохраняются. В демо хранится только маска ****NNNN.</DialogDescription></DialogHeader><StaffForm key={editing?.employee_id ?? 'new'} member={editing} onCancel={() => setOpen(false)} onSave={(saved, isNew) => { setOpen(false); if (isNew) setInvited(saved); else toast.success('Профиль обновлён') }} /></DialogContent></Dialog>
      <Dialog open={Boolean(invited)} onOpenChange={(value) => { if (!value) setInvited(null) }}><DialogContent className="rounded-3xl text-center"><DialogHeader><div className="mx-auto grid size-14 place-items-center rounded-full bg-secondary text-primary"><UserRound className="size-7" /></div><DialogTitle className="text-2xl">Приглашение готово</DialogTitle><DialogDescription>Сотрудник привязан к вашему заведению. Передайте код или ссылку для входа.</DialogDescription></DialogHeader>{invited && <div className="rounded-2xl bg-muted p-5"><p className="text-sm text-muted-foreground">{invited.name} · {invited.employee_id}</p><p className="display-font mt-2 text-2xl font-semibold tracking-wider">{invited.invite_code}</p><div className="mt-4 grid gap-2 sm:grid-cols-2"><Button variant="outline" onClick={() => copy(invited.invite_code!, 'Код скопирован')}><Copy />Код</Button><Button onClick={() => copy(publicTipUrl(`/login?invite=${invited.invite_code}`), 'Ссылка скопирована')}><Copy />Ссылка</Button></div></div>}<Button variant="ghost" onClick={() => setInvited(null)}>Готово</Button></DialogContent></Dialog>
    </DashboardShell>
  )
}

function StaffForm({ member, onSave, onCancel }: { member: Employee | null; onSave: (member: Employee, isNew: boolean) => void; onCancel: () => void }) {
  const [name, setName] = useState(member?.name ?? '')
  const [details, setDetails] = useState(member?.payment_details ?? '')
  const [error, setError] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (name.trim().length < 2) return setError('Укажите имя сотрудника')
    try {
      const masked = maskPaymentDetails(details)
      if (member) {
        demoActions.updateStaff(member.employee_id, { name: name.trim(), payment_details: masked })
        onSave({ ...member, name: name.trim(), payment_details: masked }, false)
      } else onSave(demoActions.addStaff({ name, payment_details: masked }), true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Проверьте реквизиты')
    }
  }
  return <form onSubmit={submit} className="space-y-4" noValidate>
    <div><label htmlFor="staff-name" className="field-label">Имя</label><input id="staff-name" className="field-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Иванов И." /></div>
    <div><label htmlFor="staff-details" className="field-label">Последние четыре цифры реквизитов</label><input id="staff-details" className="field-input font-mono" inputMode="numeric" value={details} onChange={(event) => setDetails(event.target.value)} placeholder="****1234" maxLength={16} /><p className="mt-2 text-xs text-muted-foreground">Это реквизиты для выплат сотруднику, не данные карты клиента.</p></div>
    {error && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><Button type="button" variant="ghost" onClick={onCancel}>Отмена</Button><Button type="submit">{member ? 'Сохранить' : 'Создать приглашение'}</Button></div>
  </form>
}
