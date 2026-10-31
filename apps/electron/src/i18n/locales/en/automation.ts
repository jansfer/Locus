/** automation 域文案（English）。与 zh-CN 同名文件同形；缺键会在编译期报错。 */
import type { MirrorStructure } from '../../types'
import { automation as zhAutomation } from '../zh-CN/automation'

export const automation: MirrorStructure<typeof zhAutomation> = {
  schedule: {
    everyday: 'Every day',
    workdays: 'Weekdays',
    weekend: 'Weekend',
    unspecifiedTime: 'scheduled time',
    once: 'Run once ({when})',
    daily: 'Daily at {time}',
    weekly: 'Every {name} at {time}',
    monthly: 'Monthly on day {day} at {time}',
    interval: 'Every {n} {unit}',
    unitMinutes: 'minutes',
    unitHours: 'hours',
    unitDays: 'days',
    maxRunsSuffix: '· limited to {n} runs',
  },
  notification: {
    completedTitle: 'Automation Completed',
    failedTitle: 'Automation Failed',
    successStatus: 'Success',
    failedStatus: 'Failed',
    noOutput: 'Agent finished (no text output)',
    noErrorDetail: 'No error details',
    fieldTask: '**Task**: {name}',
    fieldStatus: '**Status**: {status}',
    fieldCatchUp: '**Trigger**: catch-up run (missed while the app was not running)',
    fieldDuration: '**Duration**: {duration}',
    fieldSessionId: '**Session ID**: {id}',
    durationUnknown: 'unknown',
    durationSeconds: '{n}s',
    durationMinutes: '{n} min',
    truncatedSuffix: '\n\n... [Content too long; open the full session in Locus]',
  },
}
