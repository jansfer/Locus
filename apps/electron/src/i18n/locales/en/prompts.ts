/** prompts 域文案（English）。与 zh-CN 同名文件同形；缺键会在编译期报错。 */
import type { MirrorStructure } from '../../types'
import { prompts as zhPrompts } from '../zh-CN/prompts'

export const prompts: MirrorStructure<typeof zhPrompts> = {
  defaultReplyInstruction: 'Reply in English by default; the user’s explicit language choice and project instructions take precedence.',
  responseLanguage: 'Interface language: English. Reply in English unless the user specifies otherwise.',
}
