/** misc 域文案（English）。与 zh-CN 同名文件同形；缺键会在编译期报错。 */
import type { MirrorStructure } from '../../types'
import { misc as zhmisc } from '../zh-CN/misc'

export const misc: MirrorStructure<typeof zhmisc> = {
  /** Session, tab and quote label copy */
  session: {
    untitled: 'Untitled Session',
    newAgentSession: 'New Agent Session',
    newConversation: 'New Conversation',
    queuedSessionRef: 'Session {id}',
    queuedScheduleRef: 'Schedule {id}',
    previewTabTitle: 'Preview: {name}',
    defaultAgentTabTitle: 'Agent Session',
    delegationTabTitle: 'Delegated Task',
    agentHistoryLabel: 'Agent History',
    historyQuoteRound: 'Round {turn}: {preview}',
    historyQuoteFallback: 'History quote: {preview}',
  },
  /** Virtual groups in the archived session list */
  archiveGroups: {
    automations: 'Automations',
    unassigned: 'Unassigned',
  },
  /** Toasts for capability changes (MCP/Skill add/remove/enable/disable) */
  capabilities: {
    mcpAdded: 'MCP server added: {name}',
    mcpRemoved: 'MCP server removed: {name}',
    mcpEnabled: 'MCP server enabled: {name}',
    mcpDisabled: 'MCP server disabled: {name}',
    skillAdded: 'Skill added: {name}',
    skillRemoved: 'Skill removed: {name}',
    skillEnabled: 'Skill enabled: {name}',
    skillDisabled: 'Skill disabled: {name}',
    mcpSummary: '{n} MCP servers',
    skillSummary: '{n} Skills',
    summaryUpdated: 'Project config updated: {list}',
    /** Summary list joiner: Chinese comma for zh, plain comma for en */
    summaryJoiner: ', ',
  },
  /** Channel plan quota display */
  quota: {
    weeklyLabel: 'Week',
    remaining: '{value} left',
    resetAt: ', resets {time}',
    noResetTime: ', no reset time provided',
    loadingSummary: 'Loading quota',
    copilotLoadingTitle: 'Reading GitHub Copilot plan quota',
    unknownSummary: 'Quota unknown',
    unavailableSummary: 'Quota unavailable',
    copilotNoDataTitle: 'GitHub Copilot did not provide quota data',
    planFallback: 'Plan quota',
    detailTitle: '{plan}\n{details}',
    fetchFailed: 'Failed to fetch plan quota. Please try again later.',
  },
  /** Clipboard and image copy */
  clipboard: {
    writeNotSupported: 'Writing to the clipboard is not supported in this environment',
    imageFetchFailed: 'Failed to read image ({status})',
    imageConvertFailed: 'Failed to convert image',
    imageConvertAborted: 'Image conversion cancelled',
    invalidImageData: 'Invalid image data',
    copyFailed: 'Copy failed',
    copyFailedHint: 'Copy failed. Check that the image is accessible',
  },
  /** File name lists and size limit */
  files: {
    /** File name list joiner: Chinese comma for zh, plain comma for en */
    listJoiner: ', ',
    listOverflow: '{names} and {n} files',
    sizeLimitExceeded: 'File {name} exceeds the 100MB size limit',
  },
  /** "Open with X" menu labels */
  openWith: {
    withApp: 'Open with {name}',
    systemDefault: 'Open with system default app',
  },
  /** Markdown frontmatter preview */
  frontmatter: {
    summaryLabel: 'Frontmatter',
  },
  /** Shortcut names/descriptions/categories; data files store keys, renderers call t(key) */
  shortcuts: {
    categories: {
      app: 'App',
      edit: 'Edit',
      navigation: 'Navigation',
      global: 'Global',
    },
    items: {
      'open-settings': { name: 'Open Settings', description: 'Open the app settings panel' },
      'new-session': { name: 'New Session', description: 'Create a Chat conversation or Agent session based on the current mode' },
      'toggle-sidebar': { name: 'Toggle Sidebar', description: 'Show or hide the left sidebar' },
      'zoom-in': { name: 'Zoom In', description: 'Increase the Locus UI zoom level' },
      'zoom-out': { name: 'Zoom Out', description: 'Decrease the Locus UI zoom level' },
      'reset-zoom': { name: 'Reset Zoom', description: 'Restore the default Locus UI zoom level' },
      'toggle-mode': { name: 'Switch Mode', description: 'Switch between Chat and Agent modes' },
      'global-search': { name: 'Global Search', description: 'Search conversations and sessions' },
      'file-find': { name: 'Find', description: 'Search messages in a conversation, or find file content in the preview/Diff panel' },
      'focus-input': { name: 'Focus Input', description: 'Jump to the input box' },
      'editor-bold': { name: 'Bold / Unbold', description: 'Toggle bold text in the input box' },
      'editor-strikethrough': { name: 'Strikethrough / Remove Strikethrough', description: 'Toggle strikethrough text in the input box' },
      'clear-context': { name: 'Clear Context', description: 'Clear the current conversation context' },
      'stop-generation': { name: 'Stop Agent', description: 'Interrupt the current AI response' },
      'close-tab': { name: 'Close Tab', description: 'Close the current Chat tab, or the Agent side components, preview, browser and terminal tabs' },
      'toggle-preview-panel': { name: 'Toggle Preview Panel', description: 'Show or hide the inline Diff/file preview panel' },
      'toggle-right-panel': { name: 'Toggle File Panel', description: 'Show or hide the right file panel' },
      'quick-task': { name: 'Quick Task', description: 'Open the floating quick task input window' },
      'show-main-window': { name: 'Show Main Window', description: 'Show and focus the Locus main window' },
      'voice-dictation': { name: 'Voice Input', description: 'Open the Doubao streaming voice input overlay' },
    },
  },
  /** Ctrl+Tab switcher section titles */
  tabSwitcher: {
    collaborationTitle: 'Current Collaboration',
    collaborationDescription: 'Parent and child sessions',
    recentTitle: 'Recent',
    recentDescription: 'Ordered by last access',
  },
  /** Interval and weekday options in the automation form; data files store keys, renderers call t(key) */
  automation: {
    intervals: {
      m5: 'Every 5 minutes',
      m10: 'Every 10 minutes',
      m30: 'Every 30 minutes',
      h1: 'Every hour',
      h3: 'Every 3 hours',
      h6: 'Every 6 hours',
      h12: 'Every 12 hours',
    },
    weekdays: {
      mon: 'Monday',
      tue: 'Tuesday',
      wed: 'Wednesday',
      thu: 'Thursday',
      fri: 'Friday',
      sat: 'Saturday',
      sun: 'Sunday',
    },
  },
  /** Desktop notifications and completion toasts from the global Agent listeners */
  agentNotifications: {
    automationGraduated: 'You took over the automation session; future scheduled runs will create a new one.',
    permissionTitle: 'Permission Required',
    permissionToolBody: 'Agent requests tool: {tool}',
    permissionBody: 'Agent needs your permission',
    askUserTitle: 'Agent Needs Your Input',
    askUserFallbackBody: 'Agent has a question for you',
    planReviewTitle: 'Agent Plan Awaiting Review',
    planReviewBody: 'Agent finished its plan and is waiting for your approval',
    completionTitle: 'Agent Task Complete',
    completionBody: 'Task complete: {title}',
    interruptedMaxTurns: 'Task interrupted: turn limit reached. Continue the conversation to let the Agent finish.',
    interruptedMaxBudget: 'Task interrupted: budget limit reached.',
    executionError: 'An error occurred during task execution.',
    emptyResponse: 'The Agent finished this turn but returned nothing to display. Your message was kept — retry directly or switch models.',
    abnormalEnd: 'Task ended abnormally ({subtype})',
    executionErrorDetail: 'Task execution error: {detail}',
  },
  /** Project (workspace) action failure messages */
  project: {
    createFailed: 'Failed to create project',
    folderSelectFailed: 'Failed to select project folder',
  },
  /** Developer-facing exceptions for API misuse */
  dev: {
    conversationIdOutsideProvider: 'useConversationId must be used within ConversationProvider',
  },
}
