/**
 * AboutSettings - 关于页面
 *
 * 显示应用版本号等基本信息，以及版本检测状态。
 * 检测到新版本后引导用户去 GitHub Releases 手动下载。
 */

import * as React from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { RefreshCw, Loader2, CheckCircle2, AlertCircle, Info, Terminal, ChevronDown, ChevronUp, ExternalLink, RotateCw } from 'lucide-react'
import type { EnvironmentCheckResult, RuntimeStatus, WindowsShellPreference } from '@proma/shared'
import { useT } from '@/i18n'
import {
  SettingsSection,
  SettingsCard,
  SettingsRow,
  SettingsSelect,
} from './primitives'
import { updateStatusAtom, updaterAvailableAtom, checkForUpdates } from '@/atoms/updater'
import { environmentCheckResultAtom } from '@/atoms/environment'
import { EnvironmentCheckCard } from '@/components/environment/EnvironmentCheckCard'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { ReleaseNotesViewer } from './ReleaseNotesViewer'
import { VersionHistory } from './VersionHistory'

/** 从 package.json 构建时由 Vite define 注入 */
declare const __APP_VERSION__: string
const APP_VERSION = __APP_VERSION__

const GITHUB_RELEASES_URL = 'https://github.com/jansfer/Locus/releases'

