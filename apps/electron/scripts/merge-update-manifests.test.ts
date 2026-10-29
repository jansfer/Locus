import { expect, test } from 'bun:test'
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { YAML } from 'bun'
import { writeTextFileAtomic } from '../src/main/lib/safe-file'

test('Given 四个架构原始清单 When CLI 合并 Then 生成可被更新器读取的两个清单', () => {
  const root = mkdtempSync(join(tmpdir(), 'locus-manifests-'))
  try {
    for (const os of ['macos', 'win']) for (const [arch, canonical] of [['x64', 'amd64'], ['arm64', 'arm64']]) {
      const dir = join(root, `${os === 'win' ? 'windows' : 'mac'}-${arch}-manifest`)
      mkdirSync(dir)
      const filename = os === 'win' ? 'latest.yml' : 'latest-mac.yml'
      const data = { version: '0.19.69', files: [{ url: `Locus-0.19.69-${os}-${canonical}.${os === 'win' ? 'exe' : 'zip'}`, sha512: Buffer.alloc(64, 1).toString('base64'), size: 100 }] }
      writeTextFileAtomic(join(dir, filename), YAML.stringify(data))
    }
    const result = spawnSync(process.execPath, ['run', resolve(import.meta.dir, 'merge-update-manifests.ts'), root, join(root, 'output'), '0.19.69'], { encoding: 'utf8' })
    expect(result.status).toBe(0)
    for (const filename of ['latest.yml', 'latest-mac.yml']) {
      const data = YAML.parse(readFileSync(join(root, 'output', filename), 'utf8')) as { files: Array<{ url: string }> }
      expect(data.files).toHaveLength(2)
      expect(data.files[0]?.url).toContain('amd64')
      expect(data.files[1]?.url).toContain('arm64')
    }
  } finally { rmSync(root, { recursive: true, force: true }) }
})
