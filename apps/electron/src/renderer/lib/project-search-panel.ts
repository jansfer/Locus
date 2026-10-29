/**
 * 侧栏项目搜索面板的状态机。
 *
 * 项目区块默认只保留一个搜索按钮，点击后才展开输入框。收起时必须同时清空
 * 查询，否则列表会保留用户看不见的过滤条件，出现"项目莫名少了一半"。
 */
export interface ProjectSearchPanelState {
  open: boolean
  query: string
}

export type ProjectSearchPanelEvent =
  | { type: 'toggle' }
  | { type: 'change'; query: string }
  | { type: 'close' }

export const CLOSED_PROJECT_SEARCH_PANEL: ProjectSearchPanelState = Object.freeze({ open: false, query: '' })

export function reduceProjectSearchPanelState(
  state: ProjectSearchPanelState,
  event: ProjectSearchPanelEvent,
): ProjectSearchPanelState {
  switch (event.type) {
    case 'toggle':
      // 展开时从空查询开始；收起时清空查询，避免隐藏过滤状态。
      return state.open ? CLOSED_PROJECT_SEARCH_PANEL : { open: true, query: '' }
    case 'change':
      // 输入框只在展开时挂载，收起状态下的变更事件直接忽略，防止状态漂移。
      return state.open ? { open: true, query: event.query } : state
    case 'close':
      return state.open || state.query.length > 0 ? CLOSED_PROJECT_SEARCH_PANEL : state
  }
}
