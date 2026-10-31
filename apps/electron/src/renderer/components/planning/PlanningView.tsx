import * as React from 'react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { Bot, CalendarDays, Check, ChevronRight, Flag, ListTodo, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PLANNING_CONFLICT_ERROR } from '@proma/shared'
import type { PlanningGroup, Todo } from '@proma/shared'
import { cn } from '@/lib/utils'
import { formatDate, useT } from '@/i18n'
import { productivityToolsAtom } from '@/atoms/ui-preferences'
import { automationsAtom, automationFormAtom, createEmptyDraft } from '@/atoms/automation-atoms'
import { AutomationsListView } from '@/components/automation/AutomationsListView'
import { AgentActionHint } from '@/components/agent/AgentActionHint'
import { CalendarWorkspace } from '@/components/planning/CalendarWorkspace'
import { PlanningFloatingInspector } from '@/components/planning/PlanningFloatingInspector'
import { PlanningGroupManager } from '@/components/planning/PlanningGroupManager'
import { PlanningNativeSyncControl } from '@/components/planning/PlanningNativeSyncControl'
import { agentChannelIdAtom, agentModelIdAtom, agentPendingPromptAtom, agentSessionsAtom, agentWorkspacesAtom, currentAgentWorkspaceIdAtom } from '@/atoms/agent-atoms'
import { planningCalendarCreateRequestAtom, planningSelectedTodoIdAtom, planningTabAtom, planningTagsAtom, planningTodoCreateRequestAtom, todoPlanningGroupsAtom, todosAtom, type PlanningTab } from '@/atoms/planning-atoms'
import { useOpenSession } from '@/hooks/useOpenSession'
import { useShortcut } from '@/hooks/useShortcut'
import { buildTodoAgentPrompt } from '@/lib/todo-agent-prompt'
import { getVisibleTodoNotesSaveState, type TodoNotesSaveState } from '@/lib/todo-notes-save-state'
import { upsertTodo } from '@/lib/todo-state'
import { selectVisibleTodos, type TodoListView } from '@/lib/todo-view'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { TodoDatePicker } from '@/components/ui/todo-date-picker'
import { ShortcutKeycaps } from '@/components/shortcuts/ShortcutKeycaps'
import { getTodoWorkspaceLayoutMode, type TodoWorkspaceLayoutMode } from '@/components/planning/todo-layout'

const TAB_IDS: PlanningTab[] = ['todos', 'calendar', 'automations']

/** 转义正则元字符，用于从词典默认名模板推导续编号正则。 */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

interface CreateShortcutHintProps {
  compact?: boolean
}

interface PlanningCreateButtonProps {
  label: string
  onClick: () => void
}

function CreateShortcutHint({ compact = false }: CreateShortcutHintProps = {}): React.ReactElement | null {
  return (
    <ShortcutKeycaps
      shortcutId="new-session"
      className={compact ? 'ml-1' : 'ml-1.5'}
      keycapClassName={cn(
        'border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground shadow-none',
        compact && 'h-5 min-w-5 rounded-[3px] px-1 text-[10px]',
      )}
      separatorClassName="text-primary-foreground/70"
    />
  )
}

function PlanningCreateButton({ label, onClick }: PlanningCreateButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      aria-keyshortcuts="Meta+N Control+N"
      className="relative inline-flex h-8 items-center gap-1 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground shadow-sm transition-[transform,background-color] hover:bg-primary/90 active:scale-[0.96] after:absolute after:-inset-1 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      <Plus size={14} /> {label}<CreateShortcutHint compact />
    </button>
  )
}

