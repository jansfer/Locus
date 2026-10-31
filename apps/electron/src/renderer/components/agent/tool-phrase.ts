/**
 * 工具语义化短语生成器
 *
 * 将工具名 + 输入参数合成为一句连贯、可读的中文短语，
 * 用于工具活动行的收起态展示和 Loading 态展示。
 */

import { computeDiffStats } from './tool-utils'
import type { MessageKey } from '@/i18n'
import { t } from '@/i18n'

const INTERNAL_TOOL_INPUT_PREFIX = '_'

/** 判断工具输入是否提供了可帮助用户识别本次调用的额外上下文。 */
function hasMeaningfulToolInput(input: Record<string, unknown>): boolean {
  return Object.entries(input).some(([key, value]) => {
    if (key.startsWith(INTERNAL_TOOL_INPUT_PREFIX)) {
      return key === '_intent' && typeof value === 'string' && value.trim().length > 0
    }
    if (typeof value === 'string') return value.trim().length > 0
    if (typeof value === 'number') return Number.isFinite(value)
    if (Array.isArray(value)) return value.length > 0
    return typeof value === 'object' && value !== null
  })
}

/** 去掉常见分隔符后比较名称和描述，兼容 MCP 工具名称格式。 */
function normalizeToolLabel(label: string): string {
  return label.toLocaleLowerCase().replace(/[\s/_.·-]+/g, '')
}

/**
 * 判断工具行是否需要显示工具类型前缀。
 *
 * 没有调用上下文时，名称后的短语只是工具的泛化描述，显示名称只会造成重复。
 */
export function shouldShowToolKindLabel(
  toolName: string,
  input: Record<string, unknown>,
  kindLabel: string,
  phraseLabel: string,
): boolean {
  // MCP 工具的语义化短语已经包含完整的 "SERVER / TOOL" 名称，
  // 再叠加 toolKindLabel 前缀会形成 "名称 · 名称 + 参数" 的重复，直接隐藏前缀。
  if (toolName.startsWith('mcp__')) return false
  if (!hasMeaningfulToolInput(input)) return false
  if (!kindLabel.trim() || !phraseLabel.trim()) return false
  if (normalizeToolLabel(kindLabel) === normalizeToolLabel(phraseLabel)) return false
  return normalizeToolLabel(toolName) !== normalizeToolLabel(phraseLabel)
}

/** 工具短语 */
export interface ToolPhrase {
  /** 完成态/收起态短语，如 "读取 foo.ts 第 10-60 行" */
  label: string
  /** Loading 态短语，如 "正在读取 foo.ts..." */
  loadingLabel: string
  /** 编辑/写入的增删行数统计，独立于 label，便于 UI 单独渲染且不被路径截断 */
  diffStats?: { additions: number; deletions: number }
}

/**
 * 用已解析文本构造短语（显式 intent 等运行时内容）。
 * Loading 态套用词典模板拼接，避免各工具重复维护进行时变体。
 */
function phrase(label: string): ToolPhrase {
  return {
    label,
    loadingLabel: t('agentMisc.toolLoadingTemplate', { label }),
  }
}

/** 用词典键构造短语；label 与 loading 态都随当前语言变化。 */
function phraseFromKey(key: MessageKey, params?: Record<string, string | number>): ToolPhrase {
  return phrase(t(key, params))
}

/**
 * 优先使用 Agent 为工具调用提供的短意图。
 * `_intent` 是内部展示元数据；Bash 的 `description` 兼容旧的语义化调用格式。
 */
function getExplicitToolIntent(toolName: string, input: Record<string, unknown>): string | null {
  const intent = input._intent
  if (typeof intent === 'string' && intent.trim()) return truncate(intent.trim(), 96)

  if (toolName === 'Bash') {
    const description = input.description
    if (typeof description === 'string' && description.trim()) {
      return truncate(description.trim(), 96)
    }
  }

  return null
}

/** 从路径中提取文件名（同时兼容 POSIX `/` 与 Windows `\` 分隔符） */
function filename(path: string): string {
  return path.split(/[/\\]/).pop() || path
}

/**
 * 从 Locus Skill 入口文件路径中提取 Skill 名称。
 *
 * Pi Agent 以普通 Read 工具加载 Skill，因此需在展示层识别
 * `<workspace>/skills/<skill-name>/SKILL.md`，避免标题只显示泛化的 SKILL.md。
 */
function skillNameFromEntryPath(path: string): string | null {
  const normalizedPath = path.replace(/\\/g, '/')
  const match = normalizedPath.match(/(?:^|\/)skills\/([^/]+)\/SKILL\.md$/i)
  return match?.[1] ?? null
}

