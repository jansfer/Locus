import { describe, expect, test, beforeEach, afterEach } from 'bun:test'

// Agent 提示词构建器在无 workspaceSlug 的最小上下文下不会触碰磁盘状态，
// 因此这里直接使用真实依赖模块，不使用 mock.module——Bun 的模块 mock 是
// 进程级且不可撤销的，会污染同进程运行的其他测试文件（如 config-paths
// 的其他导出被其他测试需要）。
// Automation / Collaboration / Bridge 的 headless 运行与正常会话共用
// buildSystemPrompt / buildDynamicContext，这里的断言同时覆盖全部调用路径。

const { buildSystemPrompt, buildDynamicContext } = await import('./agent-prompt-builder')
const { setI18nLanguage } = await import('../../i18n/core')

// 语言状态是模块级单例：测试结束后必须恢复默认，避免污染同进程的后续测试。
afterEach(() => {
  setI18nLanguage('zh-CN')
})

function minimalCtx(): Parameters<typeof buildSystemPrompt>[0] {
  return {
    sessionId: 'test-session',
    permissionMode: 'bypassPermissions',
    productivityTools: { todosEnabled: false, calendarEnabled: false, obsidianEnabled: false },
  }
}

describe('Given the system prompt builder When the interface language changes Then the default reply language follows', () => {
  beforeEach(() => {
    setI18nLanguage('zh-CN')
  })

  test('Given zh-CN Then the prompt requires Chinese replies and drops the hardcoded preference', () => {
    setI18nLanguage('zh-CN')
    const prompt = buildSystemPrompt(minimalCtx())
    expect(prompt).toContain('默认以简体中文回复')
    expect(prompt).not.toContain('优先中文')
  })

  test('Given en Then the prompt requires English replies', () => {
    setI18nLanguage('en')
    const prompt = buildSystemPrompt(minimalCtx())
    expect(prompt).toContain('Reply in English by default')
    expect(prompt).not.toContain('默认以简体中文回复')
  })

  test('Given a fresh run after switching Then the rebuilt prompt uses the new language', () => {
    setI18nLanguage('zh-CN')
    expect(buildSystemPrompt(minimalCtx())).toContain('默认以简体中文回复')
    setI18nLanguage('en')
    expect(buildSystemPrompt(minimalCtx())).toContain('Reply in English by default')
  })
})

describe('Given the per-message dynamic context When sending a message Then the response language block is injected', () => {
  beforeEach(() => {
    setI18nLanguage('zh-CN')
  })

  test('Given zh-CN Then the dynamic context declares Simplified Chinese', () => {
    setI18nLanguage('zh-CN')
    const context = buildDynamicContext({})
    expect(context).toContain('<response_language>')
    expect(context).toContain('简体中文')
  })

  test('Given en Then the dynamic context declares English', () => {
    setI18nLanguage('en')
    const context = buildDynamicContext({})
    expect(context).toContain('<response_language>')
    expect(context).toContain('English')
  })

  test('Given headless invocation (automation/collaboration) Then the same block applies', () => {
    // Automation 与 Collaboration 复用同一动态上下文；无 workspace 也应包含语言块。
    setI18nLanguage('en')
    const context = buildDynamicContext({ workspaceSlug: undefined })
    expect(context).toContain('<response_language>')
  })
})
