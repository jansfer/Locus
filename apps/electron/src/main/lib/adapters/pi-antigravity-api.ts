/**
 * Antigravity (Google 订阅) 的 Pi runtime 自定义 API 适配器。
 *
 * Pi SDK 没有内置 antigravity provider；这里通过 pi-ai compat 的
 * registerApiProvider 注册自定义 API `google-antigravity`，把 Pi 的会话上下文
 * 转换为 Gemini wire 格式后包进 Cloud Code v1internal 信封，POST 到
 * `{base}:streamGenerateContent?alt=sse` 并把 SSE chunk 映射回 Pi 事件流。
 *
 * 复用 Pi google-shared 的协议转换（contents / tools / thinking 映射），仅替换
 * 传输层与信封。buildModel 在注册 provider 时通过 headers 注入
 * `x-locus-antigravity-project`（cloudaicompanionProject）与 channelId；
 * access token 经 options.apiKey 传入，401 时按 channelId 串行刷新重试一次。
 */

import type {
  AssistantMessage,
  Model,
  SimpleStreamOptions,
  Tool,
  ToolCall,
  TranscriptContext,
} from '@earendil-works/pi-ai/compat'
import type { AssistantMessageEventStream as PiAssistantMessageEventStream } from '@earendil-works/pi-ai/utils/event-stream'
let calculateCost: typeof import('@earendil-works/pi-ai')['calculateCost']
let clampThinkingLevel: typeof import('@earendil-works/pi-ai')['clampThinkingLevel']
let registerApiProvider: typeof import('@earendil-works/pi-ai/compat')['registerApiProvider']
let AssistantMessageEventStream: typeof import('@earendil-works/pi-ai/utils/event-stream')['AssistantMessageEventStream']
let buildBaseOptions: typeof import('@earendil-works/pi-ai/api/simple-options')['buildBaseOptions']
let thinkingBudgetForLevel: typeof import('@earendil-works/pi-ai/api/simple-options')['thinkingBudgetForLevel']
let convertMessages: typeof import('@earendil-works/pi-ai/api/google-shared')['convertMessages']
let convertTools: typeof import('@earendil-works/pi-ai/api/google-shared')['convertTools']
let getDisabledGoogleThinkingConfig: typeof import('@earendil-works/pi-ai/api/google-shared')['getDisabledGoogleThinkingConfig']
let isThinkingPart: typeof import('@earendil-works/pi-ai/api/google-shared')['isThinkingPart']
let mapStopReasonString: typeof import('@earendil-works/pi-ai/api/google-shared')['mapStopReasonString']
let resolveGoogleFunctionCallingMode: typeof import('@earendil-works/pi-ai/api/google-shared')['resolveGoogleFunctionCallingMode']
let resolveGoogleThinkingLevel: typeof import('@earendil-works/pi-ai/api/google-shared')['resolveGoogleThinkingLevel']
let retainThoughtSignature: typeof import('@earendil-works/pi-ai/api/google-shared')['retainThoughtSignature']
let supportsGoogleStrictToolSampling: typeof import('@earendil-works/pi-ai/api/google-shared')['supportsGoogleStrictToolSampling']
let toGoogleThinkingLevel: typeof import('@earendil-works/pi-ai/api/google-shared')['toGoogleThinkingLevel']
let usesGoogleThinkingLevel: typeof import('@earendil-works/pi-ai/api/google-shared')['usesGoogleThinkingLevel']
let getCurrentTools: typeof import('@earendil-works/pi-ai/utils/transcript')['getCurrentTools']
let getInitialSystemMessage: typeof import('@earendil-works/pi-ai/utils/transcript')['getInitialSystemMessage']
let getSystemMessageText: typeof import('@earendil-works/pi-ai/utils/text')['getSystemMessageText']
let sanitizeSurrogates: typeof import('@earendil-works/pi-ai/utils/sanitize-unicode')['sanitizeSurrogates']
let formatProviderError: typeof import('@earendil-works/pi-ai/utils/error-body')['formatProviderError']
let normalizeProviderError: typeof import('@earendil-works/pi-ai/utils/error-body')['normalizeProviderError']

