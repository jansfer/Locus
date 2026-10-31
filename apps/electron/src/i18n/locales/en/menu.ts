/** menu 域文案（English）。与 zh-CN 同名文件同形；缺键会在编译期报错。 */
import type { MirrorStructure } from '../../types'
import { menu as zhMenu } from '../zh-CN/menu'

export const menu: MirrorStructure<typeof zhMenu> = {
  app: {
    about: 'About Locus',
    services: 'Services',
    hide: 'Hide Locus',
    hideOthers: 'Hide Others',
    unhide: 'Show All',
    quit: 'Quit Locus',
  },
  file: {
    label: 'File',
    closeTab: 'Close Tab',
  },
  quit: 'Quit',
  edit: {
    label: 'Edit',
    undo: 'Undo',
    redo: 'Redo',
    cut: 'Cut',
    copy: 'Copy',
    paste: 'Paste',
    pasteAndMatchStyle: 'Paste and Match Style',
    delete: 'Delete',
    selectAll: 'Select All',
  },
  view: {
    label: 'View',
    reload: 'Reload',
    forceReload: 'Force Reload',
    toggleDevTools: 'Toggle Developer Tools',
    resetZoom: 'Reset Zoom',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    toggleFullScreen: 'Toggle Full Screen',
  },
  window: {
    label: 'Window',
    minimize: 'Minimize',
    zoom: 'Zoom',
    front: 'Bring All to Front',
    window: 'Window',
    close: 'Close',
  },
  help: {
    label: 'Help',
    learnMore: 'Learn More',
  },
}
