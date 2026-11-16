/**
 * Antigravity (Google 订阅) 协议客户端。
 *
 * 集中维护 Antigravity / Cloud Code v1internal 的协议事实：
 * - Google OAuth（授权码 + refresh）换 access token；
 * - loadCodeAssist 解析 cloudaicompanionProject；
 * - fetchAvailableModels 拉取模型目录；
 * - v1internal 请求信封与 requestId 形态。
 *
 * 协议参数来自公开接口行为观测（参考 Antigravity-Manager 等社区实现的端点与
 * 报文形状），全部代码为本项目独立实现；端点可能随 Google 侧调整，集中在此
 * 便于跟进。所有网络函数均接受 proxyUrl，复用 Locus 统一的代理 fetch。
 */

import { createHash, randomUUID } from 'node:crypto'
import { getFetchFn } from './proxy-fetch'

/** Google OAuth 授权端点。 */
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
/** Google OAuth token 端点。 */
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
/** Google 用户信息端点（登录后展示账号身份）。 */
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

/**
 * Antigravity 官方公开 OAuth client（内嵌于公开 IDE，社区工具通用）。
 * 属于协议接入事实，不参与本项目署名。
 */
export const ANTIGRAVITY_OAUTH_CLIENT_ID =
  '1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com'
export const ANTIGRAVITY_OAUTH_CLIENT_SECRET = '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'

/** OAuth scopes：offline 换 refresh_token，cloud-platform 用于 Cloud Code API。 */
export const ANTIGRAVITY_OAUTH_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/cclog',
  'https://www.googleapis.com/auth/experimentsandconfigs',
].join(' ')

/**
 * Cloud Code v1internal 端点（fallback 顺序：daily → sandbox → prod）。
 *
 * sandbox 集群对非美区 IP 可能返回 400 FAILED_PRECONDITION，需要继续降级，
 * 因此 400 也视为该端点失败（见 shouldTryNextEndpoint）。
 */
export const ANTIGRAVITY_V1_INTERNAL_ENDPOINTS = [
  'https://daily-cloudcode-pa.googleapis.com/v1internal',
  'https://daily-cloudcode-pa.sandbox.googleapis.com/v1internal',
  'https://cloudcode-pa.googleapis.com/v1internal',
] as const

/**
 * 出站 UA 必须包含 antigravity 客户端标识，否则上游返回 403。
 * 这里对齐官方语言服务 Hub 的出站签名形态（版本与 CL 为官方当前发布值）。
 */
export const ANTIGRAVITY_HUB_VERSION = '2.23.1'
export const ANTIGRAVITY_HUB_CL = '998881661'

/** 构造 v1internal 出站 User-Agent：antigravity/hub/<ver> (aidev_client; os_type=…; arch=…; cl=…)。 */
export function buildAntigravityEgressUserAgent(platform: NodeJS.Platform = process.platform, arch: string = process.arch): string {
  const osType = platform === 'darwin' ? 'darwin' : platform === 'win32' ? 'windows' : 'linux'
  const archType = arch === 'arm64' ? 'arm64' : 'x86_64'
  return `antigravity/hub/${ANTIGRAVITY_HUB_VERSION} (aidev_client; os_type=${osType}; arch=${archType}; cl=${ANTIGRAVITY_HUB_CL})`
}

/** 构造 OAuth token 端点使用的 UA（对齐官方 IDE 的 vscode/Antigravity 形态）。 */
export function buildAntigravityOAuthUserAgent(): string {
  return `vscode/1.99.0 (Antigravity/${ANTIGRAVITY_HUB_VERSION})`
}

/**
 * 构造官方五段式 requestId：agent/<conversation>/<unixMs>/<trajectory>/<step>。
 *
 * - conversation：sessionKey 的 sha256 前 16 位，稳定标识同一会话；
 * - trajectory：每请求唯一的 8 位随机段，与 unixMs 共同保证幂等隔离；
 * - step：contents 长度（第几轮），由调用方传入。
 */
export function buildAntigravityRequestId(sessionKey: string, step: number): string {
  const conversation = createHash('sha256').update(sessionKey).digest('hex').slice(0, 16)
  const trajectory = randomUUID().replaceAll('-', '').slice(0, 8)
  return `agent/${conversation}/${Date.now()}/${trajectory}/${step}`
}

/** Gemini GenerateContentRequest（v1internal request 字段的内容，此处保持宽松结构）。 */
export type AntigravityGeminiRequest = Record<string, unknown>

/**
 * v1internal 请求信封。
 *
 * - requestType: 'agent' 仅在携带工具定义或工具交互时注入，普通问答不注入；
 * - userAgent 为出站签名，与 HTTP 头 UA 保持一致。
 */
export function buildV1InternalEnvelope(input: {
  project: string
  requestId: string
  model: string
  request: AntigravityGeminiRequest
  userAgent: string
  requestType?: 'agent'
}): Record<string, unknown> {
  const envelope: Record<string, unknown> = {
    project: input.project,
    requestId: input.requestId,
    request: input.request,
    model: input.model,
    userAgent: input.userAgent,
  }
  if (input.requestType) {
    envelope.requestType = input.requestType
  }
  return envelope
}

