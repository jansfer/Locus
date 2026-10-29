/**
 * 定时任务「启动补跑」判定。
 *
 * 应用退出期间到期的任务不会被调度器看到。重启时如果直接把 nextRunAt 顺延到未来，
 * 这一轮就彻底丢了；这里的判定决定哪些过期任务值得在启动后补跑一次。
 *
 * 判定规则：
 * - 只处理 active 且具备运行条件（渠道 + 工作区）的任务；与 tick 的兜底保持一致
 * - 只看已经过期的 nextRunAt；未来任务不补跑
 * - once / daily / weekly / monthly 一律补跑：错过的那次就是用户要的结果
 * - interval 仅当当前时刻仍落在「每日执行窗口 + 运行日」内才补跑；
 *   例如 10:00–22:00 每 20 分钟的任务，23:00 启动不应在窗口外跑一轮
 */

import type { Automation } from '@proma/shared'

/** 判定所需的最小字段集合，便于单测与复用 */
export type CatchUpCandidate = Pick<
  Automation,
  'active' | 'channelId' | 'workspaceId' | 'scheduleType' | 'nextRunAt'
> &
  Partial<Pick<Automation, 'activeWindowStart' | 'activeWindowEnd' | 'activeWeekdays'>>

/** 启动补跑计划：需要补跑的任务，以及需要把 nextRunAt 推进到未来的任务 */
export interface StartupCatchUpPlan<T extends CatchUpCandidate> {
  catchUps: Array<{ automation: T; missedAt: number }>
  reschedules: Array<{ automation: T; nextRunAt: number }>
}

interface ExecutionWindow {
  startMinute: number
  endMinute: number
}

function parseTimeOfDay(value: string | undefined): number | undefined {
  if (!value || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) return undefined
  const [hours, minutes] = value.split(':').map(Number)
  return hours! * 60 + minutes!
}

/** 解析每日执行窗口；配置缺失或不合法时视为没有窗口限制 */
function parseExecutionWindow(start: string | undefined, end: string | undefined): ExecutionWindow | undefined {
  const startMinute = parseTimeOfDay(start)
  const endMinute = parseTimeOfDay(end)
  if (startMinute === undefined || endMinute === undefined) return undefined
  if (startMinute >= endMinute) return undefined
  return { startMinute, endMinute }
}

function normalizeWeekdays(days: number[] | undefined): number[] {
  return [...new Set((days ?? []).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))]
}

/**
 * 当前时刻是否处于 interval 任务允许执行的时间槽。
 * 没有窗口 / 运行日限制时始终为 true。
 */
export function isWithinIntervalExecutionSlot(automation: CatchUpCandidate, at: number): boolean {
  const date = new Date(at)
  const weekdays = normalizeWeekdays(automation.activeWeekdays)
  if (weekdays.length > 0 && !weekdays.includes(date.getDay())) return false

  const window = parseExecutionWindow(automation.activeWindowStart, automation.activeWindowEnd)
  if (!window) return true

  const minuteOfDay = date.getHours() * 60 + date.getMinutes()
  return minuteOfDay >= window.startMinute && minuteOfDay < window.endMinute
}

/**
 * 该任务在启动时是否需要补跑一次。
 *
 * 只补最近错过的一轮：即使应用关闭了几天，也最多执行一次，避免启动后连环触发。
 */
export function shouldCatchUpAutomation(automation: CatchUpCandidate, now: number): boolean {
  if (!automation.active) return false
  if (!automation.channelId || !automation.workspaceId) return false
  if (!Number.isFinite(automation.nextRunAt) || automation.nextRunAt > now) return false
  if (automation.scheduleType !== 'interval') return true
  return isWithinIntervalExecutionSlot(automation, now)
}

/**
 * 生成启动补跑计划。
 *
 * - 需要补跑的任务进入 catchUps（调用方按顺序串行执行）
 * - 除 once 外的过期任务都要把 nextRunAt 推进到未来，避免 tick 与补跑重复触发
 * - once 的 nextRunAt 固定等于 scheduledAt，补跑结束后由 appendRun 自动停用
 */
export function planStartupCatchUps<T extends CatchUpCandidate>(
  automations: readonly T[],
  now: number,
  computeNextRunAt: (automation: T, now: number) => number,
): StartupCatchUpPlan<T> {
  const catchUps: StartupCatchUpPlan<T>['catchUps'] = []
  const reschedules: StartupCatchUpPlan<T>['reschedules'] = []

  for (const automation of automations) {
    if (!automation.active) continue
    if (!automation.channelId || !automation.workspaceId) continue
    if (!Number.isFinite(automation.nextRunAt) || automation.nextRunAt > now) continue

    if (shouldCatchUpAutomation(automation, now)) {
      catchUps.push({ automation, missedAt: automation.nextRunAt })
    }
    if (automation.scheduleType !== 'once') {
      reschedules.push({ automation, nextRunAt: computeNextRunAt(automation, now) })
    }
  }

  return { catchUps, reschedules }
}
