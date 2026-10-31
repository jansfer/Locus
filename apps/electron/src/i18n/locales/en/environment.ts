/** environment 域文案（English）。与 zh-CN 同名文件同形；缺键会在编译期报错。 */
import type { MirrorStructure } from '../../types'
import { environment as zhenvironment } from '../zh-CN/environment'

export const environment: MirrorStructure<typeof zhenvironment> = {
  card: {
    checking: 'Checking...',
    installed: 'Installed',
    installedWithVersion: 'v{version} (installed)',
    outdated: 'Outdated',
    upgradeAdvised: 'v{version} (upgrade recommended)',
    notInstalled: 'Not installed',
    downloadTool: 'Download {tool}',
    oneClickDownload: 'Download {tool}',
    downloadingProgress: 'Downloading {pct}% ({downloaded} / {total})',
    cancelDownload: 'Cancel download',
    downloadDone: 'Download complete. Finish the installation in the installer, then click “Re-check” to refresh.',
    relaunchInstaller: 'Reopen installer',
    downloadFailed: 'Download failed: {error}',
    retryDownload: 'Retry download',
  },
  panel: {
    title: 'Windows environment check',
    subtitle: 'Basic Agent features need no extra setup; Git Bash or WSL enables Bash command execution',
    recheck: 'Re-check',
    shellName: 'Shell environment',
    shellRequirement: 'Optional · Install Git Bash or WSL to use Bash commands',
    nodeRequirement: 'Recommended · Only needed when using MCP servers (npx xxx)',
    shellMissingHint: 'Git Bash or WSL not detected: basic Agent still works, but Bash command tools are unavailable in this session.',
    nodeMissingHint: 'Node.js not detected. You can ignore this if you do not use npx-based MCP servers.',
    gitBashReady: 'Git Bash v{version} ready',
    wslReady: 'WSL {distro} ready',
    shellMissing: 'Git Bash or WSL not detected (basic Agent still available)',
    nodeInstalledWithVersion: 'v{version} installed',
    nodeNotInstalledOptional: 'Not installed (optional)',
  },
  dialog: {
    title: 'Environment check',
    description: 'Check and fix the Windows local environment required by Locus',
  },
}
