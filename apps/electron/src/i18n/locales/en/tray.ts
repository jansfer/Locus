/** tray 域文案（English）。与 zh-CN 同名文件同形；缺键会在编译期报错。 */
import type { MirrorStructure } from '../../types'
import { tray as zhTray } from '../zh-CN/tray'

export const tray: MirrorStructure<typeof zhTray> = {
  running: 'Running',
  recent: 'Recent',
  noRecentSessions: 'No recent sessions',
  more: 'More',
  newChat: 'New Chat',
  newAgentSession: 'New Agent Session',
  openLocus: 'Open Locus',
  quit: 'Quit Locus',
  workspace: {
    unselected: 'No project selected',
    unknown: 'Unknown project',
  },
  session: {
    untitled: 'Untitled session',
  },
}
