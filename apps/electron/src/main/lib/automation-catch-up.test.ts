import { describe, expect, test } from 'bun:test'
import {
  isWithinIntervalExecutionSlot,
  planStartupCatchUps,
  shouldCatchUpAutomation,
  type CatchUpCandidate,
} from './automation-catch-up'

/** 本地时间构造，避免测试依赖运行机器的时区 */
function localTime(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): number {
  return new Date(year, month - 1, day, hour, minute, 0, 0).getTime()
}

const MISSED_AT = localTime(2026, 10, 28, 9, 0)

function candidate(overrides: Partial<CatchUpCandidate> = {}): CatchUpCandidate {
  return {
    active: true,
    channelId: 'channel-1',
    workspaceId: 'workspace-1',
    scheduleType: 'daily',
    nextRunAt: MISSED_AT,
    ...overrides,
  }
}

describe('启动补跑判定', () => {
  test('given daily 任务已过期 when 应用启动 then 需要补跑', () => {
    expect(shouldCatchUpAutomation(candidate(), localTime(2026, 10, 29, 20, 0))).toBe(true)
  })

  test('given 任务已暂停 when 应用启动 then 不补跑', () => {
    expect(shouldCatchUpAutomation(
      candidate({ active: false }),
      localTime(2026, 10, 29, 20, 0),
    )).toBe(false)
  })

  test('given 任务缺少渠道或工作区 when 应用启动 then 不补跑', () => {
    const now = localTime(2026, 10, 29, 20, 0)
    expect(shouldCatchUpAutomation(candidate({ channelId: '' }), now)).toBe(false)
    expect(shouldCatchUpAutomation(candidate({ workspaceId: undefined }), now)).toBe(false)
  })

  test('given 下次触发仍在未来 when 应用启动 then 不补跑', () => {
    const now = localTime(2026, 10, 29, 20, 0)
    expect(shouldCatchUpAutomation(candidate({ nextRunAt: now + 60_000 }), now)).toBe(false)
  })

  test('given once 任务已过期且未执行 when 应用启动 then 补跑一次', () => {
    expect(shouldCatchUpAutomation(
      candidate({ scheduleType: 'once', nextRunAt: localTime(2026, 10, 20, 9, 0) }),
      localTime(2026, 10, 29, 20, 0),
    )).toBe(true)
  })

  test('given interval 无窗口限制 when 应用启动 then 补跑一次', () => {
    expect(shouldCatchUpAutomation(
      candidate({ scheduleType: 'interval' }),
      localTime(2026, 10, 29, 20, 0),
    )).toBe(true)
  })

  test('given interval 配置了运行日 when 启动日不在运行日内 then 不补跑', () => {
    const automation = candidate({
      scheduleType: 'interval',
      activeWeekdays: [1, 2, 3, 4, 5],
    })
    // 2026-10-31 是周六，2026-11-02 是周一
    expect(isWithinIntervalExecutionSlot(automation, localTime(2026, 10, 31, 10, 0))).toBe(false)
    expect(isWithinIntervalExecutionSlot(automation, localTime(2026, 11, 2, 10, 0))).toBe(true)
  })

  test('given interval 配置每日窗口 when 启动时刻在窗口内 then 补跑', () => {
    const automation = candidate({
      scheduleType: 'interval',
      activeWindowStart: '10:00',
      activeWindowEnd: '22:00',
    })
    expect(isWithinIntervalExecutionSlot(automation, localTime(2026, 10, 29, 10, 0))).toBe(true)
    expect(isWithinIntervalExecutionSlot(automation, localTime(2026, 10, 29, 21, 59))).toBe(true)
  })

  test('given interval 配置每日窗口 when 启动时刻不在窗口内 then 不补跑', () => {
    const automation = candidate({
      scheduleType: 'interval',
      activeWindowStart: '10:00',
      activeWindowEnd: '22:00',
    })
    // 结束时刻不包含，凌晨与深夜都不在窗口内
    expect(isWithinIntervalExecutionSlot(automation, localTime(2026, 10, 29, 22, 0))).toBe(false)
    expect(isWithinIntervalExecutionSlot(automation, localTime(2026, 10, 29, 23, 30))).toBe(false)
    expect(isWithinIntervalExecutionSlot(automation, localTime(2026, 10, 29, 9, 59))).toBe(false)
  })

  test('given 窗口配置非法 when 判定 then 视为没有窗口限制', () => {
    const now = localTime(2026, 10, 29, 23, 30)
    expect(shouldCatchUpAutomation(candidate({
      scheduleType: 'interval',
      activeWindowStart: '10:00',
    }), now)).toBe(true)
    expect(shouldCatchUpAutomation(candidate({
      scheduleType: 'interval',
      activeWindowStart: '22:00',
      activeWindowEnd: '10:00',
    }), now)).toBe(true)
    expect(shouldCatchUpAutomation(candidate({
      scheduleType: 'interval',
      activeWindowStart: '25:00',
      activeWindowEnd: '26:00',
    }), now)).toBe(true)
  })
})

describe('启动补跑计划', () => {
  const now = localTime(2026, 10, 29, 20, 0)
  const computeNext = (): number => now + 60 * 60_000

  test('given 多个过期任务 when 生成计划 then 只把可运行且需要补跑的任务加入队列', () => {
    const daily = candidate({ scheduleType: 'daily' })
    const once = candidate({ scheduleType: 'once' })
    const interval = candidate({ scheduleType: 'interval' })
    const paused = candidate({ active: false })
    const future = candidate({ nextRunAt: now + 60_000 })
    const incomplete = candidate({ channelId: '' })

    const plan = planStartupCatchUps(
      [daily, once, interval, paused, future, incomplete],
      now,
      computeNext,
    )

    expect(plan.catchUps.map((item) => item.automation)).toEqual([daily, once, interval])
    expect(plan.catchUps.map((item) => item.missedAt)).toEqual([MISSED_AT, MISSED_AT, MISSED_AT])
  })

  test('given 过期任务 when 生成计划 then 除 once 外都推进 nextRunAt', () => {
    const daily = candidate({ scheduleType: 'daily' })
    const once = candidate({ scheduleType: 'once' })
    const interval = candidate({ scheduleType: 'interval' })

    const plan = planStartupCatchUps([daily, once, interval], now, computeNext)

    expect(plan.reschedules.map((item) => item.automation.scheduleType)).toEqual(['daily', 'interval'])
    expect(plan.reschedules.every((item) => item.nextRunAt === computeNext())).toBe(true)
  })

  test('given interval 启动时刻在窗口外 when 生成计划 then 不补跑但仍推进 nextRunAt', () => {
    const interval = candidate({
      scheduleType: 'interval',
      activeWindowStart: '10:00',
      activeWindowEnd: '22:00',
    })

    const plan = planStartupCatchUps([interval], localTime(2026, 10, 29, 23, 30), computeNext)

    expect(plan.catchUps).toEqual([])
    expect(plan.reschedules.map((item) => item.automation)).toEqual([interval])
  })

  test('given 过期任务 when 生成计划 then 重算下次触发时使用同一个 now', () => {
    const daily = candidate({ scheduleType: 'daily' })
    const received: number[] = []

    planStartupCatchUps([daily], now, (_automation, from) => {
      received.push(from)
      return from + 1
    })

    expect(received).toEqual([now])
  })
})
