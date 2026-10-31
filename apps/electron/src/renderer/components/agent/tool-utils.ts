/**
 * 工具展示的可复用函数和常量。
 * 供 SDK 内容块、任务进度卡片等组件复用。
 */

import type { LucideIcon } from 'lucide-react'
import type { MessageKey } from '@/i18n'
import { t } from '@/i18n'
import {
  BookOpen,
  Bot,
  CalendarClock,
  CalendarDays,
  CalendarX,
  ClipboardList,
  Database,
  Download,
  FilePenLine,
  SquareCheck,
  FileSearch,
  FileText,
  FolderSearch,
  GitBranch,
  Globe,
  Code2,
  ImagePlus,
  MousePointer2,
  Layers,
  LoaderCircle,
  List,
  ListChecks,
  LogIn,
  LogOut,
  Map,
  MapPinOff,
  MessageCircleQuestion,
  OctagonX,
  Pencil,
  Plug,
  Radio,
  Search,
  Send,
  Server,
  Terminal,
  Wrench,
  Zap,
} from 'lucide-react'

/** 工具名称到图标组件的映射 */
export const TOOL_ICONS: Record<string, LucideIcon> = {
  Edit: Pencil,
  Write: FilePenLine,
  Read: FileText,
  Bash: Terminal,
  Glob: FolderSearch,
  Grep: Search,
  Task: GitBranch,
  WebFetch: Download,
  WebSearch: Globe,
  NotebookEdit: BookOpen,
  Skill: Zap,
  TodoWrite: ListChecks,
  TodoRead: ClipboardList,
  TaskCreate: SquareCheck,
  TaskUpdate: ListChecks,
  TaskGet: FileSearch,
  TaskList: List,
  Agent: Bot,
  EnterPlanMode: Map,
  ExitPlanMode: MapPinOff,
  generate_image: ImagePlus,
  TaskOutput: Layers,
  TaskStop: OctagonX,
  AskUserQuestion: MessageCircleQuestion,
  REPL: Terminal,
  Workflow: GitBranch,
  ScheduleWakeup: CalendarClock,
  Monitor: Radio,
  PushNotification: Send,
  CronCreate: CalendarClock,
  CronDelete: CalendarX,
  CronList: CalendarDays,
  RemoteTrigger: Radio,
  EnterWorktree: LogIn,
  ExitWorktree: LogOut,
  ReadMcpResourceTool: Database,
  ListMcpResourcesTool: Server,
  SendMessage: Send,
  BrowserObserve: Globe,
  BrowserFind: Search,
  BrowserNavigate: Globe,
  BrowserWaitFor: LoaderCircle,
  BrowserClick: Globe,
  BrowserAct: MousePointer2,
  BrowserFill: Globe,
  BrowserPress: Globe,
  BrowserHover: MousePointer2,
  BrowserDrag: MousePointer2,
  BrowserScroll: Globe,
  BrowserExtract: FileText,
  BrowserSelectOption: MousePointer2,
  BrowserUpload: FilePenLine,
  BrowserScreenshot: Globe,
  BrowserListTabs: Globe,
  BrowserNewTab: Globe,
  BrowserSelectTab: Globe,
  BrowserCloseTab: Globe,
  BrowserClose: Globe,
  BrowserPreviewOpen: Globe,
  BrowserDomAction: MousePointer2,
  BrowserExecuteJavaScript: Code2,
}

/**
 * 根据工具名称获取对应的图标组件
 * MCP 工具（mcp__serverName__toolName）使用 Plug 图标
 * 未匹配时返回默认的 Wrench 图标
 */
export function getToolIcon(toolName: string): LucideIcon {
  if (TOOL_ICONS[toolName]) return TOOL_ICONS[toolName]
  if (toolName.startsWith('mcp__')) return Plug
  return Wrench
}

