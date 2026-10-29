import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { InMemoryCredentialStore } from '@earendil-works/pi-ai'
import { createAgentSession, DefaultResourceLoader, ModelRuntime, SessionManager, SettingsManager } from '@earendil-works/pi-coding-agent'
import { Type } from 'typebox'
import { writeTextFileAtomic } from '../safe-file'
import { createPromaManagedResourceLoaderOptions, createPromaProjectInstructionFilesOverride } from './pi-resource-loader-overrides'

const temporaryRoots: string[] = []

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function createManagedLoader() {
  const root = mkdtempSync(join(tmpdir(), 'locus-pi-runtime-'))
  temporaryRoots.push(root)
  const cwd = join(root, 'project')
  const agentDir = join(root, 'agent')
  mkdirSync(cwd)
  mkdirSync(agentDir)
  const settingsManager = SettingsManager.inMemory({ cacheWarming: 'off' })
  const resourceLoader = new DefaultResourceLoader({
    cwd,
    agentDir,
    settingsManager,
    ...createPromaManagedResourceLoaderOptions(),
    agentsFilesOverride: createPromaProjectInstructionFilesOverride([]),
    systemPromptOverride: () => 'Locus 测试指令',
  })
  return { root, cwd, agentDir, settingsManager, resourceLoader }
}

describe('Pi Runtime 版本兼容', () => {
  test('Given 项目与祖先目录存在环境式指令 When 加载受管资源 Then 仅使用显式注入的指令', async () => {
    const { root, cwd, agentDir, resourceLoader } = createManagedLoader()
    writeTextFileAtomic(join(root, 'AGENTS.md'), '祖先指令')
    writeTextFileAtomic(join(cwd, 'AGENTS.md'), '未经解析的项目指令')
    writeTextFileAtomic(join(agentDir, 'APPEND_SYSTEM.md'), '环境追加指令')

    await resourceLoader.reload()

    expect(resourceLoader.getAgentsFiles().agentsFiles).toEqual([])
    expect(resourceLoader.getAppendSystemPrompt()).toEqual([])
    expect(resourceLoader.getSystemPrompt()).toBe('Locus 测试指令')
    expect(resourceLoader.getExtensions().extensions).toEqual([])
  })

  test('Given 已有会话与受管工具 When 新版 SDK 创建会话 Then 恢复上下文且只启用受管工具', async () => {
    const { cwd, agentDir, settingsManager, resourceLoader } = createManagedLoader()
    await resourceLoader.reload()
    const modelRuntime = await ModelRuntime.create({
      credentials: new InMemoryCredentialStore(),
      modelsPath: null,
      allowModelNetwork: false,
      refreshOnCreate: false,
    })
    modelRuntime.registerProvider('locus-test', {
      api: 'openai-completions',
      apiKey: 'test-only',
      baseUrl: 'http://127.0.0.1:1/v1',
      models: [{ id: 'test-model', name: '测试模型', reasoning: false, input: ['text'],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 8192, maxTokens: 1024 }],
    })
    const sessionManager = SessionManager.inMemory(cwd)
    sessionManager.appendMessage({ role: 'user', content: '恢复的消息', timestamp: 1 })
    const { session } = await createAgentSession({
      cwd, agentDir, modelRuntime, settingsManager, resourceLoader, sessionManager,
      model: modelRuntime.getModel('locus-test', 'test-model'),
      noTools: 'builtin',
      customTools: [{ name: 'locus_test', label: '测试工具', description: '验证受管工具注册',
        parameters: Type.Object({}),
        execute: async () => ({ content: [{ type: 'text', text: '完成' }], details: {} }) }],
    })
    try {
      expect(session.getActiveToolNames()).toEqual(['locus_test'])
      expect(session.messages).toContainEqual({ role: 'user', content: '恢复的消息', timestamp: 1 })
    } finally {
      session.dispose()
    }
  })
})
