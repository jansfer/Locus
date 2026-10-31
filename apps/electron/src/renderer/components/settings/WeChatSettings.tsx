/**
 * WeChatSettings - 微信集成设置页
 *
 * 基于微信 iLink Bot API，扫码登录 + 长轮询消息。
 * 用户流程：点击登录 → 显示二维码 → 扫码 → 自动连接。
 */

import * as React from 'react'
import { useAtom } from 'jotai'
import { toast } from 'sonner'
import { Loader2, Power, PowerOff, LogOut, QrCode, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SettingsSection } from './primitives/SettingsSection'
import { SettingsCard } from './primitives/SettingsCard'
import { SettingsRow } from './primitives/SettingsRow'
import { wechatBridgeStateAtom } from '@/atoms/wechat-atoms'
import { useT } from '@/i18n'
import type { TranslateFn } from '@/i18n'
import type { WeChatBridgeStatus } from '@proma/shared'

/** 安全地用系统浏览器打开链接 */
function openLink(url: string): void {
  window.electronAPI.openExternal(url)
}

/** 状态指示器配置（label 存状态枚举名，渲染处经词典转换） */
const STATUS_CONFIG: Record<WeChatBridgeStatus, { color: string; label: WeChatBridgeStatus }> = {
  disconnected: { color: 'bg-gray-400', label: 'disconnected' },
  waiting_scan: { color: 'bg-amber-400 animate-pulse', label: 'waiting_scan' },
  scanned: { color: 'bg-blue-400 animate-pulse', label: 'scanned' },
  connecting: { color: 'bg-amber-400 animate-pulse', label: 'connecting' },
  connected: { color: 'bg-green-500', label: 'connected' },
  error: { color: 'bg-red-500', label: 'error' },
}

/** 状态枚举名转文案：通用状态走 shared，微信特有状态走 wechat 分组 */
function statusText(t: TranslateFn, status: WeChatBridgeStatus): string {
  if (status === 'waiting_scan') return t('settingsIntegrations.wechat.status.waitingScan')
  if (status === 'scanned') return t('settingsIntegrations.wechat.status.scanned')
  return t(`settingsIntegrations.shared.status.${status}`)
}

