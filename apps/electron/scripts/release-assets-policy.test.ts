import { expect, test } from 'bun:test'
import { assertReleaseAssets, expectedReleaseAssets } from './release-assets-policy'

test('Given 六个平台工件 When 缺失任意安装包或更新清单 Then 阻止公开发布', () => {
  const assets = expectedReleaseAssets('0.19.69').map((name) => ({ name, size: 1, state: 'uploaded' }))
  expect(() => assertReleaseAssets({ assets }, '0.19.69')).not.toThrow()
  for (const asset of assets) expect(() => assertReleaseAssets({ assets: assets.filter((candidate) => candidate !== asset) }, '0.19.69')).toThrow()
})