// 主进程构建为 CJS，Pi 的 ESM 入口必须保留动态 import。
let runtimeLoad: Promise<void> | undefined
function loadAntigravityRuntime(): Promise<void> {
  runtimeLoad ??= (async () => {
    ;({ calculateCost, clampThinkingLevel } = await import('@earendil-works/pi-ai'))
    ;({ registerApiProvider } = await import('@earendil-works/pi-ai/compat'))
    ;({ AssistantMessageEventStream } = await import('@earendil-works/pi-ai/utils/event-stream'))
    ;({ buildBaseOptions, thinkingBudgetForLevel } = await import('@earendil-works/pi-ai/api/simple-options'))
    ;({ convertMessages, convertTools, getDisabledGoogleThinkingConfig, isThinkingPart, mapStopReasonString, resolveGoogleFunctionCallingMode, resolveGoogleThinkingLevel, retainThoughtSignature, supportsGoogleStrictToolSampling, toGoogleThinkingLevel, usesGoogleThinkingLevel } = await import('@earendil-works/pi-ai/api/google-shared'))
    ;({ getCurrentTools, getInitialSystemMessage } = await import('@earendil-works/pi-ai/utils/transcript'))
    ;({ getSystemMessageText } = await import('@earendil-works/pi-ai/utils/text'))
    ;({ sanitizeSurrogates } = await import('@earendil-works/pi-ai/utils/sanitize-unicode'))
    ;({ formatProviderError, normalizeProviderError } = await import('@earendil-works/pi-ai/utils/error-body'))
  })()
  return runtimeLoad
}

import type { AntigravityOAuthCredentials } from '@proma/shared'
import {
  ANTIGRAVITY_V1_INTERNAL_ENDPOINTS,
  buildAntigravityEgressUserAgent,
  buildAntigravityRequestId,
  buildV1InternalEnvelope,
  shouldTryNextAntigravityEndpoint,
  type AntigravityGeminiRequest,
} from '../antigravity-api'
import { refreshAntigravityOAuthCredentialsSerial } from '../antigravity-oauth-credentials'

/** Antigravity 自定义 API 标识；与 provider 注册与模型 catalog 中的 api 字段一致。 */
export const ANTIGRAVITY_PI_API = 'google-antigravity'

/** buildModel 注册 provider 时注入的约定头：projectId 与 channelId。 */
export const ANTIGRAVITY_PROJECT_HEADER = 'x-locus-antigravity-project'
export const ANTIGRAVITY_CHANNEL_HEADER = 'x-locus-antigravity-channel'

type AntigravityModel = Model<typeof ANTIGRAVITY_PI_API>
type AntigravityStreamOptions = SimpleStreamOptions & {
  /** thinking 由 streamSimple 归一化后传入（与 Pi google adapter 的 GoogleOptions 同形）。 */
  thinking?: {
    enabled: boolean
    budgetTokens?: number
    level?: string
  }
}

/** 适配器运行期凭据钩子：由 buildModel 按 channelId 注册，401 时串行刷新。 */
interface AntigravityRuntimeCredentialEntry {
  credentials: AntigravityOAuthCredentials
  refresh: (current: AntigravityOAuthCredentials) => Promise<AntigravityOAuthCredentials>
}

const runtimeCredentialsByChannel = new Map<string, AntigravityRuntimeCredentialEntry>()

/** buildModel 注册 Antigravity 渠道时调用；同一渠道重复注册覆盖旧值。 */
export function setAntigravityRuntimeCredentials(
  channelId: string,
  entry: AntigravityRuntimeCredentialEntry,
): void {
  runtimeCredentialsByChannel.set(channelId, entry)
}

export function clearAntigravityRuntimeCredentials(channelId: string): void {
  runtimeCredentialsByChannel.delete(channelId)
}

// ===== 上游响应（Gemini wire 格式）最小类型 =====

interface GeminiChunkPart {
  text?: string
  thought?: boolean
  thoughtSignature?: string
  functionCall?: { id?: string; name?: string; args?: Record<string, unknown> }
}

interface GeminiStreamChunk {
  responseId?: string
  candidates?: {
    content?: { parts?: GeminiChunkPart[]; role?: string }
    finishReason?: string
  }[]
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
    thoughtsTokenCount?: number
    totalTokenCount?: number
    cachedContentTokenCount?: number
  }
}

// ===== 请求构建 =====

