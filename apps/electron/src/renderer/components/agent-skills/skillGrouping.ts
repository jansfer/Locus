import type { SkillMeta } from '@proma/shared'

export interface SkillGroup {
  id: string
  title: string
  skills: SkillMeta[]
}

/**
 * 无 group 字段的 Skill 归到哨兵标题；渲染处用 skills.group.ungrouped 键翻译。
 * 用非中文哨兵而不是中文文案，避免本文件出现用户可见中文字面量。
 */
export const UNGROUPED_TITLE_KEY = 'ungrouped'

function normalizeGroup(value: string): string {
  return value.trim().replace(/^["']|["']$/g, '')
}

export function getSkillGroupTitle(skill: SkillMeta): string {
  if (skill.group) {
    const group = normalizeGroup(skill.group)
    if (group) return group
  }

  return UNGROUPED_TITLE_KEY
}

export function groupSkills(skills: SkillMeta[]): SkillGroup[] {
  const groups = new Map<string, SkillMeta[]>()

  for (const skill of skills) {
    const title = getSkillGroupTitle(skill)
    const group = groups.get(title) ?? []
    group.push(skill)
    groups.set(title, group)
  }

  return [...groups.entries()]
    .map(([title, groupSkills]) => ({
      id: title.toLowerCase(),
      title,
      skills: groupSkills,
    }))
    .sort((a, b) => compareGroupTitle(a.title, b.title))
}

function compareGroupTitle(a: string, b: string): number {
  if (a === UNGROUPED_TITLE_KEY && b !== UNGROUPED_TITLE_KEY) return 1
  if (b === UNGROUPED_TITLE_KEY && a !== UNGROUPED_TITLE_KEY) return -1
  return a.localeCompare(b, 'zh-CN')
}
