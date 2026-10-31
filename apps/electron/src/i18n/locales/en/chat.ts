/** chat 域文案（English）。与 zh-CN 同名文件同形；缺键会在编译期报错。 */
import type { MirrorStructure } from '../../types'
import { chat as zhchat } from '../zh-CN/chat'

export const chat: MirrorStructure<typeof zhchat> = {
  /** Agent 模式推荐横幅与迁移按钮 */
  agentMode: {
    recommendTitle: 'Recommended: Agent Mode',
    switchAction: 'Switch to Agent Mode',
    switching: 'Switching...',
    switchedTitle: 'Switched to Agent Mode',
    switchedDescription: 'Conversation history has been migrated to a new Agent session',
    switchFailed: 'Failed to switch to Agent Mode',
    channelNotConfigured: 'Configure an Agent channel in Settings first',
    newSessionTitle: 'New Agent Session',
  },
  /** 底部输入区 */
  input: {
    addAttachment: 'Add Attachment',
    stopWithShortcut: 'Stop Agent ({shortcut})',
    placeholderCmdEnter: 'Type a message... (⌘/Ctrl+Enter to send, Enter for newline)',
    placeholderEnter: 'Type a message... (Enter to send, Shift+Enter for newline)',
    noNetwork: 'No network connection. Check your network and try again.',
    sendFailed: 'Failed to send. Please try again.',
  },
  /** 附件 */
  attachment: {
    oversizedFiles: 'These files exceed 100 MB and are not yet supported as Chat attachments. Skipped: {files}',
    unreadableFiles: 'These files could not be read. Skipped: {files}',
    pastedFallbackName: 'Pasted attachment {n}',
  },
  /** 消息条目 */
  message: {
    generateFailed: 'Generation failed',
    stopped: '(Stopped)',
    resend: 'Resend',
    editAndResend: 'Edit & Resend',
    userAvatarAlt: 'User avatar',
  },
  /** 删除消息确认对话框 */
  deleteDialog: {
    title: 'Delete Message',
    description: 'This cannot be undone.',
    pairWarning: 'Tip: Delete the user message and its assistant reply as a pair; otherwise the model may fail to respond correctly due to the changed data structure.',
    deleting: 'Deleting...',
  },
  /** 消息原地编辑 */
  inlineEdit: {
    placeholder: 'Edit message...',
    cancelShortcut: 'Cancel (Esc)',
    sendShortcut: 'Send (Enter)',
  },
  /** 思考设置 */
  thinking: {
    ariaLabel: 'Thinking settings',
    mode: 'Thinking Mode',
    toggleAria: 'Toggle Thinking Mode',
    off: 'Off',
    geminiDepth: 'Gemini thinking depth',
    levelMinimal: 'Minimal',
    levelLow: 'Low',
    levelMedium: 'Medium',
    levelHigh: 'High',
    defaultLevel: 'Default for this model: {level}',
  },
  /** 上下文长度设置 */
  context: {
    settings: 'Context Settings',
    length: 'Context Length',
    unlimited: 'Unlimited',
    rounds: '{n} rounds',
  },
  /** 清除上下文按钮 */
  clearContext: {
    label: 'Clear Context',
    withShortcut: 'Clear Context ({shortcut})',
  },
  /** 模型选择器 */
  model: {
    selectModel: 'Select Model',
    noModels: 'No models available',
    searchPlaceholder: 'Search models...',
    notFound: 'No models found',
    channelPrefix: 'Channel: {name}',
    channelModel: '{channel} · {model}',
  },
  /** 并排模式 */
  parallel: {
    userMessages: 'User Messages',
    assistantReplies: 'Assistant Replies',
    emptyUser: 'No user messages yet',
    emptyAssistant: 'No assistant replies yet',
  },
  /** 对话头部 */
  header: {
    editTitle: 'Edit Title',
    unpin: 'Unpin Conversation',
    pin: 'Pin Conversation',
    exitParallel: 'Exit Side-by-Side Mode',
    parallelMode: 'Side-by-Side Mode',
  },
  /** 系统提示词侧栏与选择器 */
  prompt: {
    title: 'Prompts',
    create: 'New Prompt',
    newName: 'New Prompt',
    name: 'Name',
    content: 'Content',
    contentPlaceholder: 'Enter system prompt content...',
    appendInfo: 'Append date, time and username',
    builtin: '(Built-in)',
    setDefault: 'Set as Default',
    edit: 'Edit Prompts',
    select: 'Select Prompt',
    tooltip: 'Prompt: {name}',
  },
  /** 工具选择器 */
  tools: {
    title: 'Tools',
    needsConfig: 'Setup required',
  },
}
