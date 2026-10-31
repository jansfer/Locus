/** sessionPreview 域文案（English）。与 zh-CN 同名文件同形；缺键会在编译期报错。 */
import type { MirrorStructure } from '../../types'
import { sessionPreview as zhsessionPreview } from '../zh-CN/sessionPreview'

export const sessionPreview: MirrorStructure<typeof zhsessionPreview> = {
  toolUse: 'Tool call {name}',
  toolResultError: 'Tool result failed',
  toolResultOk: 'Tool result returned',
  compactSuccess: 'Context compacted',
  compactNoop: 'Context does not need compaction',
  compacting: 'Compacting context...',
  compactFailed: 'Context compaction failed',
  permissionDenied: 'Permission check denied the operation',
  emptyMessage: '(empty message)',
  loadFailed: 'Unable to load session content',
  itemCount: '{n} items',
  reading: 'Reading session...',
  empty: 'Nothing to preview yet',
}
