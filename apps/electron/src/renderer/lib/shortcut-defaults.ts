/**
 * 快捷键默认配置
 *
 * 定义所有快捷键的 ID、名称、描述、默认绑定和分类。
 * 这是快捷键系统的基础数据层，由 shortcut-registry 消费。
 */

// ===== 类型定义 =====

/** 快捷键分类 */
export type ShortcutCategory = 'app' | 'edit' | 'navigation' | 'global'

/** 快捷键定义（不可变，内置于代码） */
export interface ShortcutDefinition {
  /** 唯一标识（如 'open-settings'） */
  id: string
  /** 展示名称：优先走词典键（渲染处 t(nameKey)），无键时回退原文 */
  nameKey?: MessageKey
  /** 中文名称 */
  name: string
  /** 词典描述键（可选） */
  descriptionKey?: MessageKey
  /** 中文描述 */
  description: string
  /** macOS 默认快捷键（如 'Cmd+,'） */
  defaultMac: string
  /** Windows 默认快捷键（如 'Ctrl+,'） */
  defaultWin: string
  /** 分类 */
  category: ShortcutCategory
  /** 是否为全局快捷键（由主进程 globalShortcut 注册） */
  global?: boolean
  /** 全局注册不可用时，是否仍保留应用内 keydown 回退 */
  localFallback?: boolean
  /** 是否为只读（仅展示，不可自定义） */
  readonly?: boolean
}

/**
 * 用户自定义快捷键覆盖（持久化到 settings.json）
 *
 * 类型在 `types/settings.ts` 中定义，此处转发以便渲染层就近使用。
 */
import type { MessageKey } from '@/i18n/types'

export type { ShortcutOverrides } from '../../types/settings'

// ===== 分类标签 =====

export const SHORTCUT_CATEGORY_LABELS: Record<ShortcutCategory, MessageKey> = {
  app: 'misc.shortcuts.categories.app',
  edit: 'misc.shortcuts.categories.edit',
  navigation: 'misc.shortcuts.categories.navigation',
  global: 'misc.shortcuts.categories.global',
}

// ===== 默认快捷键列表 =====

