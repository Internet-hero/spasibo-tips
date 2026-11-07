import { Link } from 'react-router'
import { ArrowLeft, Heart } from 'lucide-react'
import { Logo } from '@/components/Logo'

export function PublicHeader({ venueId, backTo, backLabel = 'Назад' }: { venueId?: string; backTo?: string; backLabel?: string }) {
  return (
    <header className="page-container flex min-h-20 items-center justify-between gap-3 py-3">
      {backTo ? (
        <Link to={backTo} className="inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-bold text-primary"><ArrowLeft className="size-5" />{backLabel}</Link>
      ) : <Logo />}
      {venueId && (
        <Link to={`/wall/${venueId}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-primary transition hover:bg-secondary">
          <Heart className="size-4" />Стена благодарностей
        </Link>
      )}
    </header>
  )
}
