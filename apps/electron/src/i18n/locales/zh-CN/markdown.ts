/** markdown 域文案（简体中文）。迁移时按功能补充键；叶子必须是 string。 */
export const markdown = {
  preview: {
    fieldCount: '{n} 个字段',
    keyNameAria: 'Property {key} 名称',
    valueAria: '{key} 属性值',
    unset: '未设置',
    removePropertyAria: '删除属性 {key}',
    editMathAria: '点击编辑公式',
    editImageAria: '点击编辑图片',
    pastedImage: '粘贴的图片',
  },
  tableEditor: {
    cellAriaHeader: '表头 {row}，{column}',
    cellAria: '单元格 {row}，{column}',
    editCellAria: '编辑{cell}',
    keyHint: 'Enter 保存，Shift+Enter 换行，Tab 切换单元格，Esc 取消',
    insertRowAbove: '在上方插入行',
    insertRowBelow: '在下方插入行',
    deleteRow: '删除本行',
    insertColumnLeft: '在左侧插入列',
    insertColumnRight: '在右侧插入列',
    deleteColumn: '删除本列',
    deleteTable: '删除表格',
    hint: '点击编辑、右键操作更多',
    tableAria: 'Markdown 表格',
  },
} as const
