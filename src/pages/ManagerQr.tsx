import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Copy, Download, ExternalLink, Plus, Printer, QrCode as QrIcon, Store, Users } from 'lucide-react'
import QRCode from 'qrcode'
import { toast } from 'sonner'
import { DashboardShell } from '@/components/DashboardShell'
import { QrCode } from '@/components/QrCode'
import { Button } from '@/components/ui/button'
import { publicTipUrl } from '@/lib/links'
import { demoActions, useDemoState } from '@/lib/store'

type Tab = 'staff' | 'venue' | 'table'

export default function ManagerQr() {
  const state = useDemoState()
  const [searchParams] = useSearchParams()
  const venueId = state.session?.venueId ?? 'venue-coffee'
  const members = useMemo(() => state.staff.filter((member) => member.venueId === venueId && member.active), [state.staff, venueId])
  const tables = useMemo(() => state.qrTokens.filter((token) => token.venueId === venueId && token.type === 'table' && token.active), [state.qrTokens, venueId])
  const [tab, setTab] = useState<Tab>(searchParams.get('staff') ? 'staff' : 'staff')
  const [selectedStaff, setSelectedStaff] = useState(searchParams.get('staff') ?? '')
  const [selectedTable, setSelectedTable] = useState('')
  const [label, setLabel] = useState('')
  const [guests, setGuests] = useState('5')
  const [formError, setFormError] = useState('')
  const member = members.find((item) => item.id === selectedStaff) ?? members[0]
  const table = tables.find((item) => item.token === selectedTable) ?? tables[0]
  const staffToken = state.qrTokens.find((token) => token.staffId === member?.id && token.active)
  const venueToken = state.qrTokens.find((token) => token.venueId === venueId && token.type === 'venue' && token.active)
  const token = tab === 'staff' ? staffToken : tab === 'venue' ? venueToken : table
  const value = token ? publicTipUrl(`/p/${token.token}`) : ''
  const title = tab === 'staff' ? member?.name ?? 'Сотрудник' : tab === 'venue' ? state.venues.find((item) => item.id === venueId)?.name ?? 'Заведение' : table?.tableLabel ?? 'Новый стол'
  const subtitle = tab === 'staff' ? member?.position : tab === 'venue' ? 'Выбор любого сотрудника' : `${table?.expectedGuests ?? 0} гостей · общий счётчик`
  const copy = async () => {
    if (!value) return
    try { await navigator.clipboard.writeText(value); toast.success('Ссылка скопирована') } catch { toast.error('Скопируйте ссылку вручную') }
  }
  const download = async () => {
    if (!value) return
    const url = await QRCode.toDataURL(value, { width: 900, margin: 3, errorCorrectionLevel: 'M', color: { dark: '#173d30', light: '#fbfdf9' } })
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `spasibo-${token?.token}.png`; anchor.click(); toast.success('PNG скачан')
  }
  const addTable = (event: FormEvent) => {
    event.preventDefault()
    setFormError('')
    if (label.trim().length < 2 || Number(guests) < 1 || Number(guests) > 50) return setFormError('Укажите метку стола и число гостей от 1 до 50')
    const created = demoActions.addTableQr(label, Number(guests))
    setSelectedTable(created.token); setTab('table'); setLabel(''); toast.success(`QR для «${created.tableLabel}» создан`)
  }
  return (
    <DashboardShell role="manager" title="QR-коды" subtitle="Печать и ссылки для сотрудников, заведения и столов">
      <div className="mb-6 grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1 sm:max-w-xl">
        {([['staff', 'Сотрудник', Users], ['venue', 'Заведение', Store], ['table', 'Стол', QrIcon]] as const).map(([value, text, Icon]) => <button key={value} onClick={() => setTab(value)} aria-pressed={tab === value} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-2 text-xs font-bold transition sm:text-sm ${tab === value ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}><Icon className="size-4" />{text}</button>)}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {tab === 'staff' && <section className="surface p-5 sm:p-6"><h2 className="text-lg font-extrabold">Личный QR сотрудника</h2><p className="mt-1 text-sm text-muted-foreground">Ведёт сразу на страницу выбранного человека, его цель и послание.</p><label className="field-label mt-5" htmlFor="qr-staff">Сотрудник</label><select id="qr-staff" value={member?.id ?? ''} onChange={(event) => setSelectedStaff(event.target.value)} className="field-input">{members.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.position}</option>)}</select>{members.length === 0 && <p className="mt-4 rounded-2xl bg-muted p-4 text-sm text-muted-foreground">Сначала добавьте активного сотрудника в разделе «Команда».</p>}</section>}
          {tab === 'venue' && <section className="surface p-5 sm:p-6"><h2 className="text-lg font-extrabold">Единый QR заведения</h2><p className="mt-1 text-sm text-muted-foreground">Гость сам выберет получателя из активных сотрудников. Подходит для входа, кассы и чеков.</p><div className="mt-5 rounded-2xl bg-secondary/50 p-4 text-sm"><p className="font-bold">Что увидит гость</p><ul className="mt-2 space-y-1 text-muted-foreground"><li>· поиск по команде;</li><li>· цели и социальные сигналы;</li><li>· только публичные данные сотрудников.</li></ul></div></section>}
          {tab === 'table' && <>
            <section className="surface p-5 sm:p-6"><h2 className="text-lg font-extrabold">QR стола со сплитом компанией</h2><p className="mt-1 text-sm text-muted-foreground">Каждый гость добавляет свою благодарность, а счётчик показывает уникальных гостей за день.</p>{tables.length > 0 ? <><label className="field-label mt-5" htmlFor="qr-table">Стол</label><select id="qr-table" value={table?.token ?? ''} onChange={(event) => setSelectedTable(event.target.value)} className="field-input">{tables.map((item) => <option key={item.token} value={item.token}>{item.tableLabel} · {item.expectedGuests} гостей</option>)}</select></> : <p className="mt-4 rounded-2xl bg-muted p-4 text-sm text-muted-foreground">Создайте первый стол с помощью формы ниже.</p>}</section>
            <form onSubmit={addTable} className="surface p-5 sm:p-6" noValidate><h3 className="flex items-center gap-2 font-extrabold"><Plus className="size-5 text-accent" />Новый стол</h3><div className="mt-4 grid gap-4 sm:grid-cols-[1fr_160px]"><div><label htmlFor="table-label" className="field-label">Метка</label><input id="table-label" value={label} onChange={(event) => setLabel(event.target.value)} className="field-input" placeholder="Стол 12" /></div><div><label htmlFor="table-guests" className="field-label">Гостей</label><input id="table-guests" type="number" min="1" max="50" value={guests} onChange={(event) => setGuests(event.target.value)} className="field-input" /></div></div>{formError && <p role="alert" className="mt-3 text-sm font-semibold text-red-800">{formError}</p>}<Button type="submit" className="mt-4">Создать QR</Button></form>
          </>}
          <section className="rounded-3xl border bg-secondary/35 p-5"><h3 className="font-extrabold">Совет для печати</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Размещайте QR на контрастном фоне, оставляя свободные поля. Перед печатью откройте ссылку и проверьте получателя.</p></section>
        </div>
        <aside className="surface h-max p-5 sm:p-6">
          <div className="print-area rounded-2xl border bg-[#fbfdf9] p-5 text-center"><p className="display-font text-lg font-semibold">спасибо</p><h2 className="mt-3 text-2xl font-extrabold">{title}</h2><p className="text-sm text-muted-foreground">{subtitle}</p>{value ? <div className="mt-4"><QrCode key={value} value={value} label={title} /></div> : <div className="my-8 grid aspect-square place-items-center rounded-xl bg-muted p-5 text-sm text-muted-foreground">Выберите получателя или создайте стол</div>}<p className="mt-4 text-sm font-bold">Наведите камеру,<br />чтобы сказать спасибо</p></div>
          <div className="no-print mt-5 grid grid-cols-2 gap-2"><Button variant="outline" size="sm" onClick={copy} disabled={!value}><Copy />Ссылка</Button><Button variant="outline" size="sm" onClick={download} disabled={!value}><Download />PNG</Button><Button variant="outline" size="sm" onClick={() => window.print()} disabled={!value}><Printer />Печать</Button>{value && <Button asChild variant="outline" size="sm"><Link to={`/p/${token?.token}`} target="_blank"><ExternalLink />Открыть</Link></Button>}</div>
          {value && <p className="mt-4 break-all rounded-xl bg-muted p-3 text-xs text-muted-foreground">{value}</p>}
        </aside>
      </div>
    </DashboardShell>
  )
}
