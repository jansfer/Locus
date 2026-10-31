import * as React from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import type { BrowserViewState } from '@proma/shared'
import { ChevronLeft, ChevronRight, Globe, LoaderCircle, RotateCw, ShieldAlert, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { BROWSER_RISK_DISCLAIMER_VERSION } from '@/types/settings'
import { cn } from '@/lib/utils'
import { browserPendingNavigationMapAtom } from '@/atoms/browser-atoms'
import { BrowserSlot } from './BrowserSlot'
import { shouldReuseInitialBrowserTab } from './agent-browser-link-utils'
import { resolveExternalBrowserUrl } from './browser-external-url'
import { useT } from '@/i18n'

/** 加号菜单最多 7 项；为原生 WebContentsView 预留完整菜单及安全间距。 */
const ADD_TAB_MENU_CLEARANCE_PX = 256

interface BrowserPanelProps {
  sessionId: string
  /** 由右侧统一顶栏选中的网页。 */
  tabId: string
  state: BrowserViewState | null
  /** 右侧加号菜单展开时，原生浏览器必须避让其 renderer 区域。 */
  isAddTabMenuOpen?: boolean
}

export function BrowserPanel({ sessionId, tabId, state, isAddTabMenuOpen = false }: BrowserPanelProps): React.ReactElement {
  const t = useT()
  const [url, setUrl] = React.useState(state?.url ?? '')
  const [riskAcknowledged, setRiskAcknowledged] = React.useState<boolean | null>(null)
  const [savingRiskAcknowledgement, setSavingRiskAcknowledgement] = React.useState(false)
  const pendingNavigationUrl = useAtomValue(browserPendingNavigationMapAtom).get(sessionId)
  const setPendingNavigationMap = useSetAtom(browserPendingNavigationMapAtom)

  const selectedTab = state?.tabs.find((tab) => tab.tabId === tabId) ?? null
  React.useEffect(() => setUrl(selectedTab?.url ?? ''), [selectedTab?.url])
  React.useEffect(() => {
    let cancelled = false
    void window.electronAPI.getSettings()
      .then((settings) => {
        if (!cancelled) setRiskAcknowledged((settings.browserRiskDisclaimerVersion ?? 0) >= BROWSER_RISK_DISCLAIMER_VERSION)
      })
      .catch((error) => {
        console.error('[受管浏览器] 读取风险告知状态失败:', error)
        if (!cancelled) setRiskAcknowledged(false)
      })
    return () => { cancelled = true }
  }, [])

  const navigate = React.useCallback(async () => {
    const value = url.trim()
    const navigateBrowser = (window.electronAPI as Partial<typeof window.electronAPI>).navigateAgentBrowser
    if (!value || typeof navigateBrowser !== 'function') return
    try { await navigateBrowser({ sessionId, tabId, url: value }) } catch (error) { console.error('[受管浏览器] 导航失败:', error) }
  }, [sessionId, tabId, url])

  const openInDefaultBrowser = React.useCallback(() => {
    const externalUrl = resolveExternalBrowserUrl(url)
    if (!externalUrl) return
    void window.electronAPI.openExternal(externalUrl).catch((error) => {
      console.error('[受管浏览器] 在默认浏览器中打开失败:', error)
    })
  }, [url])

  const closeBrowser = React.useCallback(async () => {
    try {
      await window.electronAPI.closeAgentBrowser(sessionId)
    } catch (error) {
      console.error('[受管浏览器] 关闭失败:', error)
    }
  }, [sessionId])

  const acceptRiskDisclaimer = React.useCallback(async () => {
    setSavingRiskAcknowledgement(true)
    try {
      await window.electronAPI.updateSettings({ browserRiskDisclaimerVersion: BROWSER_RISK_DISCLAIMER_VERSION })
      setRiskAcknowledged(true)
      if (pendingNavigationUrl) {
        try {
          const currentState = await window.electronAPI.getAgentBrowserState(sessionId)
          if (!currentState) throw new Error(t('browser.panel.sessionMissing'))
          if (shouldReuseInitialBrowserTab(currentState)) {
            await window.electronAPI.navigateAgentBrowser({ sessionId, url: pendingNavigationUrl })
          } else {
            await window.electronAPI.createAgentBrowserTab({ sessionId, url: pendingNavigationUrl })
          }
        } catch (error) {
          console.error('[受管浏览器] 打开待处理链接失败:', error)
        } finally {
          setPendingNavigationMap((previous) => {
            const next = new Map(previous)
            next.delete(sessionId)
            return next
          })
        }
      } else {
        // 重新进入 controller.open，让已确认风险的用户初始标签导航到默认 Google 页面。
        await window.electronAPI.openAgentBrowser(sessionId)
      }
    } catch (error) {
      console.error('[受管浏览器] 保存风险告知确认失败:', error)
    } finally {
      setSavingRiskAcknowledgement(false)
    }
  }, [pendingNavigationUrl, sessionId, setPendingNavigationMap])

  const stopBackgroundRun = React.useCallback(async () => {
    if (state?.executionSource === 'user') return
    try {
      await window.electronAPI.stopAgent(sessionId)
    } catch (error) {
      console.error('[受管浏览器] 停止后台 Agent 失败:', error)
    }
  }, [sessionId, state?.executionSource])

  const riskBlocked = riskAcknowledged !== true
  // 外层右侧 Tab 会先更新 UI，再异步激活 controller 中的原生标签；激活完成前禁用
  // 依赖 controller.activeTabId 的历史操作，导航则始终显式携带当前 tabId。
  const isControllerTabActive = state?.activeTabId === tabId
  const externalBrowserUrl = resolveExternalBrowserUrl(url)
  const isBackgroundRun = state?.executionSource === 'automation' || state?.executionSource === 'delegation'
  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden border-l border-border/80 bg-content-area titlebar-no-drag">
      <div className="flex items-center h-[42px] gap-1 px-2 border-b border-border/40 bg-muted/20">
        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="size-8 rounded-lg text-muted-foreground/70 hover:bg-muted/60 hover:text-foreground" disabled={riskBlocked || !isControllerTabActive || !state?.canGoBack} onClick={() => void window.electronAPI.goBackAgentBrowser?.(sessionId)}><ChevronLeft className="size-5" /></Button></TooltipTrigger><TooltipContent>{t('browser.panel.navBack')}</TooltipContent></Tooltip>
        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="size-8 rounded-lg text-muted-foreground/70 hover:bg-muted/60 hover:text-foreground" disabled={riskBlocked || !isControllerTabActive || !state?.canGoForward} onClick={() => void window.electronAPI.goForwardAgentBrowser?.(sessionId)}><ChevronRight className="size-5" /></Button></TooltipTrigger><TooltipContent>{t('browser.panel.navForward')}</TooltipContent></Tooltip>
        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="size-8 rounded-lg text-muted-foreground/70 hover:bg-muted/60 hover:text-foreground" disabled={riskBlocked || !isControllerTabActive} onClick={() => void window.electronAPI.reloadAgentBrowser?.(sessionId)}><RotateCw className="size-[18px]" /></Button></TooltipTrigger><TooltipContent>{t('browser.panel.reload')}</TooltipContent></Tooltip>
        <form className="flex-1 min-w-0" onSubmit={(event) => { event.preventDefault(); if (!riskBlocked) void navigate() }}>
          <Input disabled={riskBlocked || !isControllerTabActive} value={url} onChange={(event) => setUrl(event.target.value)} placeholder={t('browser.panel.addressPlaceholder')} className="h-7 bg-background/70 text-xs text-muted-foreground/70" aria-label={t('browser.panel.addressAria')} />
        </form>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 rounded-lg text-muted-foreground/70 hover:bg-muted/60 hover:text-foreground"
              disabled={riskBlocked || !isControllerTabActive || !externalBrowserUrl}
              onClick={openInDefaultBrowser}
              aria-label={t('browser.panel.openExternal')}
            >
              <Globe className="size-[18px]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('browser.panel.openExternal')}</TooltipContent>
        </Tooltip>
        {state?.loading && <LoaderCircle className="size-3.5 text-muted-foreground animate-spin" />}
        {isBackgroundRun && (
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="size-7 text-amber-600 hover:text-amber-700" onClick={() => void stopBackgroundRun()} aria-label={t('browser.panel.stopBackgroundAgent')}><Square className="size-3.5 fill-current" /></Button></TooltipTrigger><TooltipContent>{state?.executionSource === 'automation' ? t('browser.panel.stopAutomationRun') : t('browser.panel.stopDelegationRun')}</TooltipContent></Tooltip>
        )}
      </div>
      {riskAcknowledged === true ? (
        <div
          className="flex flex-1 min-h-0 flex-col"
          style={isAddTabMenuOpen ? { paddingTop: ADD_TAB_MENU_CLEARANCE_PX } : undefined}
        >
          <BrowserSlot key={tabId} sessionId={sessionId} tabId={tabId} />
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 items-center justify-center bg-muted/15 px-8 text-center">
          <div className="max-w-sm space-y-2 text-muted-foreground">
            <ShieldAlert className="mx-auto size-7 text-amber-500/90" />
            <p className="text-sm font-medium text-foreground">{t('browser.panel.riskGateTitle')}</p>
            <p className="text-xs leading-5">{t('browser.panel.riskGateSubtitle')}</p>
          </div>
        </div>
      )}
      <AlertDialog open={riskAcknowledged === false} onOpenChange={(open) => { if (!open && !savingRiskAcknowledgement) void closeBrowser() }}>
        <AlertDialogContent className="max-w-xl">
          <AlertDialogHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="size-5" />
            </div>
            <AlertDialogTitle className="text-balance">{t('browser.panel.riskDialogTitle')}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left leading-6">
                <p>{t('browser.panel.riskDesc1')}</p>
                <p>{t('browser.panel.riskDesc2')}</p>
                <p className="text-xs">{t('browser.panel.riskDesc3')}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={savingRiskAcknowledgement}>{t('browser.panel.riskDecline')}</AlertDialogCancel>
            <Button type="button" disabled={savingRiskAcknowledgement} onClick={() => void acceptRiskDisclaimer()}>
              {savingRiskAcknowledgement ? t('browser.panel.riskConfirming') : t('browser.panel.riskAccept')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
