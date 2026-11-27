import { describe, expect, mock, test } from 'bun:test'

// listCodexModels 会加载 Pi SDK 与主进程模块；Electron API 用最小替身隔离。
mock.module('electron', () => ({
  app: { isPackaged: true, getPath: () => '/tmp' },
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: (value: string) => Buffer.from(value),
    decryptString: (value: Buffer) => value.toString('utf-8'),
  },
  shell: { openExternal: async () => undefined },
}))

const registry = await import('./pi-model-registry')

const fakeCredentials = { access: 'fake-access', refresh: 'fake-refresh', expires: Date.now() + 600_000 }

describe('ChatGPT (Codex) 模型列表', () => {
  test('Given 本地补丁层声明的新模型 When 列出模型 Then 包含 GPT-6.1 Terra / Sol', async () => {
    const models = await registry.listCodexModels(fakeCredentials)
    const ids = models.map((model) => model.id)
    // Pi 内置目录尚未收录这两个型号，列表必须与 buildCodexModel 的补丁合并结果一致。
    expect(ids).toContain('gpt-6.1-terra')
    expect(ids).toContain('gpt-6.1-sol')
    expect(models.find((model) => model.id === 'gpt-6.1-terra')?.name).toBe('GPT-6.1 Terra')
  })

  test('Given Pi 1.6.1 已收录 GPT-6.2 When 列出模型 Then Astra / Sol 都带本地显示名', async () => {
    const models = await registry.listCodexModels(fakeCredentials)
    expect(models.find((model) => model.id === 'gpt-6.2-astra')?.name).toBe('GPT-6.2 Astra')
    expect(models.find((model) => model.id === 'gpt-6.2-sol')?.name).toBe('GPT-6.2 Sol')
  })

  test('Given 已下线的 Codex 模型 When 列出模型 Then 不再出现', async () => {
    const ids = (await registry.listCodexModels(fakeCredentials)).map((model) => model.id)
    expect(ids).not.toContain('gpt-5.3-codex-spark')
    expect(ids.filter((id) => id.startsWith('gpt-5.4') || id.startsWith('gpt-5.5'))).toEqual([])
  })
})

describe('Codex Astra 家族 SKU 补全', () => {
  test('Given 带日期后缀的 GPT-6.2 Astra When 补全 Then 沿用 6.2 基线窗口', async () => {
    const catalog = await registry.getCodexCatalogModels()
    const model = registry.createCodexAstraFamilyModel(catalog, 'gpt-6.2-astra-20261001')
    expect(model?.id).toBe('gpt-6.2-astra-20261001')
    // 6.2 Astra 为 272K；若错误地套用首代基线会变成 372K。
    expect(model?.contextWindow).toBe(272_000)
  })

  test('Given 带日期后缀的 GPT-6.1 Astra When 补全 Then 沿用 6.1 基线窗口', async () => {
    const catalog = await registry.getCodexCatalogModels()
    const model = registry.createCodexAstraFamilyModel(catalog, 'gpt-6.1-astra-20260901')
    expect(model?.contextWindow).toBe(500_000)
  })

  test('Given 非 Astra 型号 When 补全 Then 不生成模型', async () => {
    const catalog = await registry.getCodexCatalogModels()
    expect(registry.createCodexAstraFamilyModel(catalog, 'gpt-6.2-sol')).toBeUndefined()
  })
})
