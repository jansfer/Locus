import { describe, expect, test } from 'bun:test'
import type { Channel, ChannelModel, TypedError } from '@proma/shared'
import {
  applyModelUnavailableGuidance,
  detectModelUnavailable,
  getModelUnavailableGuidance,
  resolveModelSwitchTarget,
} from './model-retirement'

function makeModel(id: string, name = id, enabled = true): ChannelModel {
  return { id, name, enabled }
}

function makeChannel(overrides: Partial<Channel> = {}): Channel {
  return {
    id: 'channel-1',
    name: '主渠道',
    provider: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    apiKey: '',
    models: [],
    enabled: true,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

const providerError: TypedError = {
  code: 'provider_error',
  title: '服务繁忙',
  message: 'API 服务当前过载，请稍后再试',
  actions: [{ key: 'r', label: '重试', action: 'retry' }],
  canRetry: true,
}

describe('模型不可用检测', () => {
  test.each([
    ['Anthropic 404', '{"type":"error","error":{"type":"not_found_error","message":"model: claude-opus-4-6"}}'],
    ['OpenAI 404', 'The model `gpt-5.4` does not exist or you do not have access to it.'],
    ['DeepSeek 400', '{"error":{"message":"Model Not Exist","type":"invalid_request_error"}}'],
    ['智谱 1211', '{"error":{"code":"1211","message":"模型不存在"}}'],
    ['Kimi 404', '404 model not found'],
    ['Ark', 'InvalidEndpointOrModel.NotFound: The model or endpoint does not exist'],
  ])('given %s when 解析 then 判定为模型不可用', (_name, message) => {
    expect(detectModelUnavailable({ errorCode: 'provider_error', detailedMessage: message }))
      .toMatchObject({ kind: 'unavailable' })
  })

  test.each([
    'This model has been deprecated and is no longer available.',
    'The selected model is decommissioned.',
    '当前模型已下线，请切换',
    '该模型已停止服务',
  ])('given 明确下线文案 "%s" when 解析 then 标记为 retired', (message) => {
    expect(detectModelUnavailable({ errorCode: 'provider_error', detailedMessage: message }))
      .toMatchObject({ kind: 'retired' })
  })

  test('given 错误码为 model_not_found when 没有文本 then 仍判定为不可用', () => {
    expect(detectModelUnavailable({ errorCode: 'model_not_found' }))
      .toMatchObject({ kind: 'unavailable' })
  })

  test.each([
    '401 {"error":{"message":"invalid api key"}}',
    '429 rate limit exceeded',
    'prompt is too long',
    '400 invalid model parameters: temperature',
    'The model output was empty',
    'read ECONNRESET',
  ])('given 非模型下线错误 "%s" when 解析 then 不误报', (message) => {
    expect(detectModelUnavailable({ errorCode: 'provider_error', detailedMessage: message }))
      .toBeUndefined()
  })
})

describe('替代模型推荐', () => {
  test('given 同家族存在更新版本 when 推荐 then 选择最高版本的基础型号', () => {
    const channel = makeChannel({
      models: [
        makeModel('claude-opus-4-5', 'Claude Opus 4.5'),
        makeModel('claude-opus-4-8', 'Claude Opus 4.8'),
        makeModel('claude-opus-4-8-thinking', 'Claude Opus 4.8 Thinking'),
        makeModel('claude-sonnet-4-6', 'Claude Sonnet 4.6'),
      ],
    })

    expect(resolveModelSwitchTarget([channel], {
      channelId: channel.id,
      modelId: 'claude-opus-4-5',
    })).toMatchObject({
      channelId: channel.id,
      modelId: 'claude-opus-4-8',
      modelName: 'Claude Opus 4.8',
    })
  })

  test('given 新版本有多个档位 when 推荐 then 优先同名档位', () => {
    const channel = makeChannel({
      provider: 'xiaomi',
      models: [
        makeModel('mimo-v2.5-pro', 'MiMo V2.5 Pro'),
        makeModel('mimo-v2.5', 'MiMo V2.5'),
        makeModel('mimo-v2.6-flash', 'MiMo V2.6 Flash'),
        makeModel('mimo-v2.6-pro', 'MiMo V2.6 Pro'),
      ],
    })

    expect(resolveModelSwitchTarget([channel], {
      channelId: channel.id,
      modelId: 'mimo-v2.5-pro',
    })?.modelId).toBe('mimo-v2.6-pro')
  })

  test('given 无法识别家族 when 推荐 then 回退到第一个启用模型', () => {
    const channel = makeChannel({
      provider: 'custom',
      models: [
        makeModel('custom-old', 'Custom Old'),
        makeModel('alpha-model', 'Alpha'),
        makeModel('beta-model', 'Beta'),
      ],
    })

    expect(resolveModelSwitchTarget([channel], {
      channelId: channel.id,
      modelId: 'custom-old',
    })?.modelId).toBe('alpha-model')
  })

  test('given 候选模型被禁用 when 推荐 then 跳过禁用项', () => {
    const channel = makeChannel({
      models: [
        makeModel('claude-opus-4-5', 'Claude Opus 4.5'),
        makeModel('claude-opus-4-8', 'Claude Opus 4.8', false),
        makeModel('claude-sonnet-4-6', 'Claude Sonnet 4.6'),
      ],
    })

    expect(resolveModelSwitchTarget([channel], {
      channelId: channel.id,
      modelId: 'claude-opus-4-5',
    })?.modelId).toBe('claude-sonnet-4-6')
  })

  test('given 当前渠道无候选 when 推荐 then 跨渠道选择并带渠道名', () => {
    const primary = makeChannel({
      id: 'primary',
      name: '主渠道',
      models: [makeModel('claude-opus-4-5', 'Claude Opus 4.5')],
    })
    const secondary = makeChannel({
      id: 'secondary',
      name: '备用渠道',
      models: [makeModel('claude-opus-4-8', 'Claude Opus 4.8')],
    })

    expect(resolveModelSwitchTarget([primary, secondary], {
      channelId: primary.id,
      modelId: 'claude-opus-4-5',
    })).toEqual({
      channelId: 'secondary',
      channelName: '备用渠道',
      modelId: 'claude-opus-4-8',
      modelName: 'Claude Opus 4.8',
    })
  })

  test('given 所有渠道都没有其他可用模型 when 推荐 then 返回 undefined', () => {
    const channel = makeChannel({
      models: [
        makeModel('claude-opus-4-5', 'Claude Opus 4.5'),
        makeModel('claude-opus-4-8', 'Claude Opus 4.8', false),
      ],
    })

    expect(resolveModelSwitchTarget([channel], {
      channelId: channel.id,
      modelId: 'claude-opus-4-5',
    })).toBeUndefined()
  })

  test('given 渠道被禁用 when 推荐 then 不选择该渠道', () => {
    const channel = makeChannel({
      enabled: false,
      models: [makeModel('claude-opus-4-8', 'Claude Opus 4.8')],
    })

    expect(resolveModelSwitchTarget([channel], {
      channelId: 'another',
      modelId: 'claude-opus-4-5',
    })).toBeUndefined()
  })
})

describe('模型下线错误引导', () => {
  const channels = [
    makeChannel({
      id: 'primary',
      name: '主渠道',
      models: [
        makeModel('mimo-v2.5-pro', 'MiMo V2.5 Pro'),
        makeModel('mimo-v2.6-pro', 'MiMo V2.6 Pro'),
      ],
    }),
  ]

  test('given 已下线且有替代 when 构造错误 then 提供一键切换动作', () => {
    const result = applyModelUnavailableGuidance(providerError, {
      errorCode: 'provider_error',
      detailedMessage: '该模型已下线，请切换',
      channels,
      channelId: 'primary',
      modelId: 'mimo-v2.5-pro',
    })

    expect(result.code).toBe('invalid_model')
    expect(result.title).toBe('模型已下线')
    expect(result.canRetry).toBe(false)
    expect(result.message).toContain('MiMo V2.5 Pro')
    expect(result.message).toContain('MiMo V2.6 Pro')
    expect(result.actions[0]).toMatchObject({
      action: 'switch_model',
      label: '切换到 MiMo V2.6 Pro',
      switchModel: {
        channelId: 'primary',
        channelName: '主渠道',
        modelId: 'mimo-v2.6-pro',
        modelName: 'MiMo V2.6 Pro',
      },
    })
    expect(result.actions[1]).toMatchObject({ action: 'select_model' })
  })

  test('given 模型不可用且无替代 when 构造错误 then 引导手动选择或渠道设置', () => {
    const result = applyModelUnavailableGuidance(providerError, {
      errorCode: 'provider_error',
      detailedMessage: 'model not found',
      channels: [makeChannel({ id: 'primary', models: [makeModel('only-model')] })],
      channelId: 'primary',
      modelId: 'only-model',
    })

    expect(result.title).toBe('模型不可用')
    expect(result.actions.map((action) => action.action)).toEqual(['select_model', 'open_channel_settings'])
    expect(result.message).toContain('没有其他可用模型')
  })

  test('given 非模型下线错误 when 构造错误 then 原样返回', () => {
    expect(applyModelUnavailableGuidance(providerError, {
      errorCode: 'provider_error',
      detailedMessage: '429 rate limit exceeded',
      channels,
      channelId: 'primary',
      modelId: 'mimo-v2.5-pro',
    })).toBe(providerError)
  })

  test('given 已下线 when 读取引导 then 文案包含当前模型与推荐模型', () => {
    const guidance = getModelUnavailableGuidance({
      errorCode: 'provider_error',
      detailedMessage: 'This model has been deprecated',
      channels,
      channelId: 'primary',
      modelId: 'mimo-v2.5-pro',
    })

    expect(guidance?.kind).toBe('retired')
    expect(guidance?.target?.modelId).toBe('mimo-v2.6-pro')
    expect(guidance?.message).toBe('当前模型「MiMo V2.5 Pro」已无法使用，建议切换到「MiMo V2.6 Pro」。')
  })
})
