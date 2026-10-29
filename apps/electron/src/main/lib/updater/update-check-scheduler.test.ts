import { describe, expect, test } from 'bun:test'
import { createUpdateCheckScheduler } from './update-check-scheduler'

describe('更新检查调度', () => {
  test('Given 一次检查失败 When 再次手动检查 Then 释放并发锁并正确传递自动标记', async () => {
    const modes: boolean[] = []
    const scheduler = createUpdateCheckScheduler({ check: async (automatic) => {
      modes.push(automatic)
      if (modes.length === 1) throw new Error('网络失败')
    } })
    await expect(scheduler.request()).rejects.toThrow('网络失败')
    await scheduler.request(true)
    expect(modes).toEqual([true, false])
  })

  test('Given 检查尚未结束 When 自动和手动请求同时到达 Then 合并为一次请求', async () => {
    let calls = 0
    let finish: (() => void) | undefined
    const scheduler = createUpdateCheckScheduler({ check: () => { calls++; return new Promise<void>((resolve) => { finish = resolve }) } })
    const first = scheduler.request()
    const second = scheduler.request(true)
    expect(calls).toBe(1)
    finish?.()
    await Promise.all([first, second])
  })

  test('Given 刚完成检查 When 连续唤醒和联网 Then 冷却期不检查但手动检查可绕过', async () => {
    let now = 0
    let calls = 0
    const scheduler = createUpdateCheckScheduler({ check: async () => { calls++ }, now: () => now })
    await scheduler.request()
    await scheduler.request()
    now = 119_999
    await scheduler.request()
    expect(calls).toBe(1)
    now = 120_000
    await scheduler.request()
    await scheduler.request(true)
    expect(calls).toBe(3)
  })

  test('Given 离线或正在下载 When 请求检查 Then 跳过且不占用恢复后的冷却期', async () => {
    let ready = false
    let calls = 0
    const scheduler = createUpdateCheckScheduler({ check: async () => { calls++ }, canCheck: () => ready })
    await scheduler.request()
    ready = true
    await scheduler.request()
    expect(calls).toBe(1)
  })

  test('Given 启动调度 When 首次计时与周期计时触发 Then 尽早检查并在清理后停止', async () => {
    let now = 0
    let calls = 0
    const callbacks: Array<() => void> = []
    const delays: number[] = []
    let cleared = 0
    const scheduler = createUpdateCheckScheduler({
      check: async () => { calls++ }, now: () => now,
      setTimeoutFn: (callback, delay) => { callbacks.push(callback); delays.push(delay); return callbacks.length as unknown as ReturnType<typeof setTimeout> },
      clearTimeoutFn: () => { cleared++ },
    })
    scheduler.start()
    expect(delays).toEqual([3000])
    callbacks[0]?.()
    await Promise.resolve()
    await Promise.resolve()
    expect(calls).toBe(1)
    expect(delays).toEqual([3000, 900_000])
    now = 900_000
    callbacks[1]?.()
    await Promise.resolve()
    await Promise.resolve()
    expect(calls).toBe(2)
    scheduler.dispose()
    expect(cleared).toBe(1)
    callbacks[2]?.()
    expect(calls).toBe(2)
  })
})
