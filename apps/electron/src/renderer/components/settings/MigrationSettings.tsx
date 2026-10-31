import * as React from 'react'
import { Copy, FolderOpen } from 'lucide-react'
import { toast } from 'sonner'
import { SettingsSection } from './primitives'
import { copyTextToClipboard } from '@/lib/clipboard'
import { useT } from '@/i18n'

export function MigrationSettings(): React.ReactElement {
  const t = useT()
  // 提示词在渲染期求值，语言切换时随组件重渲染更新
  const archivePrompt = t('settingsMisc.migration.archivePrompt')
  const restorePrompt = t('settingsMisc.migration.restorePrompt')

  const handleOpenDataFolder = async (): Promise<void> => {
    try {
      await window.electronAPI.openMigrationDataFolder()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('settingsMisc.migration.openFolderFailed'))
    }
  }

  const handleCopyPrompt = (prompt: string, successMessage: string): void => {
    void copyTextToClipboard(prompt).then(
      () => toast.success(successMessage),
      () => toast.error(t('settingsMisc.migration.copyFailed')),
    )
  }

  const handleCopyArchivePrompt = (): void => {
    handleCopyPrompt(archivePrompt, t('settingsMisc.migration.archivePromptCopied'))
  }

  const handleCopyRestorePrompt = (): void => {
    handleCopyPrompt(restorePrompt, t('settingsMisc.migration.restorePromptCopied'))
  }

  return (
    <div className="space-y-8">
      <SettingsSection
        title={t('settingsMisc.migration.title')}
        description={t('settingsMisc.migration.titleDesc')}
      >
        <ol className="space-y-3 text-sm leading-6 text-muted-foreground">
          <li className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">1</span>
            <span>{t('settingsMisc.migration.step1')}</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">2</span>
            <span>{t('settingsMisc.migration.step2')}</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">3</span>
            <span>{t('settingsMisc.migration.step3')}</span>
          </li>
        </ol>
      </SettingsSection>

      <SettingsSection
        title={t('settingsMisc.migration.createTitle')}
        description={t('settingsMisc.migration.createDesc')}
      >
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => void handleOpenDataFolder()}
            className="flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.96]"
          >
            <FolderOpen size={16} />
            {t('settingsMisc.migration.openDataFolder')}
          </button>
          <button
            onClick={handleCopyArchivePrompt}
            className="flex min-h-10 items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/60 active:scale-[0.96]"
          >
            <Copy size={16} />
            {t('settingsMisc.migration.copyArchivePrompt')}
          </button>
        </div>
      </SettingsSection>

      <SettingsSection
        title={t('settingsMisc.migration.restoreTitle')}
        description={t('settingsMisc.migration.restoreDesc')}
      >
        <div className="relative rounded-lg border border-border/60 bg-muted/30 p-4 pr-14">
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6 text-muted-foreground">{restorePrompt}</pre>
          <button
            aria-label={t('settingsMisc.migration.copyRestorePrompt')}
            title={t('settingsMisc.migration.copyRestorePrompt')}
            onClick={handleCopyRestorePrompt}
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground active:scale-[0.96]"
          >
            <Copy size={16} />
          </button>
        </div>
      </SettingsSection>

      <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-800 dark:text-amber-200">
        {t('settingsMisc.migration.warning')}
      </div>
    </div>
  )
}
