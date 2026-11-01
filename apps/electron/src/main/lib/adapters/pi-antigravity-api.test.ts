import { describe, expect, test } from 'bun:test'
import type { Tool } from '@earendil-works/pi-ai'
import { normalizeContext } from '@earendil-works/pi-ai/utils/transcript'
import {
  buildAntigravityRequest,
  parseAntigravitySseText,
  registerAntigravityApiProvider,
} from './pi-antigravity-api'

type RequestModel = Parameters<typeof buildAntigravityRequest>[0]['model']

function fakeModel(id: string, reasoning = true): RequestModel {
  return {
    id,
    provider: 'proma-google-antigravity-test',
    api: 'google-antigravity',
    baseUrl: 'https://daily-cloudcode-pa.googleapis.com',
    reasoning,
    input: ['text', 'image'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 1_000_000,
    maxTokens: 65_536,
    thinkingLevelMap: { minimal: null, low: 'LOW', medium: 'MEDIUM', high: 'HIGH' },
  } as RequestModel
}

function plainContext() {
  return normalizeContext({ messages: [{ role: 'user', content: 'hi', timestamp: 1 }] })
}

const testTool = {
  name: 'read_file',
  description: 'Read a file',
  parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
} as unknown as Tool

describe('Antigravity 请求信封组装', () => {
  const envelopeBase = {
    requestId: 'agent/conv/123/traj/2',
    userAgent: 'antigravity/hub/2.23.1',
    project: 'proj-9',
  }

  test('Given 纯文本上下文 When 组装 Then 信封含 Gemini contents 且无 requestType', () => {
    const envelope = buildAntigravityRequest({
      model: fakeModel('gemini-3-pro-high'),
      context: plainContext(),
      requestId: envelopeBase.requestId,
      userAgent: envelopeBase.userAgent,
      project: envelopeBase.project,
    })

    expect(envelope.project).toBe('proj-9')
    expect(envelope.model).toBe('gemini-3-pro-high')
    expect(envelope.requestId).toBe(envelopeBase.requestId)
    expect(envelope.userAgent).toBe(envelopeBase.userAgent)
    expect(envelope.requestType).toBeUndefined()
    const request = envelope.request as { contents: unknown[]; generationConfig?: Record<string, unknown> }
    expect(request.contents).toHaveLength(1)
  })

  test('Given 携带工具定义 When 组装 Then 注入 requestType=agent 与 tools', () => {
    const context = normalizeContext({
      messages: [
        { role: 'system', content: 'sys', timestamp: 1, toolsAdded: [testTool] },
        { role: 'user', content: 'hi', timestamp: 2 },
      ],
    })
    const envelope = buildAntigravityRequest({
      model: fakeModel('gemini-3-pro-high'),
      context,
      requestId: envelopeBase.requestId,
      userAgent: envelopeBase.userAgent,
      project: envelopeBase.project,
    })

    expect(envelope.requestType).toBe('agent')
    const request = envelope.request as { tools?: { functionDeclarations: unknown[] }[] }
    expect(request.tools).toBeDefined()
    expect(request.tools?.[0]?.functionDeclarations).toHaveLength(1)
  })

  test('Given 工具调用往返 When 组装 Then 同样注入 requestType=agent', () => {
    const context = normalizeContext({
      messages: [
        { role: 'user', content: 'hi', timestamp: 1 },
        {
          role: 'assistant',
          content: [{ type: 'toolCall', id: 't1', name: 'read_file', arguments: { path: 'a' } }],
          api: 'google-antigravity',
          provider: 'p',
          model: 'm',
          usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
          stopReason: 'toolUse',
          timestamp: 2,
        },
        { role: 'toolResult', toolCallId: 't1', toolName: 'read_file', content: [{ type: 'text', text: 'ok' }], isError: false, timestamp: 3 },
      ],
    })
    const envelope = buildAntigravityRequest({
      model: fakeModel('gemini-3-pro-high'),
      context,
      requestId: envelopeBase.requestId,
      userAgent: envelopeBase.userAgent,
      project: envelopeBase.project,
    })
    expect(envelope.requestType).toBe('agent')
  })
})

describe('Antigravity thinkingConfig 映射', () => {
  const envelopeBase = {
    requestId: 'agent/conv/1/traj/1',
    userAgent: 'antigravity/hub/2.23.1',
    project: 'proj-9',
  }

  test('Given Gemini 3 非档位变体启用思考 When 组装 Then 使用 thinkingLevel', () => {
    const envelope = buildAntigravityRequest({
      model: fakeModel('gemini-3-pro'),
      context: plainContext(),
      thinking: { enabled: true, level: 'HIGH' },
      requestId: envelopeBase.requestId,
      userAgent: envelopeBase.userAgent,
      project: envelopeBase.project,
    })
    const config = (envelope.request as { generationConfig?: { thinkingConfig?: Record<string, unknown> } }).generationConfig?.thinkingConfig
    expect(config?.thinkingLevel).toBe('HIGH')
    expect(config?.includeThoughts).toBe(true)
  })

  test('Given 预置档位变体（-high 后缀）When 组装 Then 不发送 thinkingConfig', () => {
    const envelope = buildAntigravityRequest({
      model: fakeModel('gemini-3-pro-high'),
      context: plainContext(),
      thinking: { enabled: true, level: 'HIGH' },
      requestId: envelopeBase.requestId,
      userAgent: envelopeBase.userAgent,
      project: envelopeBase.project,
    })
    const config = (envelope.request as { generationConfig?: { thinkingConfig?: unknown } }).generationConfig?.thinkingConfig
    expect(config).toBeUndefined()
  })

  test('Given Claude 模型携带预算 When 组装 Then 使用 thinkingBudget', () => {
    const envelope = buildAntigravityRequest({
      model: fakeModel('claude-sonnet-4-5'),
      context: plainContext(),
      thinking: { enabled: true, budgetTokens: 8192 },
      requestId: envelopeBase.requestId,
      userAgent: envelopeBase.userAgent,
      project: envelopeBase.project,
    })
    const config = (envelope.request as { generationConfig?: { thinkingConfig?: Record<string, unknown> } }).generationConfig?.thinkingConfig
    expect(config?.thinkingBudget).toBe(8192)
  })

  test('Given 思考关闭 When 组装 Then 使用禁用配置', () => {
    const envelope = buildAntigravityRequest({
      model: fakeModel('gemini-3-pro'),
      context: plainContext(),
      thinking: { enabled: false },
      requestId: envelopeBase.requestId,
      userAgent: envelopeBase.userAgent,
      project: envelopeBase.project,
    })
    const config = (envelope.request as { generationConfig?: { thinkingConfig?: Record<string, unknown> } }).generationConfig?.thinkingConfig
    expect(config).toBeDefined()
  })
})

describe('Antigravity SSE 解析', () => {
  test('Given data 行与哨兵 When 解析 Then 仅返回合法 JSON chunk', () => {
    const text = [
      'data: {"responseId":"r1","candidates":[{"content":{"parts":[{"text":"he"}]}}]}',
      '',
      'data: [DONE]',
      'event: ping',
      'data: {"broken"',
      'data: {"responseId":"r1","candidates":[{"finishReason":"STOP"}]}',
    ].join('\n')
    const { chunks } = parseAntigravitySseText(text)
    expect(chunks).toHaveLength(2)
    expect(chunks[0]?.candidates?.[0]?.content?.parts?.[0]?.text).toBe('he')
    expect(chunks[1]?.candidates?.[0]?.finishReason).toBe('STOP')
  })

  test('Given 空输入 When 解析 Then 返回空数组', () => {
    expect(parseAntigravitySseText('').chunks).toEqual([])
  })
})

describe('Antigravity API 适配器注册', () => {
  test('Given 重复注册 When 调用两次 Then 不抛错', () => {
    expect(() => {
      registerAntigravityApiProvider()
      registerAntigravityApiProvider()
    }).not.toThrow()
  })
})
