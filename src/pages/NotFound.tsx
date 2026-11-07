import { Link } from 'react-router'
import { Compass } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return <div className="min-h-[100dvh] bg-background"><header className="page-container py-3"><Logo /></header><main className="page-container grid min-h-[70dvh] place-items-center text-center"><section><Compass className="mx-auto size-12 text-accent" /><p className="display-font mt-5 text-5xl font-semibold">404</p><h1 className="mt-3 text-2xl font-extrabold">Такой страницы нет</h1><p className="mt-2 text-muted-foreground">Возможно, ссылка устарела или в адресе опечатка.</p><Button asChild className="mt-6 rounded-full"><Link to="/">Вернуться на главную</Link></Button></section></main></div>
}
