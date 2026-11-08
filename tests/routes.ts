import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import type { Role } from '../src/types'

export function route(path: string) {
  return path === '/' ? '/' : `/#${path}`
}

export function monitor(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`) })
  return errors
}

export async function loginAs(page: Page, role: Role, login = 'любой-логин', password = 'любой-пароль') {
  await page.goto(route(`/login?role=${role}`))
  await page.getByLabel('Логин или email').fill(login)
  await page.getByLabel('Пароль').fill(password)
  await page.getByRole('button', { name: 'Войти', exact: true }).click()
  const destination = role === 'staff' ? '/staff' : role === 'manager' ? '/manager' : '/admin'
  await expect(page).toHaveURL(new RegExp(`/#${destination}$`))
  const heading = role === 'staff' ? /Мои чаевые/ : role === 'manager' ? 'Отчёт по чаевым' : 'Платформа'
  await expect(page.getByRole('heading', { name: heading })).toBeVisible()
}
