/**
 * ShortcutGuideDialog - 只读快捷键地图。
 *
 * 与设置中的快捷键管理保持分离：这里用于快速学习和查阅，始终展示当前平台实际生效的按键。
 */

import * as React from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { AppWindow, Compass, Globe2, Keyboard, PencilLine, X } from 'lucide-react'
import { useT } from '@/i18n'
import type { MessageKey } from '@/i18n'
import { shortcutGuideOpenAtom } from '@/atoms/shortcut-guide'
import { shortcutOverridesAtom, sendWithCmdEnterAtom } from '@/atoms/shortcut-atoms'
import { cn } from '@/lib/utils'
import { iconButtonNoRingFocusClass } from '@/components/ui/icon-button-styles'
import {
  DEFAULT_SHORTCUTS,
  SHORTCUT_CATEGORY_LABELS,
} from '@/lib/shortcut-defaults'
import type { ShortcutCategory } from '@/lib/shortcut-defaults'
import {
  getAcceleratorDisplay,
  getActiveAccelerator,
  isMac,
} from '@/lib/shortcut-registry'

interface ShortcutGuideItem {
  id: string
  /** 词典键优先；来自 shortcut-defaults 的外部数据暂无键，回退 name/description 原文。 */
  nameKey?: MessageKey
  name?: string
  descriptionKey?: MessageKey
  description?: string
  accelerator: string | null
  /** `undefined` 为非全局快捷键或状态查询失败，`null` 为正在查询。 */
  globalRegistration?: boolean | null
}

const CATEGORY_ORDER: ShortcutCategory[] = ['app', 'navigation', 'edit', 'global']

const SHORTCUT_DISPLAY_ORDER: Record<ShortcutCategory, readonly string[]> = {
  app: [
    'new-session',
    'toggle-sidebar',
    'zoom-in',
    'zoom-out',
    'reset-zoom',
    'open-settings',
    'toggle-mode',
    'close-tab',
    'toggle-right-panel',
  ],
  navigation: [
    'cycle-sessions',
    'quick-switch-session',
    'file-find',
    'global-search',
    'focus-input',
    'toggle-preview-panel',
  ],
  edit: [
    'clear-context',
    'stop-generation',
    'send-message',
    'insert-line-break',
    'editor-bold',
    'editor-strikethrough',
  ],
  global: ['quick-task', 'show-main-window', 'voice-dictation'],
}

const CATEGORY_ICONS: Record<ShortcutCategory, React.ComponentType<{ className?: string }>> = {
  app: AppWindow,
  navigation: Compass,
  edit: PencilLine,
  global: Globe2,
}

function ShortcutKeys({ accelerator }: { accelerator: string | null }): React.ReactElement {
  const t = useT()
  if (accelerator === null) {
    return <span className="text-[11px] font-medium text-muted-foreground">{t('onboarding.shortcuts.disabled')}</span>
  }

  return (
    <span className="flex flex-wrap justify-end gap-1" aria-label={getAcceleratorDisplay(accelerator)}>
      {accelerator.split('+').filter(Boolean).map((key, index) => (
        <kbd
          key={`${key}-${index}`}
          className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-background px-1.5 text-center font-[system-ui] text-[11px] font-medium leading-4 text-foreground shadow-sm ring-1 ring-border/60"
        >
          {getAcceleratorDisplay(key)}
        </kbd>
      ))}
    </span>
  )
}

