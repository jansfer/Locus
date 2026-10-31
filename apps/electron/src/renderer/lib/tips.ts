/**
 * Tips 管理模块 — 平台感知的使用技巧
 *
 * 区分 macOS / Windows 平台，提供随机轮换的小贴士。
 * 文案存放在 welcome 词典（welcome.tips.*），渲染时经 t() 解析为当前语言。
 */

import type { MessageKey } from '@/i18n'

export type Platform = 'mac' | 'windows'

/** welcome 词典中的 Tip 文案键（welcome.tips.*）。 */
export type TipMessageKey = Extract<MessageKey, `welcome.tips.${string}`>

export interface Tip {
  id: string
  /** welcome 词典中的文案键；渲染处用 t(tip.messageKey) 取当前语言文案。 */
  messageKey: TipMessageKey
  /** 适用平台，'all' 表示通用 */
  platform: Platform | 'all'
}

/** 检测当前平台 */
export function getPlatform(): Platform {
  if (typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac')) {
    return 'mac'
  }
  return 'windows'
}

/** 所有 Tips 数据（messageKey 与 welcome 词典 welcome.tips.* 对应） */
export const TIPS: Tip[] = [
  // macOS 快捷键
  { id: 'mac-shortcut-new', messageKey: 'welcome.tips.macShortcutNew', platform: 'mac' },
  { id: 'mac-shortcut-search', messageKey: 'welcome.tips.macShortcutSearch', platform: 'mac' },
  { id: 'mac-shortcut-file-find', messageKey: 'welcome.tips.macShortcutFileFind', platform: 'mac' },
  { id: 'mac-shortcut-settings', messageKey: 'welcome.tips.macShortcutSettings', platform: 'mac' },
  { id: 'mac-shortcut-sidebar', messageKey: 'welcome.tips.macShortcutSidebar', platform: 'mac' },
  { id: 'mac-shortcut-mode', messageKey: 'welcome.tips.macShortcutMode', platform: 'mac' },
  { id: 'mac-shortcut-focus', messageKey: 'welcome.tips.macShortcutFocus', platform: 'mac' },
  { id: 'mac-shortcut-clear', messageKey: 'welcome.tips.macShortcutClear', platform: 'mac' },
  { id: 'mac-shortcut-stop', messageKey: 'welcome.tips.macShortcutStop', platform: 'mac' },
  { id: 'mac-shortcut-close', messageKey: 'welcome.tips.macShortcutClose', platform: 'mac' },
  { id: 'mac-shortcut-zoom', messageKey: 'welcome.tips.macShortcutZoom', platform: 'mac' },
  { id: 'mac-shortcut-tab-switch', messageKey: 'welcome.tips.macShortcutTabSwitch', platform: 'mac' },

  // Windows 快捷键
  { id: 'win-shortcut-new', messageKey: 'welcome.tips.winShortcutNew', platform: 'windows' },
  { id: 'win-shortcut-search', messageKey: 'welcome.tips.winShortcutSearch', platform: 'windows' },
  { id: 'win-shortcut-file-find', messageKey: 'welcome.tips.winShortcutFileFind', platform: 'windows' },
  { id: 'win-shortcut-settings', messageKey: 'welcome.tips.winShortcutSettings', platform: 'windows' },
  { id: 'win-shortcut-sidebar', messageKey: 'welcome.tips.winShortcutSidebar', platform: 'windows' },
  { id: 'win-shortcut-mode', messageKey: 'welcome.tips.winShortcutMode', platform: 'windows' },
  { id: 'win-shortcut-focus', messageKey: 'welcome.tips.winShortcutFocus', platform: 'windows' },
  { id: 'win-shortcut-clear', messageKey: 'welcome.tips.winShortcutClear', platform: 'windows' },
  { id: 'win-shortcut-stop', messageKey: 'welcome.tips.winShortcutStop', platform: 'windows' },
  { id: 'win-shortcut-close', messageKey: 'welcome.tips.winShortcutClose', platform: 'windows' },
  { id: 'win-shortcut-zoom', messageKey: 'welcome.tips.winShortcutZoom', platform: 'windows' },
  { id: 'win-shortcut-tab-switch', messageKey: 'welcome.tips.winShortcutTabSwitch', platform: 'windows' },

  // 通用
  { id: 'tip-agent-file', messageKey: 'welcome.tips.tipAgentFile', platform: 'all' },
  { id: 'tip-agent-mcp', messageKey: 'welcome.tips.tipAgentMcp', platform: 'all' },
  { id: 'tip-agent-skill', messageKey: 'welcome.tips.tipAgentSkill', platform: 'all' },
  { id: 'tip-attachment', messageKey: 'welcome.tips.tipAttachment', platform: 'all' },
  { id: 'tip-shortcuts-custom', messageKey: 'welcome.tips.tipShortcutsCustom', platform: 'all' },
]

/** 获取适用于当前平台的随机 Tip */
export function getRandomTip(platform: Platform): Tip {
  const filtered = TIPS.filter((t) => t.platform === 'all' || t.platform === platform)
  const index = Math.floor(Math.random() * filtered.length)
  return filtered[index] ?? filtered[0]!
}
