/**
 * Windows 环境检测面板
 *
 * 展示 Shell 环境（Git Bash / WSL）和 Node.js 的检测结果，
 * 用于设置里的 EnvironmentCheckDialog，帮助用户按需启用 Shell 与 Node.js 能力。
 */

import * as React from 'react'
import { useAtom, useSetAtom } from 'jotai'
import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useT } from '@/i18n'
import { EnvironmentCheckCard } from './EnvironmentCheckCard'
import {
  installerManifestAtom,
  runtimeStatusAtom,
  isShellEnvironmentOkAtom,
  isNodeJsOkAtom,
} from '@/atoms/environment'
import { useAtomValue } from 'jotai'

interface EnvironmentCheckPanelProps {
  /** 首次挂载时是否自动跑一次检测 */
  autoDetectOnMount?: boolean
}

export function EnvironmentCheckPanel({
  autoDetectOnMount = true,
}: EnvironmentCheckPanelProps) {
  const t = useT()
  const [runtime, setRuntime] = useAtom(runtimeStatusAtom)
  const setManifest = useSetAtom(installerManifestAtom)
  const shellOk = useAtomValue(isShellEnvironmentOkAtom)
  const nodeOk = useAtomValue(isNodeJsOkAtom)
  const [isChecking, setIsChecking] = React.useState(false)

  const refresh = React.useCallback(async () => {
    setIsChecking(true)
    try {
      const [status, manifest] = await Promise.all([
        window.electronAPI.reinitRuntime(),
        window.electronAPI.fetchInstallerManifest(),
      ])
      setRuntime(status)
      setManifest(manifest)
    } catch (error) {
      console.error('[EnvironmentCheckPanel] 检测失败:', error)
    } finally {
      setIsChecking(false)
    }
  }, [setRuntime, setManifest])

  React.useEffect(() => {
    if (autoDetectOnMount) {
      refresh()
    } else if (!runtime) {
      // 至少拿一次当前状态
      window.electronAPI.getRuntimeStatus().then((status) => {
        if (status) setRuntime(status)
      })
      window.electronAPI
        .fetchInstallerManifest()
        .then((m) => setManifest(m))
        .catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ----- Shell 环境卡片 -----
  const shell = runtime?.shell
  const gitBashAvailable = shell?.gitBash?.available ?? false
  const wslAvailable = shell?.wsl?.available ?? false

  let shellStatus: 'checking' | 'success' | 'warning' = 'warning'
  let shellStatusText = ''
  if (!runtime) {
    shellStatus = 'checking'
    shellStatusText = t('environment.card.checking')
  } else if (gitBashAvailable) {
    shellStatus = 'success'
    shellStatusText = t('environment.panel.gitBashReady', { version: shell?.gitBash?.version ?? '' })
  } else if (wslAvailable) {
    shellStatus = 'success'
    shellStatusText = t('environment.panel.wslReady', { distro: shell?.wsl?.defaultDistro ?? '' })
  } else {
    shellStatus = 'warning'
    shellStatusText = t('environment.panel.shellMissing')
  }

  // ----- Node.js 卡片 -----
  const nodeInfo = runtime?.node
  let nodeStatus: 'checking' | 'success' | 'warning' = 'warning'
  let nodeStatusText = ''
  let nodeVersion: string | undefined = undefined
  if (!runtime) {
    nodeStatus = 'checking'
    nodeStatusText = t('environment.card.checking')
  } else if (nodeInfo?.available) {
    nodeStatus = 'success'
    nodeVersion = nodeInfo.version ?? undefined
    nodeStatusText = nodeVersion ? t('environment.panel.nodeInstalledWithVersion', { version: nodeVersion }) : t('environment.card.installed')
  } else {
    nodeStatus = 'warning'
    nodeStatusText = t('environment.panel.nodeNotInstalledOptional')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">{t('environment.panel.title')}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('environment.panel.subtitle')}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={isChecking}
          className="h-8 text-xs"
        >
          {isChecking ? (
            <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="mr-1.5 h-3 w-3" />
          )}
          {t('environment.panel.recheck')}
        </Button>
      </div>

      <div className="space-y-2">
        <EnvironmentCheckCard
          name={t('environment.panel.shellName')}
          status={shellStatus}
          requirement={t('environment.panel.shellRequirement')}
          statusText={shellStatusText}
          action={
            shellStatus === 'warning'
              ? { type: 'download', installerId: 'git-for-windows' }
              : { type: 'none' }
          }
        />
        <EnvironmentCheckCard
          name="Node.js"
          status={nodeStatus}
          version={nodeVersion}
          requirement={t('environment.panel.nodeRequirement')}
          statusText={nodeStatusText}
          action={
            nodeStatus === 'warning'
              ? { type: 'download', installerId: 'nodejs' }
              : { type: 'none' }
          }
        />
      </div>

      {!shellOk && runtime && (
        <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 px-3 py-2 text-[12px] text-yellow-700 dark:text-yellow-400">
          {t('environment.panel.shellMissingHint')}
        </div>
      )}

      {!nodeOk && runtime && (
        <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 px-3 py-2 text-[12px] text-yellow-700 dark:text-yellow-400">
          {t('environment.panel.nodeMissingHint')}
        </div>
      )}
    </div>
  )
}
