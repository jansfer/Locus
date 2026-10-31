import * as React from 'react'
import { useAtom, useStore } from 'jotai'
import { useT } from '@/i18n'
import { AppShell } from './components/app-shell/AppShell'
import { OnboardingView } from './components/onboarding/OnboardingView'
import { EnvironmentCheckDialog } from './components/environment/EnvironmentCheckDialog'
import { TooltipProvider } from './components/ui/tooltip'
import { ShortcutGuideDialog } from './components/shortcuts/ShortcutGuideDialog'
import { FaqDialog } from './components/shortcuts/FaqDialog'
import { WindowControls } from './components/WindowControls'
import { detectIsWindows } from './lib/platform'
import { getWindowTitlebarContentInsetClass } from './lib/window-titlebar-layout'
import { cn } from './lib/utils'
import { PlanningReminderRail } from './components/planning/PlanningReminderRail'
import { environmentCheckDialogOpenAtom } from './atoms/environment'
import { onboardingReplayRequestedAtom } from './atoms/onboarding'
import { settingsOpenAtom, settingsTabAtom } from './atoms/settings-tab'
import { hasCompletedCurrentOnboarding } from '../types'
import hopperSeasideWhiteHouse from './assets/onboarding/hopper-seaside-white-house.png'
import locusMarkWhite from './assets/onboarding/locus-mark-white.svg'

export default function App(): React.ReactElement {
  // 应用级初始化状态。

  const store = useStore()
  const [isLoading, setIsLoading] = React.useState(true)
  const [showOnboarding, setShowOnboarding] = React.useState(false)
  const [onboardingReplayRequested, setOnboardingReplayRequested] = useAtom(onboardingReplayRequestedAtom)
  const [isReplayingOnboarding, setIsReplayingOnboarding] = React.useState(false)
  const isWindows = React.useMemo(() => detectIsWindows(), [])

  // 初始化：检查是否需要显示 Onboarding
  // macOS/Linux 上 SDK 自带 claude native binary 不依赖宿主 Node/Git；
  // Windows 上仍需 Git Bash/WSL，由 Onboarding Step 2 与聊天错误卡片引导用户安装。
  React.useEffect(() => {
    const initialize = async () => {
      try {
        const settings = await window.electronAPI.getSettings()
        if (!hasCompletedCurrentOnboarding(settings)) {
          setShowOnboarding(true)
        }
      } catch (error) {
        console.error('[App] 初始化失败:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initialize()
  }, [])

  // 设置页请求重放时跳过欢迎页，但保留完整的后续 Onboarding 流程。
  React.useEffect(() => {
    if (!onboardingReplayRequested || isLoading) return

    setIsReplayingOnboarding(true)
    setShowOnboarding(true)
    setOnboardingReplayRequested(false)
  }, [isLoading, onboardingReplayRequested, setOnboardingReplayRequested])

  // 完成 onboarding 回调：重放时回到设置页，首次完成直接进入主界面
  const handleOnboardingComplete = () => {
    const replayingOnboarding = isReplayingOnboarding
    setShowOnboarding(false)
    setIsReplayingOnboarding(false)

    if (replayingOnboarding) {
      store.set(settingsTabAtom, 'onboarding')
      store.set(settingsOpenAtom, true)
    }
  }

  // 加载中状态
  if (isLoading) {
    return <StartupLoadingScreen />
  }

  // 显示 onboarding 界面
  if (showOnboarding) {
    return (
      <TooltipProvider delayDuration={200} disableHoverableContent>
        <div className={cn('relative h-screen w-screen overflow-hidden', getWindowTitlebarContentInsetClass(isWindows))}>
          <WindowControls />
          <OnboardingView
            initialStep={isReplayingOnboarding ? 'guide' : 'welcome'}
            onComplete={handleOnboardingComplete}
          />
        </div>
      </TooltipProvider>
    )
  }

  // 显示主界面
  return (
    <TooltipProvider delayDuration={200} disableHoverableContent>
      <AppShell />
      <PlanningReminderRail />
      <ShortcutGuideDialog />
      <FaqDialog />
      <GlobalEnvironmentCheckDialog />
    </TooltipProvider>
  )
}

/**
 * 应用启动时复用 Onboarding 首屏的画作，让冷启动阶段也保持一致的品牌体验。
 */
function StartupLoadingScreen(): React.ReactElement {
  const t = useT()
  return (
    <main
      className="relative flex h-screen items-center justify-center overflow-hidden bg-[#1b3f2d] text-white"
      aria-busy="true"
      aria-live="polite"
    >
      <img
        src={hopperSeasideWhiteHouse}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-black/35 to-black/15" />

      <div className="relative flex w-full max-w-sm flex-col items-center px-8 text-center">
        <div className="flex items-center gap-3">
          <img
            src={locusMarkWhite}
            alt=""
            className="h-9 w-9 object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
          />
          <span className="text-xl font-light tracking-wide">Locus</span>
        </div>

        <p className="mt-6 max-w-xs text-balance text-lg font-light leading-relaxed tracking-[0.04em] text-white/95">
          {t('appBoot.splash.tagline')}
        </p>

        <div className="mt-7 h-px w-24 overflow-hidden bg-white/35">
          <div className="h-full w-2/5 animate-pulse bg-white/90" />
        </div>
        <p className="mt-4 text-sm font-medium tracking-[0.08em] text-white/95">{t('appBoot.splash.starting')}</p>
      </div>

      <p className="absolute bottom-8 px-6 text-center text-[11px] uppercase tracking-[0.3em] text-white/65">
        Local-first AI Agent
      </p>
    </main>
  )
}

/**
 * 全局环境检测 Dialog，由错误卡片的 recovery action 按钮打开。
 */
function GlobalEnvironmentCheckDialog(): React.ReactElement {
  const [open, setOpen] = useAtom(environmentCheckDialogOpenAtom)
  return <EnvironmentCheckDialog open={open} onOpenChange={setOpen} />
}