/** 截断文本 */
function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text
}

/**
 * 根据工具名和输入参数生成语义化短语
 *
 * 返回的 label 应读起来像一个完整动宾短语，无冗余信息。
 */
export function getToolPhrase(toolName: string, input: Record<string, unknown>): ToolPhrase {
  const explicitIntent = getExplicitToolIntent(toolName, input)
  if (explicitIntent && toolName !== 'Edit' && toolName !== 'Write') {
    return phrase(explicitIntent)
  }

  switch (toolName) {
    case 'Read': {
      const fp = input.file_path ?? input.filePath
      if (typeof fp === 'string') {
        const skillName = skillNameFromEntryPath(fp)
        if (skillName) return phraseFromKey('agentMisc.toolPhrases.readSkillNamed', { name: skillName })

        const name = filename(fp)
        const offset = typeof input.offset === 'number' ? input.offset : undefined
        const limit = typeof input.limit === 'number' ? input.limit : undefined
        if (offset !== undefined && limit !== undefined) {
          return phraseFromKey('agentMisc.toolPhrases.readNamedLines', { name, range: `${offset}-${offset + limit}` })
        }
        if (offset !== undefined) {
          return phraseFromKey('agentMisc.toolPhrases.readNamedFromLine', { name, offset })
        }
        return phraseFromKey('agentMisc.toolPhrases.readNamed', { name })
      }
      return phraseFromKey('agentMisc.toolPhrases.readFile')
    }

    case 'Edit': {
      const fp = input.file_path ?? input.filePath
      const name = typeof fp === 'string' ? filename(fp) : t('agentMisc.toolPhrases.fileFallback')
      const diff = computeDiffStats('Edit', input)
      const explicitIntent = getExplicitToolIntent(toolName, input)
      const basePhrase = explicitIntent
        ? phrase(explicitIntent)
        : phraseFromKey('agentMisc.toolPhrases.editNamed', { name })
      if (diff && (diff.additions > 0 || diff.deletions > 0)) {
        return { ...basePhrase, diffStats: diff }
      }
      return basePhrase
    }

    case 'Write': {
      const fp = input.file_path ?? input.filePath
      const name = typeof fp === 'string' ? filename(fp) : t('agentMisc.toolPhrases.fileFallback')
      const content = input.content
      const explicitIntent = getExplicitToolIntent(toolName, input)
      const basePhrase = explicitIntent
        ? phrase(explicitIntent)
        : phraseFromKey('agentMisc.toolPhrases.writeNamed', { name })
      if (typeof content === 'string' && content.length > 0) {
        const lines = content.split('\n').length
        return { ...basePhrase, diffStats: { additions: lines, deletions: 0 } }
      }
      return basePhrase
    }

    case 'Bash': {
      const cmd = input.command
      const intent = getExplicitToolIntent(toolName, input)
      if (intent) return phrase(intent)
      if (typeof cmd === 'string') {
        return phraseFromKey('agentMisc.toolPhrases.runNamed', { command: truncate(cmd, 80) })
      }
      return phraseFromKey('agentMisc.toolPhrases.runCommand')
    }

    case 'Grep': {
      const pattern = input.pattern
      if (typeof pattern === 'string') {
        const path = input.path
        const glob = input.glob
        const target = typeof glob === 'string' ? glob : typeof path === 'string' ? path : undefined
        if (target !== undefined) {
          return phraseFromKey('agentMisc.toolPhrases.grepNamedIn', { pattern, target })
        }
        return phraseFromKey('agentMisc.toolPhrases.grepNamed', { pattern })
      }
      return phraseFromKey('agentMisc.toolPhrases.grep')
    }

    case 'Glob': {
      const pattern = input.pattern
      if (typeof pattern === 'string') {
        const path = input.path
        if (typeof path === 'string') {
          return phraseFromKey('agentMisc.toolPhrases.globNamedIn', { pattern, target: path })
        }
        return phraseFromKey('agentMisc.toolPhrases.globNamed', { pattern })
      }
      return phraseFromKey('agentMisc.toolPhrases.glob')
    }

    case 'WebFetch': {
      const url = input.url
      if (typeof url === 'string') {
        return phraseFromKey('agentMisc.toolPhrases.fetchNamed', { url: truncate(url, 60) })
      }
      return phraseFromKey('agentMisc.toolPhrases.fetchWeb')
    }

    case 'WebSearch': {
      const query = input.query
      if (typeof query === 'string') {
        return phraseFromKey('agentMisc.toolPhrases.searchQueryNamed', { query: truncate(query, 60) })
      }
      return phraseFromKey('agentMisc.toolPhrases.searchWeb')
    }

    case 'Skill': {
      const skill = input.skill
      if (typeof skill === 'string') {
        return phraseFromKey('agentMisc.toolPhrases.useSkillNamed', { name: skill })
      }
      return phraseFromKey('agentMisc.toolPhrases.useSkill')
    }

    case 'NotebookEdit': {
      const fp = input.notebook_path
      if (typeof fp === 'string') {
        return phraseFromKey('agentMisc.toolPhrases.editNotebookNamed', { name: filename(fp) })
      }
      return phraseFromKey('agentMisc.toolPhrases.editNotebook')
    }

    case 'Task': {
      const desc = input.description ?? input.prompt
      if (typeof desc === 'string') {
        return phraseFromKey('agentMisc.toolPhrases.subtaskNamed', { desc: truncate(desc, 80) })
      }
      return phraseFromKey('agentMisc.toolPhrases.subtask')
    }

    case 'Agent': {
      const name = input.name
      const desc = input.description ?? input.prompt
      if (typeof name === 'string' && typeof desc === 'string') {
        return phraseFromKey('agentMisc.toolPhrases.agentNamedDesc', { name, desc: truncate(desc, 60) })
      }
      if (typeof desc === 'string') return phraseFromKey('agentMisc.toolPhrases.agentDesc', { desc: truncate(desc, 80) })
      if (typeof name === 'string') return phraseFromKey('agentMisc.toolPhrases.agentNamed', { name })
      return phraseFromKey('agentMisc.toolPhrases.agent')
    }

    case 'TaskCreate': {
      const subject = input.subject
      if (typeof subject === 'string') {
        return phraseFromKey('agentMisc.toolPhrases.createTaskNamed', { subject: truncate(subject, 80) })
      }
      return phraseFromKey('agentMisc.toolPhrases.createTask')
    }

    case 'TaskUpdate': {
      // TaskUpdate 是自描述工具，label 即完整语义
      const statusMap: Record<string, MessageKey> = {
        pending: 'agentMisc.taskStatus.pending',
        in_progress: 'agentMisc.taskStatus.inProgress',
        completed: 'agentMisc.taskStatus.completed',
        cancelled: 'agentMisc.taskStatus.cancelled',
        blocked: 'agentMisc.taskStatus.blocked',
        error: 'agentMisc.taskStatus.error',
        deleted: 'agentMisc.taskStatus.deleted',
      }
      const parts: string[] = []
      if (typeof input.taskId === 'string') parts.push(t('agentMisc.toolPhrases.taskNumbered', { taskId: input.taskId }))
      if (typeof input.status === 'string') {
        const statusKey = statusMap[input.status]
        parts.push(statusKey ? t(statusKey) : input.status)
      }
      if (typeof input.subject === 'string') parts.push(truncate(input.subject, 60))
      if (parts.length > 0) return phrase(parts.join(' '))
      return phraseFromKey('agentMisc.toolPhrases.updateTask')
    }

    case 'TaskGet': {
      const taskId = input.taskId
      if (typeof taskId === 'string') return phraseFromKey('agentMisc.toolPhrases.getTaskNamed', { taskId })
      return phraseFromKey('agentMisc.toolPhrases.getTask')
    }

    case 'TaskList': {
      return phraseFromKey('agentMisc.toolPhrases.listTasks')
    }

    case 'TodoWrite': {
      const todos = input.todos
      if (Array.isArray(todos)) {
        return phraseFromKey('agentMisc.toolPhrases.updateTodosCount', { n: todos.length })
      }
      return phraseFromKey('agentMisc.toolPhrases.updateTodos')
    }

    case 'TodoRead': {
      return phraseFromKey('agentMisc.toolPhrases.readTodos')
    }

    case 'EnterPlanMode': {
      return phraseFromKey('agentMisc.toolPhrases.enterPlanMode')
    }

    case 'ExitPlanMode': {
      return phraseFromKey('agentMisc.toolPhrases.exitPlanMode')
    }

    case 'generate_image': {
      const prompt = input.prompt
      if (typeof prompt === 'string') return phraseFromKey('agentMisc.toolPhrases.generateImageNamed', { prompt: truncate(prompt, 60) })
      return phraseFromKey('agentMisc.toolPhrases.generateImage')
    }

    case 'TaskOutput': {
      const taskId = input.task_id ?? input.taskId
      if (typeof taskId === 'string') return phraseFromKey('agentMisc.toolPhrases.getTaskOutputNamed', { taskId })
      return phraseFromKey('agentMisc.toolPhrases.getTaskOutput')
    }

    case 'TaskStop': {
      const taskId = input.task_id ?? input.taskId
      if (typeof taskId === 'string') return phraseFromKey('agentMisc.toolPhrases.stopTaskNamed', { taskId })
      return phraseFromKey('agentMisc.toolPhrases.stopTask')
    }

    case 'AskUserQuestion': {
      const questions = input.questions
      if (Array.isArray(questions) && questions.length > 0) {
        const first = questions[0] as Record<string, unknown>
        if (typeof first.question === 'string') {
          return phraseFromKey('agentMisc.toolPhrases.askNamed', { question: truncate(first.question, 60) })
        }
      }
      return phraseFromKey('agentMisc.toolPhrases.askUser')
    }

    case 'REPL': {
      const description = input.description
      const code = input.code
      if (typeof description === 'string' && description.trim()) return phraseFromKey('agentMisc.toolPhrases.replNamed', { name: truncate(description, 50) })
      if (typeof code === 'string') return phraseFromKey('agentMisc.toolPhrases.replNamed', { name: truncate(code, 50) })
      return phraseFromKey('agentMisc.toolPhrases.repl')
    }

    case 'Workflow': {
      const name = input.name
      const scriptPath = input.scriptPath
      if (typeof name === 'string') return phraseFromKey('agentMisc.toolPhrases.workflowNamed', { name })
      if (typeof scriptPath === 'string') return phraseFromKey('agentMisc.toolPhrases.workflowNamed', { name: filename(scriptPath) })
      return phraseFromKey('agentMisc.toolPhrases.workflow')
    }

    case 'ScheduleWakeup': {
      const delaySeconds = input.delaySeconds
      const reason = input.reason
      if (typeof delaySeconds === 'number' && typeof reason === 'string') {
        return phraseFromKey('agentMisc.toolPhrases.wakeupWithReason', { delay: delaySeconds, reason: truncate(reason, 40) })
      }
      if (typeof delaySeconds === 'number') return phraseFromKey('agentMisc.toolPhrases.wakeupDelay', { delay: delaySeconds })
      return phraseFromKey('agentMisc.toolPhrases.wakeup')
    }

    case 'Monitor': {
      const description = input.description
      if (typeof description === 'string') return phraseFromKey('agentMisc.toolPhrases.monitorNamed', { desc: truncate(description, 50) })
      return phraseFromKey('agentMisc.toolPhrases.monitor')
    }

    case 'PushNotification': {
      const message = input.message
      if (typeof message === 'string') return phraseFromKey('agentMisc.toolPhrases.pushNotificationNamed', { message: truncate(message, 50) })
      return phraseFromKey('agentMisc.toolPhrases.pushNotification')
    }

    case 'CronCreate': {
      const cron = input.cron
      const prompt = input.prompt
      if (typeof cron === 'string' && typeof prompt === 'string') {
        return phraseFromKey('agentMisc.toolPhrases.cronCreateFull', { cron, prompt: truncate(prompt, 40) })
      }
      if (typeof cron === 'string') return phraseFromKey('agentMisc.toolPhrases.cronCreateNamed', { cron })
      return phraseFromKey('agentMisc.toolPhrases.cronCreate')
    }

    case 'CronDelete': {
      const id = input.id
      if (typeof id === 'string') return phraseFromKey('agentMisc.toolPhrases.cronDeleteNamed', { id })
      return phraseFromKey('agentMisc.toolPhrases.cronDelete')
    }

    case 'CronList': {
      return phraseFromKey('agentMisc.toolPhrases.cronList')
    }

    case 'RemoteTrigger': {
      const action = input.action
      const triggerId = input.trigger_id
      const actionMap: Record<string, MessageKey> = {
        list: 'agentMisc.toolPhrases.actionList',
        get: 'agentMisc.toolPhrases.actionGet',
        create: 'agentMisc.toolPhrases.actionCreate',
        update: 'agentMisc.toolPhrases.actionUpdate',
        run: 'agentMisc.toolPhrases.actionRun',
      }
      const actionLabel = typeof action === 'string'
        ? (actionMap[action] ? t(actionMap[action]) : action)
        : undefined
      if (actionLabel && typeof triggerId === 'string') {
        return phraseFromKey('agentMisc.toolPhrases.remoteTriggerActionNamed', { action: actionLabel, id: triggerId })
      }
      if (actionLabel) return phraseFromKey('agentMisc.toolPhrases.remoteTriggerAction', { action: actionLabel })
      return phraseFromKey('agentMisc.toolPhrases.remoteTrigger')
    }

    case 'EnterWorktree': {
      const name = input.name
      if (typeof name === 'string') return phraseFromKey('agentMisc.toolPhrases.enterWorktreeNamed', { name })
      return phraseFromKey('agentMisc.toolPhrases.enterWorktree')
    }

    case 'ExitWorktree': {
      const action = input.action
      if (action === 'remove') return phraseFromKey('agentMisc.toolPhrases.exitWorktreeRemove')
      return phraseFromKey('agentMisc.toolPhrases.exitWorktree')
    }

    case 'ReadMcpResourceTool': {
      const server = input.server
      const uri = input.uri
      if (typeof server === 'string' && typeof uri === 'string') {
        return phraseFromKey('agentMisc.toolPhrases.readMcpResourceNamed', { server, uri: truncate(uri, 40) })
      }
      if (typeof uri === 'string') return phraseFromKey('agentMisc.toolPhrases.readMcpResourceNamedUri', { uri: truncate(uri, 60) })
      return phraseFromKey('agentMisc.toolPhrases.readMcpResource')
    }

    case 'ListMcpResourcesTool': {
      const server = input.server
      if (typeof server === 'string') return phraseFromKey('agentMisc.toolPhrases.listMcpResourceServer', { server })
      return phraseFromKey('agentMisc.toolPhrases.listMcpResource')
    }

    case 'SendMessage': {
      const to = input.to
      if (typeof to === 'string') return phraseFromKey('agentMisc.toolPhrases.sendMessageTo', { to })
      return phraseFromKey('agentMisc.toolPhrases.sendMessage')
    }

    default: {
      // MCP 工具：mcp__serverName__toolName
      const mcpParts = toolName.split('__')
      if (mcpParts[0] === 'mcp' && mcpParts.length >= 3 && mcpParts[1]) {
        const server = mcpParts[1].toUpperCase()
        const tool = mcpParts.slice(2).join('_')
        // 尝试从 input 中提取第一个有意义的参数作为摘要
        const summary = extractFirstMeaningfulValue(input)
        if (summary) {
          return phrase(`${server} / ${tool} ${truncate(summary, 60)}`)
        }
        return phrase(`${server} / ${tool}`)
      }
      // 未知工具
      const summary = extractFirstMeaningfulValue(input)
      if (summary) {
        return phrase(`${toolName} ${truncate(summary, 60)}`)
      }
      return phrase(toolName)
    }
  }
}

