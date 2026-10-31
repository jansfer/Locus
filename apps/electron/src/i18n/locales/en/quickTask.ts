/** quickTask 域文案（English）。与 zh-CN 同名文件同形；缺键会在编译期报错。 */
import type { MirrorStructure } from '../../types'
import { quickTask as zhquickTask } from '../zh-CN/quickTask'

export const quickTask: MirrorStructure<typeof zhquickTask> = {
  placeholderAgent: 'Describe your task to Locus, press Enter to send...',
  placeholderChat: 'Message Locus, press Enter to send...',
  shortcutClose: 'Esc to close',
  addAttachment: 'Add attachment',
  attachment: 'Attach',
  dropHint: 'Paste or drag files here',
  send: 'Send',
  toast: {
    largeFileReferenced: 'Large files added as referenced attachments: {names}',
    tooLargeSkipped: 'Skipped files over 100MB: {names}',
    chatLargeFileUnsupported: 'Chat attachments do not support large files yet.',
    noLocalPath: 'Local path unavailable; the file cannot be referenced as an attachment.',
    chatLargeFileKept: 'Chat does not support large file attachments yet; they were kept in the Quick Task window: {names}',
  },
}
