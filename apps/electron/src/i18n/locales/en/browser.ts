/** browser 域文案（English）。与 zh-CN 同名文件同形；缺键会在编译期报错。 */
import type { MirrorStructure } from '../../types'
import { browser as zhbrowser } from '../zh-CN/browser'

export const browser: MirrorStructure<typeof zhbrowser> = {
  panel: {
    navBack: 'Back',
    navForward: 'Forward',
    reload: 'Reload',
    addressPlaceholder: 'Enter a URL or search',
    addressAria: 'Browser address',
    openExternal: 'Open in default browser',
    stopBackgroundAgent: 'Stop current background Agent',
    stopAutomationRun: 'Stop current automation run',
    stopDelegationRun: 'Stop current delegation run',
    riskGateTitle: 'Read the risk notice before use',
    riskGateSubtitle: 'The managed browser is enabled after confirmation; login state stays on this device.',
    riskDialogTitle: 'First time using the managed browser',
    riskDesc1: 'Locus lets the Agent read, search, click and type in the browser. Some platforms may flag these actions or high-frequency usage as automated activity.',
    riskDesc2: 'This can trigger CAPTCHAs, rate limits, feature restrictions or account risk controls, and in severe cases account penalties or bans. Learn and follow the target platform rules, and assume the corresponding risks yourself.',
    riskDesc3: 'Locus cannot guarantee that third-party platforms accept these actions; avoid unnecessary high-frequency interactions and verify the page state before important operations.',
    riskDecline: 'Not now',
    riskConfirming: 'Confirming…',
    riskAccept: 'I understand and accept the risks',
    sessionMissing: 'Managed browser session does not exist.',
    slotAria: 'Managed browser page',
  },
}