/** 判断模型是否为 Claude 系（走 Anthropic-Vertex 翻译层，需要特定工具与 beta 头）。 */
function isClaudeModelId(modelId: string): boolean {
  return modelId.toLowerCase().includes('claude')
}

/** 判断模型是否为预置思考档位变体（ID 以 -high/-medium/-low 结尾）；此类模型不再叠加 thinkingConfig。 */
function isTieredThinkingVariant(modelId: string): boolean {
  return /-(high|medium|low)$/i.test(modelId)
}

/** contents 中是否包含工具调用往返（functionCall / functionResponse）。 */
function contentsHaveToolInteractions(contents: unknown): boolean {
  if (!Array.isArray(contents)) return false
  return contents.some((content) => {
    if (!content || typeof content !== 'object') return false
    const parts = (content as { parts?: unknown }).parts
    if (!Array.isArray(parts)) return false
    return parts.some((part) => {
      if (!part || typeof part !== 'object') return false
      return 'functionCall' in part || 'functionResponse' in part
    })
  })
}

/**
 * 组装 v1internal 请求信封。
 *
 * - Gemini 3+ 模型用 thinkingLevel；其余（Claude / 2.5）用 thinkingBudget；
 * - 预置档位变体不再叠加 thinkingConfig，避免双份配置互相矛盾；
 * - 携带工具定义或工具交互时注入 requestType: 'agent'。
 */
export function buildAntigravityRequest(input: {
  model: AntigravityModel
  context: TranscriptContext
  thinking?: AntigravityStreamOptions['thinking']
  maxTokens?: number
  temperature?: number
  toolChoice?: SimpleStreamOptions['toolChoice']
  requestId: string
  userAgent: string
  project: string
}): Record<string, unknown> {
  // google-shared 的转换只读取 id / reasoning / thinkingLevelMap，与具体 API 标识无关；
  // 这里复用其 Gemini wire 转换实现。
  const googleModel = input.model as unknown as Model<'google-generative-ai'>
  const contents = convertMessages(googleModel, input.context)
  const initialSystemMessage = getInitialSystemMessage(input.context.messages)
  const currentTools: Tool[] = getCurrentTools(input.context.messages)
  const isClaude = isClaudeModelId(input.model.id)
  const supportsStrictMode = supportsGoogleStrictToolSampling(input.model.id)

  const generationConfig: Record<string, unknown> = {}
  if (input.temperature !== undefined) generationConfig.temperature = input.temperature
  if (input.maxTokens !== undefined) generationConfig.maxOutputTokens = input.maxTokens

  const request: AntigravityGeminiRequest = {
    contents,
    ...(initialSystemMessage && { systemInstruction: { parts: [{ text: sanitizeSurrogates(getSystemMessageText(initialSystemMessage)) }] } }),
    ...(currentTools.length > 0 && {
      // Cloud Code 上游对 Claude 系模型要求 legacy `parameters`（OpenAPI 3.03），
      // 由翻译层转换为 Anthropic input_schema；Gemini 模型用完整 JSON Schema。
      tools: convertTools(currentTools, isClaude, supportsStrictMode),
    }),
  }

  const functionCallingMode = currentTools.length > 0
    ? resolveGoogleFunctionCallingMode(currentTools, input.toolChoice, supportsStrictMode)
    : undefined
  if (functionCallingMode !== undefined) {
    request.toolConfig = { functionCallingConfig: { mode: functionCallingMode } }
  }

  if (input.thinking && !isTieredThinkingVariant(input.model.id)) {
    if (input.thinking.enabled && input.model.reasoning) {
      const thinkingConfig: Record<string, unknown> = { includeThoughts: true }
      if (usesGoogleThinkingLevel(googleModel) && input.thinking.level !== undefined) {
        thinkingConfig.thinkingLevel = input.thinking.level
      } else if (input.thinking.level !== undefined) {
        // Gemini 3 判定不命中（Claude / Gemini 2.5）：Pi 传入的 level 实际是
        // streamSimple 归一化后的档位，这里回退为预算语义。
        thinkingConfig.thinkingBudget = input.thinking.budgetTokens
          ?? thinkingBudgetForLevel(clampThinkingLevelForBudget(googleModel, input.thinking.level))
      } else if (input.thinking.budgetTokens !== undefined) {
        thinkingConfig.thinkingBudget = input.thinking.budgetTokens
      }
      generationConfig.thinkingConfig = thinkingConfig
    } else if (input.model.reasoning) {
      const disabled = getDisabledGoogleThinkingConfig(googleModel)
      generationConfig.thinkingConfig = disabled
    }
  }

  if (Object.keys(generationConfig).length > 0) {
    request.generationConfig = generationConfig
  }

  const hasTools = currentTools.length > 0
  const hasToolInteractions = contentsHaveToolInteractions(contents)
  return buildV1InternalEnvelope({
    project: input.project,
    requestId: input.requestId,
    model: input.model.id,
    request,
    userAgent: input.userAgent,
    ...(hasTools || hasToolInteractions ? { requestType: 'agent' as const } : {}),
  })
}

