/** 在打包后的 Electron 下验证运行时依赖和 CLI，禁止用 Bun 代替 Electron 加载 native 模块。 */
const { createRequire } = require('node:module')
const { resolve, join, dirname } = require('node:path')
const { pathToFileURL } = require('node:url')
const { spawnSync } = require('node:child_process')
const { assertBinaryArchitecture } = require('./binary-architecture.cjs')

async function main() {
  const [resourceDirectory, expectedArch] = process.argv.slice(2)
  if (!resourceDirectory || process.arch !== expectedArch) throw new Error(`Electron 架构不匹配: ${process.arch}/${expectedArch}`)
  const resources = resolve(resourceDirectory)
  const appExecutable = process.platform === 'darwin' ? join(dirname(resources), 'MacOS/Locus') : join(dirname(resources), process.platform === 'win32' ? 'Locus.exe' : 'locus')
  assertBinaryArchitecture(appExecutable, expectedArch)
  const requireApp = createRequire(join(resources, 'app.asar', 'package.json'))
  const nativePty = requireApp('node-pty')
  const sharp = requireApp('sharp')
  await sharp({ create: { width: 1, height: 1, channels: 4, background: '#000000' } }).png().toBuffer()
  const sdk = await import(pathToFileURL(join(resources, 'app.asar/node_modules/@earendil-works/pi-coding-agent/dist/index.js')).href)
  if (typeof sdk.createAgentSession !== 'function') throw new Error('Pi SDK 入口缺失')
  if (process.platform === 'win32') {
    const nativePi = join(resources, `app.asar/node_modules/@earendil-works/pi-tui/native/win32/prebuilds/win32-${expectedArch}/win32-platform.node`)
    requireApp(nativePi)
  }
  const cli = join(resources, 'bin', process.platform === 'win32' ? 'proma.exe' : 'proma')
  assertBinaryArchitecture(cli, expectedArch)
  const cliResult = spawnSync(cli, ['--help'], { encoding: 'utf8', timeout: 60000 })
  if (cliResult.error || cliResult.status !== 0) throw new Error(`包内 CLI 无法执行: ${cliResult.error || cliResult.stderr}`)
  const office = join(resources, 'officecli', process.platform === 'win32' ? 'officecli.exe' : 'officecli')
  assertBinaryArchitecture(office, expectedArch)
  const officeResult = spawnSync(office, ['--version'], { encoding: 'utf8', timeout: 60000 })
  if (officeResult.error || officeResult.status !== 0) throw new Error(`OfficeCLI 无法执行: ${officeResult.error || officeResult.stderr}`)
  await new Promise((resolvePromise, reject) => {
    let output = ''
    const shell = process.platform === 'win32' ? 'powershell.exe' : '/bin/sh'
    const args = process.platform === 'win32' ? ['-NoProfile', '-Command', 'Write-Output LOCUS_PTY_OK'] : ['-c', 'echo LOCUS_PTY_OK']
    const terminal = nativePty.spawn(shell, args, { cols: 80, rows: 24, cwd: resources, env: process.env })
    const timer = setTimeout(() => { terminal.kill(); reject(new Error('PTY 冒烟测试超时')) }, 15000)
    terminal.onData((data) => { output += data })
    terminal.onExit(() => { clearTimeout(timer); output.includes('LOCUS_PTY_OK') ? resolvePromise() : reject(new Error(`PTY 没有输出预期结果: ${output}`)) })
  })
  console.log(`打包运行时验证通过: ${process.platform}/${process.arch}, Electron ${process.versions.electron}`)
}

// Pi/PTY 可能保留后台句柄；验证结束后显式退出这个独立测试进程。
main().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1) })
