import { expect, test } from '@playwright/test'
import { loginAs, monitor, route } from './routes'

test('любые логин и пароль открывают выбранную роль, пустые — нет', async ({ page }) => {
  const errors = monitor(page)
  await page.goto(route('/login?role=staff'))
  await page.getByRole('button', { name: 'Войти', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('любые непустые')
  for (const role of ['staff', 'manager', 'admin'] as const) await loginAs(page, role, `demo-${role}-123`, 'не-стандартный-пароль')
  expect(errors).toEqual([])
})

test('кнопки ролей на главной ведут на форму, а не сразу в кабинет', async ({ page }) => {
  await page.goto(route('/'))
  await page.getByRole('button', { name: /Официант Свои чаевые/ }).click()
  await expect(page).toHaveURL(/\/#\/login\?role=staff$/)
  await expect(page.getByLabel('Логин или email')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Официант', exact: true })).toHaveAttribute('aria-pressed', 'true')
})

test('гость не попадает в кабинет без входа', async ({ page }) => {
  await page.goto(route('/manager'))
  await expect(page).toHaveURL(/\/#\/login$/)
  await expect(page.getByRole('heading', { name: 'Вход в кабинет' })).toBeVisible()
})

test('официант видит только свои чаевые и маску реквизитов', async ({ page }) => {
  const errors = monitor(page)
  await loginAs(page, 'staff')
  await expect(page.getByRole('heading', { name: 'Мои чаевые, Вероника' })).toBeVisible()
  await expect(page.getByText('p_0001', { exact: true })).toBeVisible()
  await expect(page.getByText('p_0002', { exact: true })).toHaveCount(0)
  await expect(page.getByText('****1001', { exact: true })).toBeVisible()
  await expect(page.getByText('350,00 ₽', { exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test('мерчант получает отчёт, рассчитанный из payments.csv', async ({ page }) => {
  const errors = monitor(page)
  await loginAs(page, 'manager')
  await expect(page.getByRole('heading', { name: 'Отчёт по чаевым' })).toBeVisible()
  await expect(page.getByText('1 031,25 ₽', { exact: true })).toBeVisible()
  await expect(page.getByText('23,54%', { exact: true })).toBeVisible()
  await expect(page.getByText('83%', { exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test('регистрация PENDING и активация администратором', async ({ page }) => {
  const errors = monitor(page)
  await page.goto(route('/register'))
  await page.getByLabel('Название').fill('Вкус-Сервис Новый')
  await page.getByLabel(/Описание/).fill('Ресторан сети')
  await page.getByRole('button', { name: 'Отправить на проверку' }).click()
  await expect(page.getByText(/Вкус-Сервис Новый ожидает активации/)).toBeVisible()
  await page.goto(route('/manager/qr'))
  await expect(page.getByRole('button', { name: 'Сгенерировать QR' })).toBeDisabled()
  await loginAs(page, 'admin')
  const card = page.locator('article').filter({ hasText: 'Вкус-Сервис Новый' })
  await card.getByRole('button', { name: 'Активировать', exact: true }).click()
  await expect(card.getByText('Активен', { exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test('приглашение привязывает нового сотрудника к мерчанту', async ({ page }) => {
  const errors = monitor(page)
  await loginAs(page, 'manager')
  await page.goto(route('/manager/staff'))
  await page.getByRole('button', { name: 'Добавить сотрудника' }).click()
  await page.getByLabel('Имя', { exact: true }).fill('Тестов С.')
  await page.getByLabel('Последние четыре цифры реквизитов').fill('9876543210')
  await page.getByRole('button', { name: 'Создать приглашение' }).click()
  const dialog = page.getByRole('dialog')
  const invite = (await dialog.locator('p.display-font').textContent())!.trim()
  await page.getByRole('button', { name: 'Готово', exact: true }).click()
  const card = page.locator('article').filter({ hasText: 'Тестов С.' })
  await expect(card.getByText('****3210', { exact: true })).toBeVisible()
  await page.goto(route(`/login?invite=${invite}`))
  await page.getByRole('button', { name: 'Войти', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Мои чаевые, Тестов С.' })).toBeVisible()
  await expect(page.getByText('****3210', { exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test('администратор видит события аудита', async ({ page }) => {
  await loginAs(page, 'admin')
  await page.getByRole('button', { name: 'Аудит', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Журнал переходов' })).toBeVisible()
  await expect(page.getByText('evt_0100', { exact: true })).toBeVisible()
  await expect(page.getByText('payment_confirmed', { exact: true }).first()).toBeVisible()
})