/**
 * 把 Pi 思考档位字符串归一为预算计算输入。
 *
 * streamSimple 传入的 level 已经是 Google 档位字符串（LOW/MEDIUM/HIGH…），
 * 这里映射回 Pi 级别供 thinkingBudgetForLevel 计算预算。
 */
function clampThinkingLevelForBudget(model: Model<'google-generative-ai'>, level: string): Parameters<typeof thinkingBudgetForLevel>[0] {
  const normalized = level.toLowerCase()
  if (normalized === 'minimal' || normalized === 'low' || normalized === 'medium'
    || normalized === 'high' || normalized === 'xhigh' || normalized === 'max' || normalized === 'off') {
    return clampThinkingLevel(model, normalized) as Parameters<typeof thinkingBudgetForLevel>[0]
  }
  return 'medium'
}

// ===== SSE 解析与事件映射 =====

interface ParsedSseResult {
  chunks: GeminiStreamChunk[]
}

/** 解析 SSE 文本为 Gemini chunk 列表；非 data 行与 [DONE] 哨兵忽略。 */
export function parseAntigravitySseText(text: string): ParsedSseResult {
  const chunks: GeminiStreamChunk[] = []
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line.startsWith('data:')) continue
    const payload = line.slice(5).trim()
    if (!payload || payload === '[DONE]') continue
    try {
      const parsed = JSON.parse(payload) as GeminiStreamChunk & { response?: GeminiStreamChunk }
      const chunk = parsed?.response ?? parsed
      if (chunk && typeof chunk === 'object') chunks.push(chunk)
    } catch {
      // 忽略无法解析的残缺行（网络截断场景由上层整体错误处理兜底）
    }
  }
  return { chunks }
}

/** 从上游错误响应体提取可读信息。 */
function summarizeUpstreamError(bodyText: string, status: number): string {
  try {
    const parsed = JSON.parse(bodyText) as { error?: { message?: string; status?: string } }
    if (parsed.error?.message) {
      return parsed.error.status ? `${parsed.error.status}: ${parsed.error.message}` : parsed.error.message
    }
  } catch {
    // 非 JSON 错误体，按原文摘要
  }
  const trimmed = bodyText.trim()
  return trimmed ? `HTTP ${status}: ${trimmed.slice(0, 200)}` : `HTTP ${status}`
}

/** Antigravity 上游错误（携带 HTTP 状态码，供 401 重试判定）。 */
class AntigravityUpstreamError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'AntigravityUpstreamError'
    this.status = status
  }
}

let toolCallCounter = 0

/**
 * 发起流式请求并映射为 Pi 事件流。
 *
 * 401 时先尝试按 channelId 串行刷新 access token 并重试一次；请求端点按
 * daily → sandbox → prod 降级。事件映射与 Pi google adapter 保持一致。
 */
