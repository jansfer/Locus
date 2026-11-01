import { describe, expect, test } from 'bun:test'
import type { AntigravityOAuthCredentials } from '@proma/shared'
import { refreshAntigravityOAuthCredentialsSerial, rememberAntigravityOAuthCredentials } from './antigravity-oauth-credentials'

function credentials(access: string, refresh = 'rt-1', expires = Date.now() + 600_000): AntigravityOAuthCredentials {
  return { access, refresh, expires }
}

describe('Antigravity 凭据记忆', () => {
  test('Given 较新凭据 When remember Then 保留较新值', () => {
    const older = credentials('old-access', 'rt-1', Date.now() + 1000)
    const newer = credentials('new-access', 'rt-1', Date.now() + 100_000)
    rememberAntigravityOAuthCredentials('ch-1', older)
    expect(rememberAntigravityOAuthCredentials('ch-1', newer)).toBe(newer)
  })

  test('Given force 写入 When 旧快照回写 Then 旧快照不覆盖已刷新凭据', () => {
    const refreshed = credentials('refreshed-access', 'rt-2', Date.now() + 100_000)
    rememberAntigravityOAuthCredentials('ch-2', refreshed, true)
    const stale = credentials('stale-access', 'rt-1', Date.now() + 1000)
    expect(rememberAntigravityOAuthCredentials('ch-2', stale)).toBe(refreshed)
  })
})

describe('Antigravity 串行刷新', () => {
  test('Given 并发两次刷新 When 同一渠道 Then 只发起一次网络刷新并共享结果', async () => {
    let refreshCount = 0
    const base = credentials('base-access', 'rt-base')
    rememberAntigravityOAuthCredentials('ch-3', base, true)

    const [a, b] = await Promise.all([
      refreshAntigravityOAuthCredentialsSerial('ch-3', base, async () => {
        refreshCount += 1
        return credentials(`fresh-${refreshCount}`, 'rt-fresh')
      }),
      refreshAntigravityOAuthCredentialsSerial('ch-3', base, async () => {
        refreshCount += 1
        return credentials(`fresh-${refreshCount}`, 'rt-fresh')
      }),
    ])

    expect(refreshCount).toBe(1)
    expect(a.access).toBe(b.access)
    expect(a.access).toBe('fresh-1')
  })

  test('Given 已有更新凭据 When 旧快照触发刷新 Then 直接复用最新凭据', async () => {
    const latest = credentials('latest-access', 'rt-latest', Date.now() + 100_000)
    rememberAntigravityOAuthCredentials('ch-4', latest, true)
    const stale = credentials('stale-access', 'rt-stale', Date.now() + 1000)

    let refreshCount = 0
    const result = await refreshAntigravityOAuthCredentialsSerial('ch-4', stale, async () => {
      refreshCount += 1
      return credentials('should-not-happen')
    })

    expect(refreshCount).toBe(0)
    expect(result).toBe(latest)
  })

  test('Given 不同渠道 When 并发刷新 Then 各自独立刷新', async () => {
    let ch5Count = 0
    let ch6Count = 0
    const base5 = credentials('base-5')
    const base6 = credentials('base-6')

    const [a, b] = await Promise.all([
      refreshAntigravityOAuthCredentialsSerial('ch-5', base5, async () => {
        ch5Count += 1
        return credentials('fresh-5')
      }),
      refreshAntigravityOAuthCredentialsSerial('ch-6', base6, async () => {
        ch6Count += 1
        return credentials('fresh-6')
      }),
    ])

    expect(ch5Count).toBe(1)
    expect(ch6Count).toBe(1)
    expect(a.access).toBe('fresh-5')
    expect(b.access).toBe('fresh-6')
  })
})
