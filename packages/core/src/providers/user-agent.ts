/**
 * User-Agent 中的可追溯追溯链接。
 *
 * 注意：UA 前缀仍保留 `Proma/`，因为部分第三方渠道（如 Kimi Coding Plan）
 * 按 `Proma/` 前缀做服务端白名单校验，改成新名称会导致这些渠道不可用。
 * 本常量仅控制括号内的仓库地址。
 */
const PROMA_REPO_URL = 'https://github.com/jansfer/Locus'

let _promaVersion = '0.0.0'

export function setPromaVersion(version: string): void {
  _promaVersion = version
}

export function getPromaVersion(): string {
  return _promaVersion
}

export function getPromaUserAgent(version?: string): string {
  const v = version ?? _promaVersion
  return `Proma/${v} (+${PROMA_REPO_URL})`
}
