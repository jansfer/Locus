/** menu 域文案（简体中文）。应用菜单（macOS 应用菜单与各平台菜单栏）。 */
export const menu = {
  app: {
    about: '关于 Locus',
    services: '服务',
    hide: '隐藏 Locus',
    hideOthers: '隐藏其他',
    unhide: '显示全部',
    quit: '退出 Locus',
  },
  file: {
    label: '文件',
    closeTab: '关闭标签页',
  },
  quit: '退出',
  edit: {
    label: '编辑',
    undo: '撤销',
    redo: '重做',
    cut: '剪切',
    copy: '复制',
    paste: '粘贴',
    pasteAndMatchStyle: '粘贴并匹配样式',
    delete: '删除',
    selectAll: '全选',
  },
  view: {
    label: '视图',
    reload: '重新加载',
    forceReload: '强制重新加载',
    toggleDevTools: '切换开发者工具',
    resetZoom: '重置缩放',
    zoomIn: '放大',
    zoomOut: '缩小',
    toggleFullScreen: '切换全屏',
  },
  window: {
    label: '窗口',
    minimize: '最小化',
    zoom: '缩放',
    front: '前置全部窗口',
    window: '窗口',
    close: '关闭',
  },
  help: {
    label: '帮助',
    learnMore: '了解更多',
  },
} as const
