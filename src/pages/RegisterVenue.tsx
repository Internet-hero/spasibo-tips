import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Link } from 'react-router'
import { ArrowRight, ShieldCheck, Store } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { demoActions } from '@/lib/store'

export default function RegisterVenue() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (name.trim().length < 1 || name.trim().length > 100) return setError('Название должно содержать от 1 до 100 символов')
    if (description.trim().length > 200) return setError('Описание не должно превышать 200 символов')
    const merchant = demoActions.registerVenue({ name, description })
    navigate('/manager', { state: { notice: `Заведение ${merchant.name} ожидает активации администратором` } })
  }
  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="page-container py-3"><Logo /></header>
      <main className="page-container grid min-h-[75dvh] place-items-center py-8">
        <section className="surface w-full max-w-lg p-6 sm:p-8">
          <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary"><Store className="size-6" /></span>
          <h1 className="display-font mt-5 text-2xl font-semibold">Регистрация мерчанта</h1>
          <p className="mt-2 text-sm text-muted-foreground">Создадим пространство заведения. До проверки администратором генерация QR будет недоступна.</p>
          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <div><label className="field-label" htmlFor="venue-name">Название</label><input id="venue-name" className="field-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Вкус-Сервис, новый ресторан" maxLength={100} /></div>
            <div><label className="field-label" htmlFor="venue-description">Описание <span className="font-medium text-muted-foreground">· необязательно</span></label><textarea id="venue-description" className="field-input min-h-24 resize-none" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ресторан сети, адрес и особенности" maxLength={200} /></div>
            {error && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
            <div className="flex items-start gap-3 rounded-2xl bg-secondary/50 p-4 text-sm text-muted-foreground"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" /><p>Мерчант не может активировать себя сам. После регистрации статус — PENDING.</p></div>
            <Button type="submit" size="lg" className="w-full rounded-2xl">Отправить на проверку<ArrowRight /></Button>
          </form>
          <Link to="/login" className="mx-auto mt-3 flex min-h-11 w-max items-center px-3 text-sm font-bold text-primary">Уже есть аккаунт</Link>
        </section>
      </main>
    </div>
  )
}
