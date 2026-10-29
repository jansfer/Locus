import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { YAML } from 'bun'

interface Step { name?: string; run?: string; if?: string }
interface Job { env?: Record<string, string>; steps: Step[]; needs?: string[] }
const workflow = YAML.parse(readFileSync(resolve(import.meta.dir, '../../../.github/workflows/release.yml'), 'utf8')) as { jobs: Record<string, Job> }

test('Given Linux ARM64 打包 When 选择 FPM Then 强制使用原生工具而不是 x86 下载包', () => {
  const job = workflow.jobs['build-linux']!
  expect(job.env?.USE_SYSTEM_FPM).toBe('true')
  expect(job.steps.some((step) => step.run?.includes('gem install fpm --version 1.17.0'))).toBe(true)
})

test('Given 自动发布 When 任一平台或清单合并未成功 Then 发布门禁必须等待全部任务', () => {
  expect(workflow.jobs['publish-release']?.needs).toEqual(expect.arrayContaining(['build-mac-arm64', 'build-mac-x64', 'build-linux', 'build-windows', 'merge-update-manifests']))
})

const notesStep = () => {
  const step = workflow.jobs['publish-release']?.steps.find((item) => item.name === '生成说明并发布 Release')
  expect(step?.run).toBeTruthy()
  return step!.run!
}

test('Given 仓库内存在对应版本的发布说明 When 发布 Release Then 优先使用该文件正文', () => {
  const run = notesStep()
  expect(run).toContain('release-notes/${TAG}.md')
  expect(run).toContain('--notes-file "$NOTES_FILE"')
  // 文件分支必须排在自动生成之前，否则手写说明会被覆盖。
  expect(run.indexOf('--notes-file')).toBeLessThan(run.indexOf('releases/generate-notes'))
})

test('Given 仓库内缺少说明文件 When 发布 Release Then 回退到 GitHub 自动生成说明', () => {
  const run = notesStep()
  expect(run).toContain('releases/generate-notes')
  expect(run).toContain('--notes "$RELEASE_NOTES"')
})

test('Given 说明文件存在但为空 When 发布 Release Then 阻止空说明的发布', () => {
  expect(notesStep()).toContain('存在但内容为空')
})
