import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Link } from 'react-router'
import { ArrowRight, Store } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { demoActions } from '@/lib/store'

export default function RegisterVenue() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [type, setType] = useState('Кафе')
  const [error, setError] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (name.trim().length < 2 || address.trim().length < 5) return setError('Укажите название и полный адрес заведения')
    demoActions.registerVenue({ name: name.trim(), address: address.trim(), type })
    navigate('/manager')
  }
  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="page-container py-3"><Logo /></header>
      <main className="page-container grid min-h-[75dvh] place-items-center py-8">
        <section className="surface w-full max-w-lg p-6 sm:p-8">
          <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary"><Store className="size-6" /></span>
          <h1 className="display-font mt-5 text-2xl font-semibold">Ваше заведение</h1><p className="mt-2 text-sm text-muted-foreground">Создадим демо-пространство с личным QR и кабинетом управляющего.</p>
          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <div><label className="field-label" htmlFor="venue-name">Название</label><input id="venue-name" className="field-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Кофейня «Рядом»" /></div>
            <div><label className="field-label" htmlFor="venue-address">Адрес</label><input id="venue-address" className="field-input" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Город, улица, дом" /></div>
            <div><label className="field-label" htmlFor="venue-type">Сфера</label><select id="venue-type" className="field-input" value={type} onChange={(event) => setType(event.target.value)}><option>Кафе</option><option>Ресторан</option><option>Барбершоп</option><option>Отель</option><option>Другое</option></select></div>
            {error && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
            <Button type="submit" size="lg" className="w-full rounded-2xl">Создать заведение<ArrowRight /></Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">Демо хранит данные только в этом браузере.</p>
          <Link to="/login" className="mx-auto mt-3 flex min-h-11 w-max items-center px-3 text-sm font-bold text-primary">Уже есть аккаунт</Link>
        </section>
      </main>
    </div>
  )
}
