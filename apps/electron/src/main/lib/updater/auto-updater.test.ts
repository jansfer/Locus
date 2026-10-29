import { afterEach, describe, expect, mock, test } from 'bun:test'
import { EventEmitter } from 'node:events'
import { tmpdir } from 'node:os'

const powerMonitor = new EventEmitter()
const events = new EventEmitter()
let checks = 0
let outcome: 'none' | 'error' = 'none'
const updater = Object.assign(events, {
  checkForUpdates: async () => {
    checks++
    events.emit('checking-for-update')
    if (outcome === 'error') {
      const error = new Error('离线测试')
      events.emit('error', error)
      throw error
    }
    events.emit('update-not-available')
  },
  downloadUpdate: async () => {},
})
mock.module('electron-updater', () => ({ autoUpdater: updater }))
mock.module('electron', () => ({
  app: { isPackaged: true, getPath: () => tmpdir(), getVersion: () => '0.19.67' },
  BrowserWindow: class {}, powerMonitor, net: { isOnline: () => true },
}))
const { initAutoUpdater, configureUpdater, cleanupUpdater, checkForUpdates, getUpdateStatus, installWhenIdle } = await import('./auto-updater')

function initialize() {
  const window = Object.assign(new EventEmitter(), {
    webContents: Object.assign(new EventEmitter(), { send: () => {} }),
    isVisible: () => false,
    isDestroyed: () => false,
  })
  initAutoUpdater(window as unknown as Parameters<typeof initAutoUpdater>[0])
  configureUpdater(window as unknown as Parameters<typeof configureUpdater>[0], { hasActiveAgents: () => true })
}

afterEach(() => {
  cleanupUpdater()
  events.removeAllListeners()
  outcome = 'none'
})

describe('自动更新生命周期', () => {
  test('Given 唤醒与网络恢复连续发生 When 自动检查无更新 Then 合并请求且不推送打扰状态', async () => {
    initialize()
    const previousStatus = getUpdateStatus()
    powerMonitor.emit('resume')
    await checkForUpdates(true)
    await checkForUpdates(true)
    expect(checks).toBe(1)
    expect(getUpdateStatus()).toEqual(previousStatus)
    cleanupUpdater()
    expect(powerMonitor.listenerCount('resume')).toBe(0)
  })

  test('Given 用户手动检查 When 网络失败 Then 仍展示明确错误且不重复请求', async () => {
    initialize()
    outcome = 'error'
    const previousChecks = checks
    await checkForUpdates()
    expect(checks).toBe(previousChecks + 1)
    expect(getUpdateStatus()).toEqual({ status: 'error', error: '离线测试' })
  })

  test('Given 已下载更新且已安排空闲安装 When 检查失败的事件与 rejection 同时发生 Then 保留安装状态', async () => {
    initialize()
    events.emit('update-downloaded', { version: '0.19.68', downloadedFile: `${tmpdir()}/locus-test-missing.exe` })
    expect(installWhenIdle()).toBe(true)
    outcome = 'error'
    await checkForUpdates()
    expect(getUpdateStatus()).toEqual({ status: 'downloaded', version: '0.19.68', installScheduled: true })
  })
})