/**
 * 内置工具显示名的词典键映射；调用 getToolDisplayName 时经 t() 求值。
 * 键为工具名，值为 agentMisc.toolDisplayNames 下的词典键。
 */
const TOOL_DISPLAY_NAME_KEYS: Record<string, MessageKey> = {
  Edit: 'agentMisc.toolDisplayNames.edit',
  Write: 'agentMisc.toolDisplayNames.write',
  Read: 'agentMisc.toolDisplayNames.read',
  Bash: 'agentMisc.toolDisplayNames.bash',
  Glob: 'agentMisc.toolDisplayNames.glob',
  Grep: 'agentMisc.toolDisplayNames.grep',
  Task: 'agentMisc.toolDisplayNames.task',
  WebFetch: 'agentMisc.toolDisplayNames.webFetch',
  WebSearch: 'agentMisc.toolDisplayNames.webSearch',
  NotebookEdit: 'agentMisc.toolDisplayNames.notebookEdit',
  Skill: 'agentMisc.toolDisplayNames.skill',
  TodoWrite: 'agentMisc.toolDisplayNames.todoWrite',
  TodoRead: 'agentMisc.toolDisplayNames.todoRead',
  TaskCreate: 'agentMisc.toolDisplayNames.taskCreate',
  TaskUpdate: 'agentMisc.toolDisplayNames.taskUpdate',
  TaskGet: 'agentMisc.toolDisplayNames.taskGet',
  TaskList: 'agentMisc.toolDisplayNames.taskList',
  EnterPlanMode: 'agentMisc.toolDisplayNames.enterPlanMode',
  ExitPlanMode: 'agentMisc.toolDisplayNames.exitPlanMode',
  generate_image: 'agentMisc.toolDisplayNames.generateImage',
  TaskOutput: 'agentMisc.toolDisplayNames.taskOutput',
  TaskStop: 'agentMisc.toolDisplayNames.taskStop',
  AskUserQuestion: 'agentMisc.toolDisplayNames.askUserQuestion',
  REPL: 'agentMisc.toolDisplayNames.repl',
  Workflow: 'agentMisc.toolDisplayNames.workflow',
  ScheduleWakeup: 'agentMisc.toolDisplayNames.scheduleWakeup',
  Monitor: 'agentMisc.toolDisplayNames.monitor',
  PushNotification: 'agentMisc.toolDisplayNames.pushNotification',
  CronCreate: 'agentMisc.toolDisplayNames.cronCreate',
  CronDelete: 'agentMisc.toolDisplayNames.cronDelete',
  CronList: 'agentMisc.toolDisplayNames.cronList',
  RemoteTrigger: 'agentMisc.toolDisplayNames.remoteTrigger',
  EnterWorktree: 'agentMisc.toolDisplayNames.enterWorktree',
  ExitWorktree: 'agentMisc.toolDisplayNames.exitWorktree',
  ReadMcpResourceTool: 'agentMisc.toolDisplayNames.readMcpResource',
  ListMcpResourcesTool: 'agentMisc.toolDisplayNames.listMcpResources',
  SendMessage: 'agentMisc.toolDisplayNames.sendMessage',
  BrowserObserve: 'agentMisc.toolDisplayNames.browserObserve',
  BrowserFind: 'agentMisc.toolDisplayNames.browserFind',
  BrowserNavigate: 'agentMisc.toolDisplayNames.browserNavigate',
  BrowserWaitFor: 'agentMisc.toolDisplayNames.browserWaitFor',
  BrowserClick: 'agentMisc.toolDisplayNames.browserClick',
  BrowserAct: 'agentMisc.toolDisplayNames.browserAct',
  BrowserFill: 'agentMisc.toolDisplayNames.browserFill',
  BrowserPress: 'agentMisc.toolDisplayNames.browserPress',
  BrowserHover: 'agentMisc.toolDisplayNames.browserHover',
  BrowserDrag: 'agentMisc.toolDisplayNames.browserDrag',
  BrowserScroll: 'agentMisc.toolDisplayNames.browserScroll',
  BrowserExtract: 'agentMisc.toolDisplayNames.browserExtract',
  BrowserSelectOption: 'agentMisc.toolDisplayNames.browserSelectOption',
  BrowserUpload: 'agentMisc.toolDisplayNames.browserUpload',
  BrowserScreenshot: 'agentMisc.toolDisplayNames.browserScreenshot',
  BrowserListTabs: 'agentMisc.toolDisplayNames.browserListTabs',
  BrowserNewTab: 'agentMisc.toolDisplayNames.browserNewTab',
  BrowserSelectTab: 'agentMisc.toolDisplayNames.browserSelectTab',
  BrowserCloseTab: 'agentMisc.toolDisplayNames.browserCloseTab',
  BrowserClose: 'agentMisc.toolDisplayNames.browserClose',
  BrowserPreviewOpen: 'agentMisc.toolDisplayNames.browserPreviewOpen',
  BrowserDomAction: 'agentMisc.toolDisplayNames.browserDomAction',
  BrowserExecuteJavaScript: 'agentMisc.toolDisplayNames.browserExecuteJavaScript',
}