export function streamAntigravity(
  model: AntigravityModel,
  context: TranscriptContext,
  options?: AntigravityStreamOptions,
): PiAssistantMessageEventStream {
  const stream = new AssistantMessageEventStream()
  void (async () => {
    const output = {
      role: 'assistant',
      content: [],
      api: ANTIGRAVITY_PI_API,
      provider: model.provider,
      model: model.id,
      usage: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: 0,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
      },
      stopReason: 'pending',
      timestamp: Date.now(),
    } as AssistantMessage

    try {
      const accessToken = options?.apiKey
      if (!accessToken) {
        throw new Error(`No API key for provider: ${model.provider}`)
      }
      const projectId = readHeader(options?.headers, ANTIGRAVITY_PROJECT_HEADER)
      if (!projectId) {
        throw new Error('Antigravity 渠道缺少项目信息（projectId），请重新登录该渠道')
      }
      const channelId = readHeader(options?.headers, ANTIGRAVITY_CHANNEL_HEADER)

      const send = async (): Promise<Response> => requestUpstream(model, context, options, accessToken, projectId)
      let response = await send()
      if (response.status === 401 && channelId) {
        const refreshedToken = await refreshRuntimeAccessToken(channelId)
        if (refreshedToken) {
          response = await requestUpstream(model, context, options, refreshedToken, projectId)
        }
      }
      if (!response.ok) {
        const bodyText = await response.text().catch(() => '')
        throw new AntigravityUpstreamError(response.status, summarizeUpstreamError(bodyText, response.status))
      }
      if (!response.body) {
        throw new Error('Antigravity 上游返回空响应流')
      }

      stream.push({ type: 'start', partial: output })
      let currentBlock: { type: 'text', text: string, textSignature?: string } | { type: 'thinking', thinking: string, thinkingSignature?: string } | null = null
      const blocks = output.content
      const blockIndex = (): number => blocks.length - 1

      const decoder = new TextDecoder()
      let buffered = ''
      const reader = response.body.getReader()
      let streamErrored = false

      const handleChunk = (chunk: GeminiStreamChunk): void => {
        output.responseId ||= chunk.responseId
        const candidate = chunk.candidates?.[0]
        const parts = candidate?.content?.parts
        if (parts) {
          for (const part of parts) {
            if (part.text !== undefined) {
              const isThinking = isThinkingPart(part)
              if (!currentBlock
                || (isThinking && currentBlock.type !== 'thinking')
                || (!isThinking && currentBlock.type !== 'text')) {
                if (currentBlock?.type === 'text') {
                  stream.push({ type: 'text_end', contentIndex: blockIndex(), content: currentBlock.text, partial: output })
                } else if (currentBlock?.type === 'thinking') {
                  stream.push({ type: 'thinking_end', contentIndex: blockIndex(), content: currentBlock.thinking, partial: output })
                }
                if (isThinking) {
                  currentBlock = { type: 'thinking', thinking: '', thinkingSignature: undefined }
                  output.content.push(currentBlock)
                  stream.push({ type: 'thinking_start', contentIndex: blockIndex(), partial: output })
                } else {
                  currentBlock = { type: 'text', text: '' }
                  output.content.push(currentBlock)
                  stream.push({ type: 'text_start', contentIndex: blockIndex(), partial: output })
                }
              }
              if (currentBlock.type === 'thinking') {
                currentBlock.thinking += part.text
                currentBlock.thinkingSignature = retainThoughtSignature(currentBlock.thinkingSignature, part.thoughtSignature)
                stream.push({ type: 'thinking_delta', contentIndex: blockIndex(), delta: part.text, partial: output })
              } else {
                currentBlock.text += part.text
                currentBlock.textSignature = retainThoughtSignature(currentBlock.textSignature, part.thoughtSignature)
                stream.push({ type: 'text_delta', contentIndex: blockIndex(), delta: part.text, partial: output })
              }
            }
            if (part.functionCall) {
              if (currentBlock) {
                if (currentBlock.type === 'text') {
                  stream.push({ type: 'text_end', contentIndex: blockIndex(), content: currentBlock.text, partial: output })
                } else {
                  stream.push({ type: 'thinking_end', contentIndex: blockIndex(), content: currentBlock.thinking, partial: output })
                }
                currentBlock = null
              }
              const providedId = part.functionCall.id
              const needsNewId = !providedId || output.content.some((b) => b.type === 'toolCall' && b.id === providedId)
              const toolCallId = needsNewId
                ? `${part.functionCall.name ?? 'tool'}_${Date.now()}_${++toolCallCounter}`
                : providedId
              // 上游 args 来自不可信 JSON；结构与 Pi ToolCall 兼容，这里收窄到 JsonObject。
              const toolCall: ToolCall = {
                type: 'toolCall',
                id: toolCallId,
                name: part.functionCall.name ?? '',
                arguments: (part.functionCall.args ?? {}) as ToolCall['arguments'],
                ...(part.thoughtSignature ? { thoughtSignature: part.thoughtSignature } : {}),
              }
              output.content.push(toolCall)
              stream.push({ type: 'toolcall_start', contentIndex: blockIndex(), partial: output })
              stream.push({ type: 'toolcall_delta', contentIndex: blockIndex(), delta: JSON.stringify(toolCall.arguments), partial: output })
              stream.push({ type: 'toolcall_end', contentIndex: blockIndex(), toolCall, partial: output })
            }
          }
        }
        if (candidate?.finishReason) {
          output.rawStopReason = candidate.finishReason
          output.stopReason = mapStopReasonString(candidate.finishReason)
          if (output.content.some((b) => b.type === 'toolCall') && output.stopReason === 'stop') {
            output.stopReason = 'toolUse'
          }
        }
        if (chunk.usageMetadata) {
          const usage = {
            input: Math.max(0, (chunk.usageMetadata.promptTokenCount ?? 0) - (chunk.usageMetadata.cachedContentTokenCount ?? 0)),
            output: (chunk.usageMetadata.candidatesTokenCount ?? 0) + (chunk.usageMetadata.thoughtsTokenCount ?? 0),
            cacheRead: chunk.usageMetadata.cachedContentTokenCount ?? 0,
            cacheWrite: 0,
            reasoning: chunk.usageMetadata.thoughtsTokenCount ?? 0,
            totalTokens: chunk.usageMetadata.totalTokenCount ?? 0,
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
          }
          output.usage = { ...usage, cost: calculateCost(model, usage) }
        }
      }

      try {
        for (; ;) {
          const { done, value } = await reader.read()
          if (done) break
          buffered += decoder.decode(value, { stream: true })
          const lines = buffered.split('\n')
          buffered = lines.pop() ?? ''
          const { chunks } = parseAntigravitySseText(lines.join('\n'))
          for (const chunk of chunks) {
            handleChunk(chunk)
          }
        }
        buffered += decoder.decode()
        const { chunks } = parseAntigravitySseText(buffered)
        for (const chunk of chunks) {
          handleChunk(chunk)
        }
      } catch (readError) {
        streamErrored = true
        throw readError
      } finally {
        reader.releaseLock()
      }
      void streamErrored

      // currentBlock 仅在 handleChunk 闭包内赋值，TS 的 CFA 在外层读到的仍是初始 null；
      // 闭包内读取则使用声明联合类型，因此把收尾逻辑封装为函数调用。
      const emitFinalBlockEnd = (): void => {
        if (currentBlock) {
          if (currentBlock.type === 'text') {
            stream.push({ type: 'text_end', contentIndex: blockIndex(), content: currentBlock.text, partial: output })
          } else {
            stream.push({ type: 'thinking_end', contentIndex: blockIndex(), content: currentBlock.thinking, partial: output })
          }
        }
      }
      emitFinalBlockEnd()

      if (options?.signal?.aborted) {
        throw new Error('Request was aborted')
      }
      if (output.stopReason === 'pending') {
        throw new Error('Antigravity stream ended without a finish reason')
      }
      if (output.stopReason === 'aborted' || output.stopReason === 'error') {
        throw new Error(output.rawStopReason ? `Provider stopped with: ${output.rawStopReason}` : 'An unknown error occurred')
      }
      stream.push({ type: 'done', reason: output.stopReason, message: output })
      stream.end()
    } catch (error) {
      output.stopReason = options?.signal?.aborted ? 'aborted' : 'error'
      output.errorMessage = formatProviderError(normalizeProviderError(error))
      stream.push({ type: 'error', reason: output.stopReason, error: output })
      stream.end()
    }
  })()
  return stream
}

