import { describe, expect, test } from 'bun:test'
import {
  CLOSED_PROJECT_SEARCH_PANEL,
  reduceProjectSearchPanelState,
  type ProjectSearchPanelState,
} from '@/lib/project-search-panel'

describe('侧栏项目搜索面板', () => {
  test('given 面板收起 when 点击搜索按钮 then 展开且查询为空', () => {
    const result = reduceProjectSearchPanelState(CLOSED_PROJECT_SEARCH_PANEL, { type: 'toggle' })

    expect(result).toEqual({ open: true, query: '' })
  })

  test('given 面板展开且已输入查询 when 再次点击搜索按钮 then 收起并清空查询', () => {
    const typed: ProjectSearchPanelState = { open: true, query: 'locus' }

    const result = reduceProjectSearchPanelState(typed, { type: 'toggle' })

    expect(result).toEqual({ open: false, query: '' })
  })

  test('given 面板展开且已输入查询 when 按 Esc 关闭 then 收起并清空查询', () => {
    const typed: ProjectSearchPanelState = { open: true, query: '跑者' }

    const result = reduceProjectSearchPanelState(typed, { type: 'close' })

    expect(result).toEqual({ open: false, query: '' })
  })

  test('given 面板收起 when 收到输入变更 then 忽略变更并保持收起', () => {
    const result = reduceProjectSearchPanelState(CLOSED_PROJECT_SEARCH_PANEL, {
      type: 'change',
      query: 'locus',
    })

    expect(result).toBe(CLOSED_PROJECT_SEARCH_PANEL)
  })

  test('given 面板已收起且查询为空 when 再次关闭 then 复用原状态引用', () => {
    expect(reduceProjectSearchPanelState(CLOSED_PROJECT_SEARCH_PANEL, { type: 'close' }))
      .toBe(CLOSED_PROJECT_SEARCH_PANEL)
  })
})
