import type { AgentWorkspace } from '@proma/shared'

/** 只过滤展示副本，不影响项目顺序、会话归属与后台任务。 */
export function filterProjectWorkspaces(
  workspaces: readonly AgentWorkspace[], query: string, archived = false,
): AgentWorkspace[] {
  const needle = query.trim().toLocaleLowerCase()
  return workspaces.filter((workspace) => Boolean(workspace.archived) === archived
    && (!needle || [workspace.name, workspace.projectRootPath ?? ''].some((text) => text.toLocaleLowerCase().includes(needle))))
}
