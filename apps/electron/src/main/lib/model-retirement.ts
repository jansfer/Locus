/**
 * 模型下线检测与替代推荐。
 *
 * Pi runtime 会把各厂商的「模型不存在 / 已下线」错误统一标成 provider_error，
 * 直接复用现有映射会显示成「服务繁忙」并给出无意义的重试按钮。这里负责：
 * 1. 从上游错误文本中识别模型不可用；
 * 2. 从当前渠道（必要时跨渠道）挑选最新的可用替代模型；
 * 3. 生成带「切换到 X」动作的 TypedError。
 *
 * 纯函数、无 Electron 依赖，便于单测。
 */

import type {
  Channel,
  ChannelModel,
  ModelSwitchTarget,
  RecoveryAction,
  TypedError,
} from '@proma/shared'

export type ModelUnavailableKind = 'retired' | 'unavailable'

export interface ModelUnavailableDetection {
  kind: ModelUnavailableKind
  /** 命中的上游错误摘要，用于诊断详情 */
  evidence: string
}

export interface ModelUnavailableInput {
  errorCode?: string
  detailedMessage?: string
  originalError?: string
  channels: readonly Channel[]
  channelId: string
  modelId: string
}

export interface ModelUnavailableGuidance {
  kind: ModelUnavailableKind
  currentModelName: string
  target?: ModelSwitchTarget
  message: string
  evidence: string
}

/** 明确表示「已下线」的文案；优先级高于普通 model not found。 */
const RETIRED_PATTERNS: readonly RegExp[] = [
  /\b(deprecated|decommissioned|retired|sunset|discontinued)\b/i,
  /\bno longer (?:supported|available|offered)\b/i,
  /(已下线|停止服务|已停止支持|不再支持|已废弃|已停用|已移除)/,
]

/** 表示模型不存在/不可用的文案；要求上下文明确指向 model。 */
const MODEL_NOT_FOUND_PATTERNS: readonly RegExp[] = [
  /\bmodel[_\s-]?not[_\s-]?found\b/i,
  /\bmodels?\b[^\n]{0,120}\b(?:does not exist|doesn't exist|not exist|is not found|not found|no longer exists)\b/i,
  /(?:模型|model)[^\n]{0,40}(?:不存在|不可用|已下线|未找到)/i,
  /InvalidEndpointOrModel\.NotFound/i,
  /not_found_error[^\n]{0,200}models?/i,
  /models?[^\n]{0,200}not_found_error/i,
]

/** 识别模型不可用；无法确认时返回 undefined，保持原有错误映射。 */
export function detectModelUnavailable(
  input: Pick<ModelUnavailableInput, 'errorCode' | 'detailedMessage' | 'originalError'>,
): ModelUnavailableDetection | undefined {
  const messages = [input.detailedMessage, input.originalError]
    .filter((message): message is string => typeof message === 'string' && message.trim().length > 0)
  const combined = messages.join('\n')
  const evidence = summarizeEvidence(combined)
  const errorCode = input.errorCode?.toLowerCase()

  if (messages.length > 0) {
    for (const pattern of RETIRED_PATTERNS) {
      if (pattern.test(combined)) return { kind: 'retired', evidence }
    }
  }

  if (errorCode === 'model_not_found' || errorCode === 'invalid_model') {
    return { kind: 'unavailable', evidence }
  }
  if (messages.length === 0) return undefined

  for (const pattern of MODEL_NOT_FOUND_PATTERNS) {
    if (pattern.test(combined)) return { kind: 'unavailable', evidence }
  }

  return undefined
}

function summarizeEvidence(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  return normalized.length > 300 ? `${normalized.slice(0, 300)}…` : normalized
}

// ============================================================================
// 模型家族 / 版本 / 档位解析
// ============================================================================

const CLAUDE_TIERS = ['opus', 'sonnet', 'haiku', 'fable'] as const

/** 已知模型家族根；用于把 deepseek-v4-pro 与 deepseek-v4-flash 归为同一家族。 */
const FAMILY_ROOTS = [
  'deepseek',
  'minimax',
  'gemini',
  'baichuan',
  'internlm',
  'hunyuan',
  'mistral',
  'doubao',
  'qwen',
  'ernie',
  'kimi',
  'mimo',
  'grok',
  'step',
  'spark',
  'phi',
  'gpt',
  'glm',
  'yi',
  'llama',
  'command',
  'o1',
  'o3',
  'o4',
] as const

const TIER_TOKENS = new Set([
  'pro',
  'flash',
  'flashx',
  'max',
  'mini',
  'plus',
  'ultra',
  'ultraspeed',
  'sol',
  'terra',
  'luna',
  'astra',
  'opus',
  'sonnet',
  'haiku',
  'fable',
  'preview',
  'exp',
  'vision',
  'codex',
  'spark',
  'thinking',
])

function normalizeModelId(modelId: string): string {
  return modelId
    .trim()
    .toLowerCase()
    .replace(/\[[^\]]*\]$/g, '')
    .replace(/-\d{8}$/g, '')
    .replace(/-latest$/g, '')
}

