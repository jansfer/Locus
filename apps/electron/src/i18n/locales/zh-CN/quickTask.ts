/** quickTask 域文案（简体中文）。快速任务浮动窗口。 */
export const quickTask = {
  placeholderAgent: '向 Locus 描述你的任务，Enter 发送...',
  placeholderChat: '向 Locus 发送消息，Enter 发送...',
  shortcutClose: 'Esc 关闭',
  addAttachment: '添加附件',
  attachment: '附件',
  dropHint: '支持粘贴或拖拽文件',
  send: '发送',
  toast: {
    largeFileReferenced: '已将大文件作为附加文件引用：{names}',
    tooLargeSkipped: '以下文件超过 100MB，已跳过：{names}',
    chatLargeFileUnsupported: 'Chat 附件暂不支持大文件。',
    noLocalPath: '无法取得本地路径，不能作为附加文件引用。',
    chatLargeFileKept: 'Chat 暂不支持大文件附加，已保留在快速任务窗口：{names}',
  },
} as const