export function PlanningView({
  embedded = false,
  componentTab,
}: { embedded?: boolean; componentTab?: PlanningTab } = {}): React.ReactElement {
  const t = useT()
  // planningTabAtom 的初始值为 Todo；右侧组件由 componentTab 锁定，避免组件 Tab 与内部导航失焦。
  const [tab, setTab] = useAtom(planningTabAtom)
  const productivityTools = useAtomValue(productivityToolsAtom)
  const isTabEnabled = React.useCallback((candidate: PlanningTab): boolean => (
    candidate === 'automations'
    || (candidate === 'todos' && productivityTools.todosEnabled)
    || (candidate === 'calendar' && productivityTools.calendarEnabled)
  ), [productivityTools.calendarEnabled, productivityTools.todosEnabled])
  const requestedTab = embedded && componentTab ? componentTab : tab
  const visibleTab = isTabEnabled(requestedTab) ? requestedTab : 'automations'
  const tabLabel = (id: PlanningTab): string => id === 'todos' ? t('planning.ui.tabs.todos') : id === 'calendar' ? t('planning.ui.tabs.calendar') : t('planning.ui.tabs.automations')
  const availableTabs = React.useMemo(() => TAB_IDS.filter((item) => isTabEnabled(item)), [isTabEnabled])
  React.useEffect(() => {
    if (!embedded && visibleTab !== tab) setTab(visibleTab)
  }, [embedded, setTab, tab, visibleTab])
  const automations = useAtomValue(automationsAtom)
  const setAutomationForm = useSetAtom(automationFormAtom)
  const requestTodoCreate = useSetAtom(planningTodoCreateRequestAtom)
  const requestCalendarCreate = useSetAtom(planningCalendarCreateRequestAtom)
  const createAutomation = (): void => {
    // 默认名按当前语言生成，续编号正则由同一词典模板推导，保证中英文都能匹配。
    const namePrefix = t('automation.ui.defaultName', { n: '' }).trimEnd()
    const namePattern = new RegExp(`^${escapeRegExp(namePrefix)}\\s*(\\d+)$`)
    let maxN = 0
    for (const automation of automations) {
      const match = namePattern.exec(automation.name.trim())
      if (match) maxN = Math.max(maxN, Number(match[1]))
    }
    const draft = createEmptyDraft()
    draft.name = t('automation.ui.defaultName', { n: maxN + 1 })
    setAutomationForm({ open: true, draft })
  }

  const triggerTodoCreate = React.useCallback(() => {
    requestTodoCreate((count) => count + 1)
  }, [requestTodoCreate])
  const triggerCalendarCreate = React.useCallback(() => {
    requestCalendarCreate((count) => count + 1)
  }, [requestCalendarCreate])
  useShortcut('new-session', React.useCallback(() => {
    if (visibleTab === 'todos') triggerTodoCreate()
    else if (visibleTab === 'calendar') triggerCalendarCreate()
    else createAutomation()
  }, [createAutomation, triggerCalendarCreate, triggerTodoCreate, visibleTab]), true, { exclusive: true })
  return (
    <div className="flex h-full flex-col overflow-hidden bg-content-area">
      <header className={cn('relative flex w-full items-center justify-between titlebar-no-drag', embedded ? 'px-4 py-3' : 'px-6 pb-5 pt-8 sm:px-8 xl:px-10')}>
        <div className="absolute inset-y-0 left-0 z-0 titlebar-drag-region right-0" />
        <div className="relative z-[1]">
          <h1 className={cn('font-semibold tracking-tight text-wrap-balance', embedded ? 'text-lg' : 'text-2xl')}>{tabLabel(visibleTab)}</h1>
          <p className={cn('text-muted-foreground', embedded ? 'mt-0.5 text-xs' : 'mt-1 text-sm')}>{visibleTab === 'todos' ? t('planning.ui.subtitles.todos') : visibleTab === 'calendar' ? t('planning.ui.subtitles.calendar') : t('planning.ui.subtitles.automations')}</p>
        </div>
        <div className="relative z-[1] titlebar-no-drag flex items-center gap-2">
          {visibleTab === 'todos' && <PlanningCreateButton label={t('planning.ui.createTodo')} onClick={triggerTodoCreate} />}
          {visibleTab === 'calendar' && <PlanningCreateButton label={t('planning.ui.createEvent')} onClick={triggerCalendarCreate} />}
          {visibleTab === 'automations' && automations.length > 0 && (
            <button
              type="button"
              onClick={createAutomation}
              aria-keyshortcuts="Meta+N Control+N"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 active:scale-[0.96]"
            >
              <Plus size={16} /> {t('automation.ui.createButton')}<CreateShortcutHint />
            </button>
          )}
        </div>
      </header>
      {!embedded && (
        <div className="titlebar-no-drag w-full px-6 sm:px-8 xl:px-10">
          <nav className="inline-flex rounded-xl bg-muted/60 p-1 shadow-inner" aria-label={t('planning.ui.navAriaLabel')}>
            {availableTabs.map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={cn('min-h-9 rounded-lg px-3 text-sm transition-colors', visibleTab === item ? 'bg-background font-medium text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>{tabLabel(item)}</button>)}
          </nav>
        </div>
      )}
      {embedded && (
        <div className="titlebar-no-drag shrink-0 px-3 pb-3">
          <AgentActionHint action={visibleTab === 'todos' ? t('planning.ui.hints.todos') : visibleTab === 'calendar' ? t('planning.ui.hints.calendar') : t('planning.ui.hints.automations')} />
        </div>
      )}
      <main className={cn('min-h-0 flex-1 titlebar-no-drag', embedded ? 'px-3 pb-3' : visibleTab === 'todos' ? 'px-6 pb-5 pt-4 sm:px-8 xl:px-10' : 'px-6 pb-8 pt-6 sm:px-8 xl:px-10', visibleTab === 'calendar' || visibleTab === 'todos' ? 'overflow-hidden' : 'overflow-y-auto')}>
        <div className={cn('w-full', (visibleTab === 'calendar' || visibleTab === 'todos') && 'h-full')}>
          {visibleTab === 'todos' && <TodoWorkspace />}
          {visibleTab === 'calendar' && <CalendarWorkspace />}
          {visibleTab === 'automations' && <AutomationsListView />}
        </div>
      </main>
    </div>
  )
}

function endOfToday(value: number | Date = Date.now()): number {
  const date = new Date(value)
  date.setHours(23, 59, 59, 999)
  return date.getTime()
}

function addLocalDays(value: number, amount: number): number {
  const date = new Date(value)
  date.setDate(date.getDate() + amount)
  return date.getTime()
}

function useLocalDayVersion(): number {
  const [dayStart, setDayStart] = React.useState(() => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    return date.getTime()
  })
  React.useEffect(() => {
    const scheduleNextMidnight = (): (() => void) => {
      const now = new Date()
      const next = new Date(now)
      next.setHours(24, 0, 0, 50)
      const timer = window.setTimeout(() => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        setDayStart(today.getTime())
        cleanup = scheduleNextMidnight()
      }, Math.max(1_000, next.getTime() - now.getTime()))
      return () => window.clearTimeout(timer)
    }
    let cleanup = scheduleNextMidnight()
    return () => cleanup()
  }, [])
  return dayStart
}

/** 只在下一个开放 Todo 到期时刷新，避免用高频时钟破坏行级渲染隔离。 */
function useTodoDeadlineRefresh(todos: Todo[]): void {
  const [deadlineVersion, setDeadlineVersion] = React.useState(0)
  React.useEffect(() => {
    const now = Date.now()
    let nextDueAt: number | undefined
    for (const todo of todos) {
      if (todo.status !== 'open' || todo.dueAt === undefined || todo.dueAt <= now) continue
      if (nextDueAt === undefined || todo.dueAt < nextDueAt) nextDueAt = todo.dueAt
    }
    if (nextDueAt === undefined) return
    const timer = window.setTimeout(() => setDeadlineVersion((version) => version + 1), Math.max(1_000, nextDueAt - now + 50))
    return () => window.clearTimeout(timer)
  }, [deadlineVersion, todos])
}

function TodoWorkspace(): React.ReactElement {
  const t = useT()
  const todos = useAtomValue(todosAtom)
  const groups = useAtomValue(todoPlanningGroupsAtom)
  const tags = useAtomValue(planningTagsAtom)
  const todoCreateRequest = useAtomValue(planningTodoCreateRequestAtom)
  const agentSessions = useAtomValue(agentSessionsAtom)
  const agentWorkspaces = useAtomValue(agentWorkspacesAtom)
  const agentChannelId = useAtomValue(agentChannelIdAtom)
  const agentModelId = useAtomValue(agentModelIdAtom)
  const openSession = useOpenSession()
  const setTodos = useSetAtom(todosAtom)
  const setAgentSessions = useSetAtom(agentSessionsAtom)
  const setCurrentWorkspaceId = useSetAtom(currentAgentWorkspaceIdAtom)
  const setPendingPrompt = useSetAtom(agentPendingPromptAtom)
  const setGroups = useSetAtom(todoPlanningGroupsAtom)
  const [view, setView] = React.useState<TodoListView>('today')
  const [selectedId, setSelectedId] = useAtom(planningSelectedTodoIdAtom)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [quickTitle, setQuickTitle] = React.useState('')
  const [quickPriority, setQuickPriority] = React.useState<Todo['priority']>('medium')
  const [quickGroupId, setQuickGroupId] = React.useState<string>('__none__')
  const [quickDueAt, setQuickDueAt] = React.useState<number | undefined>(endOfToday)
  const [isCreatingTodo, setIsCreatingTodo] = React.useState(false)
  const creatingTodoRef = React.useRef(false)
  const [detailTitle, setDetailTitle] = React.useState('')
  const [detailNotes, setDetailNotes] = React.useState('')
  const [todoConflict, setTodoConflict] = React.useState(false)
  const selectedTodoIdRef = React.useRef<string | null>(null)
  const todoBaseUpdatedAtRef = React.useRef<number | null>(null)
  const detailTitleRef = React.useRef('')
  const detailNotesRef = React.useRef('')
  const savedDetailTitleRef = React.useRef('')
  const savedDetailNotesRef = React.useRef('')
  const [todoPendingDeletion, setTodoPendingDeletion] = React.useState<Todo | null>(null)
  const [startingTodoId, setStartingTodoId] = React.useState<string | null>(null)
  const [assigningTodoId, setAssigningTodoId] = React.useState<string | null>(null)
  const [projectPickerOpen, setProjectPickerOpen] = React.useState(false)
  // 弹框挂载到 Todo 组件自身，避免窄右栏时跨越到整个应用窗口。
  const todoWorkspaceRef = React.useRef<HTMLElement>(null)
  const [layoutMode, setLayoutMode] = React.useState<TodoWorkspaceLayoutMode>('three-column')

  React.useLayoutEffect(() => {
    const workspace = todoWorkspaceRef.current
    if (!workspace || typeof ResizeObserver === 'undefined') return
    const updateLayoutMode = (width = workspace.clientWidth) => {
      const next = getTodoWorkspaceLayoutMode(width)
      setLayoutMode((current) => current === next ? current : next)
    }
    updateLayoutMode()
    const observer = new ResizeObserver(([entry]) => {
      if (entry) updateLayoutMode(entry.contentRect.width)
    })
    observer.observe(workspace)
    return () => observer.disconnect()
  }, [])

  const applyTodoDetailDraft = React.useCallback((todo: Todo): void => {
    const title = todo.title
    const notes = todo.notes ?? ''
    selectedTodoIdRef.current = todo.id
    todoBaseUpdatedAtRef.current = todo.updatedAt
    detailTitleRef.current = title
    detailNotesRef.current = notes
    savedDetailTitleRef.current = title
    savedDetailNotesRef.current = notes
    setDetailTitle(title)
    setDetailNotes(notes)
    setTodoConflict(false)
  }, [])

  const selected = todos.find((todo) => todo.id === selectedId)
  React.useEffect(() => {
    // 用户已在“全部任务”中点击时，保持列表上下文；仅在当前视图看不到目标时才切换定位。
    if (!selected || view === 'all') return
    setView(selected.status === 'completed' ? 'completed' : selected.groupId ? `group:${selected.groupId}` : 'all')
  }, [selected, view])
  React.useEffect(() => {
    if (!selected) {
      selectedTodoIdRef.current = null
      todoBaseUpdatedAtRef.current = null
      return
    }
    if (selectedTodoIdRef.current !== selected.id) {
      applyTodoDetailDraft(selected)
      return
    }
    if (selected.updatedAt === todoBaseUpdatedAtRef.current) return
    const hasDirtyDraft = detailTitleRef.current !== savedDetailTitleRef.current || detailNotesRef.current !== savedDetailNotesRef.current
    if (hasDirtyDraft) {
      setTodoConflict(true)
      return
    }
    applyTodoDetailDraft(selected)
  }, [applyTodoDetailDraft, selected?.id, selected?.updatedAt])

  const updateTodo = React.useCallback(async (
    id: string,
    input: Omit<Parameters<typeof window.electronAPI.updateTodo>[0], 'id'>,
    savedField?: 'title' | 'notes',
    silentNotesSync = false,
    savedNotesSnapshot?: string,
  ) => {
    try {
      const updated = await window.electronAPI.updateTodo({ id, ...input })
      if (updated) {
        setTodos((items) => upsertTodo(items, updated))
        if (selectedTodoIdRef.current === id) {
          todoBaseUpdatedAtRef.current = updated.updatedAt
          if (savedField === 'title') {
            detailTitleRef.current = updated.title
            savedDetailTitleRef.current = updated.title
            setDetailTitle(updated.title)
          }
          if (savedField === 'notes') {
            const notes = updated.notes ?? ''
            const hasNewerNotesDraft = savedNotesSnapshot !== undefined && detailNotesRef.current !== savedNotesSnapshot
            savedDetailNotesRef.current = notes
            // 自动保存完成后，只在用户未继续输入时同步草稿 ref；否则保留新草稿并交给下一次保存。
            if (!hasNewerNotesDraft) {
              detailNotesRef.current = notes
              // 自动保存时不回写输入框，避免打断正在输入的内容（主进程会 trim 首尾空白）
              if (!silentNotesSync) setDetailNotes(notes)
            }
          }
        }
      }
      return updated
    } catch (error) {
      if (error instanceof Error && error.message.includes(PLANNING_CONFLICT_ERROR)) {
        if (selectedTodoIdRef.current === id) setTodoConflict(true)
        toast.error(t('planning.ui.todoConflictToast'))
      } else {
        console.error('[任务/日程] 更新 Todo 失败:', error)
        toast.error(t('planning.ui.todoUpdateFailed'))
      }
      return undefined
    }
  }, [setTodos])

  // —— Todo 标题/描述草稿式自动保存 ——
  const notesSaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const notesSaveInFlightIdsRef = React.useRef(new Set<string>())
  const notesSaveStateTodoIdRef = React.useRef<string | null>(null)
  const [notesSaveState, setNotesSaveState] = React.useState<TodoNotesSaveState>(null)
  const notesSaveStateTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const showNotesSaved = React.useCallback((id: string): void => {
    if (notesSaveStateTimerRef.current) clearTimeout(notesSaveStateTimerRef.current)
    notesSaveStateTimerRef.current = setTimeout(() => {
      notesSaveStateTimerRef.current = null
      if (notesSaveStateTodoIdRef.current === id) {
        notesSaveStateTodoIdRef.current = null
        setNotesSaveState(null)
      }
    }, 2000)
  }, [])

  const saveDetailNotes = React.useCallback((): void => {
    if (notesSaveTimerRef.current) {
      clearTimeout(notesSaveTimerRef.current)
      notesSaveTimerRef.current = null
    }
    const id = selectedTodoIdRef.current
    const expectedUpdatedAt = todoBaseUpdatedAtRef.current
    if (!id || !expectedUpdatedAt || todoConflict || notesSaveInFlightIdsRef.current.has(id)) return
    const notes = detailNotesRef.current
    if (notes === savedDetailNotesRef.current) return
    notesSaveInFlightIdsRef.current.add(id)
    if (notesSaveStateTimerRef.current) {
      clearTimeout(notesSaveStateTimerRef.current)
      notesSaveStateTimerRef.current = null
    }
    notesSaveStateTodoIdRef.current = id
    setNotesSaveState('saving')
    // 保存时保留草稿快照；请求返回后若用户已继续输入，不覆盖新草稿。
    void updateTodo(id, { notes, expectedUpdatedAt }, 'notes', true, notes).then((updated) => {
      notesSaveInFlightIdsRef.current.delete(id)
      if (selectedTodoIdRef.current !== id) {
        if (notesSaveStateTodoIdRef.current === id) {
          notesSaveStateTodoIdRef.current = null
          setNotesSaveState(null)
        }
        return
      }
      if (!updated) {
        if (notesSaveStateTodoIdRef.current === id) notesSaveStateTodoIdRef.current = null
        setNotesSaveState(null)
        return
      }
      if (detailNotesRef.current !== savedDetailNotesRef.current) {
        // 新草稿在本次请求中产生；立即续存，避免 800ms timer 已在请求期间空转后丢失内容。
        if (!notesSaveTimerRef.current) {
          notesSaveTimerRef.current = setTimeout(() => {
            notesSaveTimerRef.current = null
            saveDetailNotesRef.current()
          }, 0)
        }
        return
      }
      notesSaveStateTodoIdRef.current = id
      setNotesSaveState('saved')
      showNotesSaved(id)
    })
  }, [showNotesSaved, todoConflict, updateTodo])

  const saveDetailNotesRef = React.useRef(saveDetailNotes)
  saveDetailNotesRef.current = saveDetailNotes

  const scheduleNotesAutoSave = React.useCallback((): void => {
    if (notesSaveTimerRef.current) clearTimeout(notesSaveTimerRef.current)
    notesSaveTimerRef.current = setTimeout(() => {
      notesSaveTimerRef.current = null
      saveDetailNotesRef.current()
    }, 800)
  }, [])

  const saveDetailTitle = React.useCallback((): void => {
    const id = selectedTodoIdRef.current
    if (!id || todoConflict) return
    const currentTodo = todos.find((todo) => todo.id === id)
    if (!currentTodo) return
    const title = detailTitleRef.current.trim()
    if (!title || title === currentTodo.title) return
    void updateTodo(id, { title, expectedUpdatedAt: currentTodo.updatedAt }, 'title')
  }, [todoConflict, todos, updateTodo])

  React.useEffect(() => {
    return () => {
      if (notesSaveTimerRef.current) {
        clearTimeout(notesSaveTimerRef.current)
        notesSaveTimerRef.current = null
      }
      if (notesSaveStateTimerRef.current) {
        clearTimeout(notesSaveStateTimerRef.current)
        notesSaveStateTimerRef.current = null
      }
      notesSaveStateTodoIdRef.current = null
    }
  }, [])

  const reloadTodoDetail = (): void => {
    if (selected) applyTodoDetailDraft(selected)
  }

  const openCreateDialog = React.useCallback((): void => {
    setQuickTitle('')
    setQuickPriority('medium')
    setQuickGroupId(view.startsWith('group:') ? view.slice('group:'.length) : '__none__')
    setQuickDueAt(endOfToday())
    setCreateOpen(true)
  }, [view])
  const handledTodoCreateRequest = React.useRef(todoCreateRequest)
  React.useEffect(() => {
    if (todoCreateRequest === handledTodoCreateRequest.current) return
    handledTodoCreateRequest.current = todoCreateRequest
    openCreateDialog()
  }, [openCreateDialog, todoCreateRequest])

  const createTodo = async (): Promise<void> => {
    const title = quickTitle.trim()
    if (!title || creatingTodoRef.current) return
    creatingTodoRef.current = true
    setIsCreatingTodo(true)
    const dueAt = quickDueAt
    try {
      const todo = await window.electronAPI.createTodo({
        title,
        priority: quickPriority,
        groupId: quickGroupId === '__none__' ? undefined : quickGroupId,
        dueAt,
        // 数据层会以计划完成时间创建默认提醒。
      })
      setTodos((items) => [todo, ...items])
      // 不自动打开详情；同时切换到新任务实际所属的视图，确保创建后立即可见。
      setSelectedId(null)
      setView(quickGroupId === '__none__' ? (dueAt ? 'today' : 'all') : `group:${quickGroupId}`)
      setCreateOpen(false)
      setQuickTitle('')
      setQuickPriority('medium')
      setQuickDueAt(endOfToday())
    } catch (error) {
      console.error('[任务/日程] 创建 Todo 失败:', error)
      toast.error(t('planning.ui.todoCreateFailed'))
    } finally {
      creatingTodoRef.current = false
      setIsCreatingTodo(false)
    }
  }

  const createTodoGroup = React.useCallback(async (name: string): Promise<PlanningGroup | undefined> => {
    try {
      const group = await window.electronAPI.createPlanningGroup({ scope: 'todo', name })
      setGroups((items) => [...items, group].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'zh-CN')))
      return group
    } catch (error) {
      console.error('[任务/日程] 创建 Todo 分组失败:', error)
      toast.error(t('planning.ui.todoGroupCreateFailed'))
      return undefined
    }
  }, [setGroups])

  const renameTodoGroup = React.useCallback(async (group: PlanningGroup, name: string): Promise<PlanningGroup | undefined> => {
    try {
      const updated = await window.electronAPI.updatePlanningGroup({ id: group.id, scope: 'todo', name })
      if (!updated) throw new Error(t('planning.ui.groupMissing'))
      setGroups((items) => items.map((item) => item.id === updated.id ? updated : item))
      setTodos((items) => items.map((item) => item.groupId === updated.id ? { ...item, group: updated } : item))
      toast.success(t('planning.ui.todoGroupRenamed'))
      return updated
    } catch (error) {
      console.error('[任务/日程] 重命名 Todo 分组失败:', error)
      toast.error(t('planning.ui.todoGroupRenameFailed'))
      return undefined
    }
  }, [setGroups, setTodos])

  const deleteTodoGroup = React.useCallback(async (group: PlanningGroup): Promise<boolean> => {
    try {
      const deleted = await window.electronAPI.deletePlanningGroup('todo', group.id)
      if (!deleted) throw new Error(t('planning.ui.groupMissing'))
      setGroups((items) => items.filter((item) => item.id !== group.id))
      setTodos((items) => items.map((item) => item.groupId === group.id ? { ...item, groupId: undefined, group: undefined } : item))
      setView((current) => current === `group:${group.id}` ? 'all' : current)
      toast.success(t('planning.ui.todoGroupDeleted'))
      return true
    } catch (error) {
      console.error('[任务/日程] 删除 Todo 分组失败:', error)
      toast.error(t('planning.ui.todoGroupDeleteFailed'))
      return false
    }
  }, [setGroups, setTodos])

  const viewRef = React.useRef(view)
  viewRef.current = view
  const completeTodo = React.useCallback(async (todo: Todo): Promise<void> => {
    const updated = await updateTodo(todo.id, { status: todo.status === 'completed' ? 'open' : 'completed', expectedUpdatedAt: todo.updatedAt })
    if (!updated) return
    if (updated.status === 'completed') {
      toast.success(t('planning.ui.todoCompleted'), {
        description: todo.title,
        action: {
          label: t('planning.ui.undo'),
          onClick: () => { void updateTodo(todo.id, { status: 'open', expectedUpdatedAt: updated.updatedAt }) },
        },
      })
      if (viewRef.current !== 'completed') setSelectedId((current) => current === todo.id ? null : current)
    }
  }, [setSelectedId, updateTodo])

  const deleteTodo = async (): Promise<void> => {
    const todo = todoPendingDeletion
    if (!todo) return
    try {
      await window.electronAPI.deleteTodo(todo.id)
      setTodos((items) => items.filter((item) => item.id !== todo.id))
      if (selectedId === todo.id) setSelectedId(null)
      setTodoPendingDeletion(null)
    } catch (error) {
      console.error('[任务/日程] 删除 Todo 失败:', error)
      toast.error(t('planning.ui.todoDeleteFailed'))
    }
  }

  const assignTodoWorkspace = React.useCallback(async (todo: Todo, workspaceId: string): Promise<void> => {
    if (assigningTodoId) return
    if (todo.workspaceId === workspaceId) {
      setProjectPickerOpen(false)
      return
    }
    setAssigningTodoId(todo.id)
    try {
      const updatedTodo = await window.electronAPI.updateTodo({
        id: todo.id,
        workspaceId,
        expectedUpdatedAt: todo.updatedAt,
      })
      if (!updatedTodo) throw new Error(t('planning.ui.todoMissing'))
      setTodos((items) => upsertTodo(items, updatedTodo))
      setProjectPickerOpen(false)
    } catch (error) {
      console.error('[Todo] 选择项目失败:', error)
      const message = error instanceof Error ? error.message : t('planning.ui.retryLater')
      toast.error(message.includes(PLANNING_CONFLICT_ERROR) ? t('planning.ui.todoProjectConflict') : t('planning.ui.projectAssignFailed'), {
        description: message.includes(PLANNING_CONFLICT_ERROR) ? undefined : message,
      })
    } finally {
      setAssigningTodoId(null)
    }
  }, [assigningTodoId, setTodos])

  const startTodoInWorkspace = React.useCallback(async (todo: Todo, workspaceId: string): Promise<void> => {
    if (startingTodoId) return
    if (!agentChannelId) {
      toast.error(t('planning.ui.noAgentChannel'))
      return
    }
    const workspace = agentWorkspaces.find((item) => item.id === workspaceId)
    if (!workspace) {
      toast.error(t('planning.ui.workspaceUnavailable'))
      return
    }

    setStartingTodoId(todo.id)
    try {
      const { todo: updatedTodo, session } = await window.electronAPI.startTodoAgent({
        todoId: todo.id,
        workspaceId,
        expectedUpdatedAt: todo.updatedAt,
        channelId: agentChannelId,
        modelId: agentModelId ?? undefined,
      })
      setTodos((items) => upsertTodo(items, updatedTodo))
      setAgentSessions((items) => [session, ...items])
      setCurrentWorkspaceId(workspaceId)
      void window.electronAPI.updateSettings({ agentWorkspaceId: workspaceId }).catch(console.error)
      openSession('agent', session.id, session.title)
      setPendingPrompt({
        sessionId: session.id,
        message: buildTodoAgentPrompt(updatedTodo.id, true),
        mentionedTodoIds: [updatedTodo.id],
      })
      toast.success(t('planning.ui.agentStarted'), { description: t('planning.ui.agentStartedDescription', { name: workspace.name }) })
    } catch (error) {
      console.error('[Todo] 启动 Agent 失败:', error)
      const message = error instanceof Error ? error.message : t('planning.ui.retryLater')
      toast.error(message.includes(PLANNING_CONFLICT_ERROR) ? t('planning.ui.todoStartConflict') : t('planning.ui.agentStartFailed'), {
        description: message.includes(PLANNING_CONFLICT_ERROR) ? undefined : message,
      })
    } finally {
      setStartingTodoId(null)
    }
  }, [agentChannelId, agentModelId, agentWorkspaces, openSession, setAgentSessions, setCurrentWorkspaceId, setPendingPrompt, setTodos, startingTodoId])

  const dayVersion = useLocalDayVersion()
  useTodoDeadlineRefresh(todos)
  const now = Date.now()
  const openTodos = React.useMemo(() => todos.filter((todo) => todo.status === 'open'), [todos])
  const todoGroupUsageCounts = React.useMemo(() => {
    const counts = new Map<string, number>()
    for (const todo of todos) if (todo.status === 'open' && todo.groupId) counts.set(todo.groupId, (counts.get(todo.groupId) ?? 0) + 1)
    return counts
  }, [todos])
  const todoGroupHasAssociatedItems = React.useMemo(() => new Set(todos.flatMap((todo) => todo.groupId ? [todo.groupId] : [])), [todos])
  const todayEnd = React.useMemo(() => endOfToday(dayVersion), [dayVersion])
  const weekEnd = React.useMemo(() => endOfToday(addLocalDays(dayVersion, 7)), [dayVersion])
  const visibleTodos = React.useMemo(() => selectVisibleTodos(todos, view, todayEnd, weekEnd), [todayEnd, todos, view, weekEnd])
  const viewTitle = view === 'all' ? t('planning.ui.views.all') : view === 'today' ? t('planning.ui.views.today') : view === 'upcoming' ? t('planning.ui.views.upcoming') : view === 'completed' ? t('planning.ui.views.completed') : groups.find((group) => `group:${group.id}` === view)?.name ?? t('planning.ui.views.group')
  const count = (predicate: (todo: Todo) => boolean): number => openTodos.filter(predicate).length

  const navItems: Array<{ id: TodoListView; label: string; icon: React.ReactNode; count?: number }> = [
    { id: 'all', label: t('planning.ui.views.all'), icon: <ListTodo size={15} />, count: openTodos.length },
    { id: 'today', label: t('planning.ui.views.today'), icon: <CalendarDays size={15} />, count: count((todo) => todo.dueAt !== undefined && todo.dueAt <= todayEnd) },
    { id: 'upcoming', label: t('planning.ui.views.upcoming'), icon: <ChevronRight size={15} />, count: count((todo) => todo.dueAt !== undefined && todo.dueAt > todayEnd && todo.dueAt <= weekEnd) },
    { id: 'completed', label: t('planning.ui.views.completed'), icon: <Check size={15} /> },
  ]
  const visibleNotesSaveState = getVisibleTodoNotesSaveState(notesSaveState, notesSaveStateTodoIdRef.current, selected?.id)
  const selectTodo = React.useCallback((todo: Todo): void => setSelectedId(todo.id), [setSelectedId])
  const requestTodoDeletion = React.useCallback((todo: Todo): void => setTodoPendingDeletion(todo), [])
  const updateTodoDueAt = React.useCallback((todo: Todo, dueAt?: number): void => {
    void updateTodo(todo.id, { dueAt: dueAt ?? null, expectedUpdatedAt: todo.updatedAt })
  }, [updateTodo])

  return (
    <section ref={todoWorkspaceRef} className="relative h-full min-h-[500px] overflow-hidden rounded-none border border-border/60 bg-card">
      <div className={cn(
        'grid h-full min-h-0 w-full overflow-hidden',
        layoutMode === 'three-column'
          ? selected ? 'grid-cols-[minmax(9rem,11rem)_minmax(17rem,1fr)_minmax(20rem,23rem)]' : 'grid-cols-[minmax(9rem,11rem)_minmax(0,1fr)]'
          : layoutMode === 'two-column' && selected ? 'grid-cols-[minmax(17rem,1fr)_minmax(18rem,23rem)]' : 'grid-cols-1',
      )}>
        {layoutMode === 'three-column' && <aside className="flex min-h-0 flex-col overflow-y-auto border-r border-border/60 bg-muted/15 p-2 scrollbar-thin">
          <div className="px-2 pb-3 pt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Todo</div>
          <nav className="space-y-1" aria-label={t('planning.ui.views.all')}>
            {navItems.map((item) => <button key={item.id} type="button" onClick={() => { setView(item.id); setSelectedId(null) }} className={cn('flex h-9 w-full items-center gap-2 rounded-md px-2 text-sm transition-colors', view === item.id ? 'bg-background font-medium text-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground')}><span className="text-muted-foreground">{item.icon}</span><span className="flex-1 text-left">{item.label}</span>{item.count !== undefined && <span className="text-xs tabular-nums text-muted-foreground">{item.count}</span>}</button>)}
          </nav>
          <div className="mt-7"><div className="flex items-center justify-between px-2 pb-2"><span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('planning.ui.todoGroupField')}</span><PlanningGroupManager scope="todo" groups={groups} itemLabel="Todo" getUsageCount={(groupId) => todoGroupUsageCounts.get(groupId) ?? 0} hasAssociatedItems={(groupId) => todoGroupHasAssociatedItems.has(groupId)} showDeletionCount={false} onCreate={createTodoGroup} onRename={renameTodoGroup} onDelete={deleteTodoGroup} onCreated={(group) => { setView(`group:${group.id}`); setSelectedId(null) }} trigger={<button type="button" className="min-h-10 px-1 text-xs text-muted-foreground transition-colors hover:text-foreground">{t('planning.ui.manage')}</button>} /></div><div className="space-y-1">{groups.map((group) => { const id = `group:${group.id}` as TodoListView; return <button key={group.id} type="button" onClick={() => { setView(id); setSelectedId(null) }} className={cn('flex h-9 w-full items-center gap-2 rounded-md px-2 text-sm transition-colors', view === id ? 'bg-background font-medium text-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground')}><span className="size-2 rounded-full" style={{ backgroundColor: group.color ?? 'currentColor' }} /><span className="flex-1 truncate text-left">{group.name}</span><span className="text-xs tabular-nums text-muted-foreground">{todoGroupUsageCounts.get(group.id) ?? 0}</span></button> })}</div></div>
        </aside>}

        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden border-r border-border/60">
          <div className="border-b border-border/60 px-4 py-3">
            {layoutMode !== 'three-column' && (
              <div className="mb-2 flex items-center gap-2">
                <Select value={view} onValueChange={(value) => { setView(value as TodoListView); setSelectedId(null) }}>
                  <SelectTrigger aria-label={t('planning.ui.selectViewAria')} className="h-8 min-w-0 flex-1 border-0 bg-muted/45 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {navItems.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
                    {groups.map((group) => <SelectItem key={group.id} value={`group:${group.id}`}>{t('planning.ui.views.groupPrefix', { name: group.name })}</SelectItem>)}
                  </SelectContent>
                </Select>
                <PlanningGroupManager scope="todo" groups={groups} itemLabel="Todo" getUsageCount={(groupId) => todoGroupUsageCounts.get(groupId) ?? 0} hasAssociatedItems={(groupId) => todoGroupHasAssociatedItems.has(groupId)} showDeletionCount={false} onCreate={createTodoGroup} onRename={renameTodoGroup} onDelete={deleteTodoGroup} onCreated={(group) => { setView(`group:${group.id}`); setSelectedId(null) }} trigger={<Button type="button" variant="ghost" size="sm" className="h-8 shrink-0 px-2 text-xs text-muted-foreground">{t('planning.ui.manage')}</Button>} />
              </div>
            )}
            <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold">{viewTitle}</h2><div className="flex items-center gap-2"><PlanningNativeSyncControl entity="reminder" />{view !== 'completed' && <span className="text-xs tabular-nums text-muted-foreground">{t('planning.ui.itemCount', { n: visibleTodos.length })}</span>}</div></div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{visibleTodos.length ? visibleTodos.map((todo) => <TodoListItem key={todo.id} todo={todo} selected={selectedId === todo.id} todayEnd={todayEnd} isOverdue={todo.status === 'open' && todo.dueAt !== undefined && todo.dueAt < now} onSelect={selectTodo} onToggle={completeTodo} onDelete={requestTodoDeletion} onUpdateDueAt={updateTodoDueAt} />) : <div className="flex h-full min-h-56 flex-col items-center justify-center gap-3 px-8 text-center text-sm text-muted-foreground"><span>{view === 'today' ? t('planning.ui.emptyToday') : t('planning.ui.emptyList')}</span>{view !== 'all' && view !== 'completed' && <button type="button" onClick={() => setView('all')} className="text-xs font-medium text-primary underline-offset-4 hover:underline">{t('planning.ui.viewAllAction')}</button>}</div>}</div>
        </div>

        {selected && <PlanningFloatingInspector inline={layoutMode !== 'single-column'} fullWidth={layoutMode === 'single-column'} label={t('planning.ui.todoDetailTitle')} onClose={() => { saveDetailNotes(); saveDetailTitle(); setSelectedId(null) }}><div className="space-y-4 p-4">
          {todoConflict && <div className="flex items-center justify-between gap-3 rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100"><span>{t('planning.ui.todoConflictBanner')}</span><Button type="button" variant="link" size="sm" className="h-auto shrink-0 px-0 text-xs" onClick={reloadTodoDetail}>{t('planning.ui.reload')}</Button></div>}
          <div className="pr-12"><label className="sr-only" htmlFor="todo-title">{t('planning.ui.todoTitleSrOnly')}</label><Input id="todo-title" value={detailTitle} onChange={(event) => { detailTitleRef.current = event.target.value; setDetailTitle(event.target.value) }} onBlur={saveDetailTitle} disabled={todoConflict} className="h-auto border-0 bg-transparent px-0 text-base font-semibold shadow-none focus-visible:ring-0" /></div><div><label className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted-foreground"><span>{t('planning.ui.notesLabel')}</span><span aria-live="polite" className={cn('text-[11px] font-normal text-muted-foreground transition-opacity duration-300', visibleNotesSaveState ? 'opacity-100' : 'opacity-0')}>{visibleNotesSaveState === 'saving' ? t('common.saving') : visibleNotesSaveState === 'saved' ? t('planning.ui.notesSaved') : ''}</span></label><Textarea value={detailNotes} onChange={(event) => { detailNotesRef.current = event.target.value; setDetailNotes(event.target.value); scheduleNotesAutoSave() }} onBlur={saveDetailNotes} placeholder={t('planning.ui.notesPlaceholder')} disabled={todoConflict} className="min-h-36 resize-y overflow-y-auto scrollbar-thin border-0 bg-muted/35 text-sm shadow-none focus-visible:ring-2" /></div><DetailSection title={t('planning.ui.sectionTime')}><DetailField label={t('planning.ui.dueLabel')}><TodoDatePicker value={selected.dueAt} onChange={(dueAt) => void updateTodo(selected.id, { dueAt: dueAt ?? null, expectedUpdatedAt: todoBaseUpdatedAtRef.current ?? selected.updatedAt })} className="h-8 w-full justify-start bg-muted/45 text-xs text-foreground hover:bg-muted" /></DetailField></DetailSection><DetailSection title={t('planning.ui.sectionOrganize')}><DetailField label={t('planning.ui.priorityLabel')}><Select value={selected.priority} onValueChange={(value) => void updateTodo(selected.id, { priority: value as Todo['priority'], expectedUpdatedAt: todoBaseUpdatedAtRef.current ?? selected.updatedAt })}><SelectTrigger className="h-8 border-0 bg-muted/45 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="high">{t('planning.ui.priorityHigh')}</SelectItem><SelectItem value="medium">{t('planning.ui.priorityMedium')}</SelectItem><SelectItem value="low">{t('planning.ui.priorityLow')}</SelectItem></SelectContent></Select></DetailField><DetailField label={t('planning.ui.todoGroupField')}><Select value={selected.groupId ?? '__none__'} onValueChange={(value) => void updateTodo(selected.id, { groupId: value === '__none__' ? null : value, expectedUpdatedAt: todoBaseUpdatedAtRef.current ?? selected.updatedAt })}><SelectTrigger className="h-8 border-0 bg-muted/45 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none__">{t('planning.ui.ungrouped')}</SelectItem>{groups.map((group) => <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>)}</SelectContent></Select></DetailField><DetailField label={t('planning.ui.tagsLabel')}><div className="flex flex-wrap gap-1">{tags.length ? tags.map((tag) => <button key={tag.id} type="button" onClick={() => void updateTodo(selected.id, { tagIds: selected.tags.some((item) => item.id === tag.id) ? selected.tags.filter((item) => item.id !== tag.id).map((item) => item.id) : [...selected.tags.map((item) => item.id), tag.id], expectedUpdatedAt: todoBaseUpdatedAtRef.current ?? selected.updatedAt })} className={cn('rounded-md px-2 py-1 text-xs transition-colors', selected.tags.some((item) => item.id === tag.id) ? 'bg-primary text-primary-foreground' : 'bg-muted/60 text-muted-foreground hover:bg-muted')}>#{tag.name}</button>) : <span className="text-xs text-muted-foreground">{t('planning.ui.noTags')}</span>}</div></DetailField></DetailSection><DetailSection title={t('planning.ui.sectionProjectAgent')}><DetailField label={t('planning.ui.workspaceField')}><Popover open={projectPickerOpen} onOpenChange={setProjectPickerOpen}><PopoverTrigger asChild><button type="button" disabled={startingTodoId === selected.id || assigningTodoId === selected.id || agentWorkspaces.length === 0} className="flex h-9 w-full items-center gap-2 rounded-md bg-muted/45 px-2 text-left text-xs transition-colors hover:bg-muted disabled:cursor-wait disabled:opacity-60"><span className="min-w-0 flex-1 truncate">{selected.workspaceId ? agentWorkspaces.find((workspace) => workspace.id === selected.workspaceId)?.name ?? t('planning.ui.workspaceUnavailableShort') : agentWorkspaces.length ? t('planning.ui.chooseWorkspace') : t('planning.ui.noWorkspaces')}</span><ChevronRight size={14} className="shrink-0 text-muted-foreground" /></button></PopoverTrigger><PopoverContent align="start" className="w-72 overflow-hidden p-1"><p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{t('planning.ui.chooseTodoWorkspace')}</p><div className="max-h-60 overflow-y-auto">{agentWorkspaces.map((workspace) => { const isCurrent = selected.workspaceId === workspace.id; const isAssigning = assigningTodoId === selected.id; return <button key={workspace.id} type="button" disabled={isAssigning} onClick={() => void assignTodoWorkspace(selected, workspace.id)} className={cn('flex min-h-10 w-full items-center gap-2 rounded-md px-2 text-left text-sm transition-colors hover:bg-muted disabled:cursor-wait disabled:opacity-60', isCurrent && 'bg-primary/10')}><span className="min-w-0 flex-1 truncate">{workspace.name}</span><span className={cn('shrink-0 text-xs', isCurrent ? 'text-primary' : 'text-muted-foreground')}>{isAssigning ? t('planning.ui.choosing') : isCurrent ? t('planning.ui.currentWorkspace') : t('planning.ui.choose')}</span></button> })}</div></PopoverContent></Popover></DetailField><Button type="button" size="sm" className="w-full" disabled={!selected.workspaceId || startingTodoId === selected.id || assigningTodoId === selected.id} onClick={() => { if (selected.workspaceId) void startTodoInWorkspace(selected, selected.workspaceId) }}><Bot size={15} />{startingTodoId === selected.id ? t('planning.ui.starting') : t('planning.ui.startAgent')}</Button><DetailField label={t('planning.ui.linkedSessions')}>{selected.sessionLinks.length ? <div className="space-y-1">{selected.sessionLinks.map((link) => { const session = agentSessions.find((item) => item.id === link.sessionId); return <button key={link.sessionId} type="button" disabled={!session} title={!session ? t('planning.ui.sessionUnavailable') : undefined} onClick={() => { if (!session) return; openSession('agent', session.id, session.title) }} className={cn('flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors', session ? 'bg-muted/45 hover:bg-muted' : 'cursor-not-allowed bg-muted/25 text-muted-foreground/60')}><span className="min-w-0 flex-1 truncate">{session?.title ?? t('planning.ui.sessionUnavailable')}</span><time className="shrink-0 tabular-nums text-[11px] text-muted-foreground">{formatDate(link.lastTouchedAt, { month: 'numeric', day: 'numeric' })}</time></button> })}</div> : <span className="text-xs text-muted-foreground">{t('planning.ui.noSessions')}</span>}</DetailField></DetailSection><div className="flex items-center justify-between border-t border-border/60 pt-4"><Button size="sm" variant="ghost" onClick={() => void completeTodo(selected)}>{selected.status === 'completed' ? t('planning.ui.resumeTask') : t('planning.ui.markComplete')}</Button><Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setTodoPendingDeletion(selected)}><Trash2 size={14} />{t('common.delete')}</Button></div></div></PlanningFloatingInspector>}
      </div>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent
          container={todoWorkspaceRef.current}
          overlayClassName="absolute"
          className="absolute left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 gap-0 rounded-2xl border-border/60 p-3"
          hideClose
        >
          <DialogTitle className="sr-only">{t('planning.ui.addTodoTitle')}</DialogTitle>
          <form onSubmit={(event) => { event.preventDefault(); void createTodo() }} className="overflow-hidden rounded-xl bg-muted/35 focus-within:ring-1 focus-within:ring-ring/40">
            <label className="sr-only" htmlFor="create-todo-title">{t('planning.ui.todoContentSrOnly')}</label>
            <Textarea id="create-todo-title" autoFocus value={quickTitle} onChange={(event) => setQuickTitle(event.target.value)} onKeyDown={(event) => { if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return; event.preventDefault(); void createTodo() }} placeholder={t('planning.ui.quickCreatePlaceholder')} className="min-h-28 resize-y rounded-none border-0 bg-transparent px-3 py-3 text-lg shadow-none focus-visible:ring-0" />
            <div className="flex flex-wrap items-center gap-x-1 gap-y-1 border-t border-border/60 bg-muted/20 px-1.5 py-1.5">
              <TodoDatePicker value={quickDueAt} onChange={setQuickDueAt} className="h-9 max-w-52" />
              <Select value={quickPriority} onValueChange={(value) => setQuickPriority(value as Todo['priority'])}><SelectTrigger className={cn('h-9 w-auto gap-1.5 border-0 bg-transparent px-2 text-sm shadow-none hover:bg-muted/70', quickPriority === 'high' && 'text-rose-600 dark:text-rose-400')}><Flag size={18} /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="high">{t('planning.ui.priorityHigh')}</SelectItem><SelectItem value="medium">{t('planning.ui.priorityMedium')}</SelectItem><SelectItem value="low">{t('planning.ui.priorityLow')}</SelectItem></SelectContent></Select>
              <Select value={quickGroupId} onValueChange={setQuickGroupId}><SelectTrigger className="h-9 w-auto max-w-52 gap-1.5 border-0 bg-transparent px-2 text-sm shadow-none hover:bg-muted/70"><ListTodo size={18} /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none__">{t('planning.ui.ungrouped')}</SelectItem>{groups.map((group) => <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>)}</SelectContent></Select>
              <Button type="submit" size="sm" disabled={!quickTitle.trim() || isCreatingTodo} className="ml-auto h-9 px-4">{isCreatingTodo ? t('planning.ui.addSaving') : t('planning.ui.add')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={todoPendingDeletion !== null} onOpenChange={(open) => { if (!open) setTodoPendingDeletion(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t('planning.ui.deleteTodoTitle')}</AlertDialogTitle><AlertDialogDescription>{t('planning.ui.deleteConfirmDescription', { name: todoPendingDeletion?.title ?? '' })}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => void deleteTodo()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t('common.delete')}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

function DetailField({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return <div><label className="mb-2 block text-xs font-medium text-muted-foreground">{label}</label>{children}</div>
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  return <section className="space-y-3"><h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>{children}</section>
}

const TodoListItem = React.memo(function TodoListItem({
  todo,
  selected,
  todayEnd,
  isOverdue,
  onSelect,
  onToggle,
  onDelete,
  onUpdateDueAt,
}: {
  todo: Todo
  selected: boolean
  todayEnd: number
  isOverdue: boolean
  onSelect: (todo: Todo) => void
  onToggle: (todo: Todo) => void
  onDelete: (todo: Todo) => void
  onUpdateDueAt: (todo: Todo, dueAt?: number) => void
}): React.ReactElement {
  const t = useT()
  const priorityLabel = todo.priority === 'high' ? t('planning.ui.priorityHigh') : todo.priority === 'low' ? t('planning.ui.priorityLow') : t('planning.ui.priorityMedium')
  const dueTone = isOverdue ? 'text-rose-700 dark:text-rose-300' : todo.dueAt !== undefined && todo.dueAt <= todayEnd ? 'text-amber-800 dark:text-amber-200' : 'text-muted-foreground'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(todo)}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(todo) } }}
      className={cn('group flex min-h-[56px] w-full items-center gap-3 border-b border-border/60 px-4 py-1.5 text-left transition-colors focus:outline-none', selected ? 'bg-primary/8' : 'hover:bg-muted/45 focus-visible:bg-muted/45')}
    >
      <button type="button" aria-label={todo.status === 'completed' ? t('planning.ui.restoreItemAria', { name: todo.title }) : t('planning.ui.completeItemAria', { name: todo.title })} onClick={(event) => { event.stopPropagation(); onToggle(todo) }} className={cn('mt-0.5 flex size-5 shrink-0 self-start items-center justify-center rounded-sm border transition-colors', todo.status === 'completed' ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-transparent hover:border-primary hover:bg-primary hover:text-primary-foreground')}><Check size={12} /></button>
      <span className="min-w-0 flex-1">
        <span className={cn('block min-w-0 truncate text-sm font-medium', todo.status === 'completed' && 'text-muted-foreground line-through')}>{todo.title}</span>
        <span className="mt-1.5 flex flex-wrap items-center gap-1">
          <span onClick={(event) => event.stopPropagation()}>
            <TodoDatePicker value={todo.dueAt} onChange={(dueAt) => onUpdateDueAt(todo, dueAt)} label={t('planning.ui.setDueAria', { name: todo.title })} className={cn('h-6 max-w-40 rounded-md px-1.5 text-[11px] font-medium', dueTone)} />
          </span>
          <TodoMetaBadge tone={todo.priority === 'high' ? 'high' : todo.priority === 'low' ? 'low' : 'medium'}>{priorityLabel}</TodoMetaBadge>
          {todo.group && <TodoMetaBadge>{todo.group.name}</TodoMetaBadge>}
          {todo.nativeOrigin && <TodoMetaBadge>{todo.nativeOrigin.sourceTitle ? t('planning.ui.nativeSystemSuffix', { name: todo.nativeOrigin.sourceTitle }) : t('planning.ui.nativeConnected')}</TodoMetaBadge>}
          {todo.tags.map((tag) => <TodoMetaBadge key={tag.id}>#{tag.name}</TodoMetaBadge>)}
        </span>
      </span>
      <button type="button" aria-label={t('planning.ui.deleteItemAria', { name: todo.title })} onClick={(event) => { event.stopPropagation(); onDelete(todo) }} onKeyDown={(event) => event.stopPropagation()} className="flex size-10 shrink-0 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:bg-destructive/10 focus-visible:text-destructive focus-visible:outline-none"><Trash2 size={16} /></button>
    </div>
  )
})

function TodoMetaBadge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'today' | 'overdue' | 'high' | 'medium' | 'low'
}): React.ReactElement {
  const toneClass = tone === 'overdue' ? 'bg-rose-500/12 text-rose-700 dark:text-rose-300'
    : tone === 'today' ? 'bg-amber-500/12 text-amber-800 dark:text-amber-200'
      : tone === 'high' ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
        : tone === 'medium' ? 'bg-amber-500/10 text-amber-800 dark:text-amber-200'
          : tone === 'low' ? 'bg-slate-500/10 text-slate-600 dark:text-slate-300'
            : 'bg-muted/70 text-muted-foreground'
  return <span className={cn('inline-flex h-5 items-center rounded-md px-1.5 text-[11px] leading-none transition-colors', toneClass)}>{children}</span>
}