export const DEFAULT_SHORTCUTS: ShortcutDefinition[] = [
  // 应用级
  {
    id: 'open-settings',
    nameKey: 'misc.shortcuts.items.open-settings.name',
    descriptionKey: 'misc.shortcuts.items.open-settings.description',
    name: '打开设置',
    description: '打开应用设置面板',
    defaultMac: 'Cmd+,',
    defaultWin: 'Ctrl+,',
    category: 'app',
  },
  {
    id: 'new-session',
    nameKey: 'misc.shortcuts.items.new-session.name',
    descriptionKey: 'misc.shortcuts.items.new-session.description',
    name: '新建对话',
    description: '根据当前模式创建 Chat 对话或 Agent 会话',
    defaultMac: 'Cmd+N',
    defaultWin: 'Ctrl+N',
    category: 'app',
  },
  {
    id: 'toggle-sidebar',
    nameKey: 'misc.shortcuts.items.toggle-sidebar.name',
    descriptionKey: 'misc.shortcuts.items.toggle-sidebar.description',
    name: '切换侧边栏',
    description: '显示或隐藏左侧边栏',
    defaultMac: 'Cmd+B',
    defaultWin: 'Ctrl+Shift+E',
    category: 'app',
  },
  // 由 Electron 原生菜单角色处理，展示但不允许在应用内修改。
  {
    id: 'zoom-in',
    nameKey: 'misc.shortcuts.items.zoom-in.name',
    descriptionKey: 'misc.shortcuts.items.zoom-in.description',
    name: '放大界面',
    description: '提高 Locus 界面的缩放比例',
    defaultMac: 'Cmd+Plus',
    defaultWin: 'Ctrl+Plus',
    category: 'app',
    readonly: true,
  },
  {
    id: 'zoom-out',
    nameKey: 'misc.shortcuts.items.zoom-out.name',
    descriptionKey: 'misc.shortcuts.items.zoom-out.description',
    name: '缩小界面',
    description: '降低 Locus 界面的缩放比例',
    defaultMac: 'Cmd+Minus',
    defaultWin: 'Ctrl+Minus',
    category: 'app',
    readonly: true,
  },
  {
    id: 'reset-zoom',
    nameKey: 'misc.shortcuts.items.reset-zoom.name',
    descriptionKey: 'misc.shortcuts.items.reset-zoom.description',
    name: '重置界面缩放',
    description: '恢复 Locus 界面的默认缩放比例',
    defaultMac: 'Cmd+0',
    defaultWin: 'Ctrl+0',
    category: 'app',
    readonly: true,
  },
  {
    id: 'toggle-mode',
    nameKey: 'misc.shortcuts.items.toggle-mode.name',
    descriptionKey: 'misc.shortcuts.items.toggle-mode.description',
    name: '切换模式',
    description: '在 Chat 和 Agent 模式之间切换',
    defaultMac: 'Cmd+Shift+M',
    defaultWin: 'Ctrl+Shift+M',
    category: 'app',
  },
  {
    id: 'global-search',
    nameKey: 'misc.shortcuts.items.global-search.name',
    descriptionKey: 'misc.shortcuts.items.global-search.description',
    name: '全局搜索',
    description: '搜索对话和会话',
    defaultMac: 'Cmd+Shift+F',
    defaultWin: 'Ctrl+Shift+F',
    category: 'navigation',
  },
  {
    id: 'file-find',
    nameKey: 'misc.shortcuts.items.file-find.name',
    descriptionKey: 'misc.shortcuts.items.file-find.description',
    name: '查找',
    description: '在对话中搜索消息，或在文件预览/Diff 面板中查找文件内容',
    defaultMac: 'Cmd+F',
    defaultWin: 'Ctrl+F',
    category: 'navigation',
  },
  {
    id: 'focus-input',
    nameKey: 'misc.shortcuts.items.focus-input.name',
    descriptionKey: 'misc.shortcuts.items.focus-input.description',
    name: '聚焦输入框',
    description: '快速跳转到输入框',
    defaultMac: 'Cmd+L',
    defaultWin: 'Ctrl+L',
    category: 'navigation',
  },

  // 编辑级（输入框格式化 — macOS 上 Cmd+B 被切换侧边栏占用，改用 Ctrl+B；Windows 上 Ctrl+B 直接加粗）
  {
    id: 'editor-bold',
    nameKey: 'misc.shortcuts.items.editor-bold.name',
    descriptionKey: 'misc.shortcuts.items.editor-bold.description',
    name: '加粗 / 取消加粗',
    description: '输入框中切换文字加粗',
    defaultMac: 'Ctrl+B',
    defaultWin: 'Ctrl+B',
    category: 'edit',
    readonly: true,
  },
  {
    id: 'editor-strikethrough',
    nameKey: 'misc.shortcuts.items.editor-strikethrough.name',
    descriptionKey: 'misc.shortcuts.items.editor-strikethrough.description',
    name: '删除线 / 取消删除线',
    description: '输入框中切换文字删除线',
    defaultMac: 'Ctrl+S',
    defaultWin: '',
    category: 'edit',
    readonly: true,
  },

  // 编辑级
  {
    id: 'clear-context',
    nameKey: 'misc.shortcuts.items.clear-context.name',
    descriptionKey: 'misc.shortcuts.items.clear-context.description',
    name: '清除上下文',
    description: '清除当前对话的上下文',
    defaultMac: 'Cmd+K',
    defaultWin: 'Ctrl+K',
    category: 'edit',
  },
  {
    id: 'stop-generation',
    nameKey: 'misc.shortcuts.items.stop-generation.name',
    descriptionKey: 'misc.shortcuts.items.stop-generation.description',
    name: '停止 Agent',
    description: '中断当前 AI 响应',
    defaultMac: 'Cmd+Shift+Backspace',
    defaultWin: 'Ctrl+Shift+Backspace',
    category: 'edit',
  },
  {
    id: 'close-tab',
    nameKey: 'misc.shortcuts.items.close-tab.name',
    descriptionKey: 'misc.shortcuts.items.close-tab.description',
    name: '关闭当前标签',
    description: '关闭当前 Chat 标签页，或 Agent 右侧组件、预览、浏览器和终端标签',
    defaultMac: 'Cmd+W',
    defaultWin: 'Ctrl+W',
    category: 'app',
  },
  {
    id: 'toggle-preview-panel',
    nameKey: 'misc.shortcuts.items.toggle-preview-panel.name',
    descriptionKey: 'misc.shortcuts.items.toggle-preview-panel.description',
    name: '切换预览面板',
    description: '显示或隐藏内联 Diff/文件预览面板',
    defaultMac: 'Cmd+\\',
    defaultWin: 'Ctrl+\\',
    category: 'navigation',
  },
  {
    id: 'toggle-right-panel',
    nameKey: 'misc.shortcuts.items.toggle-right-panel.name',
    descriptionKey: 'misc.shortcuts.items.toggle-right-panel.description',
    name: '切换文件面板',
    description: '显示或隐藏右侧文件面板',
    defaultMac: 'Cmd+Shift+B',
    defaultWin: 'Ctrl+Shift+B',
    category: 'app',
  },

  // 全局快捷键（由主进程 globalShortcut 注册，应用外也生效）
  {
    id: 'quick-task',
    nameKey: 'misc.shortcuts.items.quick-task.name',
    descriptionKey: 'misc.shortcuts.items.quick-task.description',
    name: '快速任务',
    description: '唤起浮动快速任务输入窗口',
    defaultMac: 'Alt+Space',
    defaultWin: 'Alt+Space',
    category: 'global',
    global: true,
  },
  {
    id: 'show-main-window',
    nameKey: 'misc.shortcuts.items.show-main-window.name',
    descriptionKey: 'misc.shortcuts.items.show-main-window.description',
    name: '显示主窗口',
    description: '显示并聚焦 Locus 主窗口',
    defaultMac: 'Cmd+Shift+P',
    defaultWin: 'Ctrl+Shift+P',
    category: 'global',
    global: true,
  },
  {
    id: 'voice-dictation',
    nameKey: 'misc.shortcuts.items.voice-dictation.name',
    descriptionKey: 'misc.shortcuts.items.voice-dictation.description',
    name: '语音输入',
    description: '唤起豆包流式语音输入浮窗',
    defaultMac: 'Ctrl+`',
    defaultWin: 'Ctrl+`',
    category: 'global',
    global: true,
  },
]

/** 按 ID 索引的快捷键 Map（用于快速查找） */
export const SHORTCUT_MAP = new Map(
  DEFAULT_SHORTCUTS.map((s) => [s.id, s]),
)
