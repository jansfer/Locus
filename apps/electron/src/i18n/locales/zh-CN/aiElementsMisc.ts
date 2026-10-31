/** aiElementsMisc 域文案（简体中文）。迁移时按功能补充键；叶子必须是 string。 */
export const aiElementsMisc = {
  /** 上下文分隔线 */
  contextDivider: {
    clearContext: '清除上下文',
    deleteDivider: '删除分隔线',
  },
  /** 对话容器空状态 */
  conversation: {
    emptyTitle: '暂无消息',
    emptyDescription: '在下方输入框开始对话',
  },
  /** 输入工具栏溢出按钮 */
  toolbarOverflow: {
    moreTools: '更多工具',
  },
  /** 语音输入按钮 */
  speechButton: {
    voiceInput: '语音输入',
    startVoiceInput: '开始语音输入',
    stopVoiceInput: '停止语音输入',
    preparingMic: '准备麦克风',
    listening: '正在听写',
    finishingUp: '收尾中',
    voiceDisabledHint: '请先在设置中打开语音输入开关',
    voiceToggleFailed: '切换语音输入失败',
  },
  /** 推理/思考折叠组件 */
  reasoning: {
    thinkingShort: '思考中...',
    thoughtFewSeconds: '思考了几秒',
    thoughtSeconds: '思考了 {n} 秒',
  },
  /** 消息导航迷你地图 */
  minimap: {
    title: '消息导航',
    searchPlaceholder: '搜索消息...',
    queryTooLong: '查询过长，请缩短后重试。',
    historyTooLong: '历史过长，仅显示可索引范围内的结果；请缩小范围。',
    searching: '搜索中...',
    noResults: '未找到匹配消息',
    emptyMessage: '(空消息)',
  },
  /** 文件路径芯片 */
  filePathChip: {
    fileNotFound: '未找到文件：{name}',
    fileMissing: '文件不存在: {path}',
    openPreview: '打开预览',
    showInFolder: '在文件管理器中显示',
  },
} as const
