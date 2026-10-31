import * as React from 'react'
import { useSetAtom } from 'jotai'
import { GraduationCap, RotateCcw } from 'lucide-react'
import { onboardingReplayRequestedAtom } from '@/atoms/onboarding'
import { settingsOpenAtom } from '@/atoms/settings-tab'
import { Button } from '@/components/ui/button'
import { SettingsCard, SettingsSection } from './primitives'
import { useT } from '@/i18n'

/** 设置中的二次确认页，避免点击左侧导航后误触直接进入全屏引导。 */
export function OnboardingSettings(): React.ReactElement {
  const t = useT()
  const setReplayRequested = useSetAtom(onboardingReplayRequestedAtom)
  const setSettingsOpen = useSetAtom(settingsOpenAtom)

  const handleReplay = (): void => {
    setReplayRequested(true)
    setSettingsOpen(false)
  }

  return (
    <div className="space-y-6">
      <SettingsSection
        title={t('settingsMisc.onboarding.title')}
        description={t('settingsMisc.onboarding.description')}
      >
        <SettingsCard>
          <div className="flex items-start gap-4 px-4 py-5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <GraduationCap className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-medium text-foreground">{t('settingsMisc.onboarding.ready')}</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {t('settingsMisc.onboarding.body')}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleReplay} className="shrink-0">
              <RotateCcw />
              {t('settingsMisc.onboarding.replay')}
            </Button>
          </div>
        </SettingsCard>
      </SettingsSection>
    </div>
  )
}
