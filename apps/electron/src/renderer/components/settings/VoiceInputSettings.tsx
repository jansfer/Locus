/**
 * VoiceInputSettings — 语音输入设置
 */

import * as React from 'react'
import { ExternalLink, Loader2, TestTube2, Mic, MicOff } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  SettingsCard,
  SettingsInput,
  SettingsSecretInput,
  SettingsSection,
  SettingsSelect,
  SettingsTextarea,
  SettingsToggle,
} from './primitives'
import type { VoiceDictationSettings, MicPermissionResult } from '../../../types'
import { useT } from '@/i18n'

/** label 存词典键名，渲染时经组件内映射翻译 */
const ENDPOINT_OPTIONS = [
  { value: 'async', label: 'async' },
  { value: 'duplex', label: 'duplex' },
] as const

const OUTPUT_OPTIONS = [
  { value: 'auto', label: 'auto' },
  { value: 'clipboard', label: 'clipboard' },
  { value: 'proma-input', label: 'input' },
] as const

const LANGUAGE_OPTIONS = [
  { value: 'auto', label: 'auto' },
  { value: 'zh-CN', label: 'zh' },
  { value: 'en-US', label: 'en' },
  { value: 'yue-CN', label: 'yue' },
  { value: 'ja-JP', label: 'ja' },
  { value: 'ko-KR', label: 'ko' },
] as const

const VOLCENGINE_SPEECH_SERVICE_URL = 'https://console.volcengine.com/speech/service/'

