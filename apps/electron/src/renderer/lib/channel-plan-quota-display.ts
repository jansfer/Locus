import type { Channel, ChannelPlanQuotaResult, ChannelPlanQuotaWindow, ProviderType } from '@proma/shared'
import { t } from '@/i18n'

export interface LoadedPlanQuota {
  channelKey: string
  result: ChannelPlanQuotaResult
}

export function planQuotaAccountKey(channelId?: string | null, updatedAt?: number): string | null {
  return channelId ? JSON.stringify([channelId, updatedAt]) : null
}

export function currentPlanQuota(loaded: LoadedPlanQuota | null, channelKey: string | null): ChannelPlanQuotaResult | null {
  return channelKey !== null && loaded?.channelKey === channelKey ? loaded.result : null
}

interface PlanQuotaDisplay {
  summary: string
  title: string
  muted: boolean
}

/** 显示状态必须与凭据版本绑定，不能在 effect 执行前闪现旧账号结果。 */
export function planQuotaChannelKey(channel: Pick<Channel, 'id' | 'updatedAt' | 'provider' | 'baseUrl'>): string {
  return JSON.stringify([channel.id, channel.updatedAt, channel.provider, channel.baseUrl])
}

function formatWindow(window: ChannelPlanQuotaWindow): string {
  const label = window.type === '5h' ? '5H' : window.type === 'weekly' ? t('misc.quota.weeklyLabel') : window.label.replace(/\s+/g, '')
  return `${label} ${window.remainingLabel ?? `${window.remainingPercent}%`}`
}

export function formatPlanQuotaWindowValue(window: ChannelPlanQuotaWindow, provider: ProviderType): string {
  const date = window.resetAt === undefined ? undefined : new Date(window.resetAt)
  const reset = date && Number.isFinite(date.getTime())
    ? t('misc.quota.resetAt', {
      time: new Intl.DateTimeFormat(undefined, {
        year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
      }).format(date),
    })
    : provider === 'github-copilot' ? t('misc.quota.noResetTime') : ''
  const value = window.remainingLabel ?? `${window.remainingPercent}%`
  return `${window.showProgress === false ? value : t('misc.quota.remaining', { value })}${reset}`
}

export function getPlanQuotaDisplay(quota: ChannelPlanQuotaResult | null, provider: ProviderType): PlanQuotaDisplay | null {
  const copilot = provider === 'github-copilot'
  if (!quota) return copilot ? { summary: t('misc.quota.loadingSummary'), title: t('misc.quota.copilotLoadingTitle'), muted: true } : null
  if (!quota.supported || quota.windows.length === 0) {
    return copilot ? {
      summary: quota.supported ? t('misc.quota.unknownSummary') : t('misc.quota.unavailableSummary'),
      title: quota.message ?? t('misc.quota.copilotNoDataTitle'),
      muted: true,
    } : null
  }

  const primary = [quota.windows.find((window) => window.type === '5h'), quota.windows.find((window) => window.type === 'weekly')]
    .filter((window): window is ChannelPlanQuotaWindow => Boolean(window))
  const summary = (primary.length > 0 ? primary : quota.windows.slice(0, 2)).map(formatWindow).join(' · ')
  const details = quota.windows.map((window) => `${window.label}: ${formatPlanQuotaWindowValue(window, provider)}`).join('\n')
  return { summary, title: t('misc.quota.detailTitle', { plan: quota.planName ?? t('misc.quota.planFallback'), details }), muted: false }
}
