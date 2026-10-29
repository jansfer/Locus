import { assertReleaseAssets } from './release-assets-policy'
const version = process.argv[2]
if (!version) throw new Error('需要提供版本号')
assertReleaseAssets(JSON.parse(await Bun.stdin.text()) as unknown, version)
console.log(`Release ${version} 六个平台安装包与更新清单校验通过`)
