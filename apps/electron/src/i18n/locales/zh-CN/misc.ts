/** misc 域文案（简体中文）。散落在 lib/atoms/hooks/contexts 的用户可见文案；渲染端按 id/键名消费。 */
export const misc = {
  /** 会话、Tab 与引用标签的通用文案 */
  session: {
    untitled: '未命名会话',
    newAgentSession: '新 Agent 会话',
    newConversation: '新对话',
    queuedSessionRef: '会话 {id}',
    queuedScheduleRef: '日程 {id}',
    previewTabTitle: '预览：{name}',
    defaultAgentTabTitle: 'Agent 会话',
    delegationTabTitle: '委派任务',
    agentHistoryLabel: 'Agent 历史',
    historyQuoteRound: '第{turn}轮：{preview}',
    historyQuoteFallback: '历史引用：{preview}',
  },
  /** 归档会话列表的虚拟分组 */
  archiveGroups: {
    automations: '定时任务',
    unassigned: '未归属项目',
  },
  /** 能力变化（MCP/Skill 增删启停）的 toast */
  capabilities: {
    mcpAdded: 'MCP 服务器已添加：{name}',
    mcpRemoved: 'MCP 服务器已移除：{name}',
    mcpEnabled: 'MCP 服务器已启用：{name}',
    mcpDisabled: 'MCP 服务器已禁用：{name}',
    skillAdded: 'Skill 已添加：{name}',
    skillRemoved: 'Skill 已移除：{name}',
    skillEnabled: 'Skill 已启用：{name}',
    skillDisabled: 'Skill 已关闭：{name}',
    mcpSummary: '{n} 个 MCP 服务器',
    skillSummary: '{n} 个 Skill',
    summaryUpdated: '项目配置已更新：{list}',
    /** 摘要列表分隔符：中文顿号、英文逗号 */
    summaryJoiner: '、',
  },
  /** 渠道订阅额度显示 */
  quota: {
    weeklyLabel: '周',
    remaining: '剩余 {value}',
    resetAt: '，重置 {time}',
    noResetTime: '，未提供重置时间',
    loadingSummary: '额度加载中',
    copilotLoadingTitle: '正在读取 GitHub Copilot 订阅额度',
    unknownSummary: '额度未知',
    unavailableSummary: '额度不可用',
    copilotNoDataTitle: 'GitHub Copilot 未提供可用额度数据',
    planFallback: '订阅额度',
    detailTitle: '{plan}\n{details}',
    fetchFailed: '订阅额度查询失败，请稍后重试',
  },
  /** 剪贴板与图片复制 */
  clipboard: {
    writeNotSupported: '当前环境不支持写入剪贴板',
    imageFetchFailed: '图片读取失败（{status}）',
    imageConvertFailed: '图片转换失败',
    imageConvertAborted: '图片转换已取消',
    invalidImageData: '无效的图片数据',
    copyFailed: '复制失败',
    copyFailedHint: '复制失败，请检查图片是否可访问',
  },
  /** 文件名列表与大小限制 */
  files: {
    /** 文件名列表分隔符：中文顿号、英文逗号 */
    listJoiner: '、',
    listOverflow: '{names} 等 {n} 个文件',
    sizeLimitExceeded: '文件 {name} 超过 100MB 大小限制',
  },
  /** 「用 XX 打开」菜单标签 */
  openWith: {
    withApp: '用 {name} 打开',
    systemDefault: '用系统默认应用打开',
  },
  /** Markdown 前置元数据预览 */
  frontmatter: {
    summaryLabel: '前置元数据',
  },
  /** 快捷键名称/描述/分类；数据文件存键名，渲染处 t(key) */
  shortcuts: {
    categories: {
      app: '应用',
      edit: '编辑',
      navigation: '导航',
      global: '全局',
    },
    items: {
      'open-settings': { name: '打开设置', description: '打开应用设置面板' },
      'new-session': { name: '新建对话', description: '根据当前模式创建 Chat 对话或 Agent 会话' },
      'toggle-sidebar': { name: '切换侧边栏', description: '显示或隐藏左侧边栏' },
      'zoom-in': { name: '放大界面', description: '提高 Locus 界面的缩放比例' },
      'zoom-out': { name: '缩小界面', description: '降低 Locus 界面的缩放比例' },
      'reset-zoom': { name: '重置界面缩放', description: '恢复 Locus 界面的默认缩放比例' },
      'toggle-mode': { name: '切换模式', description: '在 Chat 和 Agent 模式之间切换' },
      'global-search': { name: '全局搜索', description: '搜索对话和会话' },
      'file-find': { name: '查找', description: '在对话中搜索消息，或在文件预览/Diff 面板中查找文件内容' },
      'focus-input': { name: '聚焦输入框', description: '快速跳转到输入框' },
      'editor-bold': { name: '加粗 / 取消加粗', description: '输入框中切换文字加粗' },
      'editor-strikethrough': { name: '删除线 / 取消删除线', description: '输入框中切换文字删除线' },
      'clear-context': { name: '清除上下文', description: '清除当前对话的上下文' },
      'stop-generation': { name: '停止 Agent', description: '中断当前 AI 响应' },
      'close-tab': { name: '关闭当前标签', description: '关闭当前 Chat 标签页，或 Agent 右侧组件、预览、浏览器和终端标签' },
      'toggle-preview-panel': { name: '切换预览面板', description: '显示或隐藏内联 Diff/文件预览面板' },
      'toggle-right-panel': { name: '切换文件面板', description: '显示或隐藏右侧文件面板' },
      'quick-task': { name: '快速任务', description: '唤起浮动快速任务输入窗口' },
      'show-main-window': { name: '显示主窗口', description: '显示并聚焦 Locus 主窗口' },
      'voice-dictation': { name: '语音输入', description: '唤起豆包流式语音输入浮窗' },
    },
  },
  /** Ctrl+Tab 切换器的分组标题 */
  tabSwitcher: {
    collaborationTitle: '当前协作',
    collaborationDescription: '父会话与子会话',
    recentTitle: '最近访问',
    recentDescription: '按访问顺序排列',
  },
  /** 定时任务表单的间隔与星期选项；数据文件存键名，渲染处 t(key) */
  automation: {
    intervals: {
      m5: '每 5 分钟',
      m10: '每 10 分钟',
      m30: '每 30 分钟',
      h1: '每 1 小时',
      h3: '每 3 小时',
      h6: '每 6 小时',
      h12: '每 12 小时',
    },
    weekdays: {
      mon: '周一',
      tue: '周二',
      wed: '周三',
      thu: '周四',
      fri: '周五',
      sat: '周六',
      sun: '周日',
    },
  },
  /** Agent 全局监听器的桌面通知与完成态 toast */
  agentNotifications: {
    automationGraduated: '已接管自动任务会话，后续定时运行将创建新会话。',
    permissionTitle: '需要权限确认',
    permissionToolBody: 'Agent 请求使用工具: {tool}',
    permissionBody: 'Agent 需要你的权限确认',
    askUserTitle: 'Agent 需要你的输入',
    askUserFallbackBody: 'Agent 有问题需要你回答',
    planReviewTitle: 'Agent 计划待审批',
    planReviewBody: 'Agent 已完成计划，等待你的审批',
    completionTitle: 'Agent 任务完成',
    completionBody: '[{title}] 任务已完成',
    interruptedMaxTurns: '任务被中断：已达到轮次上限。继续对话可让 Agent 接着完成。',
    interruptedMaxBudget: '任务被中断：已达到预算上限。',
    executionError: '任务执行过程中发生错误。',
    emptyResponse: 'Agent 本轮结束了，但没有返回任何可展示内容。你的消息已保留，可以直接重试或切换模型。',
    abnormalEnd: '任务异常结束（{subtype}）',
    executionErrorDetail: '任务执行出错：{detail}',
  },
  /** 项目（工作区）操作失败提示 */
  project: {
    createFailed: '创建失败',
    folderSelectFailed: '选择项目文件夹失败',
  },
  /** 开发者误用 API 的异常提示 */
  dev: {
    conversationIdOutsideProvider: 'useConversationId 必须在 ConversationProvider 内使用',
  },
} as const
