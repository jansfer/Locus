/** agentView 域文案（简体中文）。迁移时按功能补充键；叶子必须是 string。 */
export const agentView = {
  /** 思考模式 Hover Popover；档位键名与 AgentThinkingLevel 取值一一对应。 */
  thinking: {
    depth: '思考深度',
    mode: '思考模式',
    off: '关闭',
    minimal: '最小',
    low: '低',
    medium: '中',
    high: '高',
    xhigh: '极高',
    max: '最大',
  },
  /** Todo / 日程的 Agent 操作通知。 */
  planning: {
    todo: {
      created: '已创建 Todo',
      updated: '已更新 Todo',
      deleted: '已删除 Todo',
    },
    schedule: {
      created: '已创建日程',
      updated: '已更新日程',
      deleted: '已删除日程',
    },
    quotedTitle: '「{title}」',
  },
  /** 从回复节点标记为 Todo 的弹窗。 */
  todoDialog: {
    title: '标记为 Todo',
    taskTitle: '任务标题',
    group: 'Todo 分组',
    noGroup: '不分组',
    add: '添加 Todo',
    emptyTitle: 'Todo 标题不能为空',
    titleTooLong: 'Todo 标题不能超过 500 字',
    added: '已添加 Todo',
    linkedDesc: '已关联当前 Agent 会话',
    createFailed: '创建 Todo 失败',
  },
  /** 附件处理提示。 */
  attachments: {
    noWorkspace: '暂时无法发送附件',
    noWorkspaceDesc: '当前 Agent 会话没有绑定有效项目。请在顶部选择项目，或新建 Agent 会话后重新上传。',
    staleData: '附件数据已失效',
    stalePasteDesc: '请移除后重新粘贴：{files}',
    staleFilesDesc: '请移除后重新添加文件：{files}',
    saveFailed: '附件保存失败',
    saveFailedDesc: '请确认当前项目可用，或新建 Agent 会话后重新上传。',
    notAttached: '附件没有成功加入消息',
    notAttachedDesc: '请重新上传文件，或切换到有效项目后再试。',
    largeReferenced: '已将大文件作为附加文件引用：{files}',
    oversizedSkipped: '以下文件超过 100MB 且无法取得本地路径，已跳过：{files}',
    attachFailedSkipped: '以下文件附加失败，已跳过：{files}',
    unreadableSkipped: '以下文件无法读取，已跳过：{files}',
    directoryAttached: '已附加目录: {names}',
    directoryAttachFailed: '以下文件夹附加失败：{names}',
    attachContentFailed: '附加文件或文件夹失败',
    longTextConverted: '已将超长文本转为附件',
    longTextConvertedDesc: '{filename}，点击附件可预览编辑。',
    longTextConvertFailed: '超长文本转附件失败',
    cannotReferenceCurrent: '不能引用当前会话',
    filesReferenced: '已引用 {n} 个文件',
  },
  /** 模型与思考深度切换。 */
  model: {
    switchDeferred: '模型已切换，本轮结束后生效',
    fastModeToggleFailed: '快速模式切换失败',
    defaultThinkingSaveFailed: '默认思考深度保存失败',
    thinkingSwitchDeferred: '思考强度已切换，本轮结束后生效',
    thinkingSwitchFailed: '思考深度切换失败',
    recommendedUnavailable: '推荐模型已不可用，请重新选择模型',
    replyNotFinished: '当前回复尚未结束，请稍后再切换模型',
    switchedRetrying: '已切换到 {name}，正在重试',
  },
  /** 消息发送。 */
  send: {
    stoppingPrevious: '正在停止上一轮 Agent',
    stoppingPreviousDesc: '请等待停止完成后再发送消息。',
    legacyTranscript: '这是只读历史会话，请新建 Pi 会话继续',
    messagesSyncing: '上一轮消息正在同步',
    messagesSyncingDesc: '请稍等片刻再发送；队列会在同步完成后继续。',
    enqueueFailed: '消息加入队列失败',
    appendFailed: '追加消息失败',
  },
  /** 消息队列。 */
  queue: {
    alreadySending: '消息已开始发送，无法再立即发送',
    sendFailed: '队列消息发送失败',
    operationFailed: '队列消息操作失败',
    recallBlocked: '消息已开始发送，无法撤回',
    removeBlocked: '消息已开始发送，无法删除',
    removeFailed: '删除队列消息失败',
  },
  /** 本地项目根重新关联与恢复。 */
  projectRoot: {
    relinked: '本地项目根已重新关联',
    relinkFailed: '重新关联项目文件夹失败',
    restored: '已在原路径新建空项目文件夹',
    restoreFailed: '恢复项目文件夹失败',
    restoreDialogTitle: '在原路径新建空文件夹？',
    restoreDialogDesc: '将在该本地项目原路径创建空文件夹。此操作不会恢复被删除的文件。',
    creating: '创建中...',
    createEmptyFolder: '新建空文件夹',
  },
  /** 探索分支（AgentView 分叉 + SidePanel 带回引用）。 */
  exploration: {
    sourceLabel: '这条 Agent 回复',
    forked: '已创建探索分支',
    forkedDesc: '分支继承此处之前的完整上下文；结论可带回主线。',
    forkFailed: '创建探索分支失败',
    forkNotSupported: '该消息无法作为探索起点（可能属于子代理执行过程或已被清理）。请选择主对话中的其他回复再试。',
    bringBackNoConclusion: '探索分支还没有可带回的 Agent 结论',
    referenceLabel: '探索后新增内容 · {title}',
    referencePrefix: '这是探索后的新增内容：',
    added: '已添加探索引用',
    addedDesc: '探索 Tab 保持打开；主会话发送后 Agent 会读取该标记。',
    action: '添加探索引用',
    actionTip: '将探索后新增内容作为会话引用添加到主线草稿；探索 Tab 保持打开，不会自动发送',
    noConclusionTip: '完成一轮新的探索回复后即可添加引用',
  },
  /** 快照回退。 */
  rewind: {
    confirmTitle: '确认回退',
    confirmDesc: '回退将截断该消息之后的所有对话。此操作不可撤销，确定要回退吗？',
    action: '回退',
    rewound: '已回退到此处',
    filesRestored: '{n} 个文件已恢复',
    filesUnchanged: '文件无变化',
    rewoundNoFiles: '已回退对话',
    fileRestoreUnavailable: '文件恢复不可用：{error}',
    failed: '回退失败',
  },
  /** 输入工具栏（Codex 快速模式 / 附加 / 停止）。 */
  toolbar: {
    fastModeOn: '快速',
    fastModeOff: '标准',
    fastModeOnTip: '已启用快速模式：优先响应，消耗更多额度',
    fastModeOffTip: '开启快速模式：优先响应，消耗更多额度',
    attach: '附加文件或文件夹',
    stop: '停止 Agent',
    stopAgain: '再次停止 Agent',
    stopUnconfirmed: '停止未确认，再次发送中断请求',
    stopWithShortcut: '停止 Agent ({shortcut})',
  },
  /** 输入框 placeholder 与模型引导。 */
  composer: {
    placeholderCmdEnter: '输入消息...（@ 引用文件，/ 调用 Skill，# 使用 MCP，& 引用会话，～ 引用待办/日程；⌘/Ctrl+Enter 发送）',
    placeholderEnter: '输入消息...（@ 引用文件，/ 调用 Skill，# 使用 MCP，& 引用会话，～ 引用待办/日程；Enter 发送）',
    selectModelFirst: '请先选择模型',
    noModelEnableChannel: '暂无可用模型，请先在设置中启用渠道',
    noAvailableModel: '暂无可用模型，请在设置中添加或启用渠道和模型',
    selectModelToStart: '请选择模型以开始 Agent 对话',
    goToSettings: '前往设置',
    selectModel: '选择模型',
  },
  /** 已退役 Claude runtime 的只读历史会话横幅。 */
  legacy: {
    banner: '这是已退役 Claude runtime 的只读历史会话；原对话可查看，但不能继续、分叉或回退。',
    continueInPi: '以 Pi 新会话继续',
  },
  /** SidePanel 右侧工作区 Tab 标题。 */
  tabs: {
    files: '文件',
    changes: '改动',
    calendar: '日程',
    automations: '定时任务',
    memory: '项目记忆',
    chat: '问答',
    explorationFallback: '探索分支',
    previewFallback: '预览',
    newBrowserTab: '新建标签页',
  },
  /** SidePanel 终端 Tab 标题。 */
  terminal: {
    defaultTitle: '终端',
    withName: '终端 · {name}',
  },
  /** SidePanel 文件浏览（来源切换、附加列表、空态）。 */
  filesBrowser: {
    sessionFiles: '会话文件',
    projectFiles: '项目文件',
    projectRootUnavailable: '本地项目根目录不可用；当前会话文件仍可访问。',
    searchPlaceholder: '搜索文件...',
    sourceTablist: '文件来源',
    dragToReference: '支持拖拽文件或文件夹到输入框，实现引用',
    openTerminalIn: '在 {name} 打开终端',
    openTerminalTip: '在右侧标签中打开终端',
    detachDirectoryNamed: '解除附加目录 {name}',
    detachDirectoryTip: '解除附加目录',
    emptyFolder: '空文件夹',
  },
  /** SidePanel 并排 Pane。 */
  pane: {
    ariaLeft: '左侧 Pane：{tab}',
    ariaRight: '右侧 Pane：{tab}',
    sideBySideLeft: '在左侧并排',
    sideBySideRight: '在右侧并排',
    resizeAria: '调整并排宽度；双击恢复均分',
  },
  /** SidePanel 内嵌浏览器视图。 */
  browser: {
    dropToRestore: '释放后恢复浏览器视图',
    tabClosed: '浏览器标签已关闭',
  },
  /** SidePanel 内嵌问答空态。 */
  chatEmpty: '暂无问答会话',
  /** SidePanel 等待初始化空态。 */
  waiting: {
    projectInit: '等待项目初始化...',
    sessionInit: '等待会话初始化...',
  },
  /** 附加文件/目录行菜单。 */
  fileMenu: {
    moreActions: '更多操作',
    referenceToAgent: '引用到 Agent',
    addToChat: '添加到聊天',
    showInFolder: '在文件夹中显示',
    openFile: '打开文件',
    detach: '移除附加',
    moveTo: '移动到...',
  },
  unknownError: '未知错误',
  /** 在新对话继续时发送给 Agent 的默认提示词（作为用户消息展示）。 */
  newSessionPrompt: '请读取 &session:{sessionId} 的历史，然后从上个会话停止的位置继续。',
} as const
