import { Link } from 'react-router'
import { CircleOff } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'

export default function Unavailable({ title = 'Получатель недоступен', text = 'Возможно, сотрудник больше не работает в заведении или QR-код был отключён.' }) {
  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="page-container py-3"><Logo /></header>
      <main className="page-container grid min-h-[70dvh] place-items-center py-10">
        <section className="surface max-w-md p-8 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-muted text-muted-foreground"><CircleOff className="size-8" /></span>
          <h1 className="display-font mt-6 text-xl font-semibold">{title}</h1>
          <p className="mt-3 text-muted-foreground">{text}</p>
          <Button asChild className="mt-6 rounded-full"><Link to="/p/coffee/select">Выбрать другого сотрудника</Link></Button>
        </section>
      </main>
    </div>
  )
}