export function VoiceInputSettings(): React.ReactElement {
  const t = useT()
  const [settings, setSettings] = React.useState<VoiceDictationSettings | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [testing, setTesting] = React.useState(false)
  const [micPermission, setMicPermission] = React.useState<MicPermissionResult | null>(null)
  const [requestingPermission, setRequestingPermission] = React.useState(false)

  const refreshMicPermission = React.useCallback(async () => {
    try {
      const result = await window.electronAPI.checkMicrophonePermission()
      setMicPermission(result)
    } catch (error) {
      console.error('[语音输入] 检查麦克风权限失败:', error)
    }
  }, [])
  React.useEffect(() => {
    window.electronAPI.getVoiceDictationSettings()
      .then(setSettings)
      .catch((error) => {
        console.error('[语音输入] 加载设置失败:', error)
        toast.error(t('settingsIntegrations.voice.loadFailed'))
      })
    refreshMicPermission()
  }, [refreshMicPermission, t])

  const handleRequestMicPermission = React.useCallback(async () => {
    setRequestingPermission(true)
    try {
      const result = await window.electronAPI.requestMicrophonePermission()
      setMicPermission(result)
      if (result.status === 'granted') {
        toast.success(t('settingsIntegrations.voice.micGranted'))
      } else if (result.status === 'denied') {
        toast.error(t('settingsIntegrations.voice.micDenied'))
      }
    } catch (error) {
      console.error('[语音输入] 请求麦克风权限失败:', error)
      toast.error(t('settingsIntegrations.voice.micRequestFailed'))
    } finally {
      setRequestingPermission(false)
    }
  }, [])

  const update = React.useCallback(async (updates: Partial<VoiceDictationSettings>) => {
    if (!settings) return
    const optimistic = { ...settings, ...updates, provider: 'doubao' as const }
    setSettings(optimistic)
    setSaving(true)
    try {
      const saved = await window.electronAPI.updateVoiceDictationSettings(optimistic)
      setSettings(saved)
      window.electronAPI.reregisterGlobalShortcuts().catch(console.error)
    } catch (error) {
      console.error('[语音输入] 保存设置失败:', error)
      toast.error(t('settingsIntegrations.voice.saveFailed'))
    } finally {
      setSaving(false)
    }
  }, [settings])

  const handleTest = React.useCallback(async () => {
    if (!settings) return
    setTesting(true)
    try {
      const result = await window.electronAPI.testVoiceDictationConnection(settings)
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t('settingsIntegrations.voice.unknownError')
      toast.error(t('settingsIntegrations.voice.testFailed', { message }))
    } finally {
      setTesting(false)
    }
  }, [settings, t])

  if (!settings) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        {t('settingsIntegrations.voice.loading')}
      </div>
    )
  }

  const endpointOptions = ENDPOINT_OPTIONS.map((option) => ({ ...option, label: t(`settingsIntegrations.voice.endpoint.${option.label}`) }))
  const outputOptions = OUTPUT_OPTIONS.map((option) => ({ ...option, label: t(`settingsIntegrations.voice.output.${option.label}`) }))
  const languageOptions = LANGUAGE_OPTIONS.map((option) => ({ ...option, label: t(`settingsIntegrations.voice.language.${option.label}`) }))

  return (
    <div className="space-y-6">
      <SettingsSection
        title={t('settingsIntegrations.voice.title')}
        description={t('settingsIntegrations.voice.description')}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={testing || !settings.appId || !settings.accessToken || !settings.resourceId}
          >
            {testing ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <TestTube2 className="mr-1.5 size-3.5" />}
            {t('settingsIntegrations.shared.testConnection')}
          </Button>
        }
      >
        <div className="rounded-lg bg-muted/55 px-4 py-3 text-sm text-muted-foreground shadow-sm">
          <div className="mb-1.5 font-medium text-foreground">{t('settingsIntegrations.voice.howToTitle')}</div>
          <div className="space-y-1 leading-relaxed">
            <p>
              {t('settingsIntegrations.voice.openConsoleBefore')}
              <a
                href={VOLCENGINE_SPEECH_SERVICE_URL}
                target="_blank"
                rel="noreferrer"
                className="mx-1 inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
              >
                {t('settingsIntegrations.voice.volcConsole')}
                <ExternalLink className="size-3" />
              </a>
              {t('settingsIntegrations.voice.openConsoleAfter')}
            </p>
            <p>{t('settingsIntegrations.voice.findCategory')}</p>
            <p>{t('settingsIntegrations.voice.fillFields')}</p>
          </div>
        </div>

        {/* 麦克风权限状态 */}
        {micPermission && (
          <div className="rounded-lg border px-4 py-3 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {micPermission.status === 'granted' ? (
                  <Mic className="size-4 text-green-500" />
                ) : micPermission.status === 'denied' ? (
                  <MicOff className="size-4 text-destructive" />
                ) : micPermission.status === 'not-determined' ? (
                  <Mic className="size-4 text-amber-500" />
                ) : (
                  <Mic className="size-4 text-muted-foreground" />
                )}
                <div>
                  <span className="font-medium text-foreground">{t('settingsIntegrations.voice.micPermission')}</span>
                  <span className="ml-2 text-muted-foreground">
                    {micPermission.status === 'granted'
                      ? t('settingsIntegrations.voice.micStatusGranted')
                      : micPermission.status === 'denied'
                      ? t('settingsIntegrations.voice.micStatusDenied')
                      : micPermission.status === 'not-determined'
                      ? t('settingsIntegrations.voice.micStatusNotDetermined')
                      : t('settingsIntegrations.voice.micStatusUnsupported')}
                  </span>
                </div>
              </div>
              {(micPermission.status === 'not-determined' || micPermission.status === 'denied') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRequestMicPermission}
                  disabled={requestingPermission}
                >
                  {requestingPermission ? (
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  ) : micPermission.status === 'not-determined' ? (
                    <Mic className="mr-1.5 size-3.5" />
                  ) : (
                    <MicOff className="mr-1.5 size-3.5" />
                  )}
                  {micPermission.status === 'not-determined' ? t('settingsIntegrations.voice.allowMic') : t('settingsIntegrations.voice.rerequestMic')}
                </Button>
              )}
            </div>
          </div>
        )}

        <SettingsCard>
          <SettingsToggle
            label={t('settingsIntegrations.voice.enableLabel')}
            description={t('settingsIntegrations.voice.enableDesc')}
            checked={settings.enabled}
            onCheckedChange={(enabled) => update({ enabled })}
          />
          <SettingsInput
            label={t('settingsIntegrations.voice.appIdLabel')}
            description={t('settingsIntegrations.voice.appIdDesc')}
            value={settings.appId}
            onChange={(appId) => update({ appId })}
            placeholder={t('settingsIntegrations.voice.appIdPlaceholder')}
          />
          <SettingsSecretInput
            label={t('settingsIntegrations.voice.tokenLabel')}
            description={t('settingsIntegrations.voice.tokenDesc')}
            value={settings.accessToken}
            onChange={(accessToken) => update({ accessToken })}
            placeholder={t('settingsIntegrations.voice.tokenPlaceholder')}
          />
          <SettingsInput
            label="Resource ID"
            description={t('settingsIntegrations.voice.resourceIdDesc')}
            value={settings.resourceId}
            onChange={(resourceId) => update({ resourceId })}
            placeholder="volc.seedasr.sauc.duration"
          />
          <SettingsSelect
            label={t('settingsIntegrations.voice.endpointLabel')}
            description={t('settingsIntegrations.voice.endpointDesc')}
            value={settings.endpointMode}
            onValueChange={(endpointMode) => update({ endpointMode: endpointMode as VoiceDictationSettings['endpointMode'] })}
            options={endpointOptions}
          />
          <SettingsSelect
            label={t('settingsIntegrations.voice.languageLabel')}
            description={t('settingsIntegrations.voice.languageDesc')}
            value={settings.language || 'auto'}
            onValueChange={(language) => update({ language: language === 'auto' ? '' : language })}
            options={languageOptions}
          />
          <SettingsTextarea
            label={t('settingsIntegrations.voice.hotwordsLabel')}
            description={t('settingsIntegrations.voice.hotwordsDesc')}
            value={settings.customHotwords}
            onChange={(customHotwords) => update({ customHotwords })}
            placeholder={"Locus\nJotai\nShadcnUI\nClaude Code"}
            minHeight={112}
          />
          <SettingsSelect
            label={t('settingsIntegrations.voice.outputLabel')}
            description={t('settingsIntegrations.voice.outputDesc')}
            value={settings.outputMode}
            onValueChange={(outputMode) => update({ outputMode: outputMode as VoiceDictationSettings['outputMode'] })}
            options={outputOptions}
          />
        </SettingsCard>
      </SettingsSection>

      {saving && (
        <p className="text-xs text-muted-foreground">{t('settingsIntegrations.voice.saving')}</p>
      )}
    </div>
  )
}
