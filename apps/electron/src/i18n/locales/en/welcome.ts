/** welcome 域文案（English）。与 zh-CN 同名文件同形；缺键会在编译期报错。 */
import type { MirrorStructure } from '../../types'
import { welcome as zhwelcome } from '../zh-CN/welcome'

export const welcome: MirrorStructure<typeof zhwelcome> = {

}
