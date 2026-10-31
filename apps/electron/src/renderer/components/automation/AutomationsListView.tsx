/**
 * 定时任务列表视图（codex Automations 风格）
 *
 * 由侧边栏 Automations 入口触发显示，全屏占据中间内容区（隐藏 TabBar）。
 *
 * 结构：
 * - 顶部：标题 "定时任务" + 「+ 新建」按钮
 * - 内容：分组列表
 *   - Current（启用中）：active=true
 *   - Paused（已暂停 / 草稿）：active=false
 * - 每行：名称 + prompt 摘要 + 调度文案
 * - 点击行 → 通过 automationFormAtom 打开编辑表单 overlay
 */

import * as React from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { toast } from 'sonner'
import { Clock, Pause, Play, Power, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { currentLocaleTag, formatDate, t, useT } from '@/i18n'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import {
  automationsAtom,
  automationFormAtom,
  automationToDraft,
  createEmptyDraft,
} from '@/atoms/automation-atoms'
import type { Automation } from '@proma/shared'

/** 星期名的 Intl 基准日：2024-01-07 是周日，按偏移天数生成各语言星期短名。 */
const WEEKDAY_BASE = new Date(2024, 0, 7)

/** 把调度配置格式化为可读文案（与主进程调度器共用 automation.schedule 键） */
function formatSchedule(a: Automation): string {
  if (a.scheduleType === 'once') {
    const when = a.scheduledAt
      ? formatDate(a.scheduledAt, { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      : t('automation.schedule.unspecifiedTime')
    return t('automation.schedule.once', { when })
  }
  if (a.scheduleType === 'daily') return t('automation.schedule.daily', { time: a.timeOfDay ?? '09:00' })
  if (a.scheduleType === 'weekly') {
    const name = new Intl.DateTimeFormat(currentLocaleTag(), { weekday: 'short' }).format(new Date(WEEKDAY_BASE.getTime() + (a.dayOfWeek ?? 1) * 86_400_000))
    return t('automation.schedule.weekly', { name, time: a.timeOfDay ?? '09:00' })
  }
  if (a.scheduleType === 'monthly') {
    const dom = a.dayOfMonth ?? 1
    // 29-31 号在短月会自动落在当月最后一天，列表里追加提示避免用户误以为漏跑
    const suffix = dom >= 29 ? t('automation.ui.shortMonthSuffix') : ''
    return t('automation.schedule.monthly', { day: dom, time: a.timeOfDay ?? '09:00' }) + suffix
  }
  const min = a.intervalMinutes
  let label = min < 60
    ? t('automation.schedule.interval', { n: min, unit: t('automation.schedule.unitMinutes') })
    : min < 1440
      ? t('automation.schedule.interval', { n: min / 60, unit: t('automation.schedule.unitHours') })
      : t('automation.schedule.interval', { n: min / 1440, unit: t('automation.schedule.unitDays') })
  const weekdayLabel = a.activeWeekdays && a.activeWeekdays.length > 0 ? ` · ${formatWeekdays(a.activeWeekdays)}` : ''
  const windowLabel = a.activeWindowStart && a.activeWindowEnd ? ` · ${a.activeWindowStart}–${a.activeWindowEnd}` : ''
  if (weekdayLabel || windowLabel) label += `${weekdayLabel}${windowLabel}`
  // 叠加了运行次数上限时在末尾标注，让列表能看出"跑 N 次就停"
  return a.maxRuns !== undefined ? label + t('automation.schedule.maxRunsSuffix', { n: a.maxRuns }) : label
}

function formatWeekdays(days?: number[]): string {
  const normalized = [...new Set(days ?? [])].sort((a, b) => a - b)
  if (normalized.length === 0) return t('automation.schedule.everyday')
  if (normalized.join(',') === '1,2,3,4,5') return t('automation.schedule.workdays')
  if (normalized.join(',') === '0,6') return t('automation.schedule.weekend')
  // 星期名用 Intl 按当前语言生成，避免维护数组；分隔符随语言区分。
  const formatter = new Intl.DateTimeFormat(currentLocaleTag(), { weekday: 'short' })
  return normalized.map((day) => formatter.format(new Date(WEEKDAY_BASE.getTime() + day * 86_400_000))).join(currentLocaleTag() === 'zh-CN' ? '、' : ', ')
}

/** 转义正则元字符，用于从词典默认名模板推导续编号正则。 */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function formatNextRun(a: Automation): string {
  if (!a.active) return a.completedAt ? t('automation.ui.statusCompleted') : t('automation.ui.statusPaused')
  return t('automation.ui.nextRunPrefix', { time: formatDate(a.nextRunAt, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) })
}

/** 定时任务列表嵌入统一的任务/日程页，页头由父级提供。 */
export function AutomationsListView(): React.ReactElement {
  const t = useT()
  const automations = useAtomValue(automationsAtom)
  const [pendingDeletion, setPendingDeletion] = React.useState<Automation | null>(null)
  const setAutomations = useSetAtom(automationsAtom)
  const setForm = useSetAtom(automationFormAtom)

  const refreshList = React.useCallback(async () => {
    const list = await window.electronAPI.listAutomations()
    setAutomations(list)
  }, [setAutomations])

  const current = automations.filter((a) => a.active)
  // 已完成（once 跑完 / 跑满 maxRuns 自动停用，带 completedAt）单独成组，区别于用户手动暂停 / 草稿
  const completed = automations.filter((a) => !a.active && a.completedAt)
  const paused = automations.filter((a) => !a.active && !a.completedAt)

  const handleCreate = (): void => {
    // 自动命名「定时任务 N」：取现有最大 X + 1；解析正则由同一词典模板推导，保证中英文都能匹配。
    const namePrefix = t('automation.ui.defaultName', { n: '' }).trimEnd()
    const namePattern = new RegExp(`^${escapeRegExp(namePrefix)}\\s*(\\d+)$`)
    let maxN = 0
    for (const a of automations) {
      const m = namePattern.exec(a.name.trim())
      if (m) maxN = Math.max(maxN, Number(m[1]))
    }
    const draft = createEmptyDraft()
    draft.name = t('automation.ui.defaultName', { n: maxN + 1 })
    setForm({ open: true, draft })
  }

  const handleEdit = (a: Automation): void => {
    setForm({ open: true, draft: automationToDraft(a) })
  }
  const confirmDelete = async (): Promise<void> => {
    const automation = pendingDeletion
    if (!automation) return
    try {
      await window.electronAPI.deleteAutomation(automation.id)
      await refreshList()
      setPendingDeletion(null)
      toast.success(t('automation.ui.deleted'))
    } catch (error) {
      console.error('[定时任务] 删除失败:', error)
      toast.error(t('automation.ui.deleteFailed'))
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* 列表内容 */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {automations.length === 0 ? (
          <EmptyState onCreate={handleCreate} />
        ) : (
          <div className="flex w-full flex-col gap-8 pb-8">
            {current.length > 0 && (
              <Section title={t('automation.ui.groups.active')} automations={current} onEdit={handleEdit} onRefresh={refreshList} onDelete={setPendingDeletion} />
            )}
            {paused.length > 0 && (
              <Section title={t('automation.ui.groups.paused')} automations={paused} onEdit={handleEdit} onRefresh={refreshList} onDelete={setPendingDeletion} />
            )}
            {completed.length > 0 && (
              <Section title={t('automation.ui.groups.completed')} automations={completed} onEdit={handleEdit} onRefresh={refreshList} onDelete={setPendingDeletion} />
            )}
          </div>
        )}
      </div>
      <AlertDialog open={pendingDeletion !== null} onOpenChange={(open) => { if (!open) setPendingDeletion(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t('automation.ui.deleteTitle')}</AlertDialogTitle><AlertDialogDescription>{t('planning.ui.deleteConfirmDescription', { name: pendingDeletion?.name ?? '' })}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => void confirmDelete()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t('common.delete')}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface SectionProps {
  title: string
  automations: Automation[]
  onEdit: (a: Automation) => void
  onRefresh: () => Promise<void>
  onDelete: (a: Automation) => void
}

function Section({ title, automations, onEdit, onRefresh, onDelete }: SectionProps): React.ReactElement {
  const t = useT()

  /** 列表上的任务是否具备运行 / 启用所需的最小完整度 */
  const isRunnable = (a: Automation): boolean => !!a.channelId && !!a.workspaceId

  const handleRunNow = async (e: React.MouseEvent, a: Automation): Promise<void> => {
    e.stopPropagation()
    if (!isRunnable(a)) {
      toast.error(t('automation.ui.notRunnable'))
      onEdit(a)
      return
    }
    toast.success(t('automation.ui.startedRun', { name: a.name }), {
      description: t('automation.ui.runCreatedDescription'),
    })
    try {
      await window.electronAPI.runAutomationNow(a.id)
    } catch (err) {
      toast.error(t('automation.ui.runFailed'))
      console.error('[定时任务] 立即运行失败:', err)
    }
  }

  const handleToggle = async (e: React.MouseEvent, a: Automation): Promise<void> => {
    e.stopPropagation()
    // 启用前必须配齐模型与项目，否则打开编辑面板让用户补全
    if (!a.active && !isRunnable(a)) {
      toast.error(t('automation.ui.notRunnable'))
      onEdit(a)
      return
    }
    try {
      await window.electronAPI.toggleAutomation(a.id, !a.active)
      await onRefresh()
      toast.success(a.active ? t('automation.ui.pausedToast') : t('common.enabled'))
    } catch (err) {
      toast.error(t('automation.ui.toggleFailed'))
      console.error('[定时任务] 切换状态失败:', err)
    }
  }

  const handleDelete = (event: React.MouseEvent, automation: Automation): void => {
    event.stopPropagation()
    onDelete(automation)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[13px] font-medium text-foreground/55 px-1">{title}</div>
      <div className="overflow-hidden rounded-none border border-border/60 bg-card">
        {automations.map((a, i) => (
          // 行容器：用 div + role=button，避免与内部 button（立即运行/删除/暂停）
          // 形成嵌套 button 的非法 HTML，同时通过 keyDown 维持键盘可达。
          <div
            key={a.id}
            role="button"
            tabIndex={0}
            onClick={() => onEdit(a)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onEdit(a)
              }
            }}
            className={cn(
              'group w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 cursor-pointer focus:outline-none focus-visible:bg-muted/50',
              i > 0 && 'border-t border-border/60',
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-[14px] font-medium text-foreground truncate">{a.name}</span>
                <span className="text-[12px] text-foreground/45 truncate">
                  {a.prompt.slice(0, 60)}{a.prompt.length > 60 ? '…' : ''}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Clock className="size-3" />{formatSchedule(a)}</span>
                <span className="tabular-nums">{formatNextRun(a)}</span>
              </div>
            </div>
            {/* 右侧槽位固定宽度，只在悬浮时显示行操作，避免改变列表布局。 */}
            <div className="relative h-7 w-16 shrink-0">
              <div className="pointer-events-none absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={t('automation.ui.runNowAria', { name: a.name })}
                      onClick={(e) => { void handleRunNow(e, a) }}
                      className="p-1.5 rounded-md text-foreground/50 hover:text-foreground/85 hover:bg-foreground/[0.08] transition-colors"
                    >
                      <Play className="size-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{t('automation.ui.runNowTooltip')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={t('planning.ui.deleteItemAria', { name: a.name })}
                      onClick={(e) => handleDelete(e, a)}
                      className="p-1.5 rounded-md text-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{t('automation.ui.deleteTooltip')}</TooltipContent>
                </Tooltip>
              </div>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={a.active ? t('automation.ui.pauseAria', { name: a.name }) : t('automation.ui.enableAria', { name: a.name })}
                  onClick={(e) => { void handleToggle(e, a) }}
                  className={cn(
                    'p-1.5 -m-1.5 shrink-0 flex items-center justify-center rounded-md transition-colors',
                    a.active
                      ? 'text-foreground/35 hover:bg-foreground/[0.06] hover:text-foreground/70 group-hover:text-foreground/55'
                      : 'text-foreground/30 hover:bg-emerald-500/10 hover:text-emerald-500 group-hover:text-foreground/45',
                  )}
                >
                  {a.active ? <Pause className="size-3.5" /> : <Power className="size-3.5" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {a.active ? t('automation.ui.pauseTooltip') : t('automation.ui.enableTooltip')}
              </TooltipContent>
            </Tooltip>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }): React.ReactElement {
  const t = useT()
  return (
    <div className="max-w-2xl mx-auto pt-24 flex flex-col items-center text-center gap-4">
      <div className="size-16 rounded-2xl bg-foreground/[0.04] flex items-center justify-center">
        <Clock className="size-8 text-foreground/30" />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="text-[16px] font-medium text-foreground/85">{t('automation.ui.emptyTitle')}</div>
        <div className="text-[13px] text-foreground/50 leading-relaxed max-w-md">
          {t('automation.ui.emptyDescription')}
        </div>
      </div>
      <button
        type="button"
        onClick={onCreate}
	        className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-md text-[13px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
      >
        <Plus size={14} />
        <span>{t('automation.ui.createButton')}</span>
      </button>
    </div>
  )
}
