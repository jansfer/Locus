/** 自动发现更及时；冷却与并发合并避免唤醒、联网事件造成请求风暴。 */
interface UpdateCheckSchedulerOptions {
  check: (automatic: boolean) => Promise<void>
  canCheck?: () => boolean
  now?: () => number
  setTimeoutFn?: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>
  clearTimeoutFn?: (timer: ReturnType<typeof setTimeout>) => void
}

export function createUpdateCheckScheduler({
  check, canCheck = () => true, now = Date.now,
  setTimeoutFn = setTimeout, clearTimeoutFn = clearTimeout,
}: UpdateCheckSchedulerOptions) {
  let lastCheckAt = -Infinity
  let inFlight: Promise<void> | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let disposed = false

  const request = (manual = false): Promise<void> => {
    if (inFlight) return inFlight
    if (disposed || !canCheck() || (!manual && now() - lastCheckAt < 120_000)) return Promise.resolve()
    lastCheckAt = now()
    const pending = check(!manual)
    inFlight = pending.finally(() => { inFlight = null })
    return inFlight
  }
  const schedule = (delay: number): void => {
    timer = setTimeoutFn(() => {
      timer = null
      if (disposed) return
      void request().catch((error: unknown) => console.warn('[更新] 自动检查失败:', error))
      schedule(15 * 60 * 1000)
    }, delay)
  }
  const dispose = (): void => {
    disposed = true
    if (timer !== null) clearTimeoutFn(timer)
    timer = null
  }
  const start = (): void => {
    dispose()
    disposed = false
    schedule(3000)
  }
  return { request, start, dispose }
}
