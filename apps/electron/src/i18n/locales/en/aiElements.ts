/** aiElements 域文案（English）。与 zh-CN 同名文件同形；缺键会在编译期报错。 */
import type { MirrorStructure } from '../../types'
import { aiElements as zhaiElements } from '../zh-CN/aiElements'

export const aiElements: MirrorStructure<typeof zhaiElements> = {
  /** 富文本输入框 */
  input: {
    placeholder: 'How can I help you today?',
    expandInput: 'Expand input',
    collapseInput: 'Collapse input',
  },
  /** 消息组件原语 */
  message: {
    thinking: 'Thinking...',
    stopped: 'Generation stopped',
    expandAll: 'Show all',
    saveImage: 'Save image',
    imageLoading: 'Loading image…',
    imageLoadFailed: 'Unable to load image: {name}',
    quoteTitle: 'Click to jump to the original message and highlight the quoted content',
    quoteJumpTitle: 'Jump to quoted location and highlight',
    quoteJumpAria: 'Jump to the quoted location of {label} and highlight',
    fallbackSession: 'Session {id}',
    fallbackTodo: 'Todo {id}',
    fallbackCalendarEvent: 'Event {id}',
  },
}
