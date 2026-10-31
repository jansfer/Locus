/** sessionPreview 域文案（简体中文）。迁移时按功能补充键；叶子必须是 string。 */
export const sessionPreview = {
  toolUse: '调用工具 {name}',
  toolResultError: '工具结果出错',
  toolResultOk: '工具返回结果',
  compactSuccess: '上下文已压缩',
  compactNoop: '当前上下文无需压缩',
  compacting: '正在压缩上下文...',
  compactFailed: '上下文压缩失败',
  permissionDenied: '权限检查已拒绝操作',
  emptyMessage: '(空消息)',
  loadFailed: '无法加载会话内容',
  itemCount: '{n} 条',
  reading: '正在读取会话...',
  empty: '暂无可预览内容',
} as const
