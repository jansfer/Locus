import { expect, mock, test } from 'bun:test'
import type { PiAgentQueryOptions } from './pi-agent-adapter'
mock.module('../agent-runtime-client', () => ({ AgentRuntimeClient: class {} }))
const { serializeQueryInput } = await import('./pi-utility-adapter')

test('Given Antigravity 刷新回调 When 序列化查询 Then 可跨进程克隆且保留凭据', () => {
  const credentials = { access: 'test', refresh: 'test-refresh', expires: 100 }
  const serialized = serializeQueryInput({
    sessionId: 'test-session', antigravityOAuthCredentials: credentials,
    onAntigravityOAuthCredentialsRefreshed: () => {},
  } as unknown as PiAgentQueryOptions)
  expect(() => structuredClone(serialized)).not.toThrow()
  expect(serialized.antigravityOAuthCredentials).toEqual(credentials)
  expect(serialized.onAntigravityOAuthCredentialsRefreshed).toBeUndefined()
})