/**
 * 获取工具的显示名称
 * MCP 工具解析为 "serverName / toolName" 格式
 * 内置工具返回本地化名称，其余返回原始名称
 */
export function getToolDisplayName(toolName: string): string {
  const key = TOOL_DISPLAY_NAME_KEYS[toolName]
  if (key) return t(key)
  // MCP 工具：mcp__serverName__toolName → "SERVERNAME / TOOLNAME"
  const parts = toolName.split('__')
  if (parts[0] === 'mcp' && parts.length >= 3 && parts[1]) {
    return `${parts[1].toUpperCase()} / ${parts.slice(2).join('_').toUpperCase()}`
  }
  return toolName
}

/**
 * 根据工具名称和输入参数生成简洁的摘要文本
 * 用于在工具活动列表中展示关键信息
 */
export function getInputSummary(
  toolName: string,
  input: Record<string, unknown>
): string | null {
  switch (toolName) {
    case 'Bash': {
      const command = input.command
      if (typeof command === 'string') {
        return command.length > 80 ? command.slice(0, 80) + '…' : command
      }
      return null
    }

    case 'Grep': {
      const pattern = input.pattern
      if (typeof pattern === 'string') {
        return `/${pattern}/`
      }
      return null
    }

    case 'Glob': {
      const pattern = input.pattern
      if (typeof pattern === 'string') {
        return pattern
      }
      return null
    }

    case 'WebFetch': {
      const url = input.url
      if (typeof url === 'string') {
        return url.length > 60 ? url.slice(0, 60) + '…' : url
      }
      return null
    }

    case 'WebSearch': {
      const query = input.query
      if (typeof query === 'string') {
        return query.length > 60 ? query.slice(0, 60) + '…' : query
      }
      return null
    }

    case 'BrowserNavigate': {
      const url = input.url
      if (typeof url !== 'string') return null
      try { return new URL(url).host } catch { return url.slice(0, 60) }
    }

    case 'BrowserClick':
    case 'BrowserAct':
    case 'BrowserFill':
    case 'BrowserHover':
    case 'BrowserUpload': {
      return typeof input.ref === 'string' ? input.ref : null
    }

    case 'BrowserDrag': {
      return typeof input.sourceRef === 'string' && typeof input.targetRef === 'string'
        ? `${input.sourceRef} → ${input.targetRef}`
        : null
    }

    case 'BrowserFind': {
      return typeof input.name === 'string' ? input.name : typeof input.role === 'string' ? input.role : null
    }

    case 'BrowserScroll': {
      return typeof input.selector === 'string' ? input.selector : typeof input.position === 'string' ? input.position : typeof input.deltaY === 'number' ? `${input.deltaY}px` : null
    }

    case 'BrowserExtract':
    case 'BrowserSelectOption': {
      return typeof input.selector === 'string' ? input.selector : null
    }

    case 'BrowserPress': {
      return typeof input.key === 'string' ? input.key : null
    }

    case 'Skill': {
      const skill = input.skill
      if (typeof skill === 'string') {
        return skill
      }
      return null
    }

    case 'Task': {
      const description = input.description ?? input.prompt
      if (typeof description === 'string') {
        return description.length > 80
          ? description.slice(0, 80) + '…'
          : description
      }
      return null
    }

    case 'TaskCreate': {
      const subject = input.subject
      if (typeof subject === 'string') {
        return subject
      }
      return null
    }

    case 'TaskUpdate': {
      // 复用任务状态词典键组；与 tool-phrase.ts 的 TaskUpdate 短语保持一致
      const statusMap: Record<string, MessageKey> = {
        pending: 'agentMisc.taskStatus.pending',
        in_progress: 'agentMisc.taskStatus.inProgress',
        completed: 'agentMisc.taskStatus.completed',
        cancelled: 'agentMisc.taskStatus.cancelled',
        blocked: 'agentMisc.taskStatus.blocked',
        error: 'agentMisc.taskStatus.error',
      }
      const parts: string[] = []
      if (typeof input.taskId === 'string') {
        parts.push(t('agentMisc.toolPhrases.taskNumbered', { taskId: input.taskId }))
      }
      if (typeof input.status === 'string') {
        const statusKey = statusMap[input.status]
        parts.push(statusKey ? t(statusKey) : input.status)
      }
      if (typeof input.subject === 'string') {
        parts.push(input.subject)
      }
      return parts.length > 0 ? parts.join(' ') : null
    }

    case 'TaskGet': {
      const taskId = input.taskId
      if (typeof taskId === 'string') {
        return `#${taskId}`
      }
      return null
    }

    case 'TaskList': {
      const reason = input.reason
      if (typeof reason === 'string') {
        return reason
      }
      return null
    }

    case 'Read':
    case 'Edit':
    case 'Write': {
      const filePath = input.file_path
      if (typeof filePath === 'string') {
        // 仅展示文件名，不展示完整路径（兼容 Windows 反斜杠）
        return filePath.split(/[/\\]/).pop() || filePath
      }
      return null
    }

    case 'NotebookEdit': {
      const notebookPath = input.notebook_path
      if (typeof notebookPath === 'string') {
        return notebookPath.split(/[/\\]/).pop() || notebookPath
      }
      return null
    }

    case 'TodoWrite': {
      const todos = input.todos
      if (Array.isArray(todos)) {
        return t('agentMisc.inputSummary.todoCount', { n: todos.length })
      }
      return null
    }

    case 'Agent': {
      const parts: string[] = []
      if (typeof input.name === 'string') {
        parts.push(input.name)
      }
      const detail = input.description ?? input.prompt
      if (typeof detail === 'string') {
        parts.push(detail)
      }
      return parts.length > 0 ? parts.join(' · ') : null
    }

    case 'generate_image': {
      const prompt = input.prompt
      if (typeof prompt === 'string') {
        return prompt.length > 80 ? prompt.slice(0, 80) + '…' : prompt
      }
      return null
    }

    case 'TaskOutput':
    case 'TaskStop': {
      const taskId = input.task_id ?? input.taskId
      if (typeof taskId === 'string') return `#${taskId}`
      return null
    }

    case 'AskUserQuestion': {
      const questions = input.questions
      if (Array.isArray(questions) && questions.length > 0) {
        const first = questions[0] as Record<string, unknown>
        if (typeof first.question === 'string') {
          return first.question.length > 60 ? first.question.slice(0, 60) + '…' : first.question
        }
      }
      return null
    }

    case 'REPL': {
      const description = input.description
      const code = input.code
      if (typeof description === 'string' && description.trim()) return description
      if (typeof code === 'string') return code.length > 60 ? code.slice(0, 60) + '…' : code
      return null
    }

    case 'Workflow': {
      const name = input.name
      const scriptPath = input.scriptPath
      if (typeof name === 'string') return name
      if (typeof scriptPath === 'string') return scriptPath.split(/[/\\]/).pop() || scriptPath
      return null
    }

    case 'ScheduleWakeup': {
      const delaySeconds = input.delaySeconds
      const reason = input.reason
      if (typeof delaySeconds === 'number' && typeof reason === 'string') return `${delaySeconds}s · ${reason}`
      if (typeof delaySeconds === 'number') return `${delaySeconds}s`
      return null
    }

    case 'Monitor': {
      const description = input.description
      if (typeof description === 'string') return description.length > 60 ? description.slice(0, 60) + '…' : description
      return null
    }

    case 'PushNotification': {
      const message = input.message
      if (typeof message === 'string') return message.length > 60 ? message.slice(0, 60) + '…' : message
      return null
    }

    case 'CronCreate': {
      const cron = input.cron
      const prompt = input.prompt
      if (typeof cron === 'string' && typeof prompt === 'string') {
        const truncated = prompt.length > 40 ? prompt.slice(0, 40) + '…' : prompt
        return `${cron} · ${truncated}`
      }
      if (typeof cron === 'string') return cron
      return null
    }

    case 'CronDelete': {
      const id = input.id
      if (typeof id === 'string') return id
      return null
    }

    case 'RemoteTrigger': {
      const action = input.action
      const triggerId = input.trigger_id
      if (typeof action === 'string' && typeof triggerId === 'string') return `${action} · ${triggerId}`
      if (typeof action === 'string') return action
      return null
    }

    case 'EnterWorktree': {
      const name = input.name
      if (typeof name === 'string') return name
      return null
    }

    case 'ExitWorktree': {
      const action = input.action
      if (action === 'remove') return t('agentMisc.inputSummary.removeWorktree')
      if (action === 'keep') return t('agentMisc.inputSummary.keepWorktree')
      return null
    }

    case 'CronList':
      return null

    case 'ReadMcpResourceTool': {
      const uri = input.uri
      if (typeof uri === 'string') return uri.length > 60 ? uri.slice(0, 60) + '…' : uri
      return null
    }

    case 'ListMcpResourcesTool': {
      const server = input.server
      if (typeof server === 'string') return server
      return null
    }

    case 'SendMessage': {
      const to = input.to
      if (typeof to === 'string') return to
      return null
    }

    default:
      return null
  }
}

/**
 * 从工具输入参数中提取文件路径
 * 按优先级依次检查常见的路径字段名
 */
export function extractFilePath(
  input: Record<string, unknown>
): string | null {
  const value =
    input.file_path ?? input.filePath ?? input.path ?? input.notebook_path
  if (typeof value === 'string') {
    return value
  }
  return null
}

/**
 * 计算 Edit 工具的差异统计（新增/删除行数）
 * 仅对 Edit 工具有效，其他工具返回 null
 */
export function computeDiffStats(
  toolName: string,
  input: Record<string, unknown>
): { additions: number; deletions: number } | null {
  if (toolName !== 'Edit') {
    return null
  }

  const oldString = input.old_string
  const newString = input.new_string

  if (typeof oldString !== 'string' || typeof newString !== 'string') {
    return null
  }

  const oldLines = oldString ? oldString.split('\n').length : 0
  const newLines = newString ? newString.split('\n').length : 0

  return {
    additions: newLines,
    deletions: oldLines,
  }
}

/**
 * 将秒数格式化为可读的耗时字符串
 * 60 秒以内显示 "X.Xs"，超过 60 秒显示 "Xm Ys"
 */
export function formatElapsed(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}m ${remainingSeconds}s`
}
