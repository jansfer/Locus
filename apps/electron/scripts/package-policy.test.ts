import { describe, expect, test } from 'bun:test'
import { resolvePackagingTarget, artifactNamePattern } from './package-policy'

describe('安装包命名与目标架构', () => {
  test.each(['linux', 'win32', 'darwin'] as const)('Given %s 原生构建 When 生成文件名 Then 显式包含系统和架构', (platform) => {
    for (const arch of ['x64', 'arm64'] as const) {
      const target = resolvePackagingTarget([], platform, arch)
      const os = platform === 'win32' ? 'win' : platform === 'darwin' ? 'macos' : 'linux'
      expect(target.artifactArch).toBe(arch === 'x64' ? 'amd64' : 'arm64')
      expect(artifactNamePattern(target)).toBe(`Locus-\${version}-${os}-${target.artifactArch}.\${ext}`)
      expect(target.args).toContain(`--${arch}`)
    }
  })
  test('Given 跨平台、跨架构或多个架构 When 打包 Then 拒绝混入宿主二进制', () => {
    expect(() => resolvePackagingTarget(['--arm64'], 'linux', 'x64')).toThrow()
    expect(() => resolvePackagingTarget(['--win'], 'linux', 'x64')).toThrow()
    expect(() => resolvePackagingTarget(['--x64', '--arm64'], 'linux', 'x64')).toThrow()
  })
})
