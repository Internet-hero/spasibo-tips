import { Link } from 'react-router'
import { CircleOff } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'

export default function Unavailable({ title = 'QR-код недоступен', text = 'Ссылка устарела или была отключена.', code }: { title?: string; text?: string; code?: string }) {
  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="page-container py-3"><Logo /></header>
      <main className="page-container grid min-h-[70dvh] place-items-center py-10">
        <section className="surface max-w-md p-8 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-muted text-muted-foreground"><CircleOff className="size-8" /></span>
          {code && <p className="mt-5 font-mono text-xs font-bold text-red-800" data-testid="error-code">{code}</p>}
          <h1 className="display-font mt-4 text-xl font-semibold">{title}</h1>
          <p className="mt-3 text-muted-foreground">{text}</p>
          <Button asChild className="mt-6 rounded-full"><Link to="/">Вернуться на главную</Link></Button>
        </section>
      </main>
    </div>
  )
}
