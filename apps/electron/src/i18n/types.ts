/**
 * i18n 类型定义。
 *
 * zh-CN 词典是文案键的单一来源：MessageKey 从中文词典结构自动推导，
 * 保证类型安全的键名；英文词典声明为 Record<MessageKey, string>，
 * 在编译期强制两套词典键一致。
 */

import type { zhCN } from './locales/zh-CN'

/** 应用界面语言偏好；'system' 表示跟随操作系统（默认值）。 */
export type AppLanguage = 'system' | 'zh-CN' | 'en'

/** 解析后的实际语言（一定不是 'system'）。 */
export type ResolvedLanguage = 'zh-CN' | 'en'

/** 全部合法的语言偏好取值。 */
export const APP_LANGUAGES = ['system', 'zh-CN', 'en'] as const

/** 运行时校验设置文件中的 language 字段。 */
export function isAppLanguage(value: unknown): value is AppLanguage {
  return typeof value === 'string' && (APP_LANGUAGES as readonly string[]).includes(value)
}

/**
 * 把嵌套词典结构扁平化为点分键联合类型，如 'menu.file.closeTab'。
 * 叶子节点必须是 string（文案），中间节点是分组。
 */
type FlattenMessageKeys<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${FlattenMessageKeys<T[K]>}`
}[keyof T & string]

/** 全部文案键（点分路径），从 zh-CN 词典推导。 */
export type MessageKey = FlattenMessageKeys<typeof zhCN>

/** 翻译插值参数：模板中的 {name} 占位符。 */
export type TranslateParams = Record<string, string | number>

/** 翻译函数签名。 */
export type TranslateFn = (key: MessageKey, params?: TranslateParams) => string

/**
 * 与源词典同形、叶子为 string 的目标词典类型。
 *
 * 用于英文词典：zh-CN 新增键而英文侧未补充时直接编译报错。
 */
export type MirrorStructure<T> = {
  [K in keyof T]: T[K] extends string ? string : MirrorStructure<T[K]>
}
