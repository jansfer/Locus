import { Menu, shell, BrowserWindow } from 'electron'
import { t } from '../i18n'

export function createApplicationMenu(): Menu {
  const isMac = process.platform === 'darwin'

  /**
   * 菜单快捷键说明：
   *
   * 大部分快捷键由渲染进程的 shortcut-registry 统一管理。
   * 但 Cmd+W 需要在菜单中拦截（否则 macOS 默认关闭窗口），
   * 改为通知渲染进程关闭当前标签页。
   *
   * 菜单文案使用当前有效语言；语言切换时主进程会重建应用菜单。
   */

  /**
   * 重新加载当前窗口。
   *
   * 不使用 Electron 的 `reload` / `forceReload` role：这些 role 会自动注册
   * CmdOrCtrl+R、F5 等系统快捷键。刷新只能从原生“视图”菜单显式触发。
   */
  const reloadFocusedWindow = (ignoreCache = false): void => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win || win.isDestroyed()) return

    if (ignoreCache) {
      win.webContents.reloadIgnoringCache()
    } else {
      win.webContents.reload()
    }
  }

  const template: Electron.MenuItemConstructorOptions[] = [
    // 应用菜单 (仅 macOS)
    ...(isMac
      ? [
          {
            label: 'Locus',
            submenu: [
              { role: 'about' as const, label: t('menu.app.about') },
              { type: 'separator' as const },
              { role: 'services' as const, label: t('menu.app.services') },
              { type: 'separator' as const },
              { role: 'hide' as const, label: t('menu.app.hide') },
              { role: 'hideOthers' as const, label: t('menu.app.hideOthers') },
              { role: 'unhide' as const, label: t('menu.app.unhide') },
              { type: 'separator' as const },
              { role: 'quit' as const, label: t('menu.app.quit') },
            ],
          },
        ]
      : []),

    // 文件菜单
    {
      label: t('menu.file.label'),
      submenu: [
        // Cmd+W / Ctrl+W：主窗口关闭当前标签页；独立记忆窗口关闭自身。
        {
          label: t('menu.file.closeTab'),
          accelerator: 'CmdOrCtrl+W',
          click: () => {
            const win = BrowserWindow.getFocusedWindow()
            if (!win) return

            let windowType: string | null = null
            try {
              windowType = new URL(win.webContents.getURL()).searchParams.get('window')
            } catch {
              // 窗口尚未加载页面时沿用主窗口的安全默认行为。
            }
            if (windowType === 'workspace-memory') {
              win.close()
              return
            }

            win.webContents.send('menu:close-tab')
          },
        },
        ...(isMac ? [] : [{ type: 'separator' as const }, { role: 'quit' as const, label: t('menu.quit') }]),
      ],
    },

    // 编辑菜单
    {
      label: t('menu.edit.label'),
      submenu: [
        { role: 'undo' as const, label: t('menu.edit.undo') },
        { role: 'redo' as const, label: t('menu.edit.redo') },
        { type: 'separator' as const },
        { role: 'cut' as const, label: t('common.cut') },
        { role: 'copy' as const, label: t('common.copy') },
        { role: 'paste' as const, label: t('common.paste') },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' as const, label: t('menu.edit.pasteAndMatchStyle') },
              { role: 'delete' as const, label: t('menu.edit.delete') },
              { role: 'selectAll' as const, label: t('menu.edit.selectAll') },
            ]
          : [{ role: 'delete' as const, label: t('menu.edit.delete') }, { type: 'separator' as const }, { role: 'selectAll' as const, label: t('menu.edit.selectAll') }]),
      ],
    },

    // 视图菜单
    {
      label: t('menu.view.label'),
      submenu: [
        {
          label: t('menu.view.reload'),
          click: () => reloadFocusedWindow(),
        },
        {
          label: t('menu.view.forceReload'),
          click: () => reloadFocusedWindow(true),
        },
        { role: 'toggleDevTools' as const, label: t('menu.view.toggleDevTools') },
        { type: 'separator' as const },
        { role: 'resetZoom' as const, label: t('menu.view.resetZoom') },
        { role: 'zoomIn' as const, label: t('menu.view.zoomIn') },
        { role: 'zoomOut' as const, label: t('menu.view.zoomOut') },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const, label: t('menu.view.toggleFullScreen') },
      ],
    },

    // 窗口菜单
    {
      label: t('menu.window.label'),
      submenu: [
        { role: 'minimize' as const, label: t('menu.window.minimize') },
        { role: 'zoom' as const, label: t('menu.window.zoom') },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const, label: t('menu.window.front') },
              { type: 'separator' as const },
              { role: 'window' as const, label: t('menu.window.window') },
            ]
          : [{ role: 'close' as const, label: t('menu.window.close') }]),
      ],
    },

    // 帮助菜单
    {
      label: t('menu.help.label'),
      role: 'help' as const,
      submenu: [
        {
          label: t('menu.help.learnMore'),
          click: async () => {
            await shell.openExternal('https://github.com/yourusername/proma')
          },
        },
      ],
    },
  ]

  return Menu.buildFromTemplate(template)
}
