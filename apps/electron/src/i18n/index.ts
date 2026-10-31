/**
 * i18n 模块总入口。
 *
 * - 主进程：`import { t, setI18nLanguage, resolveLanguage } from '../i18n'`；
 * - renderer：`import { useT } from '@/i18n'`，需要非组件上下文时也可直接用 `t`。
 */

export {
  t,
  getI18nLanguage,
  setI18nLanguage,
  subscribeI18n,
  formatDate,
  formatNumber,
  formatRelativeTime,
  currentLocaleTag,
} from './core'
export { resolveLanguage } from './resolve-language'
export { useT } from './react'
export {
  APP_LANGUAGES,
  isAppLanguage,
  type AppLanguage,
  type ResolvedLanguage,
  type MessageKey,
  type TranslateParams,
  type TranslateFn,
  type MirrorStructure,
} from './types'
