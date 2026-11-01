/**
 * Antigravity (Google 订阅) OAuth 登录服务。
 *
 * 自研 Google OAuth 授权码流（Pi SDK 无内置 antigravity provider）：
 * - 主进程起本地 loopback 回调服务（临时端口，尽量双栈绑定 localhost）；
 * - 通过 shell.openExternal 打开 Google 授权页，回调服务接收授权码；
 * - 浏览器无法回连 localhost 时，支持把地址栏完整回调地址粘贴进 Locus；
 * - 成功后链式完成 userinfo 展示与 loadCodeAssist 项目解析。
 *
 * token 的加密存储与过期刷新由上层（channel-manager）负责，本服务只封装
 * 「跑一次登录流程」与「取消」两个操作。
 */

import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { randomUUID } from 'node:crypto'
import { shell } from 'electron'
import {
  buildAntigravityAuthUrl,
  exchangeAntigravityCode,
  fetchAntigravityUserInfo,
  parseAntigravityCallbackUrl,
  resolveAntigravityProjectId,
  type GoogleUserInfo,
} from './antigravity-api'
import { getEffectiveProxyUrl } from './proxy-settings-service'

/** 登录结果（expires 已从秒转换为 Unix 毫秒）。 */
export interface AntigravityLoginOutcome {
  access: string
  refresh: string
  expires: number
  projectId?: string
  accountId?: string
}

export interface AntigravityLoginCallbacks {
  /** SDK 生成授权 URL 后回调，渲染层同步展示；主进程负责打开浏览器。 */
  onAuthUrl?: (url: string) => void
  /** 浏览器回调不可达时，请求用户粘贴完整回调地址。 */
  onManualInputRequest?: (request: { message: string; placeholder: string }) => void
  /** 进度消息回调。 */
  onProgress?: (message: string) => void
}

/** 进行中的登录流程句柄；同一时刻只允许一个登录流程。 */
interface ActiveAntigravityLogin {
  abort: AbortController
  cancel(): void
  submitCallbackInput(input: string): boolean
}

let activeLogin: ActiveAntigravityLogin | undefined

/** 渲染层提交手动粘贴的回调地址；仅在登录流程等待输入时有效。 */
export function submitAntigravityOAuthCallbackInput(input: string): boolean {
  return activeLogin?.submitCallbackInput(input) ?? false
}

/** 取消进行中的 Antigravity OAuth 登录流程（若有）。 */
export function cancelAntigravityOAuthLogin(): void {
  activeLogin?.cancel()
}

/** 双栈优先探测本地回调端口：`::` 双栈 → IPv4 回退。返回 { server, redirectUri }。 */
async function startLoopbackServer(): Promise<{ server: Server; redirectUri: string }> {
  const dualStack = await tryListen('::')
  if (dualStack) {
    const port = (dualStack.address() as AddressInfo).port
    return { server: dualStack, redirectUri: `http://localhost:${port}/oauth-callback` }
  }
  const ipv4 = await tryListen('127.0.0.1')
  if (ipv4) {
    const port = (ipv4.address() as AddressInfo).port
    return { server: ipv4, redirectUri: `http://127.0.0.1:${port}/oauth-callback` }
  }
  throw new Error('无法在本地启动 OAuth 回调服务（localhost 绑定失败），请检查防火墙设置后重试')
}

function tryListen(host: string): Promise<Server | null> {
  return new Promise((resolve) => {
    const server = createServer()
    server.once('error', () => resolve(null))
    server.listen({ host, port: 0, ipv6Only: false }, () => resolve(server))
  })
}

const OAUTH_SUCCESS_HTML = '<!doctype html><meta charset="utf-8"><title>Locus</title><body style="font-family:sans-serif;text-align:center;padding-top:48px"><h2>登录成功</h2><p>Antigravity 账号已授权给 Locus，可以关闭此页面。</p></body>'
const OAUTH_FAILURE_HTML = '<!doctype html><meta charset="utf-8"><title>Locus</title><body style="font-family:sans-serif;text-align:center;padding-top:48px"><h2>登录未完成</h2><p>Locus 未能接收授权结果，请返回 Locus 重试。</p></body>'

/**
 * 发起一次 Antigravity 浏览器 OAuth 登录。
 *
 * 成功返回完整凭据（含 loadCodeAssist 解析出的 projectId）；用户取消或失败则抛错。
 */
