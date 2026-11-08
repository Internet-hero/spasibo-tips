import { expect, test } from '@playwright/test'
import { loginAs, monitor, route } from './routes'
import { readFile } from 'node:fs/promises'

test('проценты на главной передаются в форму и меняют итог', async ({ page }) => {
  const errors = monitor(page)
  await page.goto(route('/'))
  for (const pct of [5, 15, 10]) {
    const button = page.getByTestId(`home-tip-${pct}`)
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('home-open-qr')).toHaveAttribute('href', `#/p/qr_001?tip=${pct}`)
  }
  await page.getByTestId('home-tip-5').click()
  await page.getByTestId('home-open-qr').click()
  await page.getByRole('button', { name: 'Продолжить', exact: true }).click()
  await expect(page.getByTestId('tip-5')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('amount-total')).toHaveText(/668,85/)
  expect(errors).toEqual([])
})

test('генерация QR содержит 6 полей, PNG и полный URL', async ({ page }) => {
  const errors = monitor(page)
  await loginAs(page, 'manager')
  await page.goto(route('/manager/qr'))
  await page.getByLabel('Номер чека').fill('r_1101')
  await page.getByLabel('Сумма чека, ₽').fill('500')
  await page.getByRole('button', { name: 'Сгенерировать QR', exact: true }).click()
  await expect(page.getByText('qr_101 · e_001', { exact: true })).toBeVisible()
  for (const field of ['merchant_id:', 'employee_id:', 'receipt_id:', 'nonce:', 'exp:', 'signature:']) await expect(page.getByText(field, { exact: true })).toBeVisible()
  const origin = new URL(page.url()).origin
  await expect(page.getByTestId('qr-code')).toHaveAttribute('data-qr-value', `${origin}/#/pay?qr=qr_101`)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'PNG', exact: true }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('qr_101-r_1101.png')
  const generated = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('spasibo-demo-state-v2')!)
    return state.qr_links.find((qr: { qr_id: string }) => qr.qr_id === 'qr_101')
  })
  expect(generated.nonce).toMatch(/^[a-f0-9]{6}$/)
  expect(generated.signature).toMatch(/^[a-f0-9]{16}$/)
  expect(Date.parse(generated.exp) - Date.now()).toBeGreaterThan(24 * 60 * 60 * 1000 - 5000)
  expect(Date.parse(generated.exp) - Date.now()).toBeLessThanOrEqual(24 * 60 * 60 * 1000)
  await page.goto(route('/pay?qr=qr_101'))
  await expect(page.getByRole('heading', { name: 'Вероника', exact: true })).toBeVisible()
  await expect(page.getByText('r_1101', { exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test('CSV мерчанта сохраняет 7 колонок и суммы из отчёта', async ({ page }) => {
  await loginAs(page, 'manager')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'CSV', exact: true }).click()
  const download = await downloadPromise
  const path = await download.path()
  const csv = await readFile(path!, 'utf8')
  expect(csv).toContain('"payment_id","merchant_id","employee_id","amount","tip","status","timestamp"')
  expect(csv).toContain('p_0001')
  expect(csv).toContain('31.85')
})
