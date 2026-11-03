import { describe, expect, spyOn, test } from 'bun:test'
import {
  ANTIGRAVITY_OAUTH_CLIENT_ID,
  ANTIGRAVITY_V1_INTERNAL_ENDPOINTS,
  buildAntigravityAuthUrl,
  buildAntigravityEgressUserAgent,
  buildAntigravityRequestId,
  buildV1InternalEnvelope,
  mapAntigravityAvailableModels,
  fetchAntigravityAvailableModels,
  exchangeAntigravityCode,
  parseAntigravityCallbackUrl,
  shouldTryNextAntigravityEndpoint,
} from './antigravity-api'

describe('Antigravity requestId 构造', () => {
  test('Given 同一 sessionKey When 多次生成 Then conversation 段稳定且整体为五段式', () => {
    const first = buildAntigravityRequestId('session-abc', 3)
    const second = buildAntigravityRequestId('session-abc', 4)

    const firstParts = first.split('/')
    const secondParts = second.split('/')
    expect(firstParts).toHaveLength(5)
    expect(firstParts[0]).toBe('agent')
    expect(firstParts[1]).toBe(secondParts[1])
    expect(firstParts[4]).toBe('3')
    expect(secondParts[4]).toBe('4')
  })

  test('Given 不同 sessionKey When 生成 Then conversation 段不同', () => {
    const a = buildAntigravityRequestId('session-a', 1)
    const b = buildAntigravityRequestId('session-b', 1)
    expect(a.split('/')[1]).not.toBe(b.split('/')[1])
  })
})

describe('Antigravity v1internal 信封组装', () => {
  const baseInput = {
    project: 'proj-1',
    requestId: 'agent/conv/123/traj/2',
    model: 'gemini-3-pro-high',
    request: { contents: [{ role: 'user', parts: [{ text: 'hi' }] }] },
    userAgent: 'antigravity/hub/2.23.1',
  }

  test('Given 基本输入 When 组装 Then 包含 project/requestId/request/model/userAgent', () => {
    const envelope = buildV1InternalEnvelope(baseInput)
    expect(envelope.project).toBe('proj-1')
    expect(envelope.requestId).toBe('agent/conv/123/traj/2')
    expect(envelope.model).toBe('gemini-3-pro-high')
    expect(envelope.userAgent).toBe('antigravity/hub/2.23.1')
    expect(envelope.request).toEqual(baseInput.request)
    expect(envelope.requestType).toBeUndefined()
  })

  test('Given agent 请求类型 When 组装 Then 注入 requestType', () => {
    const envelope = buildV1InternalEnvelope({ ...baseInput, requestType: 'agent' })
    expect(envelope.requestType).toBe('agent')
  })
})

describe('Antigravity OAuth 授权 URL', () => {
  test('Given redirectUri 与 state When 构造 Then 携带官方 client、offline 与 consent', () => {
    const url = new URL(buildAntigravityAuthUrl('http://localhost:12345/oauth-callback', 'state-1'))
    expect(url.origin).toBe('https://accounts.google.com')
    expect(url.pathname).toBe('/o/oauth2/v2/auth')
    expect(url.searchParams.get('client_id')).toBe(ANTIGRAVITY_OAUTH_CLIENT_ID)
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:12345/oauth-callback')
    expect(url.searchParams.get('state')).toBe('state-1')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('access_type')).toBe('offline')
    expect(url.searchParams.get('prompt')).toBe('consent')
    expect(url.searchParams.get('scope')).toContain('cloud-platform')
  })
})

describe('Antigravity 回调地址解析', () => {
  test('Given 合法回调地址与匹配 state When 解析 Then 返回授权码', () => {
    const result = parseAntigravityCallbackUrl('http://localhost:1/oauth-callback?state=s1&code=c1', 's1')
    expect(result).toEqual({ code: 'c1' })
  })

  test('Given state 不匹配 When 解析 Then 返回 state 错误', () => {
    const result = parseAntigravityCallbackUrl('http://localhost:1/oauth-callback?state=bad&code=c1', 's1')
    expect(result).toEqual({ error: 'OAuth state 不匹配，请重新发起登录' })
  })

  test('Given 上游 error 参数 When 解析 Then 返回错误信息', () => {
    const result = parseAntigravityCallbackUrl('http://localhost:1/oauth-callback?state=s1&error=access_denied', 's1')
    expect(result).toEqual({ error: 'access_denied' })
  })

  test('Given 缺少 code 或非 URL 输入 When 解析 Then 返回 null', () => {
    expect(parseAntigravityCallbackUrl('http://localhost:1/oauth-callback?state=s1', 's1')).toBeNull()
    expect(parseAntigravityCallbackUrl('not a url', 's1')).toBeNull()
    expect(parseAntigravityCallbackUrl('', 's1')).toBeNull()
  })
})

