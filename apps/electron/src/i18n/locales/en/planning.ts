/** planning 域文案（English）。与 zh-CN 同名文件同形；缺键会在编译期报错。 */
import type { MirrorStructure } from '../../types'
import { planning as zhPlanning } from '../zh-CN/planning'

export const planning: MirrorStructure<typeof zhPlanning> = {
  reminder: {
    todoTitle: 'Todo Reminder',
    eventTitle: 'Event Reminder',
  },
}