/**
 * 从工具结果提取一条不会挤占主描述的短摘要。
 * 完整结果仍由 ToolResultRenderer 展示，主行只保留用户需要快速扫读的事实。
 */
export function getToolResultSummary(toolName: string, result: string | undefined, isError = false): string | null {
  if (isError) return t('agentMisc.toolResultSummary.failed')
  if (!result?.trim()) return null

  if (toolName === 'Read') {
    const totalLineMatch = result.match(/total\s+(\d+)\s+lines?/i) ?? result.match(/\bof\s+(\d+)\b/i)
    if (totalLineMatch?.[1]) return t('agentMisc.toolResultSummary.lines', { n: totalLineMatch[1] })

    const remainingLineCount = result.match(/\[(\d+)\s+more\s+lines?\s+in\s+file/i)?.[1]
    if (remainingLineCount) return t('agentMisc.toolResultSummary.moreLines', { n: remainingLineCount })
  }
  if (toolName === 'Grep' && /(?:no matches|没有匹配|未找到)/i.test(result)) return t('agentMisc.toolResultSummary.noMatches')
  if (toolName === 'Bash') return t('agentMisc.toolResultSummary.bashDone')
  if (toolName === 'Edit' || toolName === 'Write') return t('agentMisc.toolResultSummary.fileUpdated')
  if (toolName === 'Glob') return t('agentMisc.toolResultSummary.bashDone')

  return null
}

/** 从 input 中提取第一个有意义的字符串值作为摘要 */
function extractFirstMeaningfulValue(input: Record<string, unknown>): string | null {
  // 优先检查常见的描述性字段
  const priorityKeys = ['description', 'prompt', 'query', 'command', 'name', 'subject', 'path', 'file_path', 'url']
  for (const key of priorityKeys) {
    const value = input[key]
    if (typeof value === 'string' && value.length > 0) return value
  }
  // 回退到第一个非下划线开头的字符串值
  for (const [key, value] of Object.entries(input)) {
    if (!key.startsWith('_') && typeof value === 'string' && value.length > 0 && value.length < 200) {
      return value
    }
  }
  return null
}
