/** chat 域文案（简体中文）。迁移时按功能补充键；叶子必须是 string。 */
export const chat = {
  /** Agent 模式推荐横幅与迁移按钮 */
  agentMode: {
    recommendTitle: '推荐使用 Agent 模式',
    switchAction: '切换到 Agent 模式',
    switching: '切换中...',
    switchedTitle: '已切换到 Agent 模式',
    switchedDescription: '对话历史已迁移到新的 Agent 会话',
    switchFailed: '切换到 Agent 模式失败',
    channelNotConfigured: '请先在设置中配置 Agent 渠道',
    newSessionTitle: '新 Agent 会话',
  },
  /** 底部输入区 */
  input: {
    addAttachment: '添加附件',
    stopWithShortcut: '停止 Agent ({shortcut})',
    placeholderCmdEnter: '输入消息... (⌘/Ctrl+Enter 发送，Enter 换行)',
    placeholderEnter: '输入消息... (Enter 发送，Shift+Enter 换行)',
    noNetwork: '当前无网络连接，请检查网络后重试',
    sendFailed: '发送失败，请重试',
  },
  /** 附件 */
  attachment: {
    oversizedFiles: '以下文件超过 100MB，Chat 附件暂不支持，已跳过：{files}',
    unreadableFiles: '以下文件无法读取，已跳过：{files}',
    pastedFallbackName: '粘贴附件-{n}',
  },
  /** 消息条目 */
  message: {
    generateFailed: '生成失败',
    stopped: '（已中止）',
    resend: '重新发送',
    editAndResend: '编辑后重发',
    userAvatarAlt: '用户头像',
  },
  /** 删除消息确认对话框 */
  deleteDialog: {
    title: '确认删除',
    description: '删除后无法恢复。',
    pairWarning: '提示：建议同时删除对话对（用户消息和对应的助手回复），否则可能因数据结构变化导致模型无法正常返回对话。',
    deleting: '删除中...',
  },
  /** 消息原地编辑 */
  inlineEdit: {
    placeholder: '编辑消息...',
    cancelShortcut: '取消 (Esc)',
    sendShortcut: '发送 (Enter)',
  },
  /** 思考设置 */
  thinking: {
    ariaLabel: '思考设置',
    mode: '思考模式',
    toggleAria: '启用思考模式',
    off: '已关闭',
    geminiDepth: 'Gemini 思考深度',
    levelMinimal: '最小',
    levelLow: '低',
    levelMedium: '中',
    levelHigh: '高',
    defaultLevel: '当前模型默认：{level}',
  },
  /** 上下文长度设置 */
  context: {
    settings: '上下文设置',
    length: '上下文长度',
    unlimited: '无限',
    rounds: '{n} 轮',
  },
  /** 清除上下文按钮 */
  clearContext: {
    label: '清除上下文',
    withShortcut: '清除上下文 ({shortcut})',
  },
  /** 模型选择器 */
  model: {
    selectModel: '选择模型',
    noModels: '暂无可用模型',
    searchPlaceholder: '搜索模型...',
    notFound: '未找到模型',
    channelPrefix: '渠道：{name}',
    channelModel: '{channel} · {model}',
  },
  /** 并排模式 */
  parallel: {
    userMessages: '用户消息',
    assistantReplies: '助手回复',
    emptyUser: '暂无用户消息',
    emptyAssistant: '暂无助手回复',
  },
  /** 对话头部 */
  header: {
    editTitle: '编辑标题',
    unpin: '取消置顶',
    pin: '置顶对话',
    exitParallel: '关闭并排模式',
    parallelMode: '并排模式',
  },
  /** 系统提示词侧栏与选择器 */
  prompt: {
    title: '提示词',
    create: '新建提示词',
    newName: '新提示词',
    name: '名称',
    content: '内容',
    contentPlaceholder: '输入系统提示词内容...',
    appendInfo: '追加日期时间和用户名',
    builtin: '(内置)',
    setDefault: '设为默认',
    edit: '编辑提示词',
    select: '选择提示词',
    tooltip: '提示词: {name}',
  },
  /** 工具选择器 */
  tools: {
    title: '工具',
    needsConfig: '需配置',
  },
} as const
