/**
 * GeneralSettings - 通用设置页
 *
 * 顶部：用户档案编辑（头像 + 用户名）
 * 下方：语言等通用设置
 */

import * as React from 'react'
import { useAtom, useAtomValue } from 'jotai'
import { Camera, Check, ExternalLink, ImagePlus, Play, Volume2 } from 'lucide-react'
import Picker from '@emoji-mart/react'
import data from '@emoji-mart/data'
import {
  SettingsSection,
  SettingsCard,
  SettingsRow,
  SettingsToggle,
} from './primitives'
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { UserAvatar } from '../chat/UserAvatar'
import { userProfileAtom } from '@/atoms/user-profile'
import {
  notificationsEnabledAtom,
  notificationSoundEnabledAtom,
  notificationSoundsAtom,
  updateNotificationsEnabled,
  updateNotificationSoundEnabled,
  updateNotificationSound,
  playNotificationSound,
  NOTIFICATION_SOUNDS,
  DEFAULT_NOTIFICATION_SOUNDS,
} from '@/atoms/notifications'
import {
  longTextPasteAsAttachmentEnabledAtom,
  richTextRenderingEnabledAtom,
  sessionHoverPreviewEnabledAtom,
  productivityToolsAtom,
  updateProductivityTools,
  updateLongTextPasteAsAttachmentEnabled,
  updateRichTextRenderingEnabled,
  updateSessionHoverPreviewEnabled,
} from '@/atoms/ui-preferences'
import { cn } from '@/lib/utils'
import { detectIsMac, detectIsWindows } from '@/lib/platform'
import { getEffectiveSoundPackId } from '@/lib/notification-sound-selection'
import { toast } from 'sonner'
import { useT } from '@/i18n'
import { isAppLanguage } from '@/i18n/types'
import { languagePreferenceAtom, resolvedLanguageAtom, updateLanguagePreference } from '@/atoms/language'
import type { NotificationSoundId, NotificationSoundType, NotificationSoundSettings, ProductivityToolsSettings } from '@/types/settings'

/** emoji-mart 选择回调的 emoji 对象类型 */
interface EmojiMartEmoji {
  id: string
  name: string
  native: string
  unified: string
  keywords: string[]
  shortcodes: string
}

