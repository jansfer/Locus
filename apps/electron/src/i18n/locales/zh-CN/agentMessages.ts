/** agentMessages 域文案（简体中文）。迁移时按功能补充键；叶子必须是 string。 */
export const agentMessages = {
  /** 上下文压缩状态 */
  compact: {
    successLabel: '上下文已压缩',
    startedLabel: '开始压缩上下文',
    noopLabel: '当前上下文无需压缩',
    failedLabel: '上下文压缩失败',
    runningLabel: '正在整理上下文',
    runningDetail: '正在生成会话摘要，完成后可继续当前任务。',
    successDetail: '会话已整理，可以继续当前任务。',
    noopDetail: '当前上下文仍可用，可以继续当前任务。',
    failedDetail: '请检查模型连接后重试。',
    compactAction: '压缩上下文',
  },
  permissionDenied: '权限检查已拒绝操作',
  /** 错误卡片与恢复操作 */
  error: {
    unknown: '未知错误',
    viewDetails: '查看诊断详情',
    hideDetails: '收起诊断详情',
    reselectFolder: '重新选择文件夹',
    createEmptyFolder: '在原路径新建空文件夹',
    retryInNewConversation: '在新对话继续',
    retryInNewConversationTitle: '新建对话并引用当前会话继续',
    retryInNewSession: '在新会话中重试',
    retryInNewSessionTitle: '如遇到未知错误，可点此按钮在新会话中尝试解决',
  },
  /** 助手消息操作栏 */
  actions: {
    markAsTodo: '标记为 Todo',
    exploreFromHere: '从此处探索（保留主线，结论可带回）',
    rewindToHere: '回退到此处',
    stoppedByUser: '已被用户中断',
  },
  attachment: {
    saveImage: '保存图片',
  },
  /** 定时任务来源标记 */
  scheduledRun: {
    badge: '来自 Locus 定时任务',
    badgeTitle: '来自 Locus 定时任务，点击查看设置',
  },
  /** 网络中断自动恢复 */
  retry: {
    interruptedCountdown: '网络暂时中断，{countdown} 秒后开始第 {attempt}/{max} 次继续当前回答',
    interruptedSoon: '网络暂时中断，即将开始第 {attempt}/{max} 次继续当前回答',
    running: '正在第 {attempt}/{max} 次继续当前回答…',
    resumed: '已在第 {attempt}/{max} 次继续当前回答时恢复',
    exhaustedTotal: '本轮自动恢复已耗尽（{total}/{max}）',
    exhaustedCurrent: '自动恢复已耗尽（{attempt}/{max}）',
    cancelled: '自动恢复已取消',
    scheduledTotal: '本轮已安排 {total}/{max} 次自动恢复',
    historyTitle: '已执行的恢复记录：',
    waitingAttempt: '等待 {countdown} 秒后开始第 {attempt} 次继续当前回答',
    soonAttempt: '即将开始第 {attempt} 次继续当前回答',
    runningAttempt: '正在执行第 {attempt} 次继续当前回答…',
    attemptError: '第 {attempt} 次恢复前的错误（{time}）- {reason}',
    runtimeLabel: '运行时: {value}',
    platformLabel: '平台: {value}',
    modelLabel: '模型: {value}',
    projectLabel: '项目: {value}',
    showStderr: '显示 stderr 输出',
    showStackTrace: '显示堆栈跟踪',
  },
  /** Token 用量 tooltip */
  usage: {
    duration: '耗时: {duration}',
    input: '输入: {value}',
    output: '输出: {value}',
    cacheWrite: '缓存写入: {value}',
    cacheRead: '缓存读取: {value}',
  },
  /** 工具调用块与思考块 */
  tool: {
    promptLabel: '提示词',
    relatedBlocks: '关联 {blocks}',
    completedCount: '{done}/{total} 已完成',
    inProgressCount: '{n} 进行中',
    pendingCount: '{n} 待处理',
    childToolCount: '{n} 项工具',
    toolCallCount: '{n} 次工具调用',
    expandThinking: '展开思考',
  },
  /** AskUser 问答横幅 */
  askUser: {
    title: 'Locus Agent 需要你的输入',
    dismissTitle: '关闭并终止 Agent',
    tabMulti: '{n}-多选：{header}',
    tabSingle: '{n}-单选：{header}',
    questionFallback: '问题 {n}',
    badgeMulti: '{n}-多选',
    badgeSingle: '{n}-单选',
    badgeMultiWithHeader: '{n}-多选：{header}',
    badgeSingleWithHeader: '{n}-单选：{header}',
    hintConfirm: '↑↓ 选择 · Enter 确认',
    hintNext: '↑↓ 选择 · Enter 下一个',
    customOption: '其他...',
    customPlaceholder: '输入自定义答案...',
  },
} as const
