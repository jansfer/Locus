import { describe, expect, test } from 'bun:test'
import {
  probeLoopbackBinding,
  resolveCodexCallbackBindPlan,
  type LoopbackProbeResult,
} from './oauth-callback-host'

describe('回调端口探测', () => {
  test('given 真实本机 when 探测 then 返回确定性的绑定结果', async () => {
    // 本机端口是否可绑定取决于环境（Windows 动态保留 / 已运行实例），
    // 这里只验证探测函数返回结构化结果而不是抛出。
    for (const host of ['::', '127.0.0.1'] as const) {
      const result = await probeLoopbackBinding(host)
      expect(typeof result.ok).toBe('boolean')
      if (!result.ok) {
        expect(typeof result.errorCode).toBe('string')
        expect(result.errorCode!.length).toBeGreaterThan(0)
      }
    }
  })
})

describe('回调绑定决策', () => {
  const occupied: LoopbackProbeResult = { ok: false, errorCode: 'EADDRINUSE' }
  const reserved: LoopbackProbeResult = { ok: false, errorCode: 'EACCES' }
  const noIpv6: LoopbackProbeResult = { ok: false, errorCode: 'EADDRNOTAVAIL' }
  const free: LoopbackProbeResult = { ok: true }

  test('given 双栈可绑定 when 生成计划 then 使用 :: 让两种 localhost 解析都可达', async () => {
    const plan = await resolveCodexCallbackBindPlan(async () => free)
    expect(plan.bindHost).toBe('::')
  })

  test('given IPv6 不可用而 IPv4 空闲 when 生成计划 then 保持 Pi 默认绑定', async () => {
    const plan = await resolveCodexCallbackBindPlan(async (host) => (host === '::' ? noIpv6 : free))
    expect(plan.bindHost).toBeUndefined()
  })

  test('given 端口被占用 when 生成计划 then 返回提示并允许继续授权', async () => {
    expect((await resolveCodexCallbackBindPlan(async () => occupied)).warning).toContain('1455 被其他程序占用')
  })

  test('given IPv6 不可用且 IPv4 也被占用 when 生成计划 then 同样允许手动回调', async () => {
    expect((await resolveCodexCallbackBindPlan(async (host) => (host === '::' ? noIpv6 : occupied))).warning)
      .toContain('1455 被其他程序占用')
  })

  test('given 端口权限被拒绝 when 生成计划 then 保留错误码且允许继续授权', async () => {
    expect((await resolveCodexCallbackBindPlan(async () => reserved)).warning).toContain('EACCES')
  })

  test('given IPv6 不可用且 IPv4 权限被拒绝 when 生成计划 then 同样允许手动回调', async () => {
    expect((await resolveCodexCallbackBindPlan(async (host) => (host === '::' ? noIpv6 : reserved))).warning)
      .toContain('EACCES')
  })
})
