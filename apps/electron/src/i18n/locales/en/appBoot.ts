/** appBoot 域文案（English）。与 zh-CN 同名文件同形；缺键会在编译期报错。 */
import type { MirrorStructure } from '../../types'
import { appBoot as zhappBoot } from '../zh-CN/appBoot'

export const appBoot: MirrorStructure<typeof zhappBoot> = {
  splash: {
    tagline: 'Where collaboration flows and ideas take shape',
    starting: 'Starting Locus',
  },
  update: {
    downloadedTitle: 'Locus update downloaded',
    downloadedDesc: 'Will install automatically once all agents finish.',
    viewUpdate: 'View update',
    installWhenIdle: 'Update when idle',
    notReady: 'The update is not ready yet, please try again later',
    scheduledTitle: 'Update scheduled for idle time',
    scheduledDesc: 'Locus will restart to install once current tasks finish.',
    cancelSchedule: 'Cancel schedule',
    scheduleFailed: 'Could not schedule the idle update, please try again later',
    fallbackVersion: 'New version',
  },
}
