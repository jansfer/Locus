import { afterEach, describe, expect, test } from 'bun:test'
import { findFile, resolveFiles, Provider } from 'electron-updater/out/providers/Provider'
import { MacUpdater } from 'electron-updater/out/MacUpdater'
import { mergeUpdateManifests } from './update-manifest-policy'

const archDescriptor = Object.getOwnPropertyDescriptor(process, 'arch')!
afterEach(() => Object.defineProperty(process, 'arch', archDescriptor))
const sha512 = Buffer.alloc(64, 2).toString('base64')
class TestMacUpdater extends MacUpdater {
  static selectArchitecture(files: ReturnType<typeof resolveFiles>, arm64: boolean) {
    return this.filterFilesForArch(files, arm64)
  }
}
function merged(os: 'win' | 'macos') {
  const ext = os === 'win' ? 'exe' : 'zip'
  return mergeUpdateManifests(os, '0.19.69', ['arm64', 'amd64'].map((arch) => ({ version: '0.19.69', files: [{ url: `Locus-0.19.69-${os}-${arch}.${ext}`, sha512, size: 100 }] })))
}

describe('旧版 electron-updater 真实选包逻辑', () => {
  test.each(['x64', 'arm64'])('Given Windows %s 客户端 When 读取新命名清单 Then 选中正确 EXE', (arch) => {
    Object.defineProperty(process, 'arch', { value: arch, configurable: true })
    const files = resolveFiles(merged('win'), new URL('https://example.test/'))
    expect(findFile(files, 'exe')?.info.url).toBe(`Locus-0.19.69-win-${arch === 'x64' ? 'amd64' : 'arm64'}.exe`)
  })
  test.each(['x64', 'arm64'])('Given macOS %s 客户端 When 过滤并选择 ZIP Then 不混用架构', (arch) => {
    Object.defineProperty(process, 'arch', { value: arch, configurable: true })
    const files = resolveFiles(merged('macos'), new URL('https://example.test/'))
    const selected = findFile(TestMacUpdater.selectArchitecture(files, arch === 'arm64'), 'zip')
    expect(selected?.info.url).toBe(`Locus-0.19.69-macos-${arch === 'x64' ? 'amd64' : 'arm64'}.zip`)
  })
  test.each(['x64', 'arm64'])('Given Linux %s 客户端 When 查询更新 Then 保持既有通道名', (arch) => {
    Object.defineProperty(process, 'arch', { value: arch, configurable: true })
    const provider = Object.assign(Object.create(Provider.prototype) as { getDefaultChannelName(): string }, { runtimeOptions: { platform: 'linux' } })
    expect(provider.getDefaultChannelName()).toBe(arch === 'x64' ? 'latest-linux' : 'latest-linux-arm64')
  })
})