export function GeneralSettings(): React.ReactElement {
  const t = useT()
  const [userProfile, setUserProfile] = useAtom(userProfileAtom)
  const [notificationsEnabled, setNotificationsEnabled] = useAtom(notificationsEnabledAtom)
  const [notificationSoundEnabled, setNotificationSoundEnabled] = useAtom(notificationSoundEnabledAtom)
  const [notificationSounds, setNotificationSounds] = useAtom(notificationSoundsAtom)
  const [longTextPasteAsAttachmentEnabled, setLongTextPasteAsAttachmentEnabled] = useAtom(longTextPasteAsAttachmentEnabledAtom)
  const [richTextRenderingEnabled, setRichTextRenderingEnabled] = useAtom(richTextRenderingEnabledAtom)
  const [sessionHoverPreviewEnabled, setSessionHoverPreviewEnabled] = useAtom(sessionHoverPreviewEnabledAtom)
  const [productivityTools, setProductivityTools] = useAtom(productivityToolsAtom)
  const [languagePreference, setLanguagePreference] = useAtom(languagePreferenceAtom)
  const resolvedLanguage = useAtomValue(resolvedLanguageAtom)
  const [isEditingName, setIsEditingName] = React.useState(false)
  const [nameInput, setNameInput] = React.useState(userProfile.userName)
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false)
  const [archiveAfterDays, setArchiveAfterDays] = React.useState<number>(7)
  /** Git/PR 推广标识：默认开启 */
  const [gitAttributionEnabled, setGitAttributionEnabled] = React.useState(true)
  const [agentIslandEnabled, setAgentIslandEnabled] = React.useState(true)
  const isMac = React.useMemo(() => detectIsMac(), [])
  const isWindows = React.useMemo(() => detectIsWindows(), [])
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // 加载归档天数与 Git/PR 标识设置
  React.useEffect(() => {
    window.electronAPI.getSettings().then((settings) => {
      setArchiveAfterDays(settings.archiveAfterDays ?? 7)
      setGitAttributionEnabled(settings.gitAttributionEnabled ?? true)
      setAgentIslandEnabled(settings.agentIsland?.enabled ?? true)
    }).catch(console.error)
  }, [])

  /** 更新生产力工具开关；失败时回滚，避免界面和持久化设置不一致。 */
  const handleProductivityToolsChange = async (updates: Partial<ProductivityToolsSettings>): Promise<void> => {
    const previous = productivityTools
    const next = { ...previous, ...updates }
    setProductivityTools(next)
    try {
      await updateProductivityTools(next)
    } catch {
      setProductivityTools(previous)
    }
  }

  /** 更新界面语言；保存失败时回滚 atom 并提示，保留原语言。 */
  const handleLanguageChange = async (value: string): Promise<void> => {
    if (!isAppLanguage(value)) return
    const previous = languagePreference
    setLanguagePreference(value)
    try {
      await updateLanguagePreference(value)
    } catch (error) {
      console.error('[通用设置] 更新语言失败:', error)
      setLanguagePreference(previous)
      toast.error(t('settings.general.language.saveFailed'))
    }
  }

  /** 更新 Git/PR 推广标识开关 */
  const handleGitAttributionChange = async (checked: boolean): Promise<void> => {
    setGitAttributionEnabled(checked)
    try {
      await window.electronAPI.updateSettings({ gitAttributionEnabled: checked })
    } catch (error) {
      console.error('[通用设置] 更新 Git/PR 标识失败:', error)
      setGitAttributionEnabled(!checked)
    }
  }

  /** 更新灵动岛开关 */
  const handleAgentIslandChange = async (checked: boolean): Promise<void> => {
    setAgentIslandEnabled(checked)
    try {
      await window.electronAPI.updateSettings({ agentIsland: { enabled: checked } })
    } catch (error) {
      console.error('[通用设置] 更新 Agent 灵动岛失败:', error)
      setAgentIslandEnabled(!checked)
    }
  }

  /** 更新归档天数 */
  const handleArchiveDaysChange = async (value: string): Promise<void> => {
    const days = parseInt(value, 10)
    setArchiveAfterDays(days)
    try {
      await window.electronAPI.updateSettings({ archiveAfterDays: days })
    } catch (error) {
      console.error('[通用设置] 更新归档天数失败:', error)
    }
  }

  /** 更新头像 */
  const handleAvatarChange = async (avatar: string): Promise<void> => {
    try {
      const updated = await window.electronAPI.updateUserProfile({ avatar })
      setUserProfile(updated)
      setShowEmojiPicker(false)
    } catch (error) {
      console.error('[通用设置] 更新头像失败:', error)
    }
  }

  /** 上传图片作为头像 */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      await handleAvatarChange(dataUrl)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  /** 保存用户名 */
  const handleSaveName = async (): Promise<void> => {
    const trimmed = nameInput.trim()
    if (!trimmed) return

    try {
      const updated = await window.electronAPI.updateUserProfile({ userName: trimmed })
      setUserProfile(updated)
      setIsEditingName(false)
    } catch (error) {
      console.error('[通用设置] 更新用户名失败:', error)
    }
  }

  /** 用户名编辑键盘事件 */
  const handleNameKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      handleSaveName()
    } else if (e.key === 'Escape') {
      setNameInput(userProfile.userName)
      setIsEditingName(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 用户档案区域 */}
      <SettingsSection
        title={t('settings.general.sectionProfile')}
        description={t('settings.general.sectionProfileDesc')}
      >
        <SettingsCard>
          <div className="flex items-center gap-5 px-4 py-4">
            {/* 头像 + Popover emoji 选择器 */}
            <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
              <PopoverTrigger asChild>
                <div className="relative group/avatar cursor-pointer">
                  <UserAvatar avatar={userProfile.avatar} size={64} />
                  {/* 编辑覆盖层 */}
                  <div
                    className={cn(
                      'absolute inset-0 rounded-[20%] flex items-center justify-center',
                      'bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity'
                    )}
                  >
                    <Camera className="size-5 text-white" />
                  </div>
                </div>
              </PopoverTrigger>
              <PopoverContent
                side="right"
                align="start"
                sideOffset={12}
                className="w-auto p-0 border-none shadow-xl"
              >
                <Picker
                  data={data}
                  onEmojiSelect={(emoji: EmojiMartEmoji) => handleAvatarChange(emoji.native)}
                  locale={resolvedLanguage === 'zh-CN' ? 'zh' : 'en'}
                  theme="auto"
                  previewPosition="none"
                  skinTonePosition="search"
                  perLine={8}
                />
                {/* 上传自定义图片 */}
                <div className="px-3 p-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      'w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px]',
                      'text-foreground/60 hover:text-foreground hover:bg-foreground/[0.06] transition-colors'
                    )}
                  >
                    <ImagePlus className="size-4" />
                    {t('settings.general.uploadImage')}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>
              </PopoverContent>
            </Popover>

            {/* 用户名 */}
            <div className="flex-1 min-w-0">
              {isEditingName ? (
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={handleNameKeyDown}
                  maxLength={30}
                  autoFocus
                  className={cn(
                    'text-lg font-semibold text-foreground bg-transparent border-b-2 border-primary',
                    'outline-none w-full max-w-[200px] pb-0.5'
                  )}
                />
              ) : (
                <button
                  onClick={() => {
                    setNameInput(userProfile.userName)
                    setIsEditingName(true)
                  }}
                  className="text-lg font-semibold text-foreground hover:text-primary transition-colors text-left"
                >
                  {userProfile.userName}
                </button>
              )}
              <p className="text-[12px] text-foreground/40 mt-0.5">
                {t('settings.general.profileEditHint')}
              </p>
            </div>
          </div>
        </SettingsCard>
      </SettingsSection>

      {/* 通用设置 */}
      <SettingsSection
        title={t('settings.general.sectionGeneral')}
        description={t('settings.general.sectionGeneralDesc')}
      >
        <SettingsCard>
          <SettingsRow
            label={t('settings.general.language.label')}
            description={t('settings.general.language.description')}
          >
            <Select
              value={languagePreference}
              onValueChange={(value) => { void handleLanguageChange(value) }}
            >
              <SelectTrigger className="w-[160px] h-8 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">{t('settings.general.language.system')}</SelectItem>
                <SelectItem value="zh-CN">{t('settings.general.language.zhCN')}</SelectItem>
                <SelectItem value="en">{t('settings.general.language.en')}</SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>
          <SettingsToggle
            label={t('settings.general.todo')}
            description={t('settings.general.todoDesc')}
            checked={productivityTools.todosEnabled}
            onCheckedChange={(checked) => { void handleProductivityToolsChange({ todosEnabled: checked }) }}
          />
          <SettingsToggle
            label={t('settings.general.calendar')}
            description={t('settings.general.calendarDesc')}
            checked={productivityTools.calendarEnabled}
            onCheckedChange={(checked) => { void handleProductivityToolsChange({ calendarEnabled: checked }) }}
          />
          <SettingsToggle
            label={t('settings.general.obsidian')}
            description={t('settings.general.obsidianDesc')}
            checked={productivityTools.obsidianEnabled}
            onCheckedChange={(checked) => { void handleProductivityToolsChange({ obsidianEnabled: checked }) }}
          />
          <SettingsToggle
            label={t('settings.general.desktopNotifications')}
            description={t('settings.general.desktopNotificationsDesc')}
            checked={notificationsEnabled}
            onCheckedChange={(checked) => {
              setNotificationsEnabled(checked)
              updateNotificationsEnabled(checked)
            }}
          />
          <SettingsToggle
            label={t('settings.general.notificationSound')}
            description={t('settings.general.notificationSoundDesc')}
            checked={notificationSoundEnabled}
            disabled={!notificationsEnabled}
            onCheckedChange={(checked) => {
              setNotificationSoundEnabled(checked)
              updateNotificationSoundEnabled(checked)
            }}
          />
          <SoundLibrary
            sounds={notificationSounds}
            disabled={!notificationsEnabled || !notificationSoundEnabled}
            onSoundChange={async (type, soundId) => {
              const newSounds = await updateNotificationSound(type, soundId, notificationSounds)
              setNotificationSounds(newSounds)
            }}
          />
          <div className="mx-4 mb-3 flex items-start justify-between gap-3 rounded-lg bg-muted/35 px-3 py-2.5 text-xs text-muted-foreground">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <Volume2 className="mt-0.5 size-3.5 shrink-0" />
              <div className="min-w-0">
                <p>{t('settings.general.sfxNotice1')}</p>
                <p className="mt-0.5">{t('settings.general.sfxNotice2')}</p>
              </div>
            </div>
            <a
              href="https://uisfx.com/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-md px-2 text-foreground/70 transition-colors hover:bg-background hover:text-foreground"
            >
              {t('settings.general.sfxViewSource')}
              <ExternalLink className="size-3" />
            </a>
          </div>
          {isWindows && (
            <SettingsToggle
              label={t('settings.general.agentStatusNotification')}
              description={t('settings.general.agentStatusNotificationDesc')}
              checked={agentIslandEnabled}
              disabled={!notificationsEnabled}
              onCheckedChange={(checked) => {
                void handleAgentIslandChange(checked)
              }}
            />
          )}
          <SettingsRow
            label={t('settings.general.autoArchive')}
            description={t('settings.general.autoArchiveDesc')}
          >
            <Select value={String(archiveAfterDays)} onValueChange={handleArchiveDaysChange}>
              <SelectTrigger className="w-[120px] h-8 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">{t('settings.general.archiveDisabled')}</SelectItem>
                <SelectItem value="7">{t('settings.general.archiveDays', { n: 7 })}</SelectItem>
                <SelectItem value="14">{t('settings.general.archiveDays', { n: 14 })}</SelectItem>
                <SelectItem value="30">{t('settings.general.archiveDays', { n: 30 })}</SelectItem>
                <SelectItem value="60">{t('settings.general.archiveDays', { n: 60 })}</SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>
          <SettingsToggle
            label={t('settings.general.longTextPaste')}
            description={t('settings.general.longTextPasteDesc')}
            checked={longTextPasteAsAttachmentEnabled}
            onCheckedChange={(checked) => {
              setLongTextPasteAsAttachmentEnabled(checked)
              updateLongTextPasteAsAttachmentEnabled(checked)
            }}
          />
          <SettingsToggle
            label={t('settings.general.markdownRender')}
            description={t('settings.general.markdownRenderDesc')}
            checked={richTextRenderingEnabled}
            onCheckedChange={(checked) => {
              setRichTextRenderingEnabled(checked)
              updateRichTextRenderingEnabled(checked)
            }}
          />
          <SettingsToggle
            label={t('settings.general.hoverPreview')}
            description={t('settings.general.hoverPreviewDesc')}
            checked={sessionHoverPreviewEnabled}
            onCheckedChange={(checked) => {
              setSessionHoverPreviewEnabled(checked)
              updateSessionHoverPreviewEnabled(checked)
            }}
          />
          {isMac && (
            <SettingsToggle
              label={t('settings.general.agentIsland')}
              description={t('settings.general.agentIslandDesc')}
              checked={agentIslandEnabled}
              onCheckedChange={(checked) => {
                void handleAgentIslandChange(checked)
              }}
            />
          )}
          <SettingsToggle
            label={t('settings.general.gitAttribution')}
            description={t('settings.general.gitAttributionDesc')}
            checked={gitAttributionEnabled}
            onCheckedChange={(checked) => {
              void handleGitAttributionChange(checked)
            }}
          />
        </SettingsCard>
      </SettingsSection>

    </div>
  )
}

