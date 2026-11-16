import { describe, expect, mock, test } from 'bun:test'

// pi-model-registry 会间接加载主进程模块；测试仅验证纯函数，故隔离 Electron。
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

describe('Antigravity 思考档位能力', () => {
  test('Given 裸 Gemini 3 模型 When 解析能力 Then 提供 low/medium/high 三档', () => {
    const capability = registry.resolveAntigravityReasoningCapability('gemini-3.8-flash')
    expect(capability?.source).toBe('pi-catalog')
    expect(capability?.levels).toEqual(['low', 'medium', 'high'])
    expect(capability?.defaultLevel).toBe('high')
  })

  test('Given 固定档位变体 When 解析能力 Then 不暴露档位选择', () => {
    expect(registry.resolveAntigravityReasoningCapability('gemini-3.8-flash-high')).toBeUndefined()
    expect(registry.resolveAntigravityReasoningCapability('gemini-3-pro-low')).toBeUndefined()
  })

  test('Given Claude 模型 When 解析能力 Then 提供含 off 的预算档位', () => {
    const capability = registry.resolveAntigravityReasoningCapability('claude-opus-5-5')
    expect(capability?.levels).toEqual(['off', 'minimal', 'low', 'medium', 'high'])
    expect(capability?.defaultLevel).toBe('high')
  })
})

describe('Antigravity 模型默认规格', () => {
  test('Given 裸 Gemini 3 模型 When 解析默认 Then 注册 thinkingLevelMap 与 1M 上下文', () => {
    const defaults = registry.resolveAntigravityModelDefaults('gemini-3.8-flash')
    expect(defaults.contextWindow).toBe(1_000_000)
    expect(defaults.thinkingLevelMap).toEqual({ off: null, minimal: null, low: 'LOW', medium: 'MEDIUM', high: 'HIGH' })
  })

  test('Given 固定档位变体 When 解析默认 Then 不注册 thinkingLevelMap', () => {
    const defaults = registry.resolveAntigravityModelDefaults('gemini-3.8-flash-high')
    expect(defaults.thinkingLevelMap).toBeUndefined()
  })

  test('Given Claude 模型 When 解析默认 Then 使用 200K 上下文', () => {
    const defaults = registry.resolveAntigravityModelDefaults('claude-opus-5-5')
    expect(defaults.contextWindow).toBe(200_000)
    expect(defaults.thinkingLevelMap).toBeUndefined()
  })
})