/** 解析模型家族；未知模型退回首段字母，至少让同前缀模型可以互相比较。 */
export function getModelFamilyKey(modelId: string | undefined): string | undefined {
  if (!modelId) return undefined
  const id = normalizeModelId(modelId)
  if (!id) return undefined

  if (id.startsWith('claude')) {
    const tier = CLAUDE_TIERS.find((candidate) => id.includes(`-${candidate}`) || id.startsWith(`${candidate}-`))
    return tier ? `claude-${tier}` : 'claude'
  }

  for (const root of FAMILY_ROOTS) {
    if (id === root) return root
    if (id.startsWith(`${root}-`) || id.startsWith(`${root}.`) || id.startsWith(`${root}_`)) return root
    // qwen3.8 / gpt5 这类家族与版本直接相连的写法
    if (root.length > 1 && id.startsWith(root) && /^[.\d]/.test(id.slice(root.length))) return root
  }

  return id.match(/^[a-z][a-z0-9]*/)?.[0]
}

/** 提取版本号数字序列；忽略日期与 32k/128k 这类容量后缀。 */
export function getModelVersion(modelId: string | undefined): number[] {
  if (!modelId) return []
  const normalized = normalizeModelId(modelId)
  const version: number[] = []

  for (const match of normalized.matchAll(/(\d+(?:\.\d+)*)([a-z])?/g)) {
    const value = match[1]!
    const suffix = match[2]
    if (suffix === 'k' || suffix === 'm' || suffix === 'b') continue
    if (/^\d{8}$/.test(value)) continue
    for (const segment of value.split('.')) version.push(Number(segment))
  }

  return version
}

function getTierTokens(modelId: string): Set<string> {
  return new Set(
    normalizeModelId(modelId)
      .split(/[^a-z0-9]+/)
      .filter((token) => TIER_TOKENS.has(token)),
  )
}

function countTierOverlap(current: Set<string>, candidate: Set<string>): number {
  let overlap = 0
  for (const token of current) {
    if (candidate.has(token)) overlap += 1
  }
  return overlap
}

/** 家族后的描述词数量；更少表示越接近基础型号，用于同版本同档位时的兜底排序。 */
function countDescriptorTokens(modelId: string): number {
  const normalized = normalizeModelId(modelId)
  const family = getModelFamilyKey(modelId)
  const remainder = family && normalized.startsWith(family)
    ? normalized.slice(family.length)
    : normalized
  return remainder
    .split(/[^a-z]+/)
    .filter(Boolean)
    .filter((token) => token !== 'k' && token !== 'm' && token !== 'b')
    .length
}

function compareVersions(a: number[], b: number[]): number {
  const length = Math.max(a.length, b.length)
  for (let index = 0; index < length; index++) {
    const left = a[index] ?? 0
    const right = b[index] ?? 0
    if (left !== right) return left - right
  }
  return 0
}

// ============================================================================
// 替代模型推荐
// ============================================================================

