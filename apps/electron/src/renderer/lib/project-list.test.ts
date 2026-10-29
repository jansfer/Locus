import { describe, expect, test } from 'bun:test'
import { filterProjectWorkspaces, getProjectSections } from './project-list'

const projects = [
  { id: 'active', name: 'Locus App', slug: 'locus', createdAt: 1, updatedAt: 1, projectRootPath: 'D:/Work/Locus' },
  { id: 'archived', name: '旧项目', slug: 'old', createdAt: 1, updatedAt: 1, archived: true },
]

describe('项目列表过滤', () => {
  test('Given 归档区域未展开 When 浏览或搜索 Then 常用项目保留且归档内容始终隐藏', () => {
    expect(getProjectSections(projects, '', false)).toEqual({ active: [projects[0]!], archived: [] })
    expect(getProjectSections(projects, '旧', false).archived).toEqual([])
    expect(getProjectSections(projects, '', true)).toEqual({ active: [projects[0]!], archived: [projects[1]!] })
    expect(getProjectSections([projects[0]!], '', true).archived).toEqual([])
  })
  test('Given 活跃和归档项目 When 切换列表 Then 分别展示且保留原始顺序', () => {
    expect(filterProjectWorkspaces(projects, '', false).map((item) => item.id)).toEqual(['active'])
    expect(filterProjectWorkspaces(projects, '', true).map((item) => item.id)).toEqual(['archived'])
    expect(projects).toHaveLength(2)
  })
  test('Given 名称或路径关键字 When 搜索 Then 忽略大小写和两端空格且无匹配返回空列表', () => {
    expect(filterProjectWorkspaces(projects, ' LOCUS ', false)).toHaveLength(1)
    expect(filterProjectWorkspaces(projects, 'd:/work', false)).toHaveLength(1)
    expect(filterProjectWorkspaces(projects, '旧', true)).toHaveLength(1)
    expect(filterProjectWorkspaces(projects, '不存在', false)).toEqual([])
  })
})
