/**
 * Antigravity (Google 订阅) 模型目录筛选。
 *
 * fetchAvailableModels 返回的是官方**全量静态目录**：既有当前旗舰模型，也包含
 * 内部任务模型（chat_* / tab_*）、已下线的旧版本（gemini-2.5、3.5-flash-low）和
 * 非对话模态（image / video）。直接全量入渠道会让模型选择器充满噪声，因此这里
 * 做一次面向 Agent 对话的收敛：
 *
 * 1. 结构字段优先：`isInternal` 标记的内部条目一律剔除（不依赖 ID 猜测）；
 * 2. 噪声模式兜底：chat_ / tab_ / -exp / -agent / -disabled / 非对话模态；
 * 3. 家族版本基线：Gemini Pro ≥ 3.1、Gemini Flash ≥ 3.7、Flash Lite ≥ 3.5、
 *    Claude ≥ 4.6，GPT 仅保留 gpt-oss-120b；`recommended` 条目豁免版本基线；
 * 4. 档位去重：`-high/-medium/-low/-extra-low/-max` 是同一模型固定思考档位的
 *    别名；若目录里存在裸模型（如 gemini-3.8-flash），则丢弃这些别名，保留可
 *    由客户端控制思考深度的裸模型；
 * 5. 排序：recommended 优先，其次按家族与版本从新到旧，保证常用模型排在前面。
 *
 * 规则刻意保持"宁可保留"的取向：无法识别家族的条目不因版本规则被误删。
 */

import {
  ANTIGRAVITY_TIER_SUFFIX,
  isAntigravityTierVariant,
  type AntigravityAvailableModel,
} from './antigravity-api'

/** 渠道模型条目（与 ChannelModel 的 id / name 字段对齐）。 */
export interface AntigravityChatModel {
  id: string
  name: string
  supportsImages: boolean
}

/** 筛选结果：保留的模型与因规则被剔除的数量，便于 UI 反馈。 */
export interface AntigravityModelSelection {
  models: AntigravityChatModel[]
  droppedCount: number
}

/** 噪声与内部标识：官方内部任务、实验、禁用与旧 agent 占位模型。 */
const NOISE_ID_PATTERN = /^(?:chat|tab)_|(?:^|[-_])(?:internal|exp|disabled|agent)(?:$|[-_])/i

/** 非对话模态：图片 / 视频 / 向量 / 语音模型不能作为 Agent 对话模型。 */
const NON_CHAT_MODALITY = /-(?:image|video|embedding|tts|audio)(?:-|$)/i

/** Gemini 家族版本基线（与官方当前旗舰线对齐）。 */
const GEMINI_PRO_MIN_VERSION: readonly [number, number] = [3, 1]
const GEMINI_FLASH_MIN_VERSION: readonly [number, number] = [3, 7]
const GEMINI_FLASH_LITE_MIN_VERSION: readonly [number, number] = [3, 5]
/** Claude 家族版本基线：4.6 及以上的新档位模型。 */
const CLAUDE_MIN_VERSION: readonly [number, number] = [4, 6]

type ModelFamily = 'gemini-argon' | 'gemini-pro' | 'gemini-flash-lite' | 'gemini-flash' | 'gemini-other' | 'claude' | 'gpt' | 'other'

interface ClassifiedModel {
  model: AntigravityChatModel
  family: ModelFamily
  /** 家族内排序用的版本号；越新越大。 */
  version: readonly [number, number]
  recommended: boolean
}

/** 解析 `gemini-<major>` / `gemini-<major>.<minor>-...` 的版本段。 */
function parseGeminiVersion(id: string): readonly [number, number] | undefined {
  const match = /gemini-(\d+)(?:\.(\d+))?/.exec(id)
  if (!match?.[1]) return undefined
  return [Number(match[1]), match[2] ? Number(match[2]) : 0]
}

/**
 * 解析 Claude 版本：跳过 8 位日期快照（如 claude-sonnet-4-5-20250929）与
 * 4 位构建号，返回最大的 (major, minor)。
 */
function parseClaudeVersion(id: string): readonly [number, number] | undefined {
  const tokens = id.split(/[-_.]/)
  let best: readonly [number, number] | undefined
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    if (!token || !/^\d+$/.test(token)) continue
    // 日期快照与构建号不是版本号
    if (token.length === 8 || token.length >= 5) continue
    const major = Number(token)
    const nextToken = tokens[index + 1]
    const minor = nextToken && /^\d+$/.test(nextToken) && nextToken.length < 5 ? Number(nextToken) : 0
    if (minor > 0) index += 1
    if (!best || major > best[0] || (major === best[0] && minor > best[1])) {
      best = [major, minor]
    }
  }
  return best
}

function compareVersion(a: readonly [number, number], b: readonly [number, number]): number {
  return a[0] - b[0] || a[1] - b[1]
}

function classifyFamily(id: string): ModelFamily {
  const lower = id.toLowerCase()
  if (lower.includes('claude')) return 'claude'
  if (lower.includes('gpt')) return 'gpt'
  if (!lower.includes('gemini')) return 'other'
  if (lower.includes('argon') || /gemini-(?:[4-9]|[1-9]\d)/.test(lower)) return 'gemini-argon'
  if (lower.includes('flash-lite')) return 'gemini-flash-lite'
  if (lower.includes('flash')) return 'gemini-flash'
  if (lower.includes('pro')) return 'gemini-pro'
  return 'gemini-other'
}

