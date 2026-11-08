import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { Copy, Download, ExternalLink, Plus, QrCode as QrIcon } from 'lucide-react'
import QRCode from 'qrcode'
import { toast } from 'sonner'
import { QrCode } from '@/components/QrCode'
import { Button } from '@/components/ui/button'
import { publicTipUrl } from '@/lib/links'
import { DemoError, demoActions, useDemoState } from '@/lib/store'
import type { QrLink } from '@/types'

export function QrGenerator({ fixedEmployeeId }: { fixedEmployeeId?: string }) {
  const state = useDemoState()
  const merchantId = state.session?.merchant_id ?? 'm_001'
  const merchant = state.merchants.find((item) => item.merchant_id === merchantId)
  const members = state.employees.filter((item) => item.merchant_id === merchantId && item.active && (!fixedEmployeeId || item.employee_id === fixedEmployeeId))
  const [selectedEmployee, setSelectedEmployee] = useState(fixedEmployeeId ?? members[0]?.employee_id ?? '')
  const [receipt, setReceipt] = useState(`r_${1001 + state.qr_links.length}`)
  const [amount, setAmount] = useState('637')
  const [created, setCreated] = useState<QrLink | null>(null)
  const [error, setError] = useState('')
  const employeeId = fixedEmployeeId ?? selectedEmployee
  const value = created ? publicTipUrl(`/pay?qr=${created.qr_id}`) : ''

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      const qr = demoActions.addQr({ employee_id: employeeId, receipt_id: receipt.trim(), base_amount: Number(amount) })
      setCreated(qr)
      setReceipt(`r_${1001 + state.qr_links.length + 1}`)
      toast.success(`QR ${qr.qr_id} создан на 24 часа`)
    } catch (caught) {
      setError(caught instanceof DemoError ? `${caught.code}: ${caught.message}` : 'Не удалось создать QR')
    }
  }
  const copy = async () => {
    if (!value) return
    try { await navigator.clipboard.writeText(value); toast.success('Платёжная ссылка скопирована') } catch { toast.error('Не удалось скопировать автоматически') }
  }
  const download = async () => {
    if (!created || !value) return
    const url = await QRCode.toDataURL(value, { width: 900, margin: 3, errorCorrectionLevel: 'M', color: { dark: '#173d30', light: '#fbfdf9' } })
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${created.qr_id}-${created.receipt_id}.png`
    anchor.click()
    toast.success('PNG скачан')
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <form onSubmit={submit} className="surface h-max p-5 sm:p-6" noValidate>
        <h2 className="flex items-center gap-2 text-lg font-extrabold"><Plus className="size-5 text-accent" />Новый QR на чек</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Серверная логика демо создаёт receipt_id, nonce, срок действия и HMAC-подпись. Повторный receipt_id для заведения запрещён.</p>
        {merchant && merchant.status !== 'ACTIVE' && <p role="alert" className="mt-4 rounded-2xl bg-amber-100 p-4 text-sm font-semibold text-amber-900">Заведение имеет статус {merchant.status}. Администратор должен активировать его перед генерацией QR.</p>}
        {!fixedEmployeeId && <div className="mt-5"><label className="field-label" htmlFor="qr-employee">Сотрудник</label><select id="qr-employee" value={employeeId} onChange={(event) => setSelectedEmployee(event.target.value)} className="field-input">{members.map((item) => <option key={item.employee_id} value={item.employee_id}>{item.name} · {item.employee_id}</option>)}</select></div>}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div><label className="field-label" htmlFor="qr-receipt">Номер чека</label><input id="qr-receipt" value={receipt} onChange={(event) => setReceipt(event.target.value)} className="field-input" placeholder="r_1101" /></div>
          <div><label className="field-label" htmlFor="qr-base-amount">Сумма чека, ₽</label><input id="qr-base-amount" type="number" min="0.01" max="1000000" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="field-input" /></div>
        </div>
        {error && <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
        <Button type="submit" className="mt-5" disabled={!employeeId || merchant?.status !== 'ACTIVE'}>Сгенерировать QR</Button>
        <div className="mt-5 rounded-2xl bg-secondary/45 p-4 text-xs leading-relaxed text-muted-foreground">Проверки: мерчант ACTIVE, сотрудник принадлежит мерчанту, чек уникален, сумма ≤ 1 000 000 ₽. Срок действия — ровно 24 часа.</div>
      </form>
      <aside className="surface h-max p-5 sm:p-6">
        {created ? <>
          <div className="print-area rounded-2xl border bg-[#fbfdf9] p-5 text-center"><p className="display-font text-lg font-semibold">чаевые по чеку</p><h2 className="mt-3 text-2xl font-extrabold">{created.receipt_id}</h2><p className="text-sm text-muted-foreground">{created.qr_id} · {created.employee_id}</p><div className="mt-4"><QrCode key={value} value={value} label={`QR чека ${created.receipt_id}`} /></div></div>
          <dl className="mt-4 space-y-2 break-all rounded-2xl bg-muted p-4 font-mono text-[11px] text-muted-foreground">
            <div><dt className="inline font-bold text-foreground">merchant_id: </dt><dd className="inline">{created.merchant_id}</dd></div>
            <div><dt className="inline font-bold text-foreground">employee_id: </dt><dd className="inline">{created.employee_id}</dd></div>
            <div><dt className="inline font-bold text-foreground">receipt_id: </dt><dd className="inline">{created.receipt_id}</dd></div>
            <div><dt className="inline font-bold text-foreground">nonce: </dt><dd className="inline">{created.nonce}</dd></div>
            <div><dt className="inline font-bold text-foreground">exp: </dt><dd className="inline">{created.exp}</dd></div>
            <div><dt className="inline font-bold text-foreground">signature: </dt><dd className="inline">{created.signature}</dd></div>
          </dl>
          <div className="no-print mt-4 grid grid-cols-2 gap-2"><Button variant="outline" size="sm" onClick={copy}><Copy />Ссылка</Button><Button variant="outline" size="sm" onClick={download}><Download />PNG</Button><Button asChild variant="outline" size="sm"><Link to={`/pay?qr=${created.qr_id}`} target="_blank"><ExternalLink />Открыть</Link></Button><Button variant="outline" size="sm" onClick={() => window.print()}>Печать</Button></div>
        </> : <div className="grid min-h-72 place-items-center rounded-2xl bg-muted p-6 text-center"><div><QrIcon className="mx-auto size-10 text-muted-foreground" /><p className="mt-4 font-extrabold">Здесь появится QR</p><p className="mt-2 text-sm text-muted-foreground">Заполните данные чека и нажмите «Сгенерировать QR».</p></div></div>}
      </aside>
    </div>
  )
}
