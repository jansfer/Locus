import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { resolvePackagingTarget } from './package-policy'

const target = resolvePackagingTarget(process.argv.slice(2), process.platform, process.arch)
const result = spawnSync(process.execPath, ['x', 'electron-builder', ...target.args], {
  cwd: resolve(import.meta.dir, '..'), stdio: 'inherit',
  env: { ...process.env, LOCUS_ARTIFACT_OS: target.os, LOCUS_ARTIFACT_ARCH: target.artifactArch },
})
if (result.error) throw result.error
process.exitCode = result.status ?? 1
