/** notifications 域文案（English）。与 zh-CN 同名文件同形；缺键会在编译期报错。 */
import type { MirrorStructure } from '../../types'
import { notifications as zhNotifications } from '../zh-CN/notifications'

export const notifications: MirrorStructure<typeof zhNotifications> = {
  scenes: {
    taskComplete: 'Task Complete',
    taskCompleteShort: 'Done',
    permissionRequest: 'Permission',
    permissionRequestShort: 'Perm',
    exitPlanMode: 'Plan Approval',
    exitPlanModeShort: 'Plan',
    planningReminder: 'Reminder',
    planningReminderShort: 'Remind',
  },
  library: {
    title: 'Sound Library',
    description: 'Pick a notification scene, then choose a feel for it',
    uisfxLink: 'UI SFX Library',
    off: 'Off',
    offState: 'Off',
    preview: 'Preview {name}',
    restoreDefault: 'Restore default sound',
    disableScene: 'Mute this scene',
  },
  soundPacks: {
    minimal: { description: 'Clean, precise, nearly invisible', bestFor: 'Productivity and system UI' },
    soft: { description: 'Rounded, gentle, reassuring', bestFor: 'Friendly daily workflows' },
    glass: { description: 'Bright and crystalline with a premium touch', bestFor: 'Clear status feedback' },
    arcade: { description: 'Pixel-flavored, brisk, a bit celebratory', bestFor: 'High-feedback tasks' },
    mechanical: { description: 'Switches, relays, and a definite cadence', bestFor: 'Dev tools and automation' },
    organic: { description: 'Wood, water, and pebbles', bestFor: 'Warm, memorable feedback' },
    dreamy: { description: 'Airy blooms and slow shimmer', bestFor: 'Long focus sessions' },
    scifi: { description: 'Restrained holograms and digital gloss', bestFor: 'AI and futuristic UI' },
    rubber: { description: 'Springy touch and friendly bounce', bestFor: 'Relaxed, approachable interactions' },
    cinematic: { description: 'Deep impact with a refined tail', bestFor: 'Important results and completions' },
    studio: { description: 'Tactile precision, warm and restrained', bestFor: 'Creation and AI workbench' },
    zen: { description: 'Paper, wood, and quiet bells', bestFor: 'Reading, planning, and focus' },
  },
}