describe('Antigravity 端点降级判定', () => {
  test('Given 5xx / 408 / 404 / sandbox 400 When 判定 Then 需要降级', () => {
    expect(shouldTryNextAntigravityEndpoint(500, ANTIGRAVITY_V1_INTERNAL_ENDPOINTS[0])).toBe(true)
    expect(shouldTryNextAntigravityEndpoint(408, ANTIGRAVITY_V1_INTERNAL_ENDPOINTS[0])).toBe(true)
    expect(shouldTryNextAntigravityEndpoint(404, ANTIGRAVITY_V1_INTERNAL_ENDPOINTS[0])).toBe(true)
    expect(shouldTryNextAntigravityEndpoint(400, 'https://daily-cloudcode-pa.sandbox.googleapis.com/v1internal')).toBe(true)
  })

  test('Given 401 / 403 / prod 400 When 判定 Then 不降级', () => {
    expect(shouldTryNextAntigravityEndpoint(401, ANTIGRAVITY_V1_INTERNAL_ENDPOINTS[0])).toBe(false)
    expect(shouldTryNextAntigravityEndpoint(403, ANTIGRAVITY_V1_INTERNAL_ENDPOINTS[0])).toBe(false)
    expect(shouldTryNextAntigravityEndpoint(400, ANTIGRAVITY_V1_INTERNAL_ENDPOINTS[2])).toBe(false)
  })
})

describe('Antigravity 出站 User-Agent', () => {
  test('Given 平台与架构 When 构造 Then 包含 antigravity 客户端标识与 os/arch', () => {
    const ua = buildAntigravityEgressUserAgent('darwin', 'arm64')
    expect(ua).toContain('antigravity/hub/')
    expect(ua).toContain('os_type=darwin')
    expect(ua).toContain('arch=arm64')

    const winUa = buildAntigravityEgressUserAgent('win32', 'x64')
    expect(winUa).toContain('os_type=windows')
    expect(winUa).toContain('arch=x86_64')
  })
})

describe('Antigravity 模型目录映射', () => {
  test('Given 官方目录条目 When 映射 Then 保留 id 与 displayName 且过滤空条目', () => {
    const models = mapAntigravityAvailableModels({
      'gemini-3-pro-high': { displayName: 'Gemini 3 Pro High', model: 'MODEL_X', supportsImages: true },
      'claude-sonnet-4-5': { model: 'MODEL_Y' },
      '': { displayName: '无效空 ID' },
      _internal: { displayName: '内部占位' },
    })
    expect(models).toEqual([
      { id: 'gemini-3-pro-high', name: 'Gemini 3 Pro High', supportsImages: true },
      { id: 'claude-sonnet-4-5', name: 'claude-sonnet-4-5', supportsImages: false },
    ])
  })
})

test('Given 上游 models 包装响应 When 获取目录 Then 解包后保留模型', async () => {
  const original = globalThis.fetch
  globalThis.fetch = (async () => Response.json({ models: { gemini: { displayName: 'Gemini' } } })) as unknown as typeof fetch
  try {
    expect(mapAntigravityAvailableModels(await fetchAntigravityAvailableModels('test'))).toEqual([{ id: 'gemini', name: 'Gemini', supportsImages: false }])
  } finally { globalThis.fetch = original }
})

test('Given 调用方取消信号 When 交换请求超时 Then 超时仍然生效', async () => {
  const originalFetch = globalThis.fetch
  const deadline = new AbortController()
  const timeout = spyOn(AbortSignal, 'timeout').mockImplementation(() => deadline.signal)
  globalThis.fetch = (async (_input: unknown, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true })
    queueMicrotask(() => deadline.abort(new Error('test timeout')))
  })) as unknown as typeof fetch
  const caller = new AbortController()
  try {
    await expect(exchangeAntigravityCode('test', 'http://localhost/callback', { signal: caller.signal })).rejects.toThrow()
    expect(timeout).toHaveBeenCalledWith(30_000)
    expect(caller.signal.aborted).toBe(false)
  } finally {
    timeout.mockRestore()
    globalThis.fetch = originalFetch
  }
})
