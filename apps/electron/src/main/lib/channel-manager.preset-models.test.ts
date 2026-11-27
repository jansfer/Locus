import { describe, expect, mock, test } from 'bun:test'
import type { ChannelsConfig } from '@proma/shared'

// 渠道迁移只读取配置对象；Electron API 用最小替身隔离模块加载。
mock.module('electron', () => ({
  app: { isPackaged: true, getPath: () => '/tmp' },
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: (value: string) => Buffer.from(value),
    decryptString: (value: Buffer) => value.toString('utf-8'),
  },
  shell: { openExternal: async () => undefined },
}))

const { applyPresetModelCandidateUpdates } = await import('./channel-manager')

function codexConfig(models: ChannelsConfig['channels'][number]['models'], applied: string[] = []): ChannelsConfig {
  return {
    version: 7,
    channels: [{
      id: 'channel-1',
      name: 'ChatGPT (Codex)',
      provider: 'openai-codex',
      baseUrl: 'https://chatgpt.com/backend-api',
      apiKey: 'credentials',
      models,
      enabled: true,
      createdAt: 1,
      updatedAt: 1,
    }],
    appliedPresetModelUpdates: applied,
  }
}

describe('渠道预设候选迁移', () => {
  test('Given 存量 Codex 渠道 When 应用迁移 Then 补入 GPT-6.2 Astra / Sol', () => {
    const { config, changed } = applyPresetModelCandidateUpdates(codexConfig([
      { id: 'gpt-6-sol', name: 'GPT-6 Sol', enabled: true },
    ]))

    expect(changed).toBe(true)
    const ids = config.channels[0]!.models.map((model) => model.id)
    expect(ids).toContain('gpt-6.2-astra')
    expect(ids).toContain('gpt-6.2-sol')
  })

  test('Given 渠道已含同 ID 但大小写不同 When 应用迁移 Then 不重复添加', () => {
    const { config } = applyPresetModelCandidateUpdates(codexConfig([
      { id: ' GPT-6.2-Astra ', name: '自定义名称', enabled: false },
    ]))

    const matches = config.channels[0]!.models.filter((model) => model.id.trim().toLowerCase() === 'gpt-6.2-astra')
    expect(matches).toHaveLength(1)
    expect(matches[0]!.name).toBe('自定义名称')
    expect(matches[0]!.enabled).toBe(false)
  })

  test('Given 迁移已执行过 When 再次应用 Then 不产生变更', () => {
    const first = applyPresetModelCandidateUpdates(codexConfig([]))
    const second = applyPresetModelCandidateUpdates(first.config)

    expect(second.changed).toBe(false)
    expect(second.config).toBe(first.config)
  })

  test('Given 非 Codex 渠道 When 应用迁移 Then 不注入 GPT-6.2 候选', () => {
    const config: ChannelsConfig = {
      version: 7,
      channels: [{
        id: 'channel-2',
        name: 'DeepSeek',
        provider: 'deepseek',
        baseUrl: 'https://api.deepseek.com',
        apiKey: 'key',
        models: [{ id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', enabled: true }],
        enabled: true,
        createdAt: 1,
        updatedAt: 1,
      }],
    }

    const { config: migrated } = applyPresetModelCandidateUpdates(config)
    const ids = migrated.channels[0]!.models.map((model) => model.id)
    expect(ids).toContain('deepseek-v4-pro')
    expect(ids).not.toContain('gpt-6.2-astra')
    expect(ids).not.toContain('gpt-6.2-sol')
  })
})