/** 家族内排序权重：越常用（越旗舰）越靠前。 */
const FAMILY_RANK: Record<ModelFamily, number> = {
  'gemini-argon': 0,
  'gemini-pro': 1,
  'gemini-flash': 2,
  'gemini-flash-lite': 3,
  claude: 4,
  gpt: 5,
  'gemini-other': 6,
  other: 7,
}

function familyVersion(family: ModelFamily, id: string): readonly [number, number] {
  if (family === 'claude') return parseClaudeVersion(id) ?? [0, 0]
  if (family === 'gemini-argon' || family.startsWith('gemini')) return parseGeminiVersion(id) ?? [0, 0]
  return [0, 0]
}

/** 是否为固定思考档位别名（如 gemini-3.8-flash-high）。 */
const isTierVariant = isAntigravityTierVariant

/** 去掉固定档位后缀，得到该模型家族的裸 ID。 */
function stripTierSuffix(id: string): string {
  return id.replace(ANTIGRAVITY_TIER_SUFFIX, '')
}

/** 家族版本基线：低于基线视为已下线模型。 */
function meetsVersionBaseline(family: ModelFamily, id: string, version: readonly [number, number]): boolean {
  switch (family) {
    case 'gemini-pro':
      // 旧版 Pro 与 preview 变体不再作为日常可用模型
      return !id.includes('preview') && compareVersion(version, GEMINI_PRO_MIN_VERSION) >= 0
    case 'gemini-flash':
      return compareVersion(version, GEMINI_FLASH_MIN_VERSION) >= 0
    case 'gemini-flash-lite':
      return compareVersion(version, GEMINI_FLASH_LITE_MIN_VERSION) >= 0
    case 'claude': {
      const lower = id.toLowerCase()
      if (lower.includes('haiku') || lower.includes('fable')) return false
      return compareVersion(version, CLAUDE_MIN_VERSION) >= 0
    }
    case 'gpt':
      // Antigravity 仅提供官方 gpt-oss-120b 系列
      return /^gpt-oss-120b(?:-medium)?$/.test(id.toLowerCase())
    // 新一代 Argon / Gemini 4+ 与无法识别家族的条目不受基线限制
    case 'gemini-argon':
    case 'gemini-other':
    case 'other':
      return true
  }
}

/** 判断原始目录条目是否属于"杂项噪声"（内部任务、实验、非对话模态）。 */
export function isAntigravityNoiseModel(id: string, entry?: AntigravityAvailableModel): boolean {
  if (!id || id.startsWith('_')) return true
  if (entry?.isInternal === true) return true
  if (NOISE_ID_PATTERN.test(id)) return true
  if (NON_CHAT_MODALITY.test(id)) return true
  return false
}

/**
 * 从 fetchAvailableModels 目录筛选可用于 Agent 对话的常用模型。
 *
 * `droppedCount` 为原始条目数减去保留条目数，用于提示"已过滤 N 个内部/旧版模型"。
 */
export function selectAntigravityChatModels(
  catalog: Record<string, AntigravityAvailableModel>,
): AntigravityModelSelection {
  const totalCount = Object.keys(catalog).length
  const nonNoise: ClassifiedModel[] = []
  const candidates: ClassifiedModel[] = []

  for (const [id, entry] of Object.entries(catalog)) {
    const normalizedId = id.trim()
    if (!normalizedId || isAntigravityNoiseModel(normalizedId, entry)) continue
    // 名称优先 displayName；缺失时用原始 ID（便于用户识别稀有条目）
    const name = entry?.displayName?.trim() || normalizedId
    const family = classifyFamily(normalizedId)
    const version = familyVersion(family, normalizedId)
    const recommended = entry?.recommended === true
    const classified: ClassifiedModel = {
      model: { id: normalizedId, name, supportsImages: entry?.supportsImages === true },
      family,
      version,
      recommended,
    }
    nonNoise.push(classified)
    if (!recommended && !meetsVersionBaseline(family, normalizedId, version)) continue
    candidates.push(classified)
  }

  // 档位去重：仅在裸模型也存在时丢弃固定档位别名，否则保留（避免家族整体消失）
  const collapseTierAliases = (list: ClassifiedModel[]): ClassifiedModel[] => {
    const existingIds = new Set(list.map((candidate) => candidate.model.id))
    return list.filter((candidate) => {
      if (!isTierVariant(candidate.model.id)) return true
      return !existingIds.has(stripTierSuffix(candidate.model.id))
    })
  }

  const filtered = collapseTierAliases(candidates)

  filtered.sort((a, b) => {
    if (a.recommended !== b.recommended) return a.recommended ? -1 : 1
    const familyDelta = FAMILY_RANK[a.family] - FAMILY_RANK[b.family]
    if (familyDelta !== 0) return familyDelta
    const versionDelta = compareVersion(b.version, a.version)
    if (versionDelta !== 0) return versionDelta
    return a.model.name.localeCompare(b.model.name)
  })

  // 安全网：若版本基线把目录清空（例如账号只下发旧一代模型），回退到
  // 全部非噪声条目，避免用户拉取后拿到空列表。
  const finalModels = filtered.length > 0 ? filtered : collapseTierAliases(nonNoise)

  return {
    models: finalModels.map((candidate) => candidate.model),
    droppedCount: Math.max(0, totalCount - finalModels.length),
  }
}