/** Google OAuth token 响应。 */
export interface GoogleTokenResponse {
  access_token: string
  expires_in: number
  token_type?: string
  refresh_token?: string
  id_token?: string
}

/** Google 用户信息（登录身份展示用）。 */
export interface GoogleUserInfo {
  email: string
  name?: string
  picture?: string
}

/** fetchAvailableModels 返回的单个模型条目（仅保留 Locus 需要的字段）。 */
export interface AntigravityAvailableModel {
  displayName?: string
  model?: string
  modelProvider?: string
  supportsImages?: boolean
  supportsThinking?: boolean
  thinkingLevel?: string
  maxOutputTokens?: number
  recommended?: boolean
  /** 官方内部任务模型标记（chat_/tab_ 等条目），不应进入用户渠道。 */
  isInternal?: boolean
}

/** 判断该 HTTP 状态下是否应尝试下一个端点（5xx / 408 / 404 / sandbox 的 400）。 */
export function shouldTryNextAntigravityEndpoint(status: number, endpointUrl: string): boolean {
  if (status === 408 || status === 404 || status >= 500) return true
  if (status === 400 && endpointUrl.includes('sandbox')) return true
  return false
}

/**
 * 显式思考档位后缀（-high/-medium/-low/-extra-low/-max）。
 *
 * 这类模型 ID 本身已固定思考深度：上游不再接受客户端指定的 thinkingLevel，
 * 因此在请求中不叠加 thinkingConfig，UI 也不展示思考档位选择。
 */
export const ANTIGRAVITY_TIER_SUFFIX = /-(?:extra-low|high|medium|low|max)$/i

/** 是否为固定思考档位变体。 */
export function isAntigravityTierVariant(modelId: string | undefined): boolean {
  const id = modelId?.trim().toLowerCase()
  return Boolean(id && ANTIGRAVITY_TIER_SUFFIX.test(id))
}

interface AntigravityRequestOptions {
  proxyUrl?: string
  signal?: AbortSignal
}

/** 取消信号与请求超时同时生效，避免调用方传 signal 后丢失超时。 */
function withRequestTimeout(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs)
  return signal ? AbortSignal.any([signal, timeout]) : timeout
}

/** 交换授权码为 token（登录第二步）。 */
export async function exchangeAntigravityCode(
  code: string,
  redirectUri: string,
  options?: AntigravityRequestOptions,
): Promise<GoogleTokenResponse> {
  const fetchFn = getFetchFn(options?.proxyUrl)
  const response = await fetchFn(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': buildAntigravityOAuthUserAgent(),
    },
    body: new URLSearchParams({
      client_id: ANTIGRAVITY_OAUTH_CLIENT_ID,
      client_secret: ANTIGRAVITY_OAUTH_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
    signal: withRequestTimeout(options?.signal, 30_000),
  })

  const bodyText = await response.text()
  if (!response.ok) {
    throw new Error(`Antigravity 授权码交换失败 (HTTP ${response.status}): ${summarizeErrorBody(bodyText)}`)
  }
  return parseJsonBody<GoogleTokenResponse>(bodyText, 'Antigravity 授权码交换响应')
}

/** 用 refresh token 换新 access token；Google 未轮换 refresh token 时响应不含该字段。 */
export async function refreshAntigravityAccessToken(
  refreshToken: string,
  options?: AntigravityRequestOptions,
): Promise<GoogleTokenResponse> {
  const fetchFn = getFetchFn(options?.proxyUrl)
  const response = await fetchFn(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': buildAntigravityOAuthUserAgent(),
    },
    body: new URLSearchParams({
      client_id: ANTIGRAVITY_OAUTH_CLIENT_ID,
      client_secret: ANTIGRAVITY_OAUTH_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
    signal: withRequestTimeout(options?.signal, 30_000),
  })

  const bodyText = await response.text()
  if (!response.ok) {
    throw new Error(`Antigravity 登录刷新失败 (HTTP ${response.status}): ${summarizeErrorBody(bodyText)}`)
  }
  return parseJsonBody<GoogleTokenResponse>(bodyText, 'Antigravity 刷新响应')
}

/** 获取登录用户信息（仅展示用途，失败不阻断登录）。 */
export async function fetchAntigravityUserInfo(
  accessToken: string,
  options?: AntigravityRequestOptions,
): Promise<GoogleUserInfo | undefined> {
  const fetchFn = getFetchFn(options?.proxyUrl)
  try {
    const response = await fetchFn(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: withRequestTimeout(options?.signal, 15_000),
    })
    if (!response.ok) return undefined
    const data = parseJsonBody<Partial<GoogleUserInfo>>(await response.text(), 'Google 用户信息')
    return typeof data.email === 'string' && data.email ? { email: data.email, name: data.name, picture: data.picture } : undefined
  } catch {
    return undefined
  }
}

