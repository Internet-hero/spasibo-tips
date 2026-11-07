import { expect, test } from '@playwright/test'
import { route } from './routes'

test('гостевой вход укладывается в бюджет запросов и загрузки', async ({ page }) => {
  let requests = 0
  page.on('request', () => { requests += 1 })
  await page.goto(route('/p/table7/select'))
  await page.evaluate(() => document.fonts.ready)
  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    return {
      domContentLoaded: Math.round(navigation.domContentLoadedEventEnd),
      transferredKb: Math.round(resources.reduce((sum, item) => sum + item.transferSize, 0) / 1024),
    }
  })
  console.log(`Guest page: ${requests} requests, ${metrics.transferredKb} KB transferred, DOMContentLoaded ${metrics.domContentLoaded} ms`)
  expect(requests).toBeLessThan(35)
  expect(metrics.domContentLoaded).toBeLessThan(3000)
})
