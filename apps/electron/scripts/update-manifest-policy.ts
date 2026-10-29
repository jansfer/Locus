export interface UpdateFile {
  url: string
  sha512: string
  size: number
}
export interface MergedUpdateManifest {
  version: string
  files: UpdateFile[]
  path: string
  sha512: string
  releaseDate: string
}

/** 从各架构原始清单取校验值，绝不通过改名猜测或复用另一架构的 hash。 */
export function mergeUpdateManifests(os: 'win' | 'macos', version: string, inputs: readonly unknown[]): MergedUpdateManifest {
  const files: UpdateFile[] = []
  const extension = os === 'win' ? 'exe' : 'zip'
  for (const input of inputs) {
    if (!input || typeof input !== 'object' || !('version' in input) || input.version !== version || !('files' in input) || !Array.isArray(input.files)) throw new Error('更新清单版本或结构无效')
    for (const value of input.files as unknown[]) {
      if (!value || typeof value !== 'object' || !('url' in value) || typeof value.url !== 'string') throw new Error('更新文件无效')
      if (!value.url.endsWith(`.${extension}`)) continue
      if (!['amd64', 'arm64'].some((arch) => value.url === `Locus-${version}-${os}-${arch}.${extension}`)) throw new Error(`更新文件名不匹配: ${value.url}`)
      if (!('sha512' in value) || typeof value.sha512 !== 'string' || Buffer.from(value.sha512, 'base64').length !== 64 || Buffer.from(value.sha512, 'base64').toString('base64') !== value.sha512) throw new Error('SHA-512 无效')
      if (!('size' in value) || typeof value.size !== 'number' || !Number.isSafeInteger(value.size) || value.size <= 0) throw new Error('更新文件大小无效')
      files.push({ url: value.url, sha512: value.sha512, size: value.size })
    }
  }
  const ordered = ['amd64', 'arm64'].map((arch) => {
    const matches = files.filter((file) => file.url === `Locus-${version}-${os}-${arch}.${extension}`)
    if (matches.length !== 1) throw new Error(`更新文件缺失或重复: ${os}-${arch}`)
    return matches[0]!
  })
  return { version, files: ordered, path: ordered[0]!.url, sha512: ordered[0]!.sha512, releaseDate: new Date().toISOString() }
}
