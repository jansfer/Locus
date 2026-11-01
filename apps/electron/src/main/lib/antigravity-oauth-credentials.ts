/**
 * 跨 Agent query 的 Antigravity OAuth refresh 协调器。
 *
 * 与 xAI 相同：Antigravity 的 access token 可能在长会话执行中过期，多个并行
 * 会话不能各自消费旧 refresh token，必须按 Locus channelId 串行刷新。
 */

import type { AntigravityOAuthCredentials } from '@proma/shared'

const inflightCredentialRefreshes = new Map<string, Promise<AntigravityOAuthCredentials>>()
const latestCredentialsByChannel = new Map<string, AntigravityOAuthCredentials>()

/**
 * 记录最新凭据。持久化写入调用方应传 force=true；新建 query 的旧快照不会覆盖
 * 已被另一个运行中 query 刷新的凭据。
 */
export function rememberAntigravityOAuthCredentials(
  channelId: string,
  credentials: AntigravityOAuthCredentials,
  force = false,
): AntigravityOAuthCredentials {
  const existing = latestCredentialsByChannel.get(channelId)
  if (force || !existing || credentials.expires > existing.expires) {
    latestCredentialsByChannel.set(channelId, credentials)
    return credentials
  }
  return existing
}

/**
 * 用同一个 channelId 串行刷新 Antigravity OAuth，并让并发调用复用刚换出的凭据。
 * refresh 回调只会由真正发起刷新的一方执行。
 */
export async function refreshAntigravityOAuthCredentialsSerial(
  channelId: string,
  fallback: AntigravityOAuthCredentials,
  refresh: (credentials: AntigravityOAuthCredentials) => Promise<AntigravityOAuthCredentials>,
): Promise<AntigravityOAuthCredentials> {
  const inflight = inflightCredentialRefreshes.get(channelId)
  if (inflight) return inflight

  const latest = latestCredentialsByChannel.get(channelId)
  if (latest
    && (latest.access !== fallback.access || latest.refresh !== fallback.refresh)
    && latest.expires > Date.now()) {
    return latest
  }

  const refreshPromise = (async () => {
    const current = latestCredentialsByChannel.get(channelId) ?? fallback
    const refreshed = await refresh(current)
    return rememberAntigravityOAuthCredentials(channelId, refreshed, true)
  })()
  inflightCredentialRefreshes.set(channelId, refreshPromise)
  try {
    return await refreshPromise
  } finally {
    if (inflightCredentialRefreshes.get(channelId) === refreshPromise) {
      inflightCredentialRefreshes.delete(channelId)
    }
  }
}
