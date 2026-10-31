import { describe, expect, test, beforeEach, mock } from 'bun:test'

// Agent 提示词构建器依赖大量主进程服务；这里 mock 到最小可用，
// 只验证与界面语言相关的注入行为。Automation / Collaboration / Bridge
// 的 headless 运行与正常会话共用 buildSystemPrompt / buildDynamicContext，
// 因此这里的断言同时覆盖全部调用路径。
mock.module('./user-profile-service', () => ({
  getUserProfile: () => ({ userName: 'Tester' }),
}))
mock.module('./agent-workspace-manager', () => ({
  getAgentWorkspaceBySlug: () => undefined,
  getProjectFilesPath: () => '/tmp/project',
  getWorkspaceMcpConfig: () => ({ servers: {} }),
}))
mock.module('./config-paths', () => ({ getConfigDirName: () => '.proma' }))
mock.module('./agent-git-attribution', () => ({
  buildGitAttributionPromptSection: () => '',
  isGitAttributionEnabled: () => false,
}))
mock.module('./settings-service', () => ({
  getSettings: () => ({ gitAttributionEnabled: false }),
}))
mock.module('./project-instruction-resolver', () => ({
  hasRootProjectAgentsInstruction: () => false,
}))
mock.module('./project-instruction-migration', () => ({
  buildLegacyProjectMigrationPrompt: () => undefined,
}))

const { buildSystemPrompt, buildDynamicContext } = await import('./agent-prompt-builder')
const { setI18nLanguage } = await import('../../i18n/core')

function minimalCtx(): Parameters<typeof buildSystemPrompt>[0] {
  return {
    sessionId: 'test-session',
    permissionMode: 'default',
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
