import type { ChannelPlanQuotaResult, ChannelPlanQuotaWindow } from '@proma/shared'
import { ANTIGRAVITY_V1_INTERNAL_ENDPOINTS, buildAntigravityEgressUserAgent } from './antigravity-api'
import { getFetchFn } from './proxy-fetch'

interface QuotaBucket {
  window?: string
  displayName?: string
  remainingFraction?: unknown
  resetTime?: string
}
interface QuotaGroup {
  displayName?: string
  buckets?: QuotaBucket[]
}

export interface AntigravityQuotaQueryOptions {
  /** cloudaicompanionProject；官方配额接口用它定位订阅项目。 */
  projectId?: string
  proxyUrl?: string
}

/** 仅使用上游明确返回的比例；缺失或无效配额不等同于额度耗尽。 */
export function parseAntigravityPlanQuota(data: unknown): ChannelPlanQuotaResult {
  const groups = (data as { groups?: QuotaGroup[] } | null)?.groups
  const windows: ChannelPlanQuotaWindow[] = []
  for (const group of Array.isArray(groups) ? groups : []) {
    for (const bucket of Array.isArray(group?.buckets) ? group.buckets : []) {
      const fraction = bucket?.remainingFraction
      if (typeof fraction !== 'number' || !Number.isFinite(fraction) || fraction < 0 || fraction > 1) continue
      const remainingPercent = Math.round(fraction * 100)
      const type = bucket.window === '5h' || bucket.window === 'weekly' ? bucket.window : 'custom'
      const label = [group.displayName, bucket.displayName || bucket.window].filter(Boolean).join(' · ') || 'Antigravity'
      const resetAt = typeof bucket.resetTime === 'string' ? Date.parse(bucket.resetTime) : NaN
      windows.push({ type, label, remainingPercent, usedPercent: 100 - remainingPercent,
        ...(Number.isFinite(resetAt) ? { resetAt } : {}),
      })
    }
  }
  return {
    supported: windows.length > 0,
    provider: 'google-antigravity',
    planName: 'Antigravity',
    windows,
    updatedAt: Date.now(),
    ...(windows.length === 0 ? { message: '上游未返回可识别的配额数据，无法判断是否还有额度' } : {}),
  }
}

/**
 * 403 的成因通常是账号级限制，而不是请求格式问题。
 *
 * 上游会在响应体中用 `validation_required` 表示需要完成 Google 账号验证；
 * 其他 403 多为账号未开通 Antigravity 订阅、或已被风控标记。
 */
function describeForbidden(bodyText: string): string {
  const lower = bodyText.toLowerCase()
  if (lower.includes('validation') || lower.includes('verify your account')) {
    return 'Antigravity 账号需要完成 Google 账号验证后才能查询订阅额度（请在 Google 账号安全设置中完成验证后重试）；不影响模型对话。'
  }
  return 'Antigravity 账号无权查询订阅额度（HTTP 403）：请确认该 Google 账号已开通 Antigravity 订阅且未被限制；不影响模型对话。'
}

/** 提取上游错误体里的可读原因，便于诊断。 */
function summarizeErrorBody(bodyText: string): string {
  const trimmed = bodyText.trim()
  if (!trimmed) return ''
  try {
    const parsed = JSON.parse(trimmed) as {
      error?: { message?: string; status?: string; details?: { reason?: string }[] }
    }
    const message = parsed.error?.message
    if (message) return message.slice(0, 160)
  } catch {
    // 非 JSON 响应，按原文摘要返回
  }
  return trimmed.slice(0, 160)
}

/** 判断该状态是否值得换下一个端点重试（配额查询是尽力而为的辅助请求）。 */
function shouldRetryQuotaEndpoint(status: number, endpointUrl: string): boolean {
  // 403 可能是区域/集群差异或项目归属问题，换端点仍有机会成功；
  // 401 表示 token 本身无效，重试无意义。
  if (status === 403) return true
  if (status === 408 || status === 404 || status >= 500) return true
  if (status === 400 && endpointUrl.includes('sandbox')) return true
  return false
}

/**
 * 查询官方分组配额（每周 / 5 小时），复用渠道代理与端点降级规则。
 *
 * 请求优先携带 `project`（官方配额接口按项目定位订阅），再回退空体：
 * 部分账号的项目归属与令牌不匹配时，空体反而可以成功。
 */
export async function queryAntigravityPlanQuota(
  access: string,
  options?: AntigravityQuotaQueryOptions,
): Promise<ChannelPlanQuotaResult> {
  const fetchFn = getFetchFn(options?.proxyUrl)
  const userAgent = buildAntigravityEgressUserAgent()
  const projectId = options?.projectId?.trim()
  const payloads = projectId ? [JSON.stringify({ project: projectId }), JSON.stringify({})] : [JSON.stringify({})]

  let forbiddenReason: string | undefined
  let lastError = 'Antigravity 配额查询失败，请检查网络或代理；无法判断剩余额度'

  for (const endpoint of ANTIGRAVITY_V1_INTERNAL_ENDPOINTS) {
    for (const body of payloads) {
      try {
        const response = await fetchFn(`${endpoint}:retrieveUserQuotaSummary`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json', 'User-Agent': userAgent },
          body,
          signal: AbortSignal.timeout(15_000),
        })
        if (response.ok) return parseAntigravityPlanQuota(await response.json())

        const bodyText = await response.text().catch(() => '')
        if (response.status === 403) {
          forbiddenReason ??= describeForbidden(bodyText)
          // 携带 project 的 403 先回退空体；空体也 403 则换下一个端点。
          continue
        }
        const detail = summarizeErrorBody(bodyText)
        lastError = `Antigravity 配额查询失败（HTTP ${response.status}）${detail ? `：${detail}` : ''}，无法判断剩余额度`
        if (!shouldRetryQuotaEndpoint(response.status, endpoint)) {
          throw new Error(lastError)
        }
      } catch (error) {
        // 网络层失败：继续尝试后续端点，最终返回统一提示。
        if (error instanceof Error && error.message.startsWith('Antigravity 配额查询失败（HTTP')) throw error
        lastError = 'Antigravity 配额查询失败，请检查网络或代理；无法判断剩余额度'
      }
    }
  }

  // 全部端点的分区/项目组合都不可用：403 优先给出账号级原因，其他按最后一次错误返回。
  throw new Error(forbiddenReason ?? lastError)
}
