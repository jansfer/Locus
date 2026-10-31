/**
 * DingTalkSettings - 钉钉集成设置页（多 Bot 版本）
 *
 * 支持多个钉钉 Bot 的配置管理、连接状态、创建引导。
 * 保存配置后自动启动 Stream 连接。
 */

import * as React from 'react'
import { useAtomValue } from 'jotai'
import { toast } from 'sonner'
import { Loader2, ExternalLink, Power, PowerOff, Plus, Trash2, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SettingsSection } from './primitives/SettingsSection'
import { SettingsCard } from './primitives/SettingsCard'
import { SettingsInput } from './primitives/SettingsInput'
import { SettingsSecretInput } from './primitives/SettingsSecretInput'
import { dingtalkBotStatesAtom } from '@/atoms/dingtalk-atoms'
import { useT } from '@/i18n'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import type { DingTalkBotConfig, DingTalkBotBridgeState, DingTalkBridgeStatus, DingTalkTestResult } from '@proma/shared'

/** 安全地用系统浏览器打开链接 */
function openLink(url: string): void {
  window.electronAPI.openExternal(url)
}

/** 可点击的外部链接组件 */
function Link({ href, children }: { href: string; children: React.ReactNode }): React.ReactElement {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-primary hover:underline cursor-pointer"
      onClick={() => openLink(href)}
    >
      {children}
      <ExternalLink className="size-3 flex-shrink-0" />
    </button>
  )
}

/** 状态指示器颜色映射（label 存状态枚举名，渲染处经词典转换；当前未直接渲染 label） */
const STATUS_CONFIG: Record<DingTalkBridgeStatus, { color: string; label: DingTalkBridgeStatus }> = {
  disconnected: { color: 'bg-gray-400', label: 'disconnected' },
  connecting: { color: 'bg-amber-400 animate-pulse', label: 'connecting' },
  connected: { color: 'bg-green-500', label: 'connected' },
  error: { color: 'bg-red-500', label: 'error' },
}

// ===== 主组件 =====

