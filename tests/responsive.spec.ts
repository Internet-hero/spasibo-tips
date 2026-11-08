import { expect, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { loginAs, route } from './routes'

const publicRoutes = [['home', '/'], ['payment', '/p/qr_001'], ['login', '/login']] as const

for (const width of [375, 768, 1024, 1440]) {
  test(`публичные страницы без горизонтального скролла: ${width}px`, async ({ page }) => {
    await mkdir('.verification', { recursive: true })
    await page.setViewportSize({ width, height: width < 768 ? 812 : 900 })
    for (const [name, path] of publicRoutes) {
      await page.goto(route(path))
      await page.evaluate(() => document.fonts.ready)
      const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: window.innerWidth }))
      expect(dimensions.scroll, `${name} при ${width}px`).toBeLessThanOrEqual(dimensions.viewport)
      if (width === 375 || width === 1440) await page.screenshot({ path: `.verification/${name}-${width}.png`, fullPage: true })
    }
  })
}

test('кабинеты без горизонтального скролла на мобильном и десктопе', async ({ page }) => {
  await mkdir('.verification', { recursive: true })
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 900 })
    await loginAs(page, 'staff')
    await page.screenshot({ path: `.verification/staff-${width}.png`, fullPage: true })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    await loginAs(page, 'manager')
    for (const [name, path] of [['manager', '/manager'], ['manager-staff', '/manager/staff'], ['manager-qr', '/manager/qr']] as const) {
      await page.goto(route(path))
      await expect(page.locator('main')).toBeVisible()
      await page.screenshot({ path: `.verification/${name}-${width}.png`, fullPage: true })
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    }
    await loginAs(page, 'admin')
    await page.screenshot({ path: `.verification/admin-${width}.png`, fullPage: true })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  }
})
