import { describe, expect, test } from 'bun:test'
import { mergeUpdateManifests } from './update-manifest-policy'

const sha512 = Buffer.alloc(64, 1).toString('base64')
function manifest(os: string, arch: string, ext: string) {
  return { version: '0.19.69', files: [{ url: `Locus-0.19.69-${os}-${arch}.${ext}`, sha512, size: 123 }] }
}
describe('双架构更新清单', () => {
  test.each([['win', 'exe'], ['macos', 'zip']] as const)('Given %s 两种架构 When 合并 Then amd64 优先且校验值保持对应', (os, ext) => {
    const result = mergeUpdateManifests(os, '0.19.69', [manifest(os, 'arm64', ext), manifest(os, 'amd64', ext)])
    expect(result.files.map((file) => file.url)).toEqual([`Locus-0.19.69-${os}-amd64.${ext}`, `Locus-0.19.69-${os}-arm64.${ext}`])
    expect(result.path).toBe(result.files[0]!.url)
    expect(result.sha512).toBe(sha512)
  })
  test('Given 缺少架构、错误版本、改名后失配或无效校验值 When 合并 Then 阻止发布', () => {
    const good = manifest('win', 'amd64', 'exe')
    expect(() => mergeUpdateManifests('win', '0.19.69', [good])).toThrow()
    expect(() => mergeUpdateManifests('win', '0.19.70', [good, manifest('win', 'arm64', 'exe')])).toThrow()
    expect(() => mergeUpdateManifests('win', '0.19.69', [good, manifest('linux', 'arm64', 'exe')])).toThrow()
    expect(() => mergeUpdateManifests('win', '0.19.69', [good, { ...manifest('win', 'arm64', 'exe'), files: [{ url: 'Locus-0.19.69-win-arm64.exe', size: 123, sha512: 'bad' }] }])).toThrow()
  })
})