export async function loginAntigravityOAuth(callbacks?: AntigravityLoginCallbacks): Promise<AntigravityLoginOutcome> {
  if (activeLogin) {
    activeLogin.cancel()
  }

  const state = randomUUID()
  const abort = new AbortController()
  let server: Server | undefined
  let settled = false

  const cleanup = (): void => {
    server?.close()
    server = undefined
    if (activeLogin?.abort === abort) {
      activeLogin = undefined
    }
  }

  const fail = (error: Error): Error => {
    if (!settled) {
      settled = true
      cleanup()
    }
    return error
  }

  const finish = (): void => {
    if (!settled) {
      settled = true
      cleanup()
    }
  }

  // 等待回调（本地服务或手动粘贴）。拒绝后必须不再 resolve，避免悬挂 promise。
  const waitForCode = new Promise<{ code: string }>((_resolve, reject) => {
    abort.signal.addEventListener('abort', () => reject(new Error('登录已取消')), { once: true })

    activeLogin = {
      abort,
      cancel: (): void => abort.abort(),
      submitCallbackInput: (input: string): boolean => {
        if (settled || abort.signal.aborted) return false
        const parsed = parseAntigravityCallbackUrl(input, state)
        if (!parsed) return false
        if ('error' in parsed) {
          reject(new Error(parsed.error))
          return true
        }
        _resolve(parsed)
        return true
      },
    }
  })

  try {
    const loopback = await startLoopbackServer()
    server = loopback.server
    const authUrl = buildAntigravityAuthUrl(loopback.redirectUri, state)
    callbacks?.onAuthUrl?.(authUrl)
    callbacks?.onProgress?.('正在打开浏览器进行 Google 授权…')
    await shell.openExternal(authUrl).catch((error) => {
      console.error('[Antigravity OAuth] 打开浏览器失败:', error)
      callbacks?.onProgress?.('无法自动打开浏览器，请手动复制授权链接到浏览器打开。')
    })

    // 回调服务：解析第一条带 code 的 GET 请求；state 校验交由 parseAntigravityCallbackUrl。
    const serverCodePromise = new Promise<{ code: string }>((resolve, reject) => {
      server!.once('request', (req, res) => {
        const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
        if (!requestUrl.pathname.endsWith('/oauth-callback')) {
          res.writeHead(404).end()
          return
        }
        const respond = (ok: boolean): void => {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(ok ? OAUTH_SUCCESS_HTML : OAUTH_FAILURE_HTML)
        }
        const parsed = parseAntigravityCallbackUrl(requestUrl.toString(), state)
        if (parsed && 'code' in parsed) {
          respond(true)
          resolve(parsed)
        } else {
          respond(false)
          reject(new Error(parsed && 'error' in parsed ? parsed.error : '回调请求缺少授权码'))
        }
      })
      abort.signal.addEventListener('abort', () => reject(new Error('登录已取消')), { once: true })
    })

    const proxyUrl = await getEffectiveProxyUrl()
    // 始终提供手动粘贴入口：代理、防火墙或浏览器异常都可能让浏览器无法回连
    // localhost；渲染层默认折叠该入口，提示文案按是否配置代理微调。
    callbacks?.onManualInputRequest?.({
      message: proxyUrl
        ? '检测到已配置代理：若浏览器授权后提示「无法访问 localhost」，请把 localhost 加入系统代理直连列表，或把浏览器地址栏中的完整回调地址粘贴到这里。'
        : '若浏览器授权后未能自动跳回 Locus，可把浏览器地址栏中的完整回调地址粘贴到这里完成登录。',
      placeholder: 'http://localhost:<port>/oauth-callback?state=…&code=…',
    })

    // 任一路径先到先得；手动粘贴与服务回调共用同一 state 校验。
    // 落选分支的 rejection 需提前标记已处理，避免 abort 后触发 unhandledRejection。
    const swallowRejection = (promise: Promise<{ code: string }>): void => {
      promise.catch(() => undefined)
    }
    swallowRejection(serverCodePromise)
    swallowRejection(waitForCode)

    let timeoutTimer: NodeJS.Timeout | undefined
    const timeoutPromise = new Promise<never>((_, reject) => {
      // 10 分钟未完成自动超时，避免回调服务长期占用端口。
      timeoutTimer = setTimeout(() => reject(new Error('登录超时（10 分钟未完成授权）')), 10 * 60_000)
    })
    abort.signal.addEventListener('abort', () => {
      if (timeoutTimer) clearTimeout(timeoutTimer)
    }, { once: true })

    try {
      const received = await Promise.race([serverCodePromise, waitForCode, timeoutPromise])
      finish()
      return await completeLogin(received, loopback, abort, callbacks)
    } finally {
      if (timeoutTimer) clearTimeout(timeoutTimer)
    }
  } catch (error) {
    throw fail(error instanceof Error ? error : new Error(String(error)))
  }
}

/** 授权码换取凭据、解析身份与项目的收尾流程。 */
async function completeLogin(
  received: { code: string },
  loopback: { redirectUri: string },
  abort: AbortController,
  callbacks?: AntigravityLoginCallbacks,
): Promise<AntigravityLoginOutcome> {
  callbacks?.onProgress?.('已收到授权码，正在换取凭据…')
  const token = await exchangeAntigravityCode(received.code, loopback.redirectUri, { signal: abort.signal })
  if (!token.refresh_token) {
    throw new Error('Google 未返回 refresh_token：请先在 Google 账号设置中撤销 Locus / Antigravity 的授权后重试')
  }

  const userInfo: GoogleUserInfo | undefined = await fetchAntigravityUserInfo(token.access_token, { signal: abort.signal })
  callbacks?.onProgress?.('正在解析 Antigravity 项目信息…')
  const projectId = await resolveAntigravityProjectId(token.access_token, { signal: abort.signal })
  if (!projectId) {
    callbacks?.onProgress?.('未能解析 Antigravity 项目信息（账号可能未开通 Antigravity 资格），Agent 运行时可能报错')
  }

  return {
    access: token.access_token,
    refresh: token.refresh_token,
    expires: Date.now() + token.expires_in * 1000,
    ...(projectId ? { projectId } : {}),
    ...(userInfo?.email ? { accountId: userInfo.email } : {}),
  }
}
