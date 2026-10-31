import { afterEach, describe, expect, mock, test } from 'bun:test'
import { createServer } from 'node:net'

const openExternal = mock(async (_url: string): Promise<void> => {})
mock.module('electron', () => ({ shell: { openExternal } }))
mock.module('./proxy-settings-service', () => ({ getEffectiveProxyUrl: async () => undefined }))
mock.module('./oauth-proxy-scope', () => ({
  runWithOAuthProxyScope: async <T>(operation: () => Promise<T>): Promise<T> => operation(),
}))

const { loginCodexOAuth, cancelCodexOAuthLogin, submitCodexOAuthCallbackInput } = await import('./codex-oauth-service')

afterEach(() => {
  cancelCodexOAuthLogin()
  openExternal.mockClear()
})

describe('Codex 浏览器登录回归（实际 Pi SDK）', () => {
  test('given 回调端口不可用 when 登录 then 仍打开授权页并允许取消手动输入', async () => {
    // 端口空闲时主动占用；环境已拒绝绑定或已有监听时同样覆盖不可用场景。
    const blocker = createServer()
    await new Promise<void>((resolve) => {
      blocker.once('error', () => resolve())
      blocker.listen(1455, '::', () => resolve())
    })
    const previousHost = process.env.PI_OAUTH_CALLBACK_HOST
    let requested = false
    try {
      await expect(loginCodexOAuth({
        onManualInputRequest: () => {
          requested = true
          // 等服务注册 pending prompt 后再取消。
          queueMicrotask(cancelCodexOAuthLogin)
        },
      })).rejects.toThrow()
      expect(openExternal).toHaveBeenCalledTimes(1)
      expect(openExternal.mock.calls[0]?.[0]).toStartWith('https://auth.openai.com/')
      expect(requested).toBe(true)
      expect(submitCodexOAuthCallbackInput('unused')).toBe(false)
      expect(process.env.PI_OAUTH_CALLBACK_HOST).toBe(previousHost)
    } finally {
      blocker.close()
    }
  }, 15000)
})
