import { Link } from 'react-router'
import { ArrowLeft, ReceiptText } from 'lucide-react'
import { Logo } from '@/components/Logo'

export function PublicHeader({ backTo, backLabel = 'Назад' }: { backTo?: string; backLabel?: string }) {
  return (
    <header className="page-container flex min-h-20 items-center justify-between gap-3 py-3">
      {backTo ? <Link to={backTo} className="inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-bold text-primary"><ArrowLeft className="size-5" />{backLabel}</Link> : <Logo />}
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground"><ReceiptText className="size-4" />QR привязан к чеку</span>
    </header>
  )
}
