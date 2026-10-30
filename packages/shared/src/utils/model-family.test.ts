import { describe, expect, test } from 'bun:test'
import {
  inferCodexAlignedGPT5ContextWindow,
  inferContextWindow,
} from './context-window'
import {
  getGeminiModelCapability,
  normalizeGeminiThinkingLevel,
} from './gemini-model-capabilities'
import {
  isGpt61Model,
  isGpt6AstraFamily,
  isGpt6LunaFamily,
  isGpt6SolFamily,
  isGpt6TerraFamily,
} from './model-family'
import { resolveReasoningProfile } from '../types/reasoning-profile'

describe('GPT-6 / GPT-6.1 家族识别', () => {
  test('given GPT-6 系列 SKU when 识别 then 归入对应家族', () => {
    expect(isGpt6AstraFamily('gpt-6-astra')).toBe(true)
    expect(isGpt6AstraFamily('gpt-6.1-astra')).toBe(true)
    expect(isGpt6AstraFamily('gpt-6-astra-20260101')).toBe(true)
    expect(isGpt6SolFamily('gpt-6-sol')).toBe(true)
    expect(isGpt6SolFamily('gpt-6.1-sol')).toBe(true)
    expect(isGpt6LunaFamily('gpt-6-luna')).toBe(true)
    expect(isGpt6LunaFamily('gpt-6.1-luna')).toBe(true)
    expect(isGpt6TerraFamily('gpt-6.1-terra')).toBe(true)
  })

  test('given 近似名称 when 识别 then 不误判', () => {
    expect(isGpt6SolFamily('gpt-6.1-terra')).toBe(false)
    expect(isGpt6LunaFamily('gpt-6-sol')).toBe(false)
    expect(isGpt6AstraFamily('gpt-5.6-sol')).toBe(false)
    expect(isGpt61Model('gpt-6-sol')).toBe(false)
    expect(isGpt61Model('gpt-6.1-sol')).toBe(true)
    expect(isGpt61Model('gpt-6.1-terra')).toBe(true)
  })
})

describe('GPT-6.1 上下文窗口', () => {
  test('given GPT-6.1 SKU when 推断 then 使用 500K Codex 对齐窗口', () => {
    for (const model of ['gpt-6.1-terra', 'gpt-6.1-sol', 'gpt-6.1-astra', 'gpt-6.1-luna']) {
      expect(inferCodexAlignedGPT5ContextWindow(model)).toBe(500_000)
    }
  })

  test('given GPT-6 首代 SKU when 推断 then 保持 372K 窗口', () => {
    expect(inferCodexAlignedGPT5ContextWindow('gpt-6-astra')).toBe(372_000)
    expect(inferCodexAlignedGPT5ContextWindow('gpt-6-sol')).toBe(372_000)
    expect(inferCodexAlignedGPT5ContextWindow('gpt-6-luna')).toBe(372_000)
  })

  test('given Kimi K3.1 when 推断 then 命中 1M 规则', () => {
    expect(inferContextWindow('kimi-k3.1-pro')).toBe(1_000_000)
    expect(inferContextWindow('k3.1-pro')).toBe(1_000_000)
  })

  test('given Gemini 4 Argon when 推断 then 使用能力表窗口', () => {
    expect(inferContextWindow('gemini-4-argon')).toBe(1_000_000)
    expect(inferContextWindow('gemini-4-argon-preview')).toBe(1_000_000)
  })
})

describe('Gemini 4 Argon 能力', () => {
  test('given 能力表查询 then 返回 1M 窗口与 32K 输出', () => {
    expect(getGeminiModelCapability('gemini-4-argon')).toEqual({
      contextWindow: 1_000_000,
      maxOutputTokens: 32_768,
      thinkingLevels: ['low', 'medium', 'high'],
      defaultThinkingLevel: 'high',
    })
  })

  test('given 非法 thinking 档位 when 归一化 then 回退到默认 high', () => {
    expect(normalizeGeminiThinkingLevel('gemini-4-argon', 'minimal')).toBe('high')
    expect(normalizeGeminiThinkingLevel('gemini-4-argon', 'high')).toBe('high')
  })
})

describe('新模型 reasoning profile', () => {
  test('given GPT-6.1 Sol/Terra when 解析 then 使用 gpt61 profile', () => {
    for (const model of ['gpt-6.1-sol', 'gpt-6.1-terra']) {
      expect(resolveReasoningProfile({ modelId: model, transport: 'openai-responses' })?.id)
        .toBe('openai-reasoning-gpt61')
    }
  })

  test('given GPT-6.1 不支持 off when 归一化 then 回退到 low 并默认 high', () => {
    const profile = resolveReasoningProfile({ modelId: 'gpt-6.1-terra', transport: 'openai-responses' })
    expect(profile?.normalize('off')).toBe('low')
    expect(profile?.normalize('minimal')).toBe('low')
    expect(profile?.normalize(undefined)).toBe('high')
    expect(profile?.levels).not.toContain('off')
  })

  test('given GPT-6 Sol when 解析 then 仍使用 sol-luna profile', () => {
    expect(resolveReasoningProfile({ modelId: 'gpt-6-sol', transport: 'openai-responses' })?.id)
      .toBe('openai-reasoning-sol-luna')
  })

  test('given Kimi K3.1 Pro when 解析 then 复用 kimi-k3 profile', () => {
    for (const model of ['kimi-k3.1-pro', 'k3.1-pro', 'kimi-k3']) {
      expect(resolveReasoningProfile({ modelId: model, transport: 'anthropic-messages' })?.id)
        .toBe('kimi-k3')
    }
  })
})
