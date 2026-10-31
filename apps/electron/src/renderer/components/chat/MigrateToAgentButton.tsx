/**
 * MigrateToAgentButton — 切换到 Agent 模式按钮
 *
 * 常驻在助手消息 Action Bar 中，点击后：
 * 1. 创建 Agent 会话（绑定默认工作区）
 * 2. 迁移当前 Chat 对话历史到新 Agent 会话
 * 3. 打开 Agent 会话 Tab 并自动激活
 * 4. 通过 Sonner 通知用户已完成切换
 */

import * as React from 'react'
import { useStore } from 'jotai'
import { toast } from 'sonner'
import { Bot, Loader2 } from 'lucide-react'
import { MessageAction } from '@/components/ai-elements/message'
import {
  agentChannelIdAtom,
  agentModelIdAtom,
  agentWorkspacesAtom,
  agentSessionsAtom,
  currentAgentSessionIdAtom,
  currentAgentWorkspaceIdAtom,
} from '@/atoms/agent-atoms'
import { tabsAtom, activeTabIdAtom, openTab } from '@/atoms/tab-atoms'
import { activeViewAtom } from '@/atoms/active-view'
import { appModeAtom } from '@/atoms/app-mode'
import { useT } from '@/i18n'

interface MigrateToAgentButtonProps {
  /** 当前对话 ID */
  conversationId: string
}

export function MigrateToAgentButton({ conversationId }: MigrateToAgentButtonProps): React.ReactElement {
  const t = useT()
  const store = useStore()
  const [migrating, setMigrating] = React.useState(false)

  const handleMigrate = async (): Promise<void> => {
    if (migrating) return

    const agentChannelId = store.get(agentChannelIdAtom)
    if (!agentChannelId) {
      toast.error(t('chat.agentMode.channelNotConfigured'))
      return
    }

    setMigrating(true)
    try {
      const workspaces = store.get(agentWorkspacesAtom)
      const defaultWorkspaceId = workspaces[0]?.id ?? null

      // 1. 创建 Agent 会话
      const session = await window.electronAPI.createAgentSession(
        undefined,
        agentChannelId,
        defaultWorkspaceId ?? undefined,
        store.get(agentModelIdAtom) || undefined,
      )

      // 2. 迁移 Chat 对话记录到新 Agent 会话
      await window.electronAPI.migrateChatToAgent(conversationId, session.id)

      // 3. 刷新会话列表
      const sessions = await window.electronAPI.listActiveAgentSessions()
      store.set(agentSessionsAtom, sessions)

      // 4. 切换到默认工作区
      if (defaultWorkspaceId) {
        store.set(currentAgentWorkspaceIdAtom, defaultWorkspaceId)
        window.electronAPI.updateSettings({
          agentWorkspaceId: defaultWorkspaceId,
        }).catch(console.error)
      }

      // 5. 切换到 Agent 模式
      store.set(appModeAtom, 'agent')
      store.set(activeViewAtom, 'conversations')

      // 6. 打开 Agent 会话 Tab 并激活
      const sessionTitle = session.title ?? t('chat.agentMode.newSessionTitle')
      const tabs = store.get(tabsAtom)
      const result = openTab(tabs, {
        type: 'agent',
        sessionId: session.id,
        title: sessionTitle,
      })
      store.set(tabsAtom, result.tabs)
      store.set(activeTabIdAtom, result.activeTabId)
      store.set(currentAgentSessionIdAtom, session.id)

      // 7. 通知用户
      toast.success(t('chat.agentMode.switchedTitle'), {
        description: t('chat.agentMode.switchedDescription'),
      })
    } catch (error) {
      console.error('[MigrateToAgentButton] 迁移失败:', error)
      toast.error(t('chat.agentMode.switchFailed'))
    } finally {
      setMigrating(false)
    }
  }

  return (
    <MessageAction
      tooltip={migrating ? t('chat.agentMode.switching') : t('chat.agentMode.switchAction')}
      onClick={() => { void handleMigrate() }}
      disabled={migrating}
    >
      {migrating ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Bot className="size-3.5" />
      )}
    </MessageAction>
  )
}
