import { describe, expect, test } from 'bun:test'
import type { AntigravityAvailableModel } from './antigravity-api'
import { isAntigravityNoiseModel, selectAntigravityChatModels } from './antigravity-model-catalog'

function catalog(entries: Record<string, AntigravityAvailableModel>): Record<string, AntigravityAvailableModel> {
  return entries
}

describe('Antigravity 目噪声判定', () => {
  test('Given 官方内部任务与 tab 补全条目 When 判定 Then 均为噪声', () => {
    expect(isAntigravityNoiseModel('chat_23310')).toBe(true)
    expect(isAntigravityNoiseModel('chat_20706')).toBe(true)
    expect(isAntigravityNoiseModel('tab_jump_flash_lite_preview')).toBe(true)
    expect(isAntigravityNoiseModel('gemini-3-flash-exp')).toBe(true)
    expect(isAntigravityNoiseModel('gemini-pro-agent')).toBe(true)
    expect(isAntigravityNoiseModel('claude-sonnet-4-6-disabled')).toBe(true)
  })

  test('Given isInternal 标记 When 判定 Then 结构字段优先于 ID 猜测', () => {
    expect(isAntigravityNoiseModel('gemini-4-argon', { isInternal: true })).toBe(true)
    expect(isAntigravityNoiseModel('gemini-4-argon', { isInternal: false })).toBe(false)
  })

  test('Given 非对话模态 When 判定 Then 排除图片与视频模型', () => {
    expect(isAntigravityNoiseModel('gemini-3.1-flash-image')).toBe(true)
    expect(isAntigravityNoiseModel('gemini-3-pro-video')).toBe(true)
  })

  test('Given 常用对话模型 When 判定 Then 不视为噪声', () => {
    expect(isAntigravityNoiseModel('gemini-3.8-flash')).toBe(false)
    expect(isAntigravityNoiseModel('claude-sonnet-5-5')).toBe(false)
    expect(isAntigravityNoiseModel('gpt-oss-120b-medium')).toBe(false)
  })
})

describe('Antigravity 模型目录筛选', () => {
  test('Given 含内部任务与旧版模型的目录 When 筛选 Then 仅保留新版常用模型', () => {
    const result = selectAntigravityChatModels(catalog({
      'gemini-3.8-flash': { displayName: 'Gemini 3.8 Flash', recommended: true },
      'gemini-3.8-flash-high': { displayName: 'Gemini 3.8 Flash (High)' },
      'gemini-3.8-flash-low': { displayName: 'Gemini 3.8 Flash (Low)' },
      'gemini-3.5-flash-lite': { displayName: 'Gemini 3.5 Flash Lite', recommended: true },
      'gemini-2.5-pro': { displayName: 'Gemini 2.5 Pro' },
      'gemini-3-pro-preview': { displayName: 'Gemini 3 Pro Preview' },
      'gemini-4-argon': { displayName: 'Gemini 4 Argon' },
      'claude-sonnet-4-5': { displayName: 'Claude Sonnet 4.5' },
      'claude-opus-5-5': { displayName: 'Claude Opus 5.5' },
      'chat_23310': {},
      'chat_20706': {},
      'tab_jump_flash_lite_preview': {},
    }))

    const ids = result.models.map((model) => model.id)
    expect(ids).not.toContain('chat_23310')
    expect(ids).not.toContain('tab_jump_flash_lite_preview')
    expect(ids).not.toContain('gemini-2.5-pro')
    expect(ids).not.toContain('gemini-3-pro-preview')
    expect(ids).not.toContain('claude-sonnet-4-5')
    // 裸模型存在时，固定档位别名被收敛
    expect(ids).not.toContain('gemini-3.8-flash-high')
    expect(ids).not.toContain('gemini-3.8-flash-low')
    expect(ids).toContain('gemini-3.8-flash')
    expect(ids).toContain('gemini-3.5-flash-lite')
    expect(ids).toContain('gemini-4-argon')
    expect(ids).toContain('claude-opus-5-5')
    // 12 条原始条目 → 保留 4 条
    expect(result.droppedCount).toBe(8)
  })

  test('Given 家族只有固定档位别名 When 筛选 Then 保留别名避免家族消失', () => {
    const result = selectAntigravityChatModels(catalog({
      'gemini-3.8-flash-high': { displayName: 'Gemini 3.8 Flash (High)' },
      'gemini-3.8-flash-medium': { displayName: 'Gemini 3.8 Flash (Medium)' },
    }))
    expect(result.models.map((model) => model.id)).toEqual(['gemini-3.8-flash-high', 'gemini-3.8-flash-medium'])
    expect(result.models).toHaveLength(2)
  })

  test('Given 裸模型缺失但推荐条目被标记 When 筛选 Then 推荐条目豁免版本基线', () => {
    const result = selectAntigravityChatModels(catalog({
      'gemini-3.6-flash': { displayName: 'Gemini 3.6 Flash', recommended: true },
      'gemini-3.6-flash-pro-x': { displayName: 'Gemini 3.6 Flash Pro X' },
    }))
    expect(result.models.map((model) => model.id)).toContain('gemini-3.6-flash')
    expect(result.models.map((model) => model.id)).not.toContain('gemini-3.6-flash-pro-x')
  })

  test('Given 推荐模型 When 筛选 Then 排序靠前且名称保留 displayName', () => {
    const result = selectAntigravityChatModels(catalog({
      'claude-opus-5-5': { displayName: 'Claude Opus 5.5' },
      'gemini-3.8-flash': { displayName: 'Gemini 3.8 Flash', recommended: true },
      'gemini-4-argon': { displayName: 'Gemini 4 Argon' },
    }))
    expect(result.models[0]?.id).toBe('gemini-3.8-flash')
    expect(result.models[0]?.name).toBe('Gemini 3.8 Flash')
    expect(result.models.map((model) => model.id)).toContain('gemini-4-argon')
  })

  test('Given 目录仅有内部条目 When 筛选 Then 返回空列表且计数正确', () => {
    const result = selectAntigravityChatModels(catalog({
      'chat_23310': {},
      'tab_jump_flash_lite_preview': {},
    }))
    expect(result.models).toHaveLength(0)
    expect(result.droppedCount).toBe(2)
  })

  test('Given 目录仅有旧一代模型 When 筛选 Then 回退保留非噪声条目而非空列表', () => {
    const result = selectAntigravityChatModels(catalog({
      'gemini-2.5-pro': { displayName: 'Gemini 2.5 Pro' },
      'claude-sonnet-4-5': { displayName: 'Claude Sonnet 4.5' },
      'chat_23310': {},
    }))
    expect(result.models.map((model) => model.id).sort()).toEqual(['claude-sonnet-4-5', 'gemini-2.5-pro'])
    expect(result.droppedCount).toBe(1)
  })

  test('Given 未知家族条目 When 筛选 Then 不因版本规则误删', () => {
    const result = selectAntigravityChatModels(catalog({
      'custom-model-x': { displayName: 'Custom Model X' },
    }))
    expect(result.models.map((model) => model.id)).toEqual(['custom-model-x'])
  })

  test('Given GPT 家族 When 筛选 Then 仅保留 gpt-oss-120b 系列', () => {
    const result = selectAntigravityChatModels(catalog({
      'gpt-oss-120b-medium': { displayName: 'GPT OSS 120B Medium', recommended: true },
      'gpt-4o-mini': { displayName: 'GPT-4o mini' },
    }))
    expect(result.models.map((model) => model.id)).toEqual(['gpt-oss-120b-medium'])
  })
})