// ===== SoundLibrary 内部组件 =====

/** 音效 pack ID（与 types 的 NotificationSoundPackId 同步，用于词典键类型收窄）。 */
const SOUND_PACK_IDS = ['minimal', 'soft', 'glass', 'arcade', 'mechanical', 'organic', 'dreamy', 'scifi', 'rubber', 'cinematic', 'studio', 'zen'] as const
type SoundPackId = typeof SOUND_PACK_IDS[number]
function isSoundPackId(id: string): id is SoundPackId {
  return (SOUND_PACK_IDS as readonly string[]).includes(id)
}

const SOUND_SCENES: Array<{ type: NotificationSoundType; labelKey: 'taskComplete' | 'permissionRequest' | 'exitPlanMode' | 'planningReminder'; shortLabelKey: 'taskCompleteShort' | 'permissionRequestShort' | 'exitPlanModeShort' | 'planningReminderShort' }> = [
  { type: 'taskComplete', labelKey: 'taskComplete', shortLabelKey: 'taskCompleteShort' },
  { type: 'permissionRequest', labelKey: 'permissionRequest', shortLabelKey: 'permissionRequestShort' },
  { type: 'exitPlanMode', labelKey: 'exitPlanMode', shortLabelKey: 'exitPlanModeShort' },
  { type: 'planningReminder', labelKey: 'planningReminder', shortLabelKey: 'planningReminderShort' },
]

