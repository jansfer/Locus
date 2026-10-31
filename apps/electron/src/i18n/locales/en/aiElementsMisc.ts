/** aiElementsMisc 域文案（English）。与 zh-CN 同名文件同形；缺键会在编译期报错。 */
import type { MirrorStructure } from '../../types'
import { aiElementsMisc as zhaiElementsMisc } from '../zh-CN/aiElementsMisc'

export const aiElementsMisc: MirrorStructure<typeof zhaiElementsMisc> = {
  /** 上下文分隔线 */
  contextDivider: {
    clearContext: 'Clear context',
    deleteDivider: 'Delete divider',
  },
  /** 对话容器空状态 */
  conversation: {
    emptyTitle: 'No messages yet',
    emptyDescription: 'Start chatting in the input box below',
  },
  /** 输入工具栏溢出按钮 */
  toolbarOverflow: {
    moreTools: 'More tools',
  },
  /** 语音输入按钮 */
  speechButton: {
    voiceInput: 'Voice input',
    startVoiceInput: 'Start voice input',
    stopVoiceInput: 'Stop voice input',
    preparingMic: 'Preparing microphone',
    listening: 'Listening',
    finishingUp: 'Finishing up',
    voiceDisabledHint: 'Enable voice input in Settings first',
    voiceToggleFailed: 'Failed to toggle voice input',
  },
  /** 推理/思考折叠组件 */
  reasoning: {
    thinkingShort: 'Thinking...',
    thoughtFewSeconds: 'Thought for a few seconds',
    thoughtSeconds: 'Thought for {n}s',
  },
  /** 消息导航迷你地图 */
  minimap: {
    title: 'Message navigation',
    searchPlaceholder: 'Search messages...',
    queryTooLong: 'Query is too long. Shorten it and try again.',
    historyTooLong: 'History is too long; showing results within the indexed range only. Narrow your query.',
    searching: 'Searching...',
    noResults: 'No matching messages',
    emptyMessage: '(empty message)',
  },
  /** 文件路径芯片 */
  filePathChip: {
    fileNotFound: 'File not found: {name}',
    fileMissing: 'File not found: {path}',
    openPreview: 'Open preview',
    showInFolder: 'Show in file manager',
  },
}
