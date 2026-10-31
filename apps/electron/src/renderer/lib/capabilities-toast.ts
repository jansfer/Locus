import { toast } from 'sonner'
import { t } from '@/i18n'
import type { MessageKey } from '@/i18n'
import type { CapabilityChange } from '@proma/shared'

/** 变化类型 → 整句文案键（含 {name} 插值） */
const CHANGE_MESSAGE_KEYS: Record<CapabilityChange['type'], MessageKey> = {
  mcp_added: 'misc.capabilities.mcpAdded',
  mcp_removed: 'misc.capabilities.mcpRemoved',
  mcp_enabled: 'misc.capabilities.mcpEnabled',
  mcp_disabled: 'misc.capabilities.mcpDisabled',
  skill_added: 'misc.capabilities.skillAdded',
  skill_removed: 'misc.capabilities.skillRemoved',
  skill_enabled: 'misc.capabilities.skillEnabled',
  skill_disabled: 'misc.capabilities.skillDisabled',
}

/**
 * 显示能力变化 toast 通知。
 *
 * - 1-3 条变化：每条单独 toast
 * - 4+ 条变化：合并为一条摘要 toast
 */
export function showCapabilityChangeToasts(changes: CapabilityChange[]): void {
  if (changes.length === 0) return

  if (changes.length <= 3) {
    for (const change of changes) {
      const message = t(CHANGE_MESSAGE_KEYS[change.type], { name: change.name })
      const isPositive = change.type.endsWith('_added') || change.type.endsWith('_enabled')
      if (isPositive) {
        toast.success(message)
      } else {
        toast.info(message)
      }
    }
  } else {
    // 批量变化：合并为一条摘要
    const mcpCount = changes.filter((c) => c.type.startsWith('mcp_')).length
    const skillCount = changes.filter((c) => c.type.startsWith('skill_')).length
    const parts: string[] = []
    if (mcpCount > 0) parts.push(t('misc.capabilities.mcpSummary', { n: mcpCount }))
    if (skillCount > 0) parts.push(t('misc.capabilities.skillSummary', { n: skillCount }))
    toast.info(t('misc.capabilities.summaryUpdated', { list: parts.join(t('misc.capabilities.summaryJoiner')) }))
  }
}