interface SoundLibraryProps {
  sounds: NotificationSoundSettings
  disabled: boolean
  onSoundChange: (type: NotificationSoundType, soundId: NotificationSoundId) => void
}

/** 单一 UISFX 风格音效库：场景只切换当前配置，不重复渲染四套卡片。 */
function SoundLibrary({ sounds, disabled, onSoundChange }: SoundLibraryProps): React.ReactElement {
  const t = useT()
  const sceneLabel = (type: NotificationSoundType): string => {
    const key = SOUND_SCENES.find((scene) => scene.type === type)?.labelKey ?? 'taskComplete'
    return t(`notifications.scenes.${key}`)
  }
  const sceneShortLabel = (type: NotificationSoundType): string => {
    const key = SOUND_SCENES.find((scene) => scene.type === type)?.shortLabelKey ?? 'taskCompleteShort'
    return t(`notifications.scenes.${key}`)
  }
  /** 音效 pack 的描述/适用场景走词典；'none' 等非 pack id 返回 null。 */
  const soundPackText = (id: string, field: 'description' | 'bestFor'): string | null => {
    if (!isSoundPackId(id)) return null
    return t(`notifications.soundPacks.${id}.${field}`)
  }
  const [activeType, setActiveType] = React.useState<NotificationSoundType>('taskComplete')
  const currentId = sounds[activeType] ?? DEFAULT_NOTIFICATION_SOUNDS[activeType]
  const currentPackId = currentId === 'none' ? undefined : getEffectiveSoundPackId(currentId)
  const selectedSound = NOTIFICATION_SOUNDS.find((sound) => sound.id === currentPackId) ?? NOTIFICATION_SOUNDS[0]
  if (!selectedSound) throw new Error('通知音 feel 列表不能为空')
  const selectedIndex = NOTIFICATION_SOUNDS.findIndex((sound) => sound.id === selectedSound.id)
  const activeScene = SOUND_SCENES.find((scene) => scene.type === activeType) ?? SOUND_SCENES[0]
  if (!activeScene) throw new Error('通知音场景列表不能为空')

  return (
    <div className={cn('border-t border-border/25 px-4 py-3', disabled && 'opacity-55')}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">{t('notifications.library.title')}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{t('notifications.library.description')}</div>
        </div>
        <a
          href="https://uisfx.com/#sound-library"
          target="_blank"
          rel="noreferrer"
          className="hidden min-h-8 items-center gap-1 rounded-md px-2 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
        >
          {t('notifications.library.uisfxLink')}
          <ExternalLink className="size-3" />
        </a>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-foreground/15 pb-1">
        {SOUND_SCENES.map((scene) => {
          const sceneId = sounds[scene.type] ?? DEFAULT_NOTIFICATION_SOUNDS[scene.type]
          const scenePack = sceneId === 'none' ? undefined : getEffectiveSoundPackId(sceneId)
          const sceneSound = NOTIFICATION_SOUNDS.find((sound) => sound.id === scenePack) ?? NOTIFICATION_SOUNDS[0]
          return (
            <button
              key={scene.type}
              type="button"
              disabled={disabled}
              aria-pressed={activeType === scene.type}
              onClick={() => setActiveType(scene.type)}
              className={cn(
                'flex min-h-9 min-w-[92px] flex-1 items-center justify-between gap-2 border-b-2 px-2 text-left transition-[border-color,background-color,color] duration-150',
                activeType === scene.type ? 'border-foreground bg-muted/55 text-foreground' : 'border-transparent text-muted-foreground hover:bg-muted/35 hover:text-foreground'
              )}
            >
              <span className="truncate text-xs font-medium">{sceneLabel(scene.type)}</span>
              <span className="flex shrink-0 items-center gap-1 text-[10px] uppercase tracking-[0.08em] opacity-75">
                <span className="size-1.5 rounded-full" style={{ backgroundColor: sceneSound?.color }} />
                {sceneId === 'none' ? t('notifications.library.off') : sceneSound?.label}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-3 overflow-hidden border-2 border-foreground/70 bg-background/45 shadow-[4px_4px_0_rgba(122,110,206,0.4)]">
        <div className="grid grid-cols-[88px_1fr_auto] items-center gap-3 px-3 py-2.5 sm:grid-cols-[104px_1fr_auto]">
          <div className="relative aspect-[1.25] overflow-hidden border border-foreground/50 bg-muted">
            <img src={selectedSound.image} alt="" className="size-full object-cover" />
            <span className="absolute left-1 top-1 bg-background/90 px-1 py-0.5 text-[9px] font-semibold tabular-nums">{String(selectedIndex + 1).padStart(2, '0')}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="truncate text-base font-semibold text-foreground">{sceneLabel(activeType)} · {currentId === 'none' ? t('notifications.library.offState') : selectedSound.label}</span>
              <span className="hidden shrink-0 text-[10px] uppercase tracking-[0.12em] text-muted-foreground sm:inline">{selectedSound.duration} S · ONE-SHOT</span>
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">{selectedSound ? soundPackText(selectedSound.id, 'description') : ''}</p>
            <Waveform color={selectedSound.color} />
          </div>
          <button
            type="button"
            disabled={disabled || currentId === 'none'}
            aria-label={t('notifications.library.preview', { name: sceneLabel(activeType) })}
            title={t('notifications.library.preview', { name: sceneLabel(activeType) })}
            onClick={() => { void playNotificationSound(currentId, activeType) }}
            className="inline-flex size-9 items-center justify-center rounded-full bg-foreground text-background transition-[transform,opacity] hover:scale-105 active:scale-[0.96] disabled:opacity-35"
          >
            <Play className="size-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-3 border-t-2 border-foreground/55 sm:grid-cols-4 lg:grid-cols-6">
          {NOTIFICATION_SOUNDS.map((sound, index) => {
            const selected = currentId !== 'none' && sound.id === currentPackId
            return (
              <div key={sound.id} className="relative min-w-0 border-b border-r border-foreground/20 last:border-r-0">
                <button
                  type="button"
                  disabled={disabled}
                  aria-pressed={selected}
                  onClick={() => onSoundChange(activeType, sound.id)}
                  className={cn(
                    'group/card flex min-h-[152px] w-full flex-col bg-background text-left transition-[background-color,transform] duration-150 hover:bg-muted/45 active:scale-[0.98]',
                    selected && 'bg-muted/70'
                  )}
                >
                  <span className="relative block aspect-[1.5] overflow-hidden border-b border-foreground/25">
                    <img src={sound.image} alt="" className="size-full object-cover transition-transform duration-200 group-hover/card:scale-105" />
                    <span className="absolute left-1.5 top-1.5 bg-background/90 px-1 py-0.5 text-[9px] font-semibold tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                    {selected && <Check className="absolute right-1.5 top-1.5 size-3.5 rounded-full bg-foreground p-0.5 text-background" />}
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5 px-2 py-1.5 pr-8">
                    <span className="flex min-w-0 items-center justify-between gap-1">
                      <span className="truncate text-xs font-medium text-foreground">{sound.label}</span>
                      <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: sound.color }} />
                    </span>
                    <span className="truncate text-[10px] leading-4 text-muted-foreground">{soundPackText(sound.id, 'bestFor')}</span>
                  </span>
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  aria-label={t('notifications.library.preview', { name: sound.label })}
                  title={t('notifications.library.preview', { name: sound.label })}
                  onClick={() => { void playNotificationSound(sound.id, activeType) }}
                  className="absolute bottom-1.5 right-1.5 inline-flex size-6 items-center justify-center rounded-full bg-foreground/90 text-background transition-[transform,opacity] hover:scale-105 active:scale-[0.96] disabled:opacity-35"
                >
                  <Play className="size-2.5" />
                </button>
              </div>
            )
          })}
        </div>
        <button
          type="button"
          disabled={disabled}
          aria-pressed={currentId === 'none'}
          onClick={() => onSoundChange(activeType, currentId === 'none' ? DEFAULT_NOTIFICATION_SOUNDS[activeType] : 'none')}
          className="inline-flex min-h-8 items-center gap-1.5 px-3 text-xs text-muted-foreground transition-colors hover:bg-muted/45 hover:text-foreground active:scale-[0.96]"
        >
          <Volume2 className="size-3.5" />
          {currentId === 'none' ? t('notifications.library.restoreDefault') : t('notifications.library.disableScene')}
        </button>
      </div>
    </div>
  )
}

const WAVEFORM_HEIGHTS = [0.35, 0.56, 0.28, 0.72, 0.94, 0.5, 0.78, 0.42, 0.66, 0.9, 0.58, 0.3, 0.7, 0.46, 0.84, 0.62, 0.38, 0.76, 0.52, 0.88, 0.44, 0.68, 0.34, 0.56, 0.8, 0.48, 0.64, 0.3]

function Waveform({ color }: { color: string }): React.ReactElement {
  return (
    <span className="mt-2 flex h-5 w-full items-center gap-px border-b border-foreground/25 pb-1" aria-hidden="true">
      {WAVEFORM_HEIGHTS.map((height, index) => (
        <span key={index} className="w-px shrink-0 rounded-full opacity-85" style={{ height: `${Math.round(height * 14)}px`, backgroundColor: color }} />
      ))}
    </span>
  )
}
