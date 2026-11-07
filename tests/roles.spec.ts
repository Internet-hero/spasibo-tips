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

test('гость использует публичные сценарии, но не попадает в кабинеты', async ({ page }) => {
  const errors = monitor(page)
  await page.goto(route('/p/anna'))
  await expect(page.getByRole('heading', { name: 'Анна', exact: true })).toBeVisible()
  await page.goto(route('/wall/venue-coffee'))
  await expect(page.getByRole('heading', { name: 'Стена благодарностей' })).toBeVisible()
  await page.goto(route('/manager'))
  await expect(page).toHaveURL(/\/#\/login$/)
  await expect(page.getByRole('heading', { name: 'Вход в кабинет' })).toBeVisible()
  expect(errors).toEqual([])
})

test('сотрудник видит только свою историю и не получает права управляющего', async ({ page }) => {
  const errors = monitor(page)
  await page.goto(route('/login?invite=MIKHAIL2026'))
  await page.getByRole('button', { name: 'Войти', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Добрый день, Михаил' })).toBeVisible()
  await expect(page.getByText(/Спасибо за рекомендацию десерта/)).toBeVisible()
  await expect(page.getByText(/Раф — как маленький праздник/)).toHaveCount(0)
  await page.goto(route('/manager'))
  await expect(page).toHaveURL(/\/#\/login$/)
  expect(errors).toEqual([])
})

test('администратор видит заведения, фильтрует платежи и блокирует доступ', async ({ page }) => {
  const errors = monitor(page)
  await page.goto(route('/login'))
  await page.getByRole('button', { name: 'Админ', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Просто кофе', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Север', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Платежи', exact: true }).click()
  await page.getByLabel('Фильтр по статусу').selectOption('failed')
  await expect(page.getByText('pay-16', { exact: true })).toBeVisible()
  await expect(page.getByText('pay-01', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Блокировки', exact: true }).click()
  const member = page.locator('.divide-y > div').filter({ hasText: 'Михаил' })
  await member.getByRole('button', { name: 'Заблокировать', exact: true }).click()
  await expect(member.getByText('Заблокирован', { exact: true })).toBeVisible()
  await page.goto(route('/p/mikhail'))
  await expect(page.getByRole('heading', { name: 'Получатель недоступен' })).toBeVisible()
  expect(errors).toEqual([])
})

test('новое заведение изолирует данные и ведёт сотрудника на собственную стену', async ({ page }) => {
  const errors = monitor(page)
  await page.goto(route('/register'))
  await page.getByLabel('Название').fill('Кофейня «Своя»')
  await page.getByLabel('Адрес').fill('Москва, Пятницкая, 25')
  await page.getByLabel('Сфера').selectOption('Кафе')
  await page.getByRole('button', { name: 'Создать заведение' }).click()
  await expect(page.getByText(/Кофейня «Своя» · аналитика/)).toBeVisible()
  const venueId = await page.evaluate(() => {
    const stored = localStorage.getItem('spasibo-demo-state-v1')
    if (!stored) throw new Error('Демо-состояние не сохранено')
    return (JSON.parse(stored) as { session: { venueId: string } }).session.venueId
  })
  await page.goto(route('/manager/staff'))
  await page.getByRole('button', { name: 'Добавить сотрудника' }).click()
  await page.getByLabel('Имя', { exact: true }).fill('Ольга')
  await page.getByLabel('Должность').fill('Бариста')
  await page.getByLabel('Название цели').fill('Новая форма')
  await page.getByLabel('Сумма, ₽').fill('15000')
  await page.getByRole('button', { name: 'Создать приглашение' }).click()
  const invitation = page.getByRole('dialog')
  await expect(invitation.getByRole('heading', { name: 'Приглашение готово' })).toBeVisible()
  const invite = (await invitation.locator('p.display-font').textContent())?.trim()
  expect(invite).toBeTruthy()
  await page.getByRole('button', { name: 'Готово', exact: true }).click()
  await page.getByRole('button', { name: 'Выйти', exact: true }).click()
  await page.goto(route(`/login?invite=${invite}`))
  await page.getByRole('button', { name: 'Войти', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Добрый день, Ольга' })).toBeVisible()
  await expect(page.getByText('Первая благодарность появится здесь автоматически.')).toBeVisible()
  await expect(page.getByText('Просто кофе', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Стена', exact: true })).toHaveAttribute('href', `#/wall/${venueId}`)
  await page.getByRole('link', { name: 'Стена', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/#/wall/${venueId}$`))
  await expect(page.getByText(/Кофейня «Своя» · Москва, Пятницкая, 25/)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Сказать спасибо' })).not.toHaveAttribute('href', '/p/coffee/select')
  await expect(page.getByText('Здесь появится первая благодарность')).toBeVisible()
  expect(errors).toEqual([])
})