/** streamSimple：按 Pi 档位归一化 thinking 后委托 stream。 */
export const streamAntigravitySimple = (
  model: AntigravityModel,
  context: TranscriptContext,
  options?: SimpleStreamOptions,
): PiAssistantMessageEventStream => {
  const apiKey = options?.apiKey
  if (!apiKey) {
    throw new Error(`No API key for provider: ${model.provider}`)
  }
  const base = {
    ...buildBaseOptions(model, context, options, apiKey),
    toolChoice: options?.toolChoice,
  }
  if (!options?.reasoning) {
    return streamAntigravity(model, context, { ...base, thinking: { enabled: false } })
  }
  const googleModel = model as unknown as Model<'google-generative-ai'>
  const clampedReasoning = clampThinkingLevel(googleModel, options.reasoning)
  if (clampedReasoning === 'off') {
    return streamAntigravity(model, context, { ...base, thinking: { enabled: false } })
  }
  const resolvedLevel = resolveGoogleThinkingLevel(googleModel, clampedReasoning)
  if (usesGoogleThinkingLevel(googleModel)) {
    return streamAntigravity(model, context, {
      ...base,
      thinking: { enabled: true, level: toGoogleThinkingLevel(resolvedLevel) },
    })
  }
  return streamAntigravity(model, context, {
    ...base,
    thinking: {
      enabled: true,
      budgetTokens: thinkingBudgetForLevel(clampedReasoning, options.thinkingBudgets),
    },
  })
}

