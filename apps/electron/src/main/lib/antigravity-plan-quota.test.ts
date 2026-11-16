import { expect, test } from 'bun:test'
import { parseAntigravityPlanQuota, queryAntigravityPlanQuota } from './antigravity-plan-quota'

interface RecordedRequest {
  url: string
  body?: string
}

/** 用可编排的 fetch 替身记录请求并按状态码返回。 */
function stubFetch(handler: (request: RecordedRequest) => Response): { requests: RecordedRequest[]; restore: () => void } {
  const original = globalThis.fetch
  const requests: RecordedRequest[] = []
  globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
    const request = { url: String(input), body: init?.body === undefined ? undefined : String(init.body) }
    requests.push(request)
    return handler(request)
  }) as unknown as typeof fetch
  return { requests, restore: () => { globalThis.fetch = original } }
}

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

test('Given 没有配额或非法比例 When 解析 Then 显示未知而不是零额度', () => {
  for (const input of [null, {}, { groups: [{ buckets: [{ remainingFraction: -1 }, { remainingFraction: 2 }, { remainingFraction: '0' }] }] }]) {
    const result = parseAntigravityPlanQuota(input)
    expect(result.supported).toBe(false)
    expect(result.windows).toEqual([])
  }
})

test('Given 提供 projectId When 查询配额 Then 首个请求携带项目且成功后不再回退', async () => {
  const stub = stubFetch(() => Response.json({
    groups: [{ displayName: 'Gemini', buckets: [{ window: 'weekly', remainingFraction: 0.5 }] }],
  }))
  try {
    const result = await queryAntigravityPlanQuota('token', { projectId: 'proj-1' })
    expect(result.supported).toBe(true)
    expect(result.windows[0]?.remainingPercent).toBe(50)
    expect(stub.requests).toHaveLength(1)
    expect(JSON.parse(stub.requests[0]!.body ?? '{}')).toEqual({ project: 'proj-1' })
  } finally {
    stub.restore()
  }
})

test('Given 带项目的请求被拒 When 查询配额 Then 回退空体重试并成功', async () => {
  let call = 0
  const stub = stubFetch(() => {
    call += 1
    if (call === 1) return new Response('', { status: 403 })
    return Response.json({ groups: [{ displayName: 'Claude', buckets: [{ window: '5h', remainingFraction: 0.25 }] }] })
  })
  try {
    const result = await queryAntigravityPlanQuota('token', { projectId: 'proj-1' })
    expect(result.supported).toBe(true)
    expect(stub.requests[1]!.body).toBe('{}')
    expect(stub.requests[1]!.url).toContain('daily-cloudcode-pa.googleapis.com')
  } finally {
    stub.restore()
  }
})

test('Given 端点返回 5xx When 查询配额 Then 降级到后续端点', async () => {
  let call = 0
  const stub = stubFetch(() => {
    call += 1
    if (call === 1) return new Response('，', { status: 503 })
    return Response.json({ groups: [{ displayName: 'Gemini', buckets: [{ window: 'weekly', remainingFraction: 0.9 }] }] })
  })
  try {
    const result = await queryAntigravityPlanQuota('token')
    expect(result.supported).toBe(true)
    expect(stub.requests[1]!.url).toContain('sandbox.googleapis.com')
  } finally {
    stub.restore()
  }
})

test('Given 全部端点 403 When 查询配额 Then 返回账号级原因而不是伪造零额度', async () => {
  const stub = stubFetch(() => new Response('', { status: 403 }))
  try {
    await expect(queryAntigravityPlanQuota('token', { projectId: 'proj-1' })).rejects.toThrow('HTTP 403')
    // 3 个端点 × 2 种报文组合（带 project / 空体）都会被尝试
    expect(stub.requests.length).toBeGreaterThanOrEqual(3)
  } finally {
    stub.restore()
  }
})

test('Given 403 且响应体要求账号验证 When 查询配额 Then 提示完成 Google 账号验证', async () => {
  const stub = stubFetch(() => new Response('{"error":{"message":"validation_required"}}', { status: 403 }))
  try {
    await expect(queryAntigravityPlanQuota('token')).rejects.toThrow('账号验证')
  } finally {
    stub.restore()
  }
})
