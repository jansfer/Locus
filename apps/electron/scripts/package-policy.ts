export interface PackagingTarget {
  os: 'linux' | 'win' | 'macos'
  arch: 'x64' | 'arm64'
  artifactArch: 'amd64' | 'arm64'
  args: string[]
}

/** 打包必须在目标宿主原生执行，附带 CLI 与 native 模块不能交叉冒充。 */
export function resolvePackagingTarget(args: readonly string[], platform: string, arch: string): PackagingTarget {
  if (arch !== 'x64' && arch !== 'arm64') throw new Error(`不支持的架构: ${arch}`)
  const platformFlag = platform === 'darwin' ? 'mac' : platform === 'win32' ? 'win' : platform === 'linux' ? 'linux' : null
  if (!platformFlag) throw new Error(`不支持的平台: ${platform}`)
  if (args.some((arg) => ['--mac', '--win', '--linux'].includes(arg) && arg !== `--${platformFlag}`)) throw new Error('请在目标平台原生构建')
  if (args.includes('--universal') || args.includes('--ia32') || args.includes('--armv7l') || args.some((arg) => arg.startsWith('--arch'))) throw new Error('仅支持单个宿主架构原生打包')
  if (args.some((arg) => ['--x64', '--arm64'].includes(arg) && arg !== `--${arch}`)) throw new Error('目标架构必须与宿主架构一致')
  if (args.some((arg) => arg.startsWith('--config.artifactName') || arg.startsWith('-c.artifactName'))) throw new Error('安装包名称由统一入口生成')
  const normalized = [...args]
  if (!normalized.includes(`--${platformFlag}`)) normalized.push(`--${platformFlag}`)
  if (!normalized.includes(`--${arch}`)) normalized.push(`--${arch}`)
  return { os: platformFlag === 'mac' ? 'macos' : platformFlag, arch, artifactArch: arch === 'x64' ? 'amd64' : 'arm64', args: normalized }
}

export function artifactNamePattern(target: PackagingTarget): string {
  return `Locus-\${version}-${target.os}-${target.artifactArch}.\${ext}`
}