/** 在单个渠道内挑选最合适的替代模型。 */
function pickBestModel(channel: Channel, currentModelId: string): ChannelModel | undefined {
  const candidates = channel.models
    .map((model, index) => ({ model, index }))
    .filter(({ model }) => model.enabled && model.id !== currentModelId)
  if (candidates.length === 0) return undefined

  const currentFamily = getModelFamilyKey(currentModelId)
  const currentTiers = getTierTokens(currentModelId)

  const ranked = [...candidates].sort((a, b) => {
    const aSameFamily = currentFamily !== undefined && getModelFamilyKey(a.model.id) === currentFamily
    const bSameFamily = currentFamily !== undefined && getModelFamilyKey(b.model.id) === currentFamily

    if (aSameFamily !== bSameFamily) return aSameFamily ? -1 : 1
    if (aSameFamily) {
      const versionDiff = compareVersions(getModelVersion(b.model.id), getModelVersion(a.model.id))
      if (versionDiff !== 0) return versionDiff

      const tierDiff = countTierOverlap(currentTiers, getTierTokens(b.model.id))
        - countTierOverlap(currentTiers, getTierTokens(a.model.id))
      if (tierDiff !== 0) return tierDiff

      const descriptorDiff = countDescriptorTokens(a.model.id) - countDescriptorTokens(b.model.id)
      if (descriptorDiff !== 0) return descriptorDiff
    }

    return a.index - b.index
  })

  return ranked[0]?.model
}

/**
 * 解析替代模型：当前渠道优先，其次同 provider 渠道，最后其他渠道。
 * 渠道内按同家族、版本降序、同档位、基础型号优先排序。
 */
export function resolveModelSwitchTarget(
  channels: readonly Channel[],
  current: { channelId: string; modelId: string },
): ModelSwitchTarget | undefined {
  const enabledChannels = channels.filter((channel) => channel.enabled)
  const currentChannel = enabledChannels.find((channel) => channel.id === current.channelId)
  const sameProviderChannels = currentChannel
    ? enabledChannels.filter((channel) => channel.id !== current.channelId && channel.provider === currentChannel.provider)
    : []
  const otherChannels = enabledChannels.filter(
    (channel) => channel.id !== current.channelId && !sameProviderChannels.includes(channel),
  )

  const orderedChannels = [
    ...(currentChannel ? [currentChannel] : []),
    ...sameProviderChannels,
    ...otherChannels,
  ]

  for (const channel of orderedChannels) {
    const model = pickBestModel(channel, current.modelId)
    if (!model) continue
    return {
      channelId: channel.id,
      channelName: channel.name,
      modelId: model.id,
      modelName: model.name,
    }
  }

  return undefined
}

// ============================================================================
// 错误引导
// ============================================================================

function buildGuidanceMessage(
  currentModelName: string,
  target: ModelSwitchTarget | undefined,
  currentChannelId: string,
): string {
  if (!target) {
    return `当前模型「${currentModelName}」已无法使用，当前没有其他可用模型，请手动选择或添加模型。`
  }
  const targetLabel = target.channelId === currentChannelId
    ? target.modelName
    : `${target.channelName} · ${target.modelName}`
  return `当前模型「${currentModelName}」已无法使用，建议切换到「${targetLabel}」。`
}

export function getModelUnavailableGuidance(
  input: ModelUnavailableInput,
): ModelUnavailableGuidance | undefined {
  const detection = detectModelUnavailable(input)
  if (!detection) return undefined

  const currentChannel = input.channels.find((channel) => channel.id === input.channelId)
  const currentModel = currentChannel?.models.find((model) => model.id === input.modelId)
  const currentModelName = currentModel?.name ?? input.modelId
  const target = input.modelId
    ? resolveModelSwitchTarget(input.channels, { channelId: input.channelId, modelId: input.modelId })
    : undefined

  return {
    kind: detection.kind,
    currentModelName,
    target,
    message: buildGuidanceMessage(currentModelName, target, input.channelId),
    evidence: detection.evidence,
  }
}

/** 把模型不可用错误替换为带切换动作的 TypedError；未命中时原样返回。 */
export function applyModelUnavailableGuidance(
  typedError: TypedError,
  input: ModelUnavailableInput,
): TypedError {
  const guidance = getModelUnavailableGuidance(input)
  if (!guidance) return typedError

  const actions: RecoveryAction[] = guidance.target
    ? [
        {
          key: 'm',
          label: `切换到 ${guidance.target.modelName}`,
          action: 'switch_model',
          switchModel: guidance.target,
        },
        { key: 's', label: '选择其他模型', action: 'select_model' },
      ]
    : [
        { key: 'm', label: '重新选择模型', action: 'select_model' },
        { key: 's', label: '渠道设置', action: 'open_channel_settings' },
      ]

  return {
    code: 'invalid_model',
    title: guidance.kind === 'retired' ? '模型已下线' : '模型不可用',
    message: guidance.message,
    actions,
    canRetry: false,
    details: [`上游错误：${guidance.evidence}`],
    originalError: input.originalError ?? input.detailedMessage,
  }
}
