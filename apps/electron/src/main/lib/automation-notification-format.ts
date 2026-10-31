/**
 * 定时任务通知的纯格式化逻辑。
 */

import type {
  Automation,
  AutomationNotificationTarget,
  AutomationRun,
  SDKAssistantMessage,
  SDKMessage,
} from '@proma/shared'
import { t } from '../../i18n'

interface AutomationNotificationCardPayload {
  automation: Automation
  run: AutomationRun
  summary: string
}

export function shouldNotifyAutomationTarget(
  target: AutomationNotificationTarget,
  status: AutomationRun['status'],
): boolean {
  if (!target.enabled) return false
  if (status === 'skipped') return false
  if (target.trigger === 'always') return true
  return target.trigger === status
}

export function extractAssistantText(messages: SDKMessage[]): string {
  const chunks: string[] = []

  for (const msg of messages) {
    if (msg.type !== 'assistant') continue
    const assistant = msg as SDKAssistantMessage
    for (const block of assistant.message.content) {
      if (block.type === 'text' && typeof block.text === 'string') {
        chunks.push(block.text)
      }
    }
  }

  return chunks.join('\n\n').trim()
}

function formatDuration(ms?: number): string {
  if (!ms || ms < 0) return t('automation.notification.durationUnknown')
  if (ms < 60_000) return t('automation.notification.durationSeconds', { n: (ms / 1000).toFixed(1) })
  return t('automation.notification.durationMinutes', { n: Math.round(ms / 60_000) })
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}${t('automation.notification.truncatedSuffix')}`
}

export function buildAutomationFeishuCard(payload: AutomationNotificationCardPayload): Record<string, unknown> {
  const { automation, run } = payload
  const success = run.status === 'success'
  const title = success ? t('automation.notification.completedTitle') : t('automation.notification.failedTitle')
  const template = success ? 'green' : 'red'
  const statusLine = success ? t('automation.notification.successStatus') : t('automation.notification.failedStatus')
  const fallback = success ? t('automation.notification.noOutput') : t('automation.notification.noErrorDetail')

  const lines = [
    t('automation.notification.fieldTask', { name: automation.name }),
    t('automation.notification.fieldStatus', { status: statusLine }),
    run.catchUp ? t('automation.notification.fieldCatchUp') : '',
    t('automation.notification.fieldDuration', { duration: formatDuration(run.durationMs) }),
    run.sessionId ? t('automation.notification.fieldSessionId', { id: run.sessionId }) : '',
    '',
    truncate(payload.summary.trim() || fallback, 12000),
  ].filter(Boolean)

  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: 'plain_text', content: title },
      template,
    },
    elements: [
      {
        tag: 'markdown',
        content: lines.join('\n'),
      },
    ],
  }
}