// ===== 传输与注册 =====

function readHeader(headers: unknown, name: string): string | undefined {
  if (!headers || typeof headers !== 'object') return undefined
  const value = (headers as Record<string, unknown>)[name]
  return typeof value === 'string' && value ? value : undefined
}

/** 401 时按 channelId 串行刷新 access token；失败返回 undefined 走原 401 报错。 */
async function refreshRuntimeAccessToken(channelId: string): Promise<string | undefined> {
  const entry = runtimeCredentialsByChannel.get(channelId)
  if (!entry) return undefined
  try {
    const refreshed = await refreshAntigravityOAuthCredentialsSerial(
      channelId,
      entry.credentials,
      (current) => entry.refresh(current),
    )
    return refreshed.access
  } catch (error) {
    console.warn('[Antigravity] 流式请求 401 后刷新凭据失败:', error)
    return undefined
  }
}

async function requestUpstream(
  model: AntigravityModel,
  context: TranscriptContext,
  options: AntigravityStreamOptions | undefined,
  accessToken: string,
  projectId: string,
): Promise<Response> {
  const isClaude = isClaudeModelId(model.id)
  const userAgent = buildAntigravityEgressUserAgent()
  const requestId = buildAntigravityRequestId(options?.sessionId ?? model.provider, context.messages.length)
  const envelope = buildAntigravityRequest({
    model,
    context,
    thinking: options?.thinking,
    maxTokens: options?.maxTokens,
    temperature: options?.temperature,
    toolChoice: options?.toolChoice,
    requestId,
    userAgent,
    project: projectId,
  })
  const bodyText = JSON.stringify(envelope)

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'User-Agent': userAgent,
  }
  if (isClaude) {
    headers['anthropic-beta'] = 'claude-code-20250219'
  }
  if (options?.sessionId) {
    headers['x-session-id'] = options.sessionId
  }

  let lastError: Error | undefined
  for (const base of ANTIGRAVITY_V1_INTERNAL_ENDPOINTS) {
    try {
      const response = await fetch(`${base}:streamGenerateContent?alt=sse`, {
        method: 'POST',
        headers,
        body: bodyText,
        signal: options?.signal,
      })
      // sandbox 集群对非美区 IP 返回 400 FAILED_PRECONDITION，需要降级下一个端点；
      // 其余状态直接返回给上层按 HTTP 语义处理（401 刷新 / 非 2xx 报错）。
      if (response.status === 400 && base.includes('sandbox')) {
        lastError = new AntigravityUpstreamError(response.status, await response.text().catch(() => `HTTP ${response.status}`))
        continue
      }
      return response
    } catch (error) {
      if (options?.signal?.aborted) throw error
      lastError = error instanceof Error ? error : new Error(String(error))
    }
  }
  throw lastError ?? new Error('Antigravity 上游端点均不可用')
}

let apiProviderRegistered = false

/** 幂等注册自定义 API 适配器；重复调用不会产生副作用。 */
export async function registerAntigravityApiProvider(): Promise<void> {
  await loadAntigravityRuntime()
  if (apiProviderRegistered) return
  registerApiProvider({
    api: ANTIGRAVITY_PI_API,
    stream: (model, context, options) => streamAntigravity(
      model as AntigravityModel,
      context,
      options as AntigravityStreamOptions | undefined,
    ),
    streamSimple: (model, context, options) => streamAntigravitySimple(
      model as AntigravityModel,
      context,
      options as SimpleStreamOptions | undefined,
    ),
  })
  apiProviderRegistered = true
}
