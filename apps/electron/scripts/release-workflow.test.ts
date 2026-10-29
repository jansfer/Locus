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
