/**
 * Codex OAuth 本地回调端口探测。
 *
 * Pi SDK 的 Codex 浏览器登录把回调服务器绑定在 `PI_OAUTH_CALLBACK_HOST`（默认
 * `127.0.0.1`）的 1455 端口，而浏览器重定向到 `http://localhost:1455/auth/callback`。
 * Windows 下 `localhost` 常优先解析为 `::1`，系统代理也不会在连接失败后回退到
 * IPv4，导致浏览器提示「localhost 拒绝连接」。
 *
 * 这里在登录前探测端口：优先确认双栈（`::`，同时接受 IPv4/IPv6 loopback）可绑定，
 * 让回调对 `localhost` 的两种解析结果都可达；端口被占用时给出明确错误，
 * 避免 Pi 静默吞掉 EADDRINUSE 后登录无限挂起。
 */

import { createServer, type AddressInfo } from 'node:net'

/** Pi SDK Codex OAuth 回调固定端口（见 pi-ai openai-codex OAuth 实现）。 */
export const CODEX_OAUTH_CALLBACK_PORT = 1455

export interface LoopbackProbeResult {
  ok: boolean
  /** 绑定失败时的 errno（EADDRINUSE / EACCES / EADDRNOTAVAIL 等） */
  errorCode?: string
}

/** 探测在指定 loopback 地址上绑定回调端口是否可行，探测套接字随即关闭。 */
export function probeLoopbackBinding(
  host: '::' | '127.0.0.1',
  port: number = CODEX_OAUTH_CALLBACK_PORT,
): Promise<LoopbackProbeResult> {
  return new Promise((resolve) => {
    const server = createServer()
    const settle = (result: LoopbackProbeResult): void => {
      server.close()
      resolve(result)
    }
    server.once('error', (error: NodeJS.ErrnoException) => {
      settle({ ok: false, errorCode: error.code })
    })
    server.listen({ host, port, ipv6Only: false }, () => {
      const address = server.address() as AddressInfo
      settle({ ok: address.port === port })
    })
  })
}

export interface CodexCallbackBindPlan {
  /**
   * 传给 Pi 的 PI_OAUTH_CALLBACK_HOST。
   * - `'::'`：双栈绑定，`localhost` 解析为 `::1` 或 `127.0.0.1` 都可达
   * - `undefined`：保持 Pi 默认（127.0.0.1），用于 IPv6 不可用的机器
   */
  bindHost: '::' | undefined
}

/** 依据探测结果生成回调绑定决策；端口被占用或被系统保留时抛出用户可读错误。 */
export async function resolveCodexCallbackBindPlan(
  probe: (host: '::' | '127.0.0.1') => Promise<LoopbackProbeResult> = probeLoopbackBinding,
): Promise<CodexCallbackBindPlan> {
  const dualStack = await probe('::')

  if (dualStack.ok) return { bindHost: '::' }

  if (dualStack.errorCode === 'EADDRINUSE') {
    throw buildPortOccupiedError()
  }

  // `::` 绑定失败的其他原因（EACCES / EADDRNOTAVAIL / EAFNOSUPPORT…）：
  // 回退到 IPv4 默认绑定前先确认 1455 在 IPv4 上可用。
  const loopback = await probe('127.0.0.1')
  if (loopback.ok) return { bindHost: undefined }
  if (loopback.errorCode === 'EADDRINUSE') throw buildPortOccupiedError()
  if (loopback.errorCode === 'EACCES') throw buildPortReservedError()
  throw new Error(`本机无法绑定 OAuth 回调端口 ${CODEX_OAUTH_CALLBACK_PORT}（${loopback.errorCode ?? '未知错误'}）`)
}

function buildPortOccupiedError(): Error {
  return new Error(
    `本地端口 ${CODEX_OAUTH_CALLBACK_PORT} 被其他程序占用，可能是上一次登录尚未结束或 Codex CLI 正在运行。` +
    '请关闭占用该端口的程序后重试，或改用设备码登录。',
  )
}

/** Windows 动态端口保留（Hyper-V/WSL）覆盖 1455 时的可操作提示。 */
function buildPortReservedError(): Error {
  return new Error(
    `本机无法绑定 OAuth 回调端口 ${CODEX_OAUTH_CALLBACK_PORT}：Windows 已把它划入动态保留范围` +
    '（Hyper-V / WSL 常见）。可在管理员终端执行「net stop winnat」再「net start winnat」清除保留后重试，' +
    '或重启电脑让保留范围重排；也可以改用设备码登录（不需要本地端口）。',
  )
}