export function DingTalkSettings(): React.ReactElement {
  const t = useT()
  const botStates = useAtomValue(dingtalkBotStatesAtom)
  const [bots, setBots] = React.useState<DingTalkBotConfig[]>([])
  const [loading, setLoading] = React.useState(true)

  const loadBots = React.useCallback(async () => {
    try {
      const config = await window.electronAPI.getDingTalkMultiConfig()
      setBots(config.bots)
    } catch {
      // fallback: 旧 API
      try {
        const oldConfig = await window.electronAPI.getDingTalkConfig()
        if (oldConfig.clientId) {
          setBots([{
            id: 'legacy',
            name: t('settingsIntegrations.dingtalk.legacyBotName'),
            enabled: oldConfig.enabled,
            clientId: oldConfig.clientId,
            clientSecret: oldConfig.clientSecret,
          }])
        }
      } catch { /* ignore */ }
    } finally {
      setLoading(false)
    }
  }, [t])

  React.useEffect(() => { loadBots() }, [loadBots])

  const handleAddBot = React.useCallback(async () => {
    try {
      const saved = await window.electronAPI.saveDingTalkBotConfig({
        name: t('settingsIntegrations.dingtalk.defaultBotName', { n: bots.length + 1 }),
        enabled: false,
        clientId: '',
        clientSecret: '',
      })
      setBots((prev) => [...prev, saved])
    } catch {
      toast.error(t('settingsIntegrations.shared.createBotFailed'))
    }
  }, [bots.length, t])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Bot 列表 */}
      <SettingsSection
        title={t('settingsIntegrations.dingtalk.botListTitle')}
        description={t('settingsIntegrations.dingtalk.botListDesc')}
        action={
          <Button size="sm" variant="outline" onClick={handleAddBot}>
            <Plus size={14} className="mr-1.5" />
            {t('settingsIntegrations.shared.addBot')}
          </Button>
        }
      >
        {bots.length === 0 ? (
          <SettingsCard divided={false}>
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t('settingsIntegrations.dingtalk.botListEmpty')}
            </div>
          </SettingsCard>
        ) : (
          <div className="space-y-3">
            {bots.map((bot) => (
              <BotConfigCard
                key={bot.id}
                bot={bot}
                state={botStates[bot.id]}
                onSaved={loadBots}
                onRemoved={loadBots}
              />
            ))}
          </div>
        )}
      </SettingsSection>

      {/* 创建钉钉机器人引导 */}
      <SettingsSection
        title={t('settingsIntegrations.dingtalk.guideTitle')}
        description={t('settingsIntegrations.dingtalk.guideDesc')}
      >
        <SettingsCard divided={false}>
          <div className="px-4 py-4 space-y-5 text-sm">
            {/* 步骤 1 */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">1</span>
                <span className="font-medium text-foreground">{t('settingsIntegrations.dingtalk.step1Title')}</span>
              </div>
              <p className="pl-7 text-muted-foreground">
                {t('settingsIntegrations.dingtalk.step1Before')}
                <Link href="https://open-dev.dingtalk.com">{t('settingsIntegrations.dingtalk.openPlatform')}</Link>
                {t('settingsIntegrations.dingtalk.step1After')}
              </p>
            </div>

            {/* 步骤 2 */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">2</span>
                <span className="font-medium text-foreground">{t('settingsIntegrations.dingtalk.step2Title')}</span>
              </div>
              <p className="pl-7 text-muted-foreground">
                {t('settingsIntegrations.dingtalk.step2Before')}
                <span className="text-foreground font-medium">Client ID (AppKey)</span>
                {t('settingsIntegrations.dingtalk.step2Mid')}
                <span className="text-foreground font-medium">Client Secret (AppSecret)</span>
                {t('settingsIntegrations.dingtalk.step2After')}
              </p>
            </div>

            {/* 步骤 3 */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">3</span>
                <span className="font-medium text-foreground">{t('settingsIntegrations.dingtalk.step3Title')}</span>
              </div>
              <p className="pl-7 text-muted-foreground">
                {t('settingsIntegrations.dingtalk.step3Before')}
                <span className="text-foreground font-medium">{t('settingsIntegrations.dingtalk.step3Highlight')}</span>
                {t('settingsIntegrations.dingtalk.step3After')}
              </p>
            </div>

            {/* 步骤 4 */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">4</span>
                <span className="font-medium text-foreground">{t('settingsIntegrations.dingtalk.step4Title')}</span>
              </div>
              <p className="pl-7 text-muted-foreground">
                {t('settingsIntegrations.dingtalk.step4Desc')}
              </p>
            </div>

            {/* 提示 */}
            <div className="pl-7 p-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs">
              <span className="font-medium">{t('settingsIntegrations.dingtalk.importantLabel')}</span>
              {t('settingsIntegrations.dingtalk.eventSubNote')}
            </div>
          </div>
        </SettingsCard>
      </SettingsSection>
    </div>
  )
}

// ===== 单个 Bot 配置卡片 =====

interface BotConfigCardProps {
  bot: DingTalkBotConfig
  state: DingTalkBotBridgeState | undefined
  onSaved: () => void
  onRemoved: () => void
}

function BotConfigCard({ bot, state, onSaved, onRemoved }: BotConfigCardProps): React.ReactElement {
  const t = useT()
  const [name, setName] = React.useState(bot.name)
  const [clientId, setClientId] = React.useState(bot.clientId)
  const [clientSecret, setClientSecret] = React.useState('')
  const [testing, setTesting] = React.useState(false)
  const [testResult, setTestResult] = React.useState<DingTalkTestResult | null>(null)
  const [expanded, setExpanded] = React.useState(!bot.clientId) // 新建的 Bot 默认展开

  // 加载已有 secret（使用 bot-specific API）
  React.useEffect(() => {
    if (bot.clientSecret && bot.id) {
      window.electronAPI.getDecryptedDingTalkBotSecret?.(bot.id)
        .then((s: string) => { if (s) setClientSecret(s) })
        .catch(() => {
          // 回退到旧 API（兼容迁移前的首个 Bot）
          window.electronAPI.getDecryptedDingTalkSecret?.()
            .then((s: string) => { if (s) setClientSecret(s) })
            .catch(() => {})
        })
    }
  }, [bot.id, bot.clientSecret])

  const statusConfig = state ? STATUS_CONFIG[state.status] : STATUS_CONFIG.disconnected
  const isConnected = state?.status === 'connected' || state?.status === 'connecting'

  const handleSave = React.useCallback(async () => {
    if (!clientId.trim() || !name.trim()) return
    try {
      await window.electronAPI.saveDingTalkBotConfig({
        id: bot.id,
        name: name.trim(),
        enabled: true,
        clientId: clientId.trim(),
        clientSecret: clientSecret || '',
      })
      toast.success(t('settingsIntegrations.shared.botSaved', { name }))
      onSaved()
    } catch {
      toast.error(t('settingsIntegrations.shared.saveFailed'))
    }
  }, [bot.id, name, clientId, clientSecret, onSaved, t])

  const handleTest = React.useCallback(async () => {
    if (!clientId.trim() || !clientSecret.trim()) return
    setTesting(true)
    setTestResult(null)
    try {
      const result = await window.electronAPI.testDingTalkConnection(clientId.trim(), clientSecret.trim())
      setTestResult(result)
    } catch (err) {
      setTestResult({ success: false, message: t('settingsIntegrations.shared.testFailed', { message: err instanceof Error ? err.message : String(err) }) })
    } finally {
      setTesting(false)
    }
  }, [clientId, clientSecret, t])

  const handleToggle = React.useCallback(async () => {
    if (isConnected) {
      await window.electronAPI.stopDingTalkBot(bot.id)
      toast.success(t('settingsIntegrations.shared.botStopped', { name: bot.name }))
    } else {
      try {
        await window.electronAPI.startDingTalkBot(bot.id)
        toast.success(t('settingsIntegrations.shared.botStarting', { name: bot.name }))
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('settingsIntegrations.shared.startFailed'))
      }
    }
  }, [bot.id, bot.name, isConnected, t])

  const handleRemove = React.useCallback(async () => {
    try {
      await window.electronAPI.removeDingTalkBot(bot.id)
      toast.success(t('settingsIntegrations.shared.botDeleted', { name: bot.name }))
      onRemoved()
    } catch {
      toast.error(t('settingsIntegrations.shared.deleteFailed'))
    }
  }, [bot.id, bot.name, onRemoved, t])

  return (
    <SettingsCard>
      {/* 头部：名称 + 状态 + 展开/折叠 */}
      <button
        type="button"
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusConfig.color}`} />
          <span className="font-medium text-sm">{bot.name || t('settingsIntegrations.shared.unnamedBot')}</span>
          <span className="text-xs text-muted-foreground">{bot.clientId ? bot.clientId.slice(0, 12) + '...' : t('settingsIntegrations.shared.notConfigured')}</span>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleToggle() }}>
              <PowerOff size={14} className="mr-1" />
              {t('settingsIntegrations.shared.stop')}
            </Button>
          ) : bot.clientId ? (
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleToggle() }}
              disabled={state?.status === 'connecting'}>
              {state?.status === 'connecting' ? <Loader2 size={14} className="animate-spin mr-1" /> : <Power size={14} className="mr-1" />}
              {t('settingsIntegrations.shared.start')}
            </Button>
          ) : null}
          <span className="text-xs text-muted-foreground">{expanded ? '▾' : '▸'}</span>
        </div>
      </button>

      {/* 展开的配置表单 */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
          <SettingsInput
            label={t('settingsIntegrations.shared.botName')}
            value={name}
            onChange={setName}
            placeholder={t('settingsIntegrations.shared.botNamePlaceholder')}
          />
          <SettingsInput
            label="Client ID (AppKey)"
            value={clientId}
            onChange={setClientId}
            placeholder="dingxxxxxxxx"
          />
          <SettingsSecretInput
            label="Client Secret (AppSecret)"
            value={clientSecret}
            onChange={setClientSecret}
            placeholder={t('settingsIntegrations.dingtalk.enterClientSecret')}
          />

          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" onClick={handleTest}
              disabled={testing || !clientId.trim() || !clientSecret.trim()}>
              {testing && <Loader2 size={14} className="animate-spin" />}
              <span>{testing ? t('settingsIntegrations.shared.testing') : t('settingsIntegrations.shared.testConnection')}</span>
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!clientId.trim() || !name.trim()}>
              {t('settingsIntegrations.shared.saveConfig')}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive">
                  <Trash2 size={14} className="mr-1" />
                  {t('common.delete')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('settingsIntegrations.shared.confirmDelete')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('settingsIntegrations.dingtalk.deleteBotDesc', { name: bot.name })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRemove}>{t('common.delete')}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {testResult && (
            <div className={cn(
              'p-3 rounded-lg flex items-start gap-2 text-sm',
              testResult.success ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-red-500/10 text-red-700 dark:text-red-400'
            )}>
              {testResult.success
                ? <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
                : <XCircle size={16} className="flex-shrink-0 mt-0.5" />
              }
              <span>{testResult.message}</span>
            </div>
          )}

          {state?.status === 'error' && state.errorMessage && (
            <div className="p-2.5 rounded-lg bg-red-500/10 text-red-700 dark:text-red-400 text-sm">
              {state.errorMessage}
            </div>
          )}
        </div>
      )}
    </SettingsCard>
  )
}