/**
 * 调用 loadCodeAssist 解析 cloudaicompanionProject（三端点 fallback）。
 *
 * 返回 null 表示三端点均不可用或账号无资格；错误信息保留最后一次响应摘要。
 */
export async function resolveAntigravityProjectId(
  accessToken: string,
  options?: AntigravityRequestOptions,
): Promise<string | null> {
  const fetchFn = getFetchFn(options?.proxyUrl)
  const userAgent = buildAntigravityEgressUserAgent()
  let lastError = 'loadCodeAssist 所有端点均不可用'

  for (const base of ANTIGRAVITY_V1_INTERNAL_ENDPOINTS) {
    try {
      const response = await fetchFn(`${base}:loadCodeAssist`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': userAgent,
        },
        body: JSON.stringify({ metadata: { ideType: 'ANTIGRAVITY' } }),
        signal: withRequestTimeout(options?.signal, 20_000),
      })

      if (response.ok) {
        const data = parseJsonBody<{ cloudaicompanionProject?: string }>(await response.text(), 'loadCodeAssist 响应')
        if (typeof data.cloudaicompanionProject === 'string' && data.cloudaicompanionProject) {
          return data.cloudaicompanionProject
        }
        return null
      }
      lastError = `loadCodeAssist ${base} 返回 HTTP ${response.status}`
      if (!shouldTryNextAntigravityEndpoint(response.status, base)) {
        return null
      }
    } catch (error) {
      options?.signal?.throwIfAborted()
      lastError = `loadCodeAssist ${base} 请求失败: ${error instanceof Error ? error.message : String(error)}`
    }
  }
  console.warn('[Antigravity]', lastError)
  return null
}

/** 调用 fetchAvailableModels 拉取模型目录（三端点 fallback）。 */
export async function fetchAntigravityAvailableModels(
  accessToken: string,
  options?: AntigravityRequestOptions,
): Promise<Record<string, AntigravityAvailableModel>> {
  const fetchFn = getFetchFn(options?.proxyUrl)
  const userAgent = buildAntigravityEgressUserAgent()
  let lastError = 'fetchAvailableModels 所有端点均不可用'

  for (const base of ANTIGRAVITY_V1_INTERNAL_ENDPOINTS) {
    try {
      const response = await fetchFn(`${base}:fetchAvailableModels`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': userAgent,
        },
        body: JSON.stringify({}),
        signal: withRequestTimeout(options?.signal, 20_000),
      })

      if (response.ok) {
        const data = parseJsonBody<{ models?: Record<string, AntigravityAvailableModel> }>(await response.text(), 'fetchAvailableModels 响应')
        if (!data?.models || typeof data.models !== 'object' || Array.isArray(data.models)) {
          throw new Error('fetchAvailableModels 响应缺少有效的 models 字段')
        }
        return data.models
      }
      lastError = `fetchAvailableModels ${base} 返回 HTTP ${response.status}`
      if (!shouldTryNextAntigravityEndpoint(response.status, base)) {
        break
      }
    } catch (error) {
      options?.signal?.throwIfAborted()
      lastError = `fetchAvailableModels ${base} 请求失败: ${error instanceof Error ? error.message : String(error)}`
    }
  }
  throw new Error(lastError)
}

/** 构造 OAuth 授权页 URL（state 防 CSRF；redirectUri 由本地回调服务提供）。 */
export function buildAntigravityAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: ANTIGRAVITY_OAUTH_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: ANTIGRAVITY_OAUTH_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  })
  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

/**
 * 从回调 URL 中提取授权码与 state。
 *
 * 兼容完整回调地址（手动粘贴场景）；非回调地址或缺少 code 时返回 null。
 */
export function parseAntigravityCallbackUrl(
  input: string,
  expectedState: string,
): { code: string } | { error: string } | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }
  const errorCode = url.searchParams.get('error')
  if (errorCode) {
    return { error: errorCode }
  }
  const code = url.searchParams.get('code')
  if (!code) return null
  const state = url.searchParams.get('state')
  if (state !== expectedState) {
    return { error: 'OAuth state 不匹配，请重新发起登录' }
  }
  return { code }
}

function parseJsonBody<T>(bodyText: string, label: string): T {
  try {
    return JSON.parse(bodyText) as T
  } catch {
    throw new Error(`${label}解析失败：响应不是有效 JSON`)
  }
}

function summarizeErrorBody(bodyText: string): string {
  const trimmed = bodyText.trim()
  if (!trimmed) return '(空响应)'
  try {
    const parsed = JSON.parse(trimmed) as { error?: string; error_description?: string }
    if (parsed.error || parsed.error_description) {
      return [parsed.error, parsed.error_description].filter(Boolean).join(': ')
    }
  } catch {
    // 非 JSON 响应，按原文摘要返回
  }
  return trimmed.length > 200 ? `${trimmed.slice(0, 200)}…` : trimmed
}
