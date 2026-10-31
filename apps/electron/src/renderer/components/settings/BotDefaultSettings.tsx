/**
 * BotDefaultSettings - 机器人用法与默认配置
 *
 * 跨平台共享的默认设置（如默认工作区）和通用机器人命令说明。
 */

import * as React from 'react'
import { useAtomValue } from 'jotai'
import { toast } from 'sonner'
import { agentWorkspacesAtom } from '@/atoms/agent-atoms'
import { useT } from '@/i18n'
import { SettingsSection } from './primitives/SettingsSection'
import { SettingsCard } from './primitives/SettingsCard'
import { SettingsSelect } from './primitives/SettingsSelect'
import { Button } from '@/components/ui/button'

export function BotDefaultSettings(): React.ReactElement {
  const t = useT()
  const workspaces = useAtomValue(agentWorkspacesAtom)

  const [defaultWorkspaceId, setDefaultWorkspaceId] = React.useState('')
  const [loading, setLoading] = React.useState(true)

  // 加载当前设置
  React.useEffect(() => {
    window.electronAPI.getSettings().then((settings) => {
      setDefaultWorkspaceId(settings.agentWorkspaceId ?? '')
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const workspaceOptions = React.useMemo(
    () => workspaces.map((w) => ({ value: w.id, label: w.name })),
    [workspaces],
  )

  const handleSave = React.useCallback(async () => {
    try {
      await window.electronAPI.updateSettings({
        agentWorkspaceId: defaultWorkspaceId || undefined,
      })
      toast.success(t('settings.bots.defaultsSaved'))
    } catch {
      toast.error(t('settings.bots.saveFailed'))
    }
  }, [defaultWorkspaceId, t])

  if (loading) return <div className="py-8 text-center text-muted-foreground text-sm">{t('common.loading')}</div>

  return (
    <>
      <SettingsSection
        title={t('settings.bots.defaultsTitle')}
        description={t('settings.bots.defaultsDesc')}
      >
        <SettingsCard>
          {workspaceOptions.length > 0 ? (
            <SettingsSelect
              label={t('settings.bots.defaultProject')}
              description={t('settings.bots.defaultProjectDesc')}
              value={defaultWorkspaceId}
              onValueChange={setDefaultWorkspaceId}
              options={workspaceOptions}
              placeholder={t('settings.bots.selectProject')}
            />
          ) : (
            <div className="py-3 text-sm text-muted-foreground">
              {t('settings.bots.noProjects')}
            </div>
          )}
        </SettingsCard>

        <div className="flex items-center mt-3">
          <Button size="sm" onClick={handleSave}>
            {t('settings.bots.saveDefaults')}
          </Button>
        </div>
      </SettingsSection>

      <div className="my-6 border-t border-border/50" />

      <SettingsSection
        title={t('settings.bots.commandsTitle')}
        description={t('settings.bots.commandsDesc')}
      >
        <SettingsCard divided={false}>
          <div className="px-4 py-3 space-y-2 text-sm text-muted-foreground">
            <div className="grid grid-cols-[140px_1fr] gap-y-1.5 gap-x-4">
              <code className="text-foreground/80 font-mono">/help (/h)</code>
              <span>{t('settings.bots.cmdHelp')}</span>
              <code className="text-foreground/80 font-mono">/new (/n)</code>
              <span>{t('settings.bots.cmdNew')}</span>
              <code className="text-foreground/80 font-mono">/list (/ls)</code>
              <span>{t('settings.bots.cmdList')}</span>
              <code className="text-foreground/80 font-mono">/stop (/s)</code>
              <span>{t('settings.bots.cmdStop')}</span>
              <code className="text-foreground/80 font-mono">/switch (/sw)</code>
              <span>{t('settings.bots.cmdSwitch')}</span>
              <code className="text-foreground/80 font-mono">/workspace (/ws)</code>
              <span>{t('settings.bots.cmdWorkspace')}</span>
              <code className="text-foreground/80 font-mono">/model (/m)</code>
              <span>{t('settings.bots.cmdModel')}</span>
              <code className="text-foreground/80 font-mono">/now</code>
              <span>{t('settings.bots.cmdNow')}</span>
            </div>
            <p className="pt-2 text-xs">
              {t('settings.bots.directTextHint')}
            </p>
          </div>
        </SettingsCard>
      </SettingsSection>
    </>
  )
}
