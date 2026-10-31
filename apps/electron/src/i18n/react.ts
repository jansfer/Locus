/**
 * renderer 侧 React 绑定：useT() 订阅语言变化。
 *
 * t() 本身是模块级稳定引用；useSyncExternalStore 保证语言切换时
 * 使用 useT() 的组件重渲染并取到最新语言的文案。
 */

import { useSyncExternalStore } from 'react'
import { getI18nLanguage, subscribeI18n, t } from './core'
import type { TranslateFn } from './types'

/** 返回响应语言切换的翻译函数。 */
export function useT(): TranslateFn {
  useSyncExternalStore(subscribeI18n, getI18nLanguage)
  return t
}
