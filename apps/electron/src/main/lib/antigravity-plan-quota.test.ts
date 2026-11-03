import { expect, test } from 'bun:test'
import { parseAntigravityPlanQuota, queryAntigravityPlanQuota } from './antigravity-plan-quota'

test('Given 分组配额 When 解析 Then 区分零额度和未知并保留重置时间', () => {
  const result = parseAntigravityPlanQuota({ groups: [{ displayName: 'Gemini', buckets: [
    { window: '5h', remainingFraction: 0, resetTime: '2026-11-04T00:00:00Z' },
    { window: 'weekly', remainingFraction: 0.75 },
    { window: '5h' },
  ] }] })
  expect(result.supported).toBe(true)
  expect(result.windows).toHaveLength(2)
  expect(result.windows[0]?.remainingPercent).toBe(0)
  expect(result.windows[0]?.resetAt).toBe(Date.parse('2026-11-04T00:00:00Z'))
  expect(result.windows[1]?.remainingPercent).toBe(75)
})

test('Given 上游拒绝查询 When 获取配额 Then 返回失败且不伪造零额度', async () => {
  const original = globalThis.fetch
  globalThis.fetch = (async () => new Response('', { status: 403 })) as unknown as typeof fetch
  try {
    await expect(queryAntigravityPlanQuota('test')).rejects.toThrow('HTTP 403')
  } finally { globalThis.fetch = original }
})
test('Given 没有配额或非法比例 When 解析 Then 显示未知而不是零额度', () => {
  for (const input of [null, {}, { groups: [{ buckets: [{ remainingFraction: -1 }, { remainingFraction: 2 }, { remainingFraction: '0' }] }] }]) {
    const result = parseAntigravityPlanQuota(input)
    expect(result.supported).toBe(false)
    expect(result.windows).toEqual([])
  }
})
