/**
 * 界面语言状态原子
 *
 * 管理语言偏好（跟随系统 / 简体中文 / English）与解析后的有效语言。
 * - languagePreferenceAtom: 用户选择，持久化到 ~/.proma/settings.json
 * - resolvedLanguageAtom: 派生的最终语言（'zh-CN' | 'en'），驱动 i18n 模块
 *
 * 使用 localStorage 缓存偏好，避免页面加载时闪现错误语言；
 * 初始化时从主进程加载设置校正，并订阅跨窗口语言变更广播。
 */

import { atom } from 'jotai'
import { isAppLanguage, type AppLanguage, type ResolvedLanguage } from '../../i18n/types'
import { resolveLanguage } from '../../i18n/resolve-language'
import { setI18nLanguage } from '../../i18n/core'

/** localStorage 缓存键 */
const LANGUAGE_CACHE_KEY = 'proma-language-preference'

/** 从 localStorage 读取缓存的语言偏好 */
function getCachedLanguagePreference(): AppLanguage {
  try {
    const cached = localStorage.getItem(LANGUAGE_CACHE_KEY)
    if (isAppLanguage(cached)) return cached
  } catch {
    // localStorage 不可用时忽略
  }
  return 'system'
}

/** 缓存语言偏好到 localStorage */
function cacheLanguagePreference(preference: AppLanguage): void {
  try {
    localStorage.setItem(LANGUAGE_CACHE_KEY, preference)
  } catch {
    // localStorage 不可用时忽略
  }
}

/** 用户选择的语言偏好 */
export const languagePreferenceAtom = atom<AppLanguage>(getCachedLanguagePreference())

/**
 * 解析后的有效语言（派生）。
 *
 * 'system' 时用 navigator.language 判断；与主进程的 app.getLocale()
 * 判定规则一致（zh 开头 → 简体中文，其他 → 英文）。
 */
export const resolvedLanguageAtom = atom<ResolvedLanguage>((get) => {
  const preference = get(languagePreferenceAtom)
  const osLocale = typeof navigator !== 'undefined' ? navigator.language : undefined
  const resolved = resolveLanguage(preference, osLocale)
  // 同步 i18n 模块的模块级语言，保证 useT()/t() 与 atom 一致。
  setI18nLanguage(resolved)
  return resolved
})

/**
 * 初始化语言系统
 *
 * 从主进程加载持久化设置，校正 atom 与缓存，并订阅跨窗口广播。
 * 返回清理函数。
 */
export async function initializeLanguage(
  setPreference: (preference: AppLanguage) => void,
): Promise<() => void> {
  const settings = await window.electronAPI.getSettings()
  const preference = isAppLanguage(settings.language) ? settings.language : 'system'
  setPreference(preference)
  cacheLanguagePreference(preference)

  // 监听其他窗口手动切换语言（跨窗口同步）
  const cleanup = window.electronAPI.onLanguageSettingsChanged((payload) => {
    if (isAppLanguage(payload.language)) {
      setPreference(payload.language)
      cacheLanguagePreference(payload.language)
    }
  })

  return cleanup
}

/**
 * 更新语言偏好并持久化
 *
 * 同时更新 localStorage 缓存和主进程配置文件；
 * 保存失败时抛错，由调用方回滚 UI 状态并提示。
 */
export async function updateLanguagePreference(preference: AppLanguage): Promise<void> {
  const previous = localStorage.getItem(LANGUAGE_CACHE_KEY)
  cacheLanguagePreference(preference)
  try {
    await window.electronAPI.updateSettings({ language: preference })
  } catch (error) {
    // 保存失败：回滚缓存，保留原语言（atom 由调用方回滚）。
    if (previous !== null) {
      try { localStorage.setItem(LANGUAGE_CACHE_KEY, previous) } catch { /* ignore */ }
    }
    throw error
  }
}
