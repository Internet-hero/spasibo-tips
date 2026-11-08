import { expect, test } from '@playwright/test'
import { createHmac } from 'node:crypto'
import { loginAs, monitor, route } from './routes'

test('T3-1: четыре экрана, SUCCESS и точные суммы qr_001', async ({ page }) => {
  const errors = monitor(page)
  await page.goto(route('/p/qr_001'))
  await expect(page.getByRole('heading', { name: 'Вероника', exact: true })).toBeVisible()
  await expect(page.getByText('r_1001', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Продолжить', exact: true }).click()
  await expect(page.getByTestId('tip-10')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('tip-amount')).toHaveText(/63,70/)
  await page.getByTestId('tip-custom').click()
  await page.getByLabel('Другая сумма чаевых, ₽').fill('250')
  await expect(page.getByTestId('tip-amount')).toHaveText(/250,00/)
  await expect(page.getByTestId('amount-total')).toHaveText(/887,00/)
  await page.getByRole('button', { name: 'Оплатить', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Подтверждение' })).toBeVisible()
  await page.getByRole('button', { name: 'Подтвердить оплату', exact: true }).click()
  await page.waitForURL(/\/pay\/p_\d+\/status/)
  await expect(page.getByRole('heading', { name: 'Спасибо! Чаевые отправлены' })).toBeVisible()
  await expect(page.getByText('Успех', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Оставить отзыв о работе' }).click()
  await page.getByLabel('Ваш отзыв о работе Вероника').fill('Отличный кофе и дружелюбное общение!')
  await page.getByRole('button', { name: 'Отправить отзыв' }).click()
  await expect(page.getByRole('status')).toContainText('Ваш отзыв отправлен')
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('spasibo-demo-state-v3')!) as { payments: { qr_id: string; status: string; tip: number }[]; audit: unknown[] })
  expect(stored.payments).toHaveLength(101)
  expect(stored.payments.find((payment) => payment.qr_id === 'qr_001')).toMatchObject({ status: 'SUCCESS', tip: 250 })
  expect(stored.audit.length).toBeGreaterThanOrEqual(102)
  expect(errors).toEqual([])
})

test('T3-2: qr_003 получает DECLINED и CARD_DECLINED', async ({ page }) => {
  const errors = monitor(page)
  await page.goto(route('/p/qr_003'))
  await page.getByRole('button', { name: 'Продолжить', exact: true }).click()
  await page.getByTestId('tip-15').click()
  await expect(page.getByTestId('tip-amount')).toHaveText(/136,65/)
  await page.getByRole('button', { name: 'Оплатить', exact: true }).click()
  await page.getByRole('button', { name: 'Подтвердить оплату', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Оплата не прошла, попробуйте другой способ' })).toBeVisible()
  await expect(page.getByText('CARD_DECLINED', { exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test('T3-3: испорченная подпись даёт INVALID_QR без создания платежа', async ({ page }) => {
  const errors = monitor(page)
  await loginAs(page, 'staff')
  await page.goto(route('/p/qr_001'))
  await page.evaluate(() => {
    const key = 'spasibo-demo-state-v3'
    const state = JSON.parse(localStorage.getItem(key)!)
    state.qr_links[0].signature = '0000000000000000'
    localStorage.setItem(key, JSON.stringify(state))
  })
  await page.reload()
  await expect(page.getByTestId('error-code')).toHaveText('INVALID_QR')
  const count = await page.evaluate(() => (JSON.parse(localStorage.getItem('spasibo-demo-state-v3')!) as { payments: unknown[] }).payments.length)
  expect(count).toBe(100)
  expect(errors).toEqual([])
})

test('T3-5: отмена CREATED до подтверждения', async ({ page }) => {
  const errors = monitor(page)
  await page.goto(route('/p/qr_002'))
  await page.getByRole('button', { name: 'Продолжить', exact: true }).click()
  await page.getByTestId('tip-10').click()
  await page.getByRole('button', { name: 'Оплатить', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Подтверждение' })).toBeVisible()
  await page.getByRole('button', { name: 'Отменить платёж', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Платёж отменён' })).toBeVisible()
  await expect(page.getByText('Отменён', { exact: true })).toBeVisible()
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('spasibo-demo-state-v3')!) as { payments: { qr_id: string; status: string }[] })
  expect(stored.payments.find((payment) => payment.qr_id === 'qr_002')?.status).toBe('CANCELED')
  expect(errors).toEqual([])
})

test('произвольная сумма не ограничена 50%, отрицательные чаевые отклоняются', async ({ page }) => {
  await page.goto(route('/pay?qr=qr_001'))
  await page.getByRole('button', { name: 'Продолжить', exact: true }).click()
  await expect(page.getByTestId('tip-0')).toHaveCount(0)
  await page.getByLabel('Другая сумма чаевых, ₽').fill('-10')
  await page.getByRole('button', { name: 'Оплатить', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('TIP_OUT_OF_RANGE')
  await page.getByLabel('Другая сумма чаевых, ₽').fill('700')
  await expect(page.getByTestId('tip-amount')).toHaveText(/700,00/)
  await expect(page.getByTestId('amount-total')).toHaveText(/1\s*337,00/)
  await page.getByRole('button', { name: 'Оплатить', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Подтверждение' })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('GATEWAY_TIMEOUT завершается успехом по кнопке проверки статуса', async ({ page }) => {
  const errors = monitor(page)
  await loginAs(page, 'staff')
  const qr = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('spasibo-demo-state-v3')!)
    return state.qr_links.find((item: { qr_id: string }) => item.qr_id === 'qr_002')
  })
  let nonce = ''
  for (let index = 0; index < 100; index += 1) {
    const candidate = index.toString(16).padStart(6, '0')
    const { createHash } = await import('node:crypto')
    if (Number(BigInt(`0x${createHash('md5').update(`qr_002${candidate}`).digest('hex')}`) % 10n) === 9) { nonce = candidate; break }
  }
  const signature = createHmac('sha256', 'demo-secret-k3')
    .update(`${qr.merchant_id}|${qr.employee_id}|${qr.receipt_id}|${nonce}|${qr.exp}`)
    .digest('hex')
    .slice(0, 16)
  await page.evaluate(({ nonce, signature }) => {
    const key = 'spasibo-demo-state-v3'
    const state = JSON.parse(localStorage.getItem(key)!)
    state.qr_links = state.qr_links.map((item: { qr_id: string; nonce: string; signature: string }) => item.qr_id === 'qr_002' ? { ...item, nonce, signature } : item)
    localStorage.setItem(key, JSON.stringify(state))
  }, { nonce, signature })
  await page.goto(route('/pay?qr=qr_002'))
  await page.reload()
  await page.getByRole('button', { name: 'Продолжить', exact: true }).click()
  await page.getByRole('button', { name: 'Оплатить', exact: true }).click()
  await page.getByRole('button', { name: 'Подтвердить оплату', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Обрабатываем, проверьте через минуту' })).toBeVisible()
  await expect(page.getByText('GATEWAY_TIMEOUT', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Проверить статус', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Спасибо! Чаевые отправлены' })).toBeVisible()
  await expect(page.getByText('GATEWAY_TIMEOUT', { exact: true })).toHaveCount(0)
  const stored = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('spasibo-demo-state-v3')!)
    return state.payments.find((payment: { qr_id: string }) => payment.qr_id === 'qr_002')
  })
  expect(stored).toMatchObject({ status: 'SUCCESS' })
  expect(errors).toEqual([])
})
