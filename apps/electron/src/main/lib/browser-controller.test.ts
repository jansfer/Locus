import { describe, expect, mock, test } from 'bun:test'
import { EventEmitter } from 'node:events'

mock.module('electron', () => ({
  app: { isPackaged: true }, BrowserWindow: class {}, WebContentsView: class {}, session: {}, net: {},
}))
const { BrowserController } = await import('./browser-controller')

class TestContents extends EventEmitter {
  destroyed = false
  closeRequested = false
  autoDestroy = true
  debugger = { isAttached: () => false }
  isDestroyed() { return this.destroyed }
  close() {
    this.closeRequested = true
    if (this.autoDestroy) queueMicrotask(() => this.finishClose())
  }
  finishClose() { this.destroyed = true; this.emit('destroyed') }
}

function createFixture(contents: TestContents[]) {
  const controller = new BrowserController()
  const abortController = new AbortController()
  const tabs = new Map(contents.map((webContents, index) => [`tab-${index}`, {
    tabId: `tab-${index}`, view: { webContents, setVisible: () => {} },
    refs: new Map(), generation: 0, attachedOwner: null,
  }]))
  const sessions = new Map([['deleted', { sessionId: 'deleted', tabs, agentAbortController: abortController, lastLayoutRevisionByTab: new Map() }]])
  Object.assign(controller, { sessions })
  return { controller, abortController, sessions, tabs }
}

describe('删除会话时关闭受管浏览器', () => {
  test('Given 多标签浏览器与排队操作 When 关闭会话 Then 取消操作并等待所有标签销毁', async () => {
    const contents = [new TestContents(), new TestContents()]
    for (const item of contents) item.autoDestroy = false
    const { controller, abortController, sessions, tabs } = createFixture(contents)
    let finished = false
    const closing = controller.close('deleted').then(() => { finished = true })
    expect(abortController.signal.aborted).toBe(true)
    await Promise.resolve()
    expect(finished).toBe(false)
    contents[0]!.finishClose()
    await Promise.resolve()
    expect(finished).toBe(false)
    contents[1]!.finishClose()
    await closing
    expect(contents.every((item) => item.destroyed)).toBe(true)
    expect(sessions.has('deleted')).toBe(false)
    expect(tabs.size).toBe(0)
    await controller.close('deleted')
  })

  test('Given 一个标签关闭失败 When 关闭会话 Then 仍关闭其它标签且报告失败', async () => {
    const broken = new TestContents()
    broken.close = () => { throw new Error('关闭失败') }
    const healthy = new TestContents()
    const { controller } = createFixture([broken, healthy])
    await expect(controller.close('deleted')).rejects.toThrow()
    expect(healthy.destroyed).toBe(true)
  })

  test('Given 会话删除中仍有晚到打开请求 When 再次打开 Then 不重建浏览器', async () => {
    const { controller } = createFixture([new TestContents()])
    await controller.deleteSession('deleted')
    await expect(controller.open('deleted')).rejects.toThrow('会话已删除')
  })
})
