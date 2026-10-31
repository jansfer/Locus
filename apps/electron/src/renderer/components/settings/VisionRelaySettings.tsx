import * as React from 'react'
import { Eye, ShieldCheck } from 'lucide-react'
import type { VisionRelaySettings as VisionRelaySettingsValue } from '@/types/settings'
import { ModelSelector } from '@/components/chat/ModelSelector'
import { Switch } from '@/components/ui/switch'
import { SettingsCard, SettingsRow, SettingsSection } from './primitives'
import { useT } from '@/i18n'

const DEFAULT_SETTINGS: VisionRelaySettingsValue = { enabled: false }

/** 为无视觉输入能力的 Agent 选择独立的视觉模型路由。 */
export function VisionRelaySettings(): React.ReactElement {
  const t = useT()
  const [settings, setSettings] = React.useState<VisionRelaySettingsValue>(DEFAULT_SETTINGS)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    window.electronAPI.getSettings()
      .then((appSettings) => setSettings(appSettings.visionRelay ?? DEFAULT_SETTINGS))
      .catch(console.error)
  }, [])

  const save = async (next: VisionRelaySettingsValue): Promise<void> => {
    const previous = settings
    setSettings(next)
    setSaving(true)
    try {
      await window.electronAPI.updateSettings({ visionRelay: next })
    } catch (error) {
      console.error('[视觉助手设置] 保存失败:', error)
      setSettings(previous)
    } finally {
      setSaving(false)
    }
  }

  const selectedModel = settings.channelId && settings.modelId
    ? { channelId: settings.channelId, modelId: settings.modelId }
    : null
  const configured = Boolean(selectedModel)

  return (
    <div className="space-y-8">
      <SettingsSection
        title={t('settingsMisc.visionRelay.title')}
        description={t('settingsMisc.visionRelay.titleDesc')}
      >
        <SettingsCard>
          <SettingsRow
            label={t('settingsMisc.visionRelay.enableLabel')}
            icon={<Eye className="size-4 text-violet-500" />}
            description={configured
              ? t('settingsMisc.visionRelay.enableDescConfigured')
              : t('settingsMisc.visionRelay.enableDescUnconfigured')}
          >
            <Switch
              checked={settings.enabled}
              disabled={saving || !configured}
              onCheckedChange={(enabled) => void save({ ...settings, enabled })}
            />
          </SettingsRow>
          <SettingsRow
            label={t('settingsMisc.visionRelay.modelLabel')}
            description={t('settingsMisc.visionRelay.modelDesc')}
          >
            <ModelSelector
              externalSelectedModel={selectedModel}
              excludedProviders={['openai-codex', 'github-copilot', 'xai']}
              showChannelInTrigger
              onModelSelect={(model) => void save({
                enabled: settings.enabled,
                channelId: model.channelId,
                modelId: model.modelId,
              })}
            />
          </SettingsRow>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title={t('settingsMisc.visionRelay.privacyTitle')} description={t('settingsMisc.visionRelay.privacyDesc')}>
        <SettingsCard>
          <SettingsRow
            label={t('settingsMisc.visionRelay.autoUseLabel')}
            icon={<ShieldCheck className="size-4 text-emerald-500" />}
            description={t('settingsMisc.visionRelay.autoUseDesc')}
          />
        </SettingsCard>
      </SettingsSection>
    </div>
  )
}
