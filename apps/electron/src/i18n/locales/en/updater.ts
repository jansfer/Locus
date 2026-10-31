/** updater 域文案（English）。与 zh-CN 同名文件同形；缺键会在编译期报错。 */
import type { MirrorStructure } from '../../types'
import { updater as zhUpdater } from '../zh-CN/updater'

export const updater: MirrorStructure<typeof zhUpdater> = {
  bootstrapError: {
    title: 'Locus failed to start properly',
    intro: 'Some features may be unavailable:',
    logLocation: 'Log location: ',
    causesTitle: 'Common causes and fixes:',
    cause1: '1. An old Locus process is still running (run killall Locus in a terminal and retry)',
    cause2: '2. The ~/.proma/ config is corrupted (rename ~/.proma and restart)',
    cause3: '3. The system Keychain cannot decrypt saved credentials (delete ~/.proma/feishu.json etc., then sign in again)',
    feedback: 'For help, please report to GitHub Issues.',
  },
}
