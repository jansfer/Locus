/** agentView 域文案（English）。与 zh-CN 同名文件同形；缺键会在编译期报错。 */
import type { MirrorStructure } from '../../types'
import { agentView as zhagentView } from '../zh-CN/agentView'

export const agentView: MirrorStructure<typeof zhagentView> = {
  /** Thinking hover popover; level keys map 1:1 to AgentThinkingLevel values. */
  thinking: {
    depth: 'Thinking depth',
    mode: 'Thinking mode',
    off: 'Off',
    minimal: 'Minimal',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    xhigh: 'Extra high',
    max: 'Max',
  },
  /** Agent-triggered Todo / schedule operation notifications. */
  planning: {
    todo: {
      created: 'Todo created',
      updated: 'Todo updated',
      deleted: 'Todo deleted',
    },
    schedule: {
      created: 'Event created',
      updated: 'Event updated',
      deleted: 'Event deleted',
    },
    quotedTitle: '“{title}”',
  },
  /** Mark-reply-as-Todo dialog. */
  todoDialog: {
    title: 'Mark as Todo',
    taskTitle: 'Task title',
    group: 'Todo group',
    noGroup: 'No group',
    add: 'Add Todo',
    emptyTitle: 'Todo title cannot be empty',
    titleTooLong: 'Todo title cannot exceed 500 characters',
    added: 'Todo added',
    linkedDesc: 'Linked to the current Agent session',
    createFailed: 'Failed to create Todo',
  },
  /** Attachment handling notices. */
  attachments: {
    noWorkspace: 'Cannot send attachments yet',
    noWorkspaceDesc: 'This Agent session has no valid project bound. Select a project at the top, or create a new Agent session and upload again.',
    staleData: 'Attachment data is no longer valid',
    stalePasteDesc: 'Remove it and paste again: {files}',
    staleFilesDesc: 'Remove them and add the files again: {files}',
    saveFailed: 'Failed to save attachments',
    saveFailedDesc: 'Make sure the current project is available, or create a new Agent session and upload again.',
    notAttached: 'Attachments were not added to the message',
    notAttachedDesc: 'Upload the files again, or switch to a valid project and retry.',
    largeReferenced: 'Added large files as attached references: {files}',
    oversizedSkipped: 'Skipped (over 100MB with no local path available): {files}',
    attachFailedSkipped: 'Failed to attach, skipped: {files}',
    unreadableSkipped: 'Unreadable files, skipped: {files}',
    directoryAttached: 'Attached directory: {names}',
    directoryAttachFailed: 'Failed to attach these folders: {names}',
    attachContentFailed: 'Failed to attach files or folders',
    longTextConverted: 'Long text converted to attachment',
    longTextConvertedDesc: '{filename}. Click the attachment to preview or edit.',
    longTextConvertFailed: 'Failed to convert long text to attachment',
    cannotReferenceCurrent: 'Cannot reference the current session',
    filesReferenced: 'Referenced {n} files',
  },
  /** Model and thinking depth switching. */
  model: {
    switchDeferred: 'Model switched; takes effect after the current turn',
    fastModeToggleFailed: 'Failed to toggle fast mode',
    defaultThinkingSaveFailed: 'Failed to save default thinking depth',
    thinkingSwitchDeferred: 'Thinking level switched; takes effect after the current turn',
    thinkingSwitchFailed: 'Failed to switch thinking depth',
    recommendedUnavailable: 'The recommended model is unavailable; please choose another model',
    replyNotFinished: 'The current reply is still in progress; switch models later',
    switchedRetrying: 'Switched to {name}; retrying',
  },
  /** Message sending. */
  send: {
    stoppingPrevious: 'Stopping the previous Agent run',
    stoppingPreviousDesc: 'Please wait for the stop to finish before sending.',
    legacyTranscript: 'This is a read-only history session; create a new Pi session to continue',
    messagesSyncing: 'Previous messages are still syncing',
    messagesSyncingDesc: 'Please wait a moment before sending; the queue will continue after syncing completes.',
    enqueueFailed: 'Failed to queue the message',
    appendFailed: 'Failed to append the message',
  },
  /** Message queue. */
  queue: {
    alreadySending: 'Message already started sending; cannot send now',
    sendFailed: 'Failed to send queued message',
    operationFailed: 'Queued message operation failed',
    recallBlocked: 'Message already started sending; cannot recall',
    removeBlocked: 'Message already started sending; cannot delete',
    removeFailed: 'Failed to delete queued message',
  },
  /** Local project root re-link and restore. */
  projectRoot: {
    relinked: 'Local project root re-linked',
    relinkFailed: 'Failed to re-link the project folder',
    restored: 'Created an empty project folder at the original path',
    restoreFailed: 'Failed to restore the project folder',
    restoreDialogTitle: 'Create an empty folder at the original path?',
    restoreDialogDesc: 'An empty folder will be created at the original path of this local project. Deleted files will not be recovered.',
    creating: 'Creating...',
    createEmptyFolder: 'Create empty folder',
  },
  /** Exploration branches (AgentView fork + SidePanel bring-back). */
  exploration: {
    sourceLabel: 'This Agent reply',
    forked: 'Exploration branch created',
    forkedDesc: 'The branch inherits the full context up to this point; conclusions can be brought back to the main line.',
    forkFailed: 'Failed to create exploration branch',
    forkNotSupported: 'This message cannot be used as an exploration start (it may belong to a subagent run or has been cleaned up). Pick another reply in the main conversation and try again.',
    bringBackNoConclusion: 'The exploration branch has no Agent conclusion to bring back yet',
    referenceLabel: 'New exploration content · {title}',
    referencePrefix: 'New content from exploration: ',
    added: 'Exploration reference added',
    addedDesc: 'The exploration tab stays open; the Agent will read this marker when the main session sends.',
    action: 'Add exploration reference',
    actionTip: 'Add the new exploration content as a session reference to the main draft; the exploration tab stays open and nothing is sent automatically',
    noConclusionTip: 'Finish a new exploration reply to add a reference',
  },
  /** Snapshot rewind. */
  rewind: {
    confirmTitle: 'Confirm rewind',
    confirmDesc: 'Rewinding truncates all conversation after this message. This cannot be undone. Rewind?',
    action: 'Rewind',
    rewound: 'Rewound to here',
    filesRestored: '{n} files restored',
    filesUnchanged: 'No file changes',
    rewoundNoFiles: 'Conversation rewound',
    fileRestoreUnavailable: 'File restore unavailable: {error}',
    failed: 'Rewind failed',
  },
  /** Input toolbar (Codex fast mode / attach / stop). */
  toolbar: {
    fastModeOn: 'Fast',
    fastModeOff: 'Standard',
    fastModeOnTip: 'Fast mode enabled: prioritizes responsiveness, uses more quota',
    fastModeOffTip: 'Enable fast mode: prioritizes responsiveness, uses more quota',
    attach: 'Attach files or folders',
    stop: 'Stop Agent',
    stopAgain: 'Stop Agent again',
    stopUnconfirmed: 'Stop not confirmed; send again to interrupt',
    stopWithShortcut: 'Stop Agent ({shortcut})',
  },
  /** Composer placeholder and model guidance. */
  composer: {
    placeholderCmdEnter: 'Type a message... (@ to reference files, / for Skills, # for MCP, & to reference sessions, ~ for todos/events; Cmd/Ctrl+Enter to send)',
    placeholderEnter: 'Type a message... (@ to reference files, / for Skills, # for MCP, & to reference sessions, ~ for todos/events; Enter to send)',
    selectModelFirst: 'Select a model first',
    noModelEnableChannel: 'No available models; enable channels in Settings first',
    noAvailableModel: 'No available models. Add or enable channels and models in Settings',
    selectModelToStart: 'Select a model to start the Agent conversation',
    goToSettings: 'Go to Settings',
    selectModel: 'Select model',
  },
  /** Read-only history banner for the retired Claude runtime. */
  legacy: {
    banner: 'This is a read-only history session from the retired Claude runtime; the conversation can be viewed but cannot continue, fork, or rewind.',
    continueInPi: 'Continue in a new Pi session',
  },
  /** SidePanel workspace tab titles. */
  tabs: {
    files: 'Files',
    changes: 'Changes',
    calendar: 'Calendar',
    automations: 'Automations',
    memory: 'Project memory',
    chat: 'Chat',
    explorationFallback: 'Exploration branch',
    previewFallback: 'Preview',
    newBrowserTab: 'New tab',
  },
  /** SidePanel terminal tab titles. */
  terminal: {
    defaultTitle: 'Terminal',
    withName: 'Terminal · {name}',
  },
  /** SidePanel file browsing (source toggle, attached lists, empty states). */
  filesBrowser: {
    sessionFiles: 'Session files',
    projectFiles: 'Project files',
    projectRootUnavailable: 'The local project root is unavailable; session files remain accessible.',
    searchPlaceholder: 'Search files...',
    sourceTablist: 'File sources',
    dragToReference: 'Drag files or folders into the input box to reference them',
    openTerminalIn: 'Open terminal in {name}',
    openTerminalTip: 'Open terminal in a right-side tab',
    detachDirectoryNamed: 'Detach directory {name}',
    detachDirectoryTip: 'Detach directory',
    emptyFolder: 'Empty folder',
  },
  /** SidePanel split panes. */
  pane: {
    ariaLeft: 'Left pane: {tab}',
    ariaRight: 'Right pane: {tab}',
    sideBySideLeft: 'Side by side on the left',
    sideBySideRight: 'Side by side on the right',
    resizeAria: 'Resize split width; double-click to reset to equal halves',
  },
  /** SidePanel embedded browser view. */
  browser: {
    dropToRestore: 'Release to restore the browser view',
    tabClosed: 'Browser tab closed',
  },
  /** SidePanel embedded chat empty state. */
  chatEmpty: 'No chat conversation yet',
  /** SidePanel waiting-for-initialization empty states. */
  waiting: {
    projectInit: 'Waiting for project initialization...',
    sessionInit: 'Waiting for session initialization...',
  },
  /** Attached file/directory row menus. */
  fileMenu: {
    moreActions: 'More actions',
    referenceToAgent: 'Reference in Agent',
    addToChat: 'Add to chat',
    showInFolder: 'Show in folder',
    openFile: 'Open file',
    detach: 'Remove attachment',
    moveTo: 'Move to...',
  },
  unknownError: 'Unknown error',
  /** Default prompt sent to the Agent when continuing in a new session (shown as a user message). */
  newSessionPrompt: 'Read the history of &session:{sessionId}, then continue from where the previous session stopped.',
}
