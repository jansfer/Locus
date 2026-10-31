/**
 * i18n 核心：翻译、插值、语言状态与 Intl 格式化。
 *
 * 主进程与 renderer 共用本模块；语言状态是模块级单例：
 * - 主进程：app 启动与设置变更时调用 setI18nLanguage()；
 * - renderer：通过 react.ts 的 useT() 订阅变化触发重渲染。
 *
 * 回退规则：当前语言缺失键时回退英文词典，仍缺失则原样返回键名，
 * 保证界面永远有可读文本而不是崩溃或留白。
 */

import type { MessageKey, ResolvedLanguage, TranslateFn, TranslateParams } from './types'
import { zhCN } from './locales/zh-CN'
import { en } from './locales/en'

let currentLanguage: ResolvedLanguage = 'zh-CN'

const listeners = new Set<() => void>()

/** 读取当前有效语言。 */
export function getI18nLanguage(): ResolvedLanguage {
  return currentLanguage
}

/**
 * 设置当前有效语言。
 *
 * 语言变化时清理 Intl 格式化器缓存并通知全部订阅者（renderer 重渲染、
 * 主进程据此重建菜单与托盘）。
 */
export function setI18nLanguage(language: ResolvedLanguage): void {
  if (currentLanguage === language) return
  currentLanguage = language
  formatterCache.clear()
  for (const listener of listeners) listener()
}

/** 订阅语言变化；返回取消订阅函数。 */
export function subscribeI18n(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** 按点分路径在嵌套词典中查找文案。 */
function lookup(dict: unknown, key: string): string | undefined {
  let current: unknown = dict
  for (const part of key.split('.')) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }
  return typeof current === 'string' ? current : undefined
}

const PLACEHOLDER_PATTERN = /\{(\w+)\}/g

/** 用参数替换模板中的 {name} 占位符；未提供的占位符保留原样以便发现问题。 */
function interpolate(template: string, params: TranslateParams | undefined): string {
  if (!params) return template
  return template.replace(PLACEHOLDER_PATTERN, (match, name: string) => {
    const value = params[name]
    return value === undefined ? match : String(value)
  })
}

/** 翻译：当前语言优先，缺失键回退另一种语言，最终回退键名。 */
export const t: TranslateFn = (key: MessageKey, params?: TranslateParams): string => {
  const primary = currentLanguage === 'zh-CN' ? zhCN : en
  const fallback = currentLanguage === 'zh-CN' ? en : zhCN
  const template = lookup(primary, key) ?? lookup(fallback, key)
  return interpolate(template ?? key, params)
}

// ===== Intl 格式化（按当前语言缓存格式化器实例） =====

type CacheableFormatter = Intl.DateTimeFormat | Intl.NumberFormat | Intl.RelativeTimeFormat

const formatterCache = new Map<string, CacheableFormatter>()

function localeTag(): string {
  return currentLanguage === 'zh-CN' ? 'zh-CN' : 'en'
}

function cachedFormatter<T extends CacheableFormatter>(
  cacheKey: string,
  create: () => T,
): T {
  const existing = formatterCache.get(cacheKey)
  if (existing) return existing as T
  const created = create()
  formatterCache.set(cacheKey, created)
  return created
}

/** 按当前语言格式化日期时间（可自定义选项，如 month: 'short'）。 */
export function formatDate(date: Date | number, options?: Intl.DateTimeFormatOptions): string {
  const optionsKey = options ? JSON.stringify(options) : ''
  const formatter = cachedFormatter(
    `date:${localeTag()}:${optionsKey}`,
    () => new Intl.DateTimeFormat(localeTag(), options),
  )
  return formatter.format(date)
}

/** 按当前语言格式化数字（千分位、小数位等）。 */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  const optionsKey = options ? JSON.stringify(options) : ''
  const formatter = cachedFormatter(
    `number:${localeTag()}:${optionsKey}`,
    () => new Intl.NumberFormat(localeTag(), options),
  )
  return formatter.format(value)
}

/** 按当前语言格式化相对时间（如「3 分钟前」 / "3 minutes ago"）。 */
export function formatRelativeTime(value: number, unit: Intl.RelativeTimeFormatUnit): string {
  const formatter = cachedFormatter(
    `relative:${localeTag()}`,
    () => new Intl.RelativeTimeFormat(localeTag(), { numeric: 'auto' }),
  )
  return formatter.format(value, unit)
}

/** 当前语言对应的 Intl locale 标签，供尚未迁移到本模块的调用点使用。 */
export function currentLocaleTag(): string {
  return localeTag()
}
