import { afterAll, afterEach, describe, expect, mock, test } from 'bun:test'

const nativeFetch = globalThis.fetch
const originalProxyFetch = { ...await import('./proxy-fetch') }
const openExternal = mock(async (_url: string): Promise<void> => {})
const request = mock(async (url: string | URL | Request, _init?: RequestInit): Promise<Response> => {
  if (String(url).includes('/token')) return Response.json({ access_token: 'access', refresh_token: 'refresh', expires_in: 3600 })
  if (String(url).includes('userinfo')) return Response.json({ email: 'test@example.com' })
  return Response.json({ cloudaicompanionProject: 'project' })
})
const getFetchFn = mock((_proxy?: string) => request as unknown as typeof fetch)
mock.module('electron', () => ({ shell: { openExternal } }))
mock.module('./proxy-settings-service', () => ({ getEffectiveProxyUrl: async () => 'http://proxy.test:8080' }))
mock.module('./proxy-fetch', () => ({ getFetchFn }))
const { loginAntigravityOAuth, cancelAntigravityOAuthLogin, submitAntigravityOAuthCallbackInput } = await import('./antigravity-oauth-service')

afterAll(() => mock.module('./proxy-fetch', () => originalProxyFetch))

afterEach(() => {
  cancelAntigravityOAuthLogin()
  openExternal.mockReset()
  getFetchFn.mockClear()
})

describe('Antigravity 完整登录生命周期', () => {
  test('Given 浏览器立即回调并先访问无关路径 When 登录 Then 接收有效回调且所有请求使用代理', async () => {
    openExternal.mockImplementation(async (authUrl) => {
      const auth = new URL(authUrl)
      const redirect = new URL(auth.searchParams.get('redirect_uri')!)
      expect((await nativeFetch(new URL('/favicon.ico', redirect))).status).toBe(404)
      redirect.searchParams.set('state', auth.searchParams.get('state')!)
      redirect.searchParams.set('code', 'test-code')
      expect((await nativeFetch(redirect)).status).toBe(200)
    })
    const result = await loginAntigravityOAuth()
    expect(result.projectId).toBe('project')
    expect(getFetchFn.mock.calls.map(([proxy]) => proxy)).toEqual(Array(3).fill('http://proxy.test:8080'))
  }, 3000)

  test('Given 已提交授权码 When 交换凭据阶段取消 Then 中止网络请求并拒绝重复提交', async () => {
    request.mockImplementationOnce(async (_url, init) => {
      queueMicrotask(cancelAntigravityOAuthLogin)
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('cancelled')), { once: true })
      })
    })
    let auth: URL
    const login = loginAntigravityOAuth({
      onAuthUrl: (url) => { auth = new URL(url) },
      onManualInputRequest: () => {
        const redirect = new URL(auth.searchParams.get('redirect_uri')!)
        redirect.searchParams.set('state', auth.searchParams.get('state')!)
        redirect.searchParams.set('code', 'test-code')
        expect(submitAntigravityOAuthCallbackInput(redirect.toString())).toBe(true)
        expect(submitAntigravityOAuthCallbackInput(redirect.toString())).toBe(false)
      },
    })
    await expect(login).rejects.toThrow()
  }, 3000)
})
