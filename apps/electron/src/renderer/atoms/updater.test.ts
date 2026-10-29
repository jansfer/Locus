import { expect, test } from 'bun:test'
import { initializeUpdater } from './updater'

test('Given 更新订阅已初始化 When 联网恢复 Then 请求自动检查且卸载后移除监听', async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const target = new EventTarget()
  const calls: Array<boolean | undefined> = []
  let unsubscribed = false
  Object.assign(target, { electronAPI: { updater: {
    getStatus: async () => ({ status: 'idle' }),
    onStatusChanged: () => () => { unsubscribed = true },
    checkForUpdates: async (automatic?: boolean) => { calls.push(automatic) },
  } } })
  Object.defineProperty(globalThis, 'window', { value: target, configurable: true })
  try {
    const cleanup = initializeUpdater(() => {})
    target.dispatchEvent(new Event('online'))
    await Promise.resolve()
    expect(calls).toEqual([true])
    cleanup()
    target.dispatchEvent(new Event('online'))
    expect(calls).toEqual([true])
    expect(unsubscribed).toBe(true)
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow)
    else Reflect.deleteProperty(globalThis, 'window')
  }
})
