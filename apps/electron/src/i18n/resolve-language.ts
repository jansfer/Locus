/**
 * 语言解析：把用户偏好 + 系统locale 解析为实际语言。
 *
 * 纯函数，不依赖 Electron，便于测试。
 */

import type { AppLanguage, ResolvedLanguage } from './types'

/**
 * 解析有效语言。
 *
 * - 显式选择 zh-CN / en 时直接使用；
 * - 'system'（或旧配置缺失）时按系统 locale 判断：zh 开头 → 简体中文，其他 → 英文。
 */
export function resolveLanguage(
  preference: AppLanguage | undefined,
  osLocale: string | undefined,
): ResolvedLanguage {
  if (preference === 'zh-CN' || preference === 'en') return preference
  const locale = (osLocale ?? '').toLowerCase()
  return locale.startsWith('zh') ? 'zh-CN' : 'en'
}
