/** files 域文案（English）。与 zh-CN 同名文件同形；缺键会在编译期报错。 */
import type { MirrorStructure } from '../../types'
import { files as zhFiles } from '../zh-CN/files'

export const files: MirrorStructure<typeof zhFiles> = {
  notRegularFile: 'Not a regular file',
  statFailed: 'Failed to get file size',
  readFailed: 'Failed to read file',
  attachDialog: {
    title: 'Attach File or Folder',
    message: 'Choose what type of content to attach',
    file: 'Files',
    folder: 'Folder',
  },
}
