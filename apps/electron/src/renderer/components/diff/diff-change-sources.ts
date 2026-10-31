import type { ChangeSource } from '@proma/shared'

export interface DiffChangeSourceEntry {
  source?: ChangeSource
}

/** 改动来源按稳定顺序展示，避免筛选或刷新时 badge 跳动。 */
const DIFF_CHANGE_SOURCE_ORDER: readonly ChangeSource[] = [
  'session',
  'workspace',
  'both',
  'none',
]

/** 改动来源 badge 在 diff 域词典中的文案键；渲染处用 t(labelKey) 取本地化文案。 */
export type DiffChangeSourceLabelKey = 'diff.source.session' | 'diff.source.workspace' | 'diff.source.both' | 'diff.source.extra'

/** 文件来源 badge 的颜色和词典键（文案在渲染处经 t() 解析）。 */
export const DIFF_CHANGE_SOURCE_CONFIG: Record<ChangeSource, { color: string; labelKey: DiffChangeSourceLabelKey }> = {
  session: { color: 'bg-blue-500/10 text-blue-500', labelKey: 'diff.source.session' },
  workspace: { color: 'bg-purple-500/10 text-purple-500', labelKey: 'diff.source.workspace' },
  both: { color: 'bg-cyan-500/10 text-cyan-500', labelKey: 'diff.source.both' },
  none: { color: 'bg-muted text-muted-foreground', labelKey: 'diff.source.extra' },
}

/** 聚合一个 Git 仓库内的来源类型；未追踪文件不会伪造来源。 */
export function collectDiffChangeSources(entries: readonly DiffChangeSourceEntry[]): ChangeSource[] {
  const sources = new Set<ChangeSource>()
  for (const entry of entries) {
    if (entry.source) sources.add(entry.source)
  }
  return DIFF_CHANGE_SOURCE_ORDER.filter((source) => sources.has(source))
}
