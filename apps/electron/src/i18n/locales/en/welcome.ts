/** welcome 域文案（English）。与 zh-CN 同名文件同形；缺键会在编译期报错。 */
import type { MirrorStructure } from '../../types'
import { welcome as zhWelcome } from '../zh-CN/welcome'

export const welcome: MirrorStructure<typeof zhWelcome> = {
  greeting: {
    night: 'Up late, {name}?',
    morning: 'Good morning, {name}',
    afternoon: 'Good afternoon, {name}',
    evening: 'Good evening, {name}',
  },
  fallbackName: 'friend',
  tips: {
    macShortcutNew: 'Press ⌘N to start a new conversation',
    macShortcutSearch: 'Press ⌘⇧F to search past conversations',
    macShortcutFileFind: 'Press ⌘F to search messages in a conversation, or find text in file previews',
    macShortcutSettings: 'Press ⌘, to open Settings',
    macShortcutSidebar: 'Press ⌘B to toggle the sidebar',
    macShortcutMode: 'Press ⌘⇧M to switch between Chat and Agent',
    macShortcutFocus: 'Press ⌘L to jump to the input box',
    macShortcutClear: 'Press ⌘K to clear the current conversation context',
    macShortcutStop: 'Press ⌘. to stop the AI response',
    macShortcutClose: 'Press ⌘W to close the current tab',
    macShortcutZoom: 'Press ⌘+ / ⌘- to zoom the interface, ⌘0 to reset',
    macShortcutTabSwitch: 'Press Ctrl+Tab to switch tabs; hold Ctrl and keep pressing Tab to cycle through them',
    winShortcutNew: 'Press Ctrl+N to start a new conversation',
    winShortcutSearch: 'Press Ctrl+Shift+F to search past conversations',
    winShortcutFileFind: 'Press Ctrl+F to search messages in a conversation, or find text in file previews',
    winShortcutSettings: 'Press Ctrl+, to open Settings',
    winShortcutSidebar: 'Press Ctrl+Shift+E to toggle the sidebar',
    winShortcutMode: 'Press Ctrl+Shift+M to switch between Chat and Agent',
    winShortcutFocus: 'Press Ctrl+L to jump to the input box',
    winShortcutClear: 'Press Ctrl+K to clear the current conversation context',
    winShortcutStop: 'Press Ctrl+Shift+Backspace to stop the AI response',
    winShortcutClose: 'Press Ctrl+W to close the current tab',
    winShortcutZoom: 'Press Ctrl++ / Ctrl+- to zoom the interface, Ctrl+0 to reset',
    winShortcutTabSwitch: 'Press Ctrl+Tab to switch tabs; hold Ctrl and keep pressing Tab to cycle through them',
    tipAgentFile: 'In Agent mode, type @ to reference session files, project files, and attached directories',
    tipAgentMcp: 'In Agent mode, type # to invoke MCP tools',
    tipAgentSkill: 'In Agent mode, type / to use Skills',
    tipAttachment: 'Drag files into the input box to attach them directly',
    tipShortcutsCustom: 'Customize all shortcuts in Settings → Shortcuts',
  },
}
