/** markdown 域文案（English）。与 zh-CN 同名文件同形；缺键会在编译期报错。 */
import type { MirrorStructure } from '../../types'
import { markdown as zhmarkdown } from '../zh-CN/markdown'

export const markdown: MirrorStructure<typeof zhmarkdown> = {
  preview: {
    fieldCount: '{n} fields',
    keyNameAria: 'Property {key} name',
    valueAria: '{key} property value',
    unset: 'Not set',
    removePropertyAria: 'Remove property {key}',
    editMathAria: 'Click to edit math',
    editImageAria: 'Click to edit image',
    pastedImage: 'Pasted image',
  },
  tableEditor: {
    cellAriaHeader: 'Header {row}, {column}',
    cellAria: 'Cell {row}, {column}',
    editCellAria: 'Edit {cell}',
    keyHint: 'Enter to save, Shift+Enter for a new line, Tab to move between cells, Esc to cancel',
    insertRowAbove: 'Insert row above',
    insertRowBelow: 'Insert row below',
    deleteRow: 'Delete row',
    insertColumnLeft: 'Insert column left',
    insertColumnRight: 'Insert column right',
    deleteColumn: 'Delete column',
    deleteTable: 'Delete table',
    hint: 'Click to edit, right-click for more actions',
    tableAria: 'Markdown table',
  },
}
