export function expectedReleaseAssets(version: string): string[] {
  const names: string[] = ['latest.yml', 'latest-mac.yml', 'latest-linux.yml', 'latest-linux-arm64.yml']
  for (const arch of ['amd64', 'arm64']) {
    for (const [os, extensions] of [['win', ['exe']], ['macos', ['dmg', 'zip']], ['linux', ['deb', 'AppImage']]] as const) {
      for (const extension of extensions) {
        const name = `Locus-${version}-${os}-${arch}.${extension}`
        names.push(name)
        if (['exe', 'dmg', 'zip'].includes(extension)) names.push(`${name}.blockmap`)
      }
    }
  }
  return names
}

export function assertReleaseAssets(input: unknown, version: string): void {
  if (!input || typeof input !== 'object' || !('assets' in input) || !Array.isArray(input.assets)) throw new Error('Release 工件列表无效')
  const assets = input.assets as unknown[]
  for (const name of expectedReleaseAssets(version)) {
    if (!assets.some((asset) => asset && typeof asset === 'object' && 'name' in asset && asset.name === name && 'size' in asset && typeof asset.size === 'number' && asset.size > 0 && 'state' in asset && asset.state === 'uploaded')) throw new Error(`Release 缺少完整工件: ${name}`)
  }
}
