import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { route } from './routes'

function monitor(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`) })
  return errors
}

test('кнопки быстрых сумм 200, 300 и 500 ₽ выбираются и меняют итоговую сумму', async ({ page }) => {
  const errors = monitor(page)
  await page.goto(route('/p/anna'))
  const amounts = page.getByTestId(/^amount-/)
  expect(await amounts.count()).toBe(3)
  for (const preset of [500, 200, 300]) {
    const button = page.getByTestId(`amount-${preset}`)
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: new RegExp(`Сказать спасибо · ${preset}`) })).toBeVisible()
  }
  expect(errors).toEqual([])
})

test('суммы на главной странице кликабельны и передаются на страницу оплаты', async ({ page }) => {
  const errors = monitor(page)
  await page.goto(route('/'))
  const amounts = page.getByTestId(/^home-amount-/)
  expect(await amounts.count()).toBe(3)
  for (const preset of [200, 500, 300]) {
    const button = page.getByTestId(`home-amount-${preset}`)
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('home-pay-anna')).toContainText(`Сказать спасибо · ${preset} ₽`)
    await expect(page.getByTestId('home-pay-anna')).toHaveAttribute('href', `#/p/anna?amount=${preset}`)
  }
  await page.getByTestId('home-amount-500').click()
  await page.getByTestId('home-pay-anna').click()
  await expect(page.getByRole('heading', { name: 'Анна', exact: true })).toBeVisible()
  await expect(page.getByTestId('amount-500')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: /Сказать спасибо · 500/ })).toBeVisible()
  expect(errors).toEqual([])
})

test('QR Анны кодирует полный URL со статическим hash-маршрутом', async ({ page }) => {
  const errors = monitor(page)
  await page.goto(route('/'))
  await page.getByRole('button', { name: /Управляющий Команда, аналитика/ }).click()
  await page.goto(route('/manager/qr'))
  const qr = page.getByTestId('qr-code')
  await expect(qr).toBeVisible()
  const origin = new URL(page.url()).origin
  await expect(qr).toHaveAttribute('data-qr-value', `${origin}/#/p/anna`)
  expect(errors).toEqual([])
})