export function WeChatSettings(): React.ReactElement {
  const t = useT()
  const [bridgeState, setBridgeState] = useAtom(wechatBridgeStateAtom)
  const [hasCredentials, setHasCredentials] = React.useState(false)
  const [loaded, setLoaded] = React.useState(false)

  // 加载配置和状态
  React.useEffect(() => {
    Promise.all([
      window.electronAPI.getWeChatConfig(),
      window.electronAPI.getWeChatStatus(),
    ]).then(([config, status]) => {
      setHasCredentials(!!config.credentials)
      setBridgeState(status)
      setLoaded(true)
    })
  }, [setBridgeState])

  // 订阅状态变化
  React.useEffect(() => {
    const unsubscribe = window.electronAPI.onWeChatStatusChanged((state) => {
      setBridgeState(state)
      // 登录成功后更新凭证状态
      if (state.status === 'connected') {
        setHasCredentials(true)
      } else if (state.status === 'disconnected') {
        // 可能是登出
        window.electronAPI.getWeChatConfig().then((config) => {
          setHasCredentials(!!config.credentials)
        })
      }
    })
    return unsubscribe
  }, [setBridgeState])

  // 开始扫码登录
  const handleLogin = React.useCallback(async () => {
    try {
      await window.electronAPI.startWeChatLogin()
    } catch (error) {
      toast.error(t('settingsIntegrations.wechat.loginFailed', { message: error instanceof Error ? error.message : String(error) }))
    }
  }, [t])

  // 启动 Bridge
  const handleStart = React.useCallback(async () => {
    try {
      await window.electronAPI.startWeChatBridge()
      toast.success(t('settingsIntegrations.wechat.bridgeStarted'))
    } catch (error) {
      toast.error(t('settingsIntegrations.wechat.startFailed', { message: error instanceof Error ? error.message : String(error) }))
    }
  }, [t])

  // 停止 Bridge
  const handleStop = React.useCallback(async () => {
    try {
      await window.electronAPI.stopWeChatBridge()
      toast.info(t('settingsIntegrations.wechat.bridgeStopped'))
    } catch (error) {
      toast.error(t('settingsIntegrations.wechat.stopFailed', { message: error instanceof Error ? error.message : String(error) }))
    }
  }, [t])

  // 登出
  const handleLogout = React.useCallback(async () => {
    try {
      await window.electronAPI.logoutWeChat()
      setHasCredentials(false)
      toast.info(t('settingsIntegrations.wechat.loggedOut'))
    } catch (error) {
      toast.error(t('settingsIntegrations.wechat.logoutFailed', { message: error instanceof Error ? error.message : String(error) }))
    }
  }, [t])

  const statusConfig = STATUS_CONFIG[bridgeState.status]
  const isConnected = bridgeState.status === 'connected'
  const isLoggingIn = bridgeState.status === 'waiting_scan' || bridgeState.status === 'scanned'
  const isConnecting = bridgeState.status === 'connecting'
  const showQRCode = isLoggingIn && bridgeState.qrCodeData

  if (!loaded) return <div />

  return (
    <div className="space-y-8">
      {/* 连接状态 */}
      <SettingsSection
        title={t('settingsIntegrations.wechat.title')}
        description={t('settingsIntegrations.wechat.description')}
      >
        <SettingsCard>
          <SettingsRow label={t('settingsIntegrations.wechat.bridgeStatus')}>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${statusConfig.color}`} />
                <span className="text-sm text-muted-foreground">{statusText(t, statusConfig.label)}</span>
              </div>
              {isConnected ? (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={handleStop}>
                    <PowerOff size={14} className="mr-1.5" />
                    {t('settingsIntegrations.shared.stop')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleLogout}>
                    <LogOut size={14} className="mr-1.5" />
                    {t('settingsIntegrations.wechat.logout')}
                  </Button>
                </div>
              ) : hasCredentials && !isLoggingIn ? (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleStart}
                    disabled={isConnecting}
                  >
                    {isConnecting ? (
                      <Loader2 size={14} className="animate-spin mr-1.5" />
                    ) : (
                      <Power size={14} className="mr-1.5" />
                    )}
                    {t('settingsIntegrations.shared.start')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleLogout}>
                    <LogOut size={14} className="mr-1.5" />
                    {t('settingsIntegrations.wechat.logout')}
                  </Button>
                </div>
              ) : !isLoggingIn ? (
                <Button size="sm" onClick={handleLogin}>
                  <QrCode size={14} className="mr-1.5" />
                  {t('settingsIntegrations.wechat.scanLogin')}
                </Button>
              ) : null}
            </div>
          </SettingsRow>
        </SettingsCard>

        {/* 错误信息 */}
        {bridgeState.status === 'error' && bridgeState.errorMessage && (
          <div className="mt-2 px-3 py-2.5 rounded-lg bg-red-500/10 text-red-700 dark:text-red-400 text-sm">
            {bridgeState.errorMessage}
          </div>
        )}

        {/* 连接成功提示 */}
        {isConnected && (
          <div className="mt-2 px-3 py-2.5 rounded-lg bg-green-500/10 text-green-700 dark:text-green-400 text-sm">
            {t('settingsIntegrations.wechat.connectedNote')}
          </div>
        )}
      </SettingsSection>

      {/* QR 码显示区域 */}
      {showQRCode && (
        <SettingsSection
          title={t('settingsIntegrations.wechat.scanLoginTitle')}
          description={t('settingsIntegrations.wechat.scanLoginDesc')}
        >
          <SettingsCard divided={false}>
            <div className="flex flex-col items-center py-8 px-4">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <img
                  src={bridgeState.qrCodeData}
                  alt={t('settingsIntegrations.wechat.qrAlt')}
                  className="w-52 h-52"
                />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                {bridgeState.status === 'scanned' ? (
                  <span className="text-blue-500 font-medium">{t('settingsIntegrations.wechat.scannedConfirm')}</span>
                ) : (
                  t('settingsIntegrations.wechat.scanHint')
                )}
              </p>
              <Button
                size="sm"
                variant="ghost"
                className="mt-2"
                onClick={handleLogin}
              >
                {t('settingsIntegrations.wechat.refreshQr')}
              </Button>
            </div>
          </SettingsCard>
        </SettingsSection>
      )}

      {/* 使用说明 */}
      <SettingsSection
        title={t('settingsIntegrations.wechat.guideTitle')}
        description={t('settingsIntegrations.wechat.guideDesc')}
      >
        <SettingsCard divided={false}>
          <div className="px-4 py-4 space-y-5 text-sm">
            {/* 步骤 1 */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">1</span>
                <span className="font-medium text-foreground">{t('settingsIntegrations.wechat.scanLogin')}</span>
              </div>
              <p className="pl-7 text-muted-foreground">
                {t('settingsIntegrations.wechat.stepScanDesc')}
              </p>
            </div>

            {/* 步骤 2 */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">2</span>
                <span className="font-medium text-foreground">{t('settingsIntegrations.wechat.stepAutoConnect')}</span>
              </div>
              <p className="pl-7 text-muted-foreground">
                {t('settingsIntegrations.wechat.stepConnectDesc')}
              </p>
            </div>

            {/* 步骤 3 */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">3</span>
                <span className="font-medium text-foreground">{t('settingsIntegrations.wechat.stepMessaging')}</span>
              </div>
              <p className="pl-7 text-muted-foreground">
                {t('settingsIntegrations.wechat.stepMessagingDesc')}
              </p>
            </div>

            {/* 提示 */}
            <div className="pl-7 p-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs">
              {t('settingsIntegrations.wechat.noteBefore')}
              <button
                type="button"
                className="inline-flex items-center gap-0.5 underline hover:no-underline cursor-pointer"
                onClick={() => openLink('https://ilinkai.weixin.qq.com')}
              >
                iLink Bot API
                <ExternalLink className="size-2.5" />
              </button>
              {t('settingsIntegrations.wechat.noteAfter')}
            </div>
          </div>
        </SettingsCard>
      </SettingsSection>
    </div>
  )
}