function ShortcutTile({ item }: { item: ShortcutGuideItem }): React.ReactElement {
  const t = useT()
  const disabled = item.accelerator === null
  const unavailable = item.globalRegistration === false
  const globalStatus = item.globalRegistration === null
    ? t('onboarding.shortcuts.globalChecking')
    : item.globalRegistration
      ? t('onboarding.shortcuts.globalActive')
      : item.globalRegistration === false
        ? t('onboarding.shortcuts.globalUnregistered')
        : null

  return (
    <div
      className={cn(
        'min-w-0 rounded-lg bg-muted/65 px-3 py-2.5 transition-colors',
        (disabled || unavailable) && 'opacity-45',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0 text-sm font-medium leading-5 text-foreground">{item.nameKey ? t(item.nameKey) : item.name}</span>
        <ShortcutKeys accelerator={item.accelerator} />
      </div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <p className="text-xs leading-4 text-muted-foreground">{item.descriptionKey ? t(item.descriptionKey) : item.description}</p>
        {globalStatus && (
          <span className={cn(
            'text-[11px] leading-4',
            unavailable ? 'text-destructive' : 'text-muted-foreground/75',
          )}>
            {globalStatus}
          </span>
        )}
      </div>
    </div>
  )
}

export function ShortcutGuideDialog(): React.ReactElement {
  const t = useT()
  const open = useAtomValue(shortcutGuideOpenAtom)
  const setOpen = useSetAtom(shortcutGuideOpenAtom)
  const overrides = useAtomValue(shortcutOverridesAtom)
  const sendWithCmdEnter = useAtomValue(sendWithCmdEnterAtom)
  const [globalShortcutStatus, setGlobalShortcutStatus] = React.useState<Record<string, boolean> | null>(null)

  React.useEffect(() => {
    if (!open) return

    let disposed = false
    setGlobalShortcutStatus(null)
    window.electronAPI.getGlobalShortcutRegistrationStatus()
      .then((status) => {
        if (!disposed) setGlobalShortcutStatus(status)
      })
      .catch((error) => {
        console.error('[快捷键地图] 查询全局快捷键状态失败:', error)
        if (!disposed) setGlobalShortcutStatus({})
      })

    return () => {
      disposed = true
    }
  }, [open])

  const shortcutGroups = React.useMemo(() => {
    const groups = new Map<ShortcutCategory, ShortcutGuideItem[]>(
      CATEGORY_ORDER.map((category) => [category, []]),
    )

    for (const definition of DEFAULT_SHORTCUTS) {
      const accelerator = getActiveAccelerator(definition.id)
      // 当前平台不存在的只读组合无需占据地图空间；用户禁用的可编辑组合仍需保留。
      if (accelerator === '') continue
      groups.get(definition.category)?.push({
        id: definition.id,
        name: definition.name,
        description: definition.description,
        accelerator,
        globalRegistration: definition.global
          ? globalShortcutStatus === null
            ? null
            : globalShortcutStatus[definition.id]
          : undefined,
      })
    }

    const primaryModifier = isMac ? 'Cmd' : 'Ctrl'
    groups.get('navigation')?.push(
      {
        id: 'quick-switch-session',
        nameKey: 'onboarding.shortcuts.directSession',
        descriptionKey: 'onboarding.shortcuts.directSessionDesc',
        accelerator: `${primaryModifier}+1-9`,
      },
      {
        id: 'cycle-sessions',
        nameKey: 'onboarding.shortcuts.cycleSessions',
        descriptionKey: 'onboarding.shortcuts.cycleSessionsDesc',
        accelerator: 'Ctrl+Tab',
      },
    )
    groups.get('edit')?.push(
      {
        id: 'send-message',
        nameKey: 'onboarding.shortcuts.sendMessage',
        descriptionKey: 'onboarding.shortcuts.sendMessageDesc',
        accelerator: sendWithCmdEnter ? `${primaryModifier}+Enter` : 'Enter',
      },
      {
        id: 'insert-line-break',
        nameKey: 'onboarding.shortcuts.insertLineBreak',
        descriptionKey: 'onboarding.shortcuts.insertLineBreakDesc',
        accelerator: sendWithCmdEnter ? 'Enter' : 'Shift+Enter',
      },
    )

    for (const category of CATEGORY_ORDER) {
      const rank = new Map(SHORTCUT_DISPLAY_ORDER[category].map((id, index) => [id, index]))
      groups.get(category)?.sort((left, right) => (rank.get(left.id) ?? Infinity) - (rank.get(right.id) ?? Infinity))
    }

    return groups
  }, [overrides, sendWithCmdEnter, globalShortcutStatus])

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-black/40 titlebar-no-drag transition-opacity duration-100 data-[state=open]:opacity-100 data-[state=closed]:opacity-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-[100] flex h-[85vh] max-h-[752px] w-[85vw] max-w-[992px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-dialog text-dialog-foreground shadow-2xl titlebar-no-drag transition-all duration-100 data-[state=open]:opacity-100 data-[state=open]:scale-100 data-[state=closed]:opacity-0 data-[state=closed]:scale-[0.98]"
        >
          <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border/50 px-6">
            <div className="flex items-center gap-3">
              <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Keyboard className="size-4" />
              </span>
              <div>
                <DialogPrimitive.Title className="text-sm font-medium text-foreground">{t('onboarding.shortcuts.title')}</DialogPrimitive.Title>
                <p className="text-xs text-muted-foreground">{isMac ? t('onboarding.shortcuts.macKeys') : t('onboarding.shortcuts.currentKeys')}</p>
              </div>
            </div>
            <DialogPrimitive.Close
              className={cn(
                'rounded-md p-1.5 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground',
                'focus-visible:bg-muted focus-visible:text-foreground',
                iconButtonNoRingFocusClass,
              )}
              aria-label={t('onboarding.shortcuts.closeAria')}
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>

          <div className="grid flex-1 grid-cols-1 content-start gap-x-8 gap-y-7 overflow-y-auto px-6 py-6 lg:grid-cols-2">
            {CATEGORY_ORDER.map((category) => {
              const shortcuts = shortcutGroups.get(category) ?? []
              if (shortcuts.length === 0) return null

              const Icon = CATEGORY_ICONS[category]
              return (
                <section key={category} aria-labelledby={`shortcut-category-${category}`}>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Icon className="size-3.5" />
                    </span>
                    <h2 id={`shortcut-category-${category}`} className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {t(SHORTCUT_CATEGORY_LABELS[category])}
                    </h2>
                    {category === 'global' && (
                      <span className="text-[11px] text-muted-foreground/75">{t('onboarding.shortcuts.systemStatus')}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {shortcuts.map((shortcut) => <ShortcutTile key={shortcut.id} item={shortcut} />)}
                  </div>
                </section>
              )
            })}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
