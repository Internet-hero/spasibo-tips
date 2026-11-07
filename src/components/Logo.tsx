import { HeartHandshake } from 'lucide-react'
import { Link } from 'react-router'

export function Logo({ inverse = false, to = '/' }: { inverse?: boolean; to?: string }) {
  return (
    <Link to={to} className={`inline-flex min-h-11 items-center gap-2 rounded-lg font-extrabold ${inverse ? 'text-primary-foreground' : 'text-primary'}`} aria-label="Спасибо — на главную">
      <span className={`grid size-9 place-items-center rounded-xl ${inverse ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground'}`}>
        <HeartHandshake className="size-5" strokeWidth={2.2} />
      </span>
      <span className="display-font text-lg lowercase">спасибо</span>
    </Link>
  )
}
