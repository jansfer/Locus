import type { ChannelPlanQuotaResult, ChannelPlanQuotaWindow } from '@proma/shared'
import { ANTIGRAVITY_V1_INTERNAL_ENDPOINTS, buildAntigravityEgressUserAgent, shouldTryNextAntigravityEndpoint } from './antigravity-api'
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

/** 查询官方分组配额（每周 / 5 小时），复用渠道代理及端点降级规则。 */
export async function queryAntigravityPlanQuota(access: string, proxyUrl?: string): Promise<ChannelPlanQuotaResult> {
  const fetchFn = getFetchFn(proxyUrl)
  let lastError = 'Antigravity 配额查询失败'
  for (const endpoint of ANTIGRAVITY_V1_INTERNAL_ENDPOINTS) {
    try {
      const response = await fetchFn(`${endpoint}:retrieveUserQuotaSummary`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json', 'User-Agent': buildAntigravityEgressUserAgent() },
        body: '{}',
        signal: AbortSignal.timeout(15_000),
      })
      if (response.ok) return parseAntigravityPlanQuota(await response.json())
      lastError = `Antigravity 配额查询失败（HTTP ${response.status}），无法判断剩余额度`
      if (!shouldTryNextAntigravityEndpoint(response.status, endpoint)) break
    } catch {
      lastError = 'Antigravity 配额查询失败，请检查网络或代理；无法判断剩余额度'
    }
  }
  throw new Error(lastError)
}