/** 更新状态卡片 */
function UpdateCard(): React.ReactElement | null {
  const t = useT()
  const available = useAtomValue(updaterAvailableAtom)
  const status = useAtomValue(updateStatusAtom)
  const [checking, setChecking] = React.useState(false)
  const [showReleaseNotes, setShowReleaseNotes] = React.useState(false)
  const [release, setRelease] = React.useState<import('@proma/shared').GitHubRelease | null>(null)

  // updater 不可用时不渲染
  if (!available) return null

  const handleCheck = async (): Promise<void> => {
    setChecking(true)
    try {
      await checkForUpdates()
    } finally {
      // 状态由 atom 订阅自动更新，延迟重置 checking 避免按钮闪烁
      setTimeout(() => setChecking(false), 1000)
    }
  }

  const handleGoToDownload = (): void => {
    const url = release?.html_url || GITHUB_RELEASES_URL
    window.electronAPI.openExternal(url)
  }

  const handleInstallWhenIdle = (): void => {
    void window.electronAPI.updater?.installWhenIdle()
      .catch((error) => console.error('[更新] 安排空闲更新失败:', error))
  }

  const handleCancelIdleInstall = (): void => {
    void window.electronAPI.updater?.cancelIdleInstall()
      .catch((error) => console.error('[更新] 取消空闲更新失败:', error))
  }

  // 当检测到新版本时，获取完整的 release 信息

  React.useEffect(() => {
    if (status.status === 'available' && status.version && !release) {
      window.electronAPI
        .getReleaseByTag(`v${status.version}`)
        .then((r) => {
          if (r) {
            setRelease(r)
            setShowReleaseNotes(true)
          }
        })
        .catch((err) => {
          console.error('[更新] 获取 Release 信息失败:', err)
        })
    }
  }, [status.status, status.version, release])

  const isChecking = checking || status.status === 'checking' || status.status === 'downloading'
  const hasReleaseNotes = status.releaseNotes || release?.body

  return (
    <SettingsCard>
      <SettingsRow label={t('settingsMisc.about.softwareUpdate')}>
        <div className="flex items-center gap-3">
          {/* 状态文字 */}
          <StatusText status={status.status} version={status.version} error={status.error} />

          {/* 操作按钮 */}
          {status.status === 'downloaded' ? (
            status.installScheduled ? (
              <button
                onClick={handleCancelIdleInstall}
                className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                {t('settingsMisc.about.cancelSchedule')}
              </button>
            ) : (
              <button
                onClick={handleInstallWhenIdle}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <RotateCw className="h-3.5 w-3.5" />
                {t('settingsMisc.about.installWhenIdle')}
              </button>
            )
          ) : status.status === 'available' ? (
            <button
              onClick={handleGoToDownload}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {t('settingsMisc.about.goToDownload')}
            </button>
          ) : (
            <button
              onClick={handleCheck}
              disabled={isChecking}
              className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
            >
              {isChecking ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {t('settingsMisc.about.checkForUpdates')}
            </button>
          )}
        </div>
      </SettingsRow>

      {/* Release Notes（新版本可用时显示） */}
      {status.status === 'available' && hasReleaseNotes && (
        <div className="px-4 pb-4 border-t">
          <button
            onClick={() => setShowReleaseNotes(!showReleaseNotes)}
            className="w-full flex items-center justify-between py-3 text-left hover:opacity-80 transition-opacity"
          >
            <span className="text-sm font-medium">{t('settingsMisc.about.releaseNotes')}</span>
            {showReleaseNotes ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {showReleaseNotes && release && (
            <div className="mt-2">
              <ReleaseNotesViewer
                release={release}
                showHeader={false}
                compact
              />
            </div>
          )}
        </div>
      )}
    </SettingsCard>
  )
}

/** 状态文字组件 */
function StatusText({ status, version, error }: {
  status: string
  version?: string
  error?: string
}): React.ReactElement {
  const t = useT()
  switch (status) {
    case 'checking':
      return <span className="text-xs text-muted-foreground">{t('settingsMisc.about.checking')}</span>
    case 'available':
      return (
        <span className="text-xs text-primary flex items-center gap-1">
          <ExternalLink className="h-3 w-3" />
          {t('settingsMisc.about.newVersionAvailable', { version: version ?? '' })}
        </span>
      )
    case 'downloading':
      return (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          {t('settingsMisc.about.downloading', { version: version ?? '' })}
        </span>
      )
    case 'downloaded':
      return (
        <span className="text-xs text-primary flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          {t('settingsMisc.about.updateReady', { version: version ?? '' })}
        </span>
      )
    case 'not-available':
      return (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          {t('settingsMisc.about.upToDate')}
        </span>
      )
    case 'error':
      return (
        <span className="text-xs text-destructive flex items-center gap-1" title={error}>
          <AlertCircle className="h-3 w-3" />
          {t('settingsMisc.about.checkFailed')}
        </span>
      )
    default:
      return <span className="text-xs text-muted-foreground">{t('settingsMisc.about.notChecked')}</span>
  }
}

/** 环境检测卡片 */
function EnvironmentCard(): React.ReactElement {
  const t = useT()
  const setEnvironmentResult = useSetAtom(environmentCheckResultAtom)
  const [result, setResult] = React.useState<EnvironmentCheckResult | null>(null)
  const [isChecking, setIsChecking] = React.useState(false)

  // 初始化时加载缓存的检测结果
  React.useEffect(() => {
    window.electronAPI.getSettings().then((settings) => {
      if (settings.lastEnvironmentCheck) {
        setResult(settings.lastEnvironmentCheck)
        setEnvironmentResult(settings.lastEnvironmentCheck)
      }
    })
  }, [])

  // 执行环境检测
  const handleCheck = async () => {
    setIsChecking(true)
    try {
      const checkResult = await window.electronAPI.checkEnvironment()
      setResult(checkResult)
      setEnvironmentResult(checkResult)
    } catch (error) {
      console.error('[环境检测] 检测失败:', error)
    } finally {
      setIsChecking(false)
    }
  }

  // Node.js 检测状态
  const nodejsStatus = !result
    ? 'checking'
    : result.nodejs.installed && result.nodejs.meetsMinimum && result.nodejs.meetsRecommended
      ? 'success'
      : 'warning'

  // Git 仅影响仓库状态、Changes 与 Diff，不阻塞基础 Agent。
  const gitStatus = !result
    ? 'checking'
    : result.git.installed && result.git.meetsRequirement
      ? 'success'
      : 'warning'

  return (
    <SettingsCard>
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">{t('settingsMisc.about.optionalEnvTitle')}</h3>
          </div>
          <button
            onClick={handleCheck}
            disabled={isChecking}
            className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            {isChecking ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {isChecking ? t('settingsMisc.about.detecting') : t('settingsMisc.about.recheck')}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {t('settingsMisc.about.envHint')}
        </p>
      </div>

      <div className="p-4 space-y-3">
        {/* Node.js 检测卡片 */}
        <EnvironmentCheckCard
          name="Node.js"
          status={nodejsStatus}
          version={result?.nodejs.version}
          requirement={t('settingsMisc.about.nodejsRequirement')}
          action={{
            type: 'openExternal',
            url: result?.nodejs.downloadUrl || 'https://nodejs.org/',
          }}
          statusText={
            result && nodejsStatus === 'warning'
              ? t('settingsMisc.about.nodejsUpgradeHint', { version: result.nodejs.version ?? '' })
              : undefined
          }
        />

        {/* Git 检测卡片 */}
        <EnvironmentCheckCard
          name="Git"
          status={gitStatus}
          version={result?.git.version}
          requirement={t('settingsMisc.about.gitRequirement')}
          action={{
            type: 'openExternal',
            url: result?.git.downloadUrl || 'https://git-scm.com/',
          }}
        />

        {/* Windows 提示 */}
        {result?.platform === 'win32' && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>{t('settingsMisc.about.windowsTipTitle')}</strong>
              {t('settingsMisc.about.windowsTipBody')}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </SettingsCard>
  )
}

/** Shell 环境卡片（Windows 平台）*/
function ShellEnvironmentCard(): React.ReactElement | null {
  const t = useT()
  const [runtimeStatus, setRuntimeStatus] = React.useState<RuntimeStatus | null>(null)
  const [shellPreference, setShellPreference] = React.useState<WindowsShellPreference>('auto')
  const [isChecking, setIsChecking] = React.useState(false)

  // 初始化时加载运行时状态与用户偏好
  React.useEffect(() => {
    Promise.all([window.electronAPI.getRuntimeStatus(), window.electronAPI.getSettings()])
      .then(([status, settings]) => {
        setRuntimeStatus(status)
        setShellPreference(settings.windowsShellPreference ?? 'auto')
      })
      .catch((error) => console.error('[Shell 环境检测] 读取设置失败:', error))
  }, [])

  // 重新检测
  const handleCheck = async () => {
    setIsChecking(true)
    try {
      // 触发重新初始化运行时（后续可以添加此 IPC 方法）
      const status = await window.electronAPI.getRuntimeStatus()
      setRuntimeStatus(status)
    } catch (error) {
      console.error('[Shell 环境检测] 检测失败:', error)
    } finally {
      setIsChecking(false)
    }
  }

  const handlePreferenceChange = async (value: string): Promise<void> => {
    if (value !== 'auto' && value !== 'git-bash' && value !== 'wsl') return
    const preference = value as WindowsShellPreference
    await window.electronAPI.updateSettings({ windowsShellPreference: preference })
    setShellPreference(preference)
  }

  // 非 Windows 平台不显示
  if (!runtimeStatus || !runtimeStatus.shell) {
    return null
  }

  const { shell } = runtimeStatus
  const hasShell = shell.gitBash?.available || shell.wsl?.available
  const resolvedShell = shellPreference === 'wsl' && shell.wsl.available
    ? 'wsl'
    : shellPreference === 'git-bash' && shell.gitBash.available
      ? 'git-bash'
      : shell.recommended
  const resolvedShellLabel = resolvedShell === 'git-bash' ? 'Git Bash' : resolvedShell === 'wsl' ? 'WSL' : t('settingsMisc.about.noShellAvailable')

  return (
    <SettingsCard>
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">{t('settingsMisc.about.shellEnvTitle')}</h3>
            {!hasShell && <Badge variant="secondary">{t('settingsMisc.about.shellOptional')}</Badge>}
          </div>
          <button
            onClick={handleCheck}
            disabled={isChecking}
            className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            {isChecking ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {isChecking ? t('settingsMisc.about.detecting') : t('settingsMisc.about.recheck')}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {t('settingsMisc.about.shellEnvHint')}
        </p>
      </div>

      <div className="p-4 space-y-3">
        <SettingsSelect
          label="Agent Shell"
          description={t('settingsMisc.about.agentShellDesc')}
          value={shellPreference}
          onValueChange={(value) => {
            void handlePreferenceChange(value).catch((error) => console.error('[Shell 环境检测] 保存偏好失败:', error))
          }}
          options={[
            { value: 'auto', label: t('settingsMisc.about.shellAuto') },
            { value: 'git-bash', label: 'Git Bash' },
            { value: 'wsl', label: t('settingsMisc.about.shellWslExperimental') },
          ]}
        />

        {/* Git Bash 检测卡片 */}
        <EnvironmentCheckCard
          name="Git Bash"
          status={shell.gitBash?.available ? 'success' : 'error'}
          version={shell.gitBash?.version ?? undefined}
          requirement={t('settingsMisc.about.gitBashRequirement')}
          action={{ type: 'download', installerId: 'git-for-windows' }}
          statusText={
            shell.gitBash?.available
              ? `${shell.gitBash.path}`
              : shell.gitBash?.error || t('settingsMisc.about.notInstalled')
          }
        />

        {/* WSL 检测卡片 */}
        <EnvironmentCheckCard
          name="WSL"
          status={shell.wsl?.available ? 'success' : 'error'}
          version={shell.wsl?.version ? `WSL ${shell.wsl.version}` : undefined}
          requirement={t('settingsMisc.about.wslRequirement')}
          action={{
            type: 'openExternal',
            url: 'https://learn.microsoft.com/zh-cn/windows/wsl/install',
          }}
          statusText={
            shell.wsl?.available
              ? t('settingsMisc.about.wslDistroInfo', {
                  distro: shell.wsl.defaultDistro || t('settingsMisc.about.wslDistroUnset'),
                  distros: shell.wsl.distros.join(', '),
                })
              : shell.wsl?.error || t('settingsMisc.about.notInstalled')
          }
        />

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>{t('settingsMisc.about.agentWillUse')}</strong>{resolvedShellLabel}
            {shellPreference === 'wsl' && resolvedShell !== 'wsl' && t('settingsMisc.about.wslFallbackNote')}
            {shellPreference === 'git-bash' && resolvedShell !== 'git-bash' && t('settingsMisc.about.gitBashFallbackNote')}
          </AlertDescription>
        </Alert>

        {/* 无可用环境警告 */}
        {!hasShell && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>{t('settingsMisc.about.noShellTitle')}</strong>
              <br />
              {t('settingsMisc.about.noShellBody')}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </SettingsCard>
  )
}

export function AboutSettings(): React.ReactElement {
  const t = useT()
  return (
    <SettingsSection
      title={t('settingsMisc.about.title')}
      description={t('settingsMisc.about.description')}
    >
      <SettingsCard>
        <SettingsRow label={t('settingsMisc.about.version')}>
          <span className="text-sm text-muted-foreground font-mono">{APP_VERSION}</span>
        </SettingsRow>
        <SettingsRow label={t('settingsMisc.about.runtime')}>
          <span className="text-sm text-muted-foreground">Electron + React</span>
        </SettingsRow>
        <SettingsRow
          label={t('settingsMisc.about.license')}
          description={t('settingsMisc.about.licenseNote')}
        >
          <a
            href="https://www.gnu.org/licenses/agpl-3.0.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            AGPL-3.0
          </a>
        </SettingsRow>
        <SettingsRow
          label={t('settingsMisc.about.repo')}
          description={t('settingsMisc.about.repoNote')}
        >
          <a
            href="https://github.com/jansfer/Locus"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            github.com/jansfer/Locus
          </a>
        </SettingsRow>
      </SettingsCard>

      {/* 自动更新卡片（updater 不可用时不渲染） */}
      <UpdateCard />

      {/* 版本历史 */}
      <VersionHistory />

      {/* 环境检测卡片 */}
      <EnvironmentCard />

      {/* Shell 环境卡片（仅 Windows） */}
      <ShellEnvironmentCard />
    </SettingsSection>
  )
}
