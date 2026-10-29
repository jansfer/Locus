import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const appDir = resolve(import.meta.dir, '..')
const arch = process.arch
const resources = process.platform === 'darwin'
  ? resolve(appDir, 'out', arch === 'arm64' ? 'mac-arm64' : 'mac', 'Locus.app/Contents/Resources')
  : resolve(appDir, 'out', `${process.platform === 'win32' ? 'win' : 'linux'}${arch === 'arm64' ? '-arm64' : ''}-unpacked/resources`)
if (!existsSync(resolve(resources, 'app.asar'))) throw new Error(`未找到打包产物: ${resources}`)
const result = spawnSync(process.execPath, ['x', 'electron', resolve(import.meta.dir, 'runtime-package-smoke.cjs'), resources, arch], {
  cwd: appDir, stdio: 'inherit', env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, timeout: 180000,
})
if (result.error) throw result.error
process.exitCode = result.status ?? 1
