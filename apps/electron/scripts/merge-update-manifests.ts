import { readFileSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { YAML } from 'bun'
import { writeTextFileAtomic } from '../src/main/lib/safe-file'
import { mergeUpdateManifests } from './update-manifest-policy'

const [inputDirectory, outputDirectory, version] = process.argv.slice(2)
if (!inputDirectory || !outputDirectory || !version) throw new Error('用法: merge-update-manifests.ts 输入目录 输出目录 版本')
mkdirSync(resolve(outputDirectory), { recursive: true })
for (const os of ['macos', 'win'] as const) {
  const filename = os === 'macos' ? 'latest-mac.yml' : 'latest.yml'
  const prefix = os === 'macos' ? 'mac' : 'windows'
  const inputs = ['x64', 'arm64'].map((arch) => YAML.parse(readFileSync(join(inputDirectory, `${prefix}-${arch}-manifest`, filename), 'utf8')))
  writeTextFileAtomic(join(outputDirectory, filename), YAML.stringify(mergeUpdateManifests(os, version, inputs), null, 2) + '\n')
}
