import type { McpOAuthProvider, McpServerEntry } from '@proma/shared'
import type { MessageKey, TranslateFn } from '@/i18n'

/** 目录卡片 description 字段的词典键（skills 域 catalog 分组）。 */
export type CatalogDescriptionKey = Extract<MessageKey, `skills.catalog.${string}.description`>
/** 目录卡片 capabilities 数组元素的词典键。 */
export type CatalogCapabilityKey = Extract<MessageKey, `skills.catalog.${string}.capabilities.${string}`>
/** 目录凭据表单可见文本（label/placeholder/helpText/acquisitionLabel）的词典键。 */
export type CatalogCredentialTextKey = Extract<MessageKey, `skills.catalog.${string}.credential.${string}`>

export type CatalogIntegrationKind = 'mcp' | 'cli' | 'guided' | 'credential'
export type CatalogAuthentication = 'none' | 'oauth' | 'api-key'

interface CatalogIntegrationBase {
  id: string
  name: string
  /** 用户可见描述；值是 skills 域词典键，渲染处用 t() 翻译。 */
  description: CatalogDescriptionKey
  /** 用户可见能力标签；元素是 skills 域词典键，渲染处用 t() 翻译。 */
  capabilities: ReadonlyArray<CatalogCapabilityKey>
  iconSlug: string
  setupUrl: string
  kind: CatalogIntegrationKind
  /** Legacy presentation hint; explicit priority controls directory order. */
  featured?: boolean
  /** Fixed catalog order; connection state never affects placement. */
  priority?: number
  placement?: 'bottom'
}

export interface CatalogMcpIntegration extends CatalogIntegrationBase {
  kind: 'mcp'
  authentication: CatalogAuthentication
  oauthProvider?: McpOAuthProvider
  serverName: string
  entry: McpServerEntry
}

export interface CatalogCliIntegration extends CatalogIntegrationBase {
  kind: 'cli'
  agentPrompt: string
}

export interface CatalogGuidedIntegration extends CatalogIntegrationBase {
  kind: 'guided'
  authType: 'api-key' | 'provider-app' | 'provider-login'
  agentPrompt: string
  /** The MCP entry created by the guided flow, when it has a stable server name. */
  serverName?: string
  /** An active workspace Skill that provides this integration without a Locus MCP entry. */
  expectedSkillSlug?: string
}

/** A fixed-token remote MCP that Locus can configure after the user supplies one credential. */
export interface CatalogCredentialIntegration extends CatalogIntegrationBase {
  kind: 'credential'
  serverName: string
  entry: McpServerEntry
  credential: {
    label: CatalogCredentialTextKey
    placeholder: CatalogCredentialTextKey
    helpText: CatalogCredentialTextKey
    acquisitionUrl: string
    acquisitionLabel: CatalogCredentialTextKey
    headerName: string
    /** 需要附加到 API Key 前的认证前缀（例如 Bearer）。 */
    valuePrefix?: string
    /** stdio MCP 的 API Key 通过此环境变量注入，远程 MCP 留空。 */
    envName?: string
    /** 凭据安全存储绑定的稳定服务 URL；stdio MCP 不会写入 mcp.json。 */
    credentialStorageUrl: string
  }
}

export type CatalogIntegration = CatalogMcpIntegration | CatalogCliIntegration | CatalogGuidedIntegration | CatalogCredentialIntegration

export type CatalogMcpConnectionStatus = 'unconfigured' | 'pending' | 'connected'
export type CatalogGuidedConnectionStatus = CatalogMcpConnectionStatus | 'skill-available'
export type CatalogCliProbeState = 'loading' | 'ready' | 'failed'
export type CatalogCliConnectionStatus = 'checking' | 'unavailable' | 'unconfigured' | 'connected'

/** 目录卡片排序优先级：已连接 > 待授权 > 未配置。 */
export function getCatalogMcpStatusRank(status: CatalogMcpConnectionStatus): number {
  if (status === 'connected') return 3
  if (status === 'pending') return 2
  return 1
}

/** Directory order is stable: priority, featured placement, then explicit bottom placement. Connection state never moves a card. */
export function compareCatalogConnectionCards(
  left: { placement?: 'bottom'; featured?: boolean; priority?: number; statusRank: number },
  right: { placement?: 'bottom'; featured?: boolean; priority?: number; statusRank: number },
): number {
  const leftPriority = left.priority ?? Number.POSITIVE_INFINITY
  const rightPriority = right.priority ?? Number.POSITIVE_INFINITY
  if (leftPriority !== rightPriority) return leftPriority - rightPriority

  const leftBottom = Number(left.placement === 'bottom')
  const rightBottom = Number(right.placement === 'bottom')
  return leftBottom - rightBottom
}

export function getCatalogMcpConnectionStatus(
  serverName: string | undefined,
  installedMcpNames: Set<string>,
  enabledMcpNames: Set<string>,
  verifiedMcpNames: Set<string>,
): CatalogMcpConnectionStatus {
  if (!serverName || !installedMcpNames.has(serverName)) return 'unconfigured'
  if (!enabledMcpNames.has(serverName) || !verifiedMcpNames.has(serverName)) return 'pending'
  return 'connected'
}

/**
 * Guided integrations normally retain the strict MCP three-state contract.
 * A provider can opt into this separate state only when its official delivery
 * mechanism is an active workspace Skill rather than an MCP server.
 */
export function getCatalogGuidedConnectionStatus(
  integration: CatalogGuidedIntegration,
  activeSkillSlugs: Set<string>,
  installedMcpNames: Set<string>,
  enabledMcpNames: Set<string>,
  verifiedMcpNames: Set<string>,
): CatalogGuidedConnectionStatus {
  if (integration.expectedSkillSlug && activeSkillSlugs.has(integration.expectedSkillSlug)) return 'skill-available'
  return getCatalogMcpConnectionStatus(integration.serverName, installedMcpNames, enabledMcpNames, verifiedMcpNames)
}

export function getCatalogMcpConnectionState(
  serverName: string | undefined,
  installedMcpNames: Set<string>,
  enabledMcpNames: Set<string>,
): { configured: boolean; enabled: boolean } {
  const configured = Boolean(serverName && installedMcpNames.has(serverName))
  return { configured, enabled: Boolean(serverName && enabledMcpNames.has(serverName)) }
}

/** Never render an unprobed or failed local CLI check as an unconfigured integration. */
export function getCatalogCliConnectionStatus(
  id: string,
  connectedCliIds: Set<string>,
  probeState: CatalogCliProbeState,
): CatalogCliConnectionStatus {
  if (probeState === 'loading') return 'checking'
  if (probeState === 'failed') return 'unavailable'
  return connectedCliIds.has(id) ? 'connected' : 'unconfigured'
}

export function getCatalogCliStatusRank(status: CatalogCliConnectionStatus): number {
  if (status === 'connected') return 3
  if (status === 'checking') return 2
  if (status === 'unavailable') return 1
  return 0
}

const remoteMcp = (url: string): McpServerEntry => ({ type: 'http', url, enabled: false })
const stdioMcp = (command: string, args: string[]): McpServerEntry => ({ type: 'stdio', command, args, enabled: false })

const MCP_CONNECTION_ACCEPTANCE_INSTRUCTION = `
最终完成形态：只有当该 MCP 已写入当前 Locus workspace 的 MCP 配置、处于启用状态，并完成真实 SDK handshake 与 listTools 验证成功后，才能显示为「已连接」或称可用；届时才可以通过 # 调用。仅在当前会话环境、OpenClaw/mcporter、临时 shell 中可用，或只安装了 Skill，都不等于 Locus MCP 已连接，必须如实说明未完成的条件。`

const CLI_CONNECTION_ACCEPTANCE_INSTRUCTION = `
最终完成形态：只有当对应官方 CLI 已完成真实认证验证，且已在当前 Locus workspace 的目录中被允许/启用后，才能显示为「已连接」。只在当前会话环境、OpenClaw/mcporter、临时 shell 中可用，或只安装了 Skill，都不等于 Locus CLI 已连接；不要猜测或伪造 CLI 状态。`

const GUIDED_CONNECTION_ACCEPTANCE_INSTRUCTION = `
完成状态必须按实际接入类型如实报告：若最终接入 MCP，只有它已写入当前 Locus workspace 的 MCP 配置、启用，并完成真实 SDK handshake 与 listTools 验证后，才能显示为「已连接」并可通过 # 调用；若最终接入 CLI，只有官方 CLI 已真实认证且已在当前 Locus workspace 的目录中被允许/启用后，才能显示为「已连接」。仅在会话环境、OpenClaw/mcporter、临时 shell 中可用，或只安装了 Skill，都不等于 Locus MCP/CLI 已连接。`

export const MCP_CREDENTIAL_SETUP_INSTRUCTION = `

如果配置需要 API Key、Access Token、授权码或其他必须由用户手动获取的内容：请使用 Locus 内置浏览器打开对应的官方获取或授权页面，先让我自行完成登录、注册、申请权限或授权。不要代替我输入密码、验证码，也不要读取或导出 Cookie、浏览器登录态或其他凭据。页面成功显示需要配置的凭据后，请让我将该凭据直接发送到当前 Agent 对话；收到后仅将其用于本次配置，绝不在回复、日志、AGENTS.md、mcp.json 或其他普通项目文件中回显或保存，并优先使用 Locus/系统提供的安全凭据存储。${MCP_CONNECTION_ACCEPTANCE_INSTRUCTION}`

const cliSetupPrompt = (name: string, setupUrl: string, settingsPath = `设置 → 远程连接 → 配置${name}`): string => `请帮我配置「${name}」。

请优先在当前 Locus 的「${settingsPath}」中完成配置，不要只给我一个网页链接，也不要自动把我切到外部网页。

官方入口：${setupUrl}

执行要求：
1. 先核验官方安装命令、认证方式、权限范围与当前环境要求；不要使用第三方安装包或猜测命令。
2. 能通过终端或当前 Locus 设置完成的步骤直接执行；需要用户登录、授权或确认时，在对应步骤停下来让我操作。
3. CLI 的 token、cookie、OAuth code 和其他敏感信息交给 CLI 自己的安全存储，不写入工作区 mcp.json、AGENTS.md、日志或普通项目文件。
4. 完成后使用官方 CLI 的 status/check 命令验证；不要把 CLI 伪装成 MCP 服务器。
5. 如果官方能力或权限不足，说明已核验事实和下一步，不要只返回链接。${CLI_CONNECTION_ACCEPTANCE_INSTRUCTION}`

const providerSetupPrompt = (name: string, setupUrl: string, authentication: string): string => `请帮我为当前 Locus 工作区配置「${name}」。

官方入口：${setupUrl}
认证方式线索：${authentication}

执行要求：
1. 先通过公开官方文档核验 MCP server URL、transport、所需 scope/权限和认证字段；不要猜测或使用非官方 endpoint。
2. 若可得到可用 MCP 配置，将非敏感 transport 配置写入当前工作区的 mcp.json；不要覆盖已有同名服务器。
3. 不要把 API Key、AppSecret、Cookie、OAuth code 或 access token 写入 mcp.json、AGENTS.md、日志或普通项目文件。需要用户在 Locus 设置中输入敏感值时，明确说明字段名与来源页面。
4. 若官方接入要求企业应用审核、管理员授权、桌面客户端登录或没有公开的 MCP 合约，停止在安全步骤处，说明已核验的事实、缺失条件和用户需要完成的操作。
5. 完成后测试 MCP 连接；仅在测试成功时启用。${MCP_CREDENTIAL_SETUP_INSTRUCTION}${GUIDED_CONNECTION_ACCEPTANCE_INSTRUCTION}`

export function buildCatalogMcpGuidePrompt(integration: CatalogMcpIntegration): string {
  const mcpUrl = integration.entry.type === 'http' || integration.entry.type === 'sse' ? integration.entry.url : '请根据官方文档核验'
  return `请帮我配置「${integration.name}」远程 MCP。

官方入口：${integration.setupUrl}
MCP URL：${mcpUrl}

执行要求：
1. 这是尚未实现 Locus 内置 OAuth 的远程 MCP；不要打开手动 MCP 编辑抽屉，也不要只给我一个网页链接。
2. 先按官方文档核验认证、scope、权限和当前客户端兼容性。
3. 需要用户登录或授权时，使用 Locus 内置浏览器打开官方页面，让用户自行完成登录、授权或获取凭据；不要代替用户输入密码、验证码，也不要读取或导出 Cookie、浏览器登录态或其他凭据。
4. 用户从官方页面取得 API Key、Access Token、授权码或其他必要配置值后，请让用户发送到当前 Agent 对话，再继续完成配置；只将其用于本次配置，优先写入 Locus/系统安全凭据存储，不要在回复、日志、AGENTS.md、mcp.json 或其他普通项目文件中回显或保存。
5. 只有完成官方认证和实际连接验证后，才写入非敏感 transport 配置并启用。${MCP_CREDENTIAL_SETUP_INSTRUCTION}`
}

const tongdaxinVipPrompt = `请帮我配置和使用「通达信」。

第一步：使用 Locus 内置浏览器打开 https://vip.tdx.com.cn/site/app/pc-mall/main.html#/page_product_mcp；不要打开手动 MCP 编辑弹窗，也不要切换到外部浏览器。

用户操作：请引导我在该网站完成注册或登录。登录完成后，基于页面和官方公开文档继续指导我找到可用的正式产品、授权入口或 MCP/Agent 接入方式。

执行要求：
1. 不要尝试读取、导出或要求我粘贴 Cookie、密码、验证码、token 或其他登录态。
2. 先核验是否存在通达信官方 MCP、CLI 或 API 契约，以及对应的权限、套餐和账户要求；不要猜测 endpoint 或安装命令。
3. 能在当前 Locus 环境完成的非敏感步骤直接执行；需要我的确认、付费订阅、实名或额外授权时清楚说明并停下。
4. 不要把敏感信息写入 mcp.json、AGENTS.md、日志或普通项目文件。
5. 完成后说明已验证的接入状态、可使用能力与后续操作。${MCP_CREDENTIAL_SETUP_INSTRUCTION}${GUIDED_CONNECTION_ACCEPTANCE_INSTRUCTION}`

// These providers have directory definitions but are intentionally withheld from
// the public MCP picker until their end-to-end connection flows are verified.
// Keep the definitions intact so re-enabling is an explicit, low-risk catalog change.
const HIDDEN_UNTIL_TESTED_INTEGRATION_IDS = new Set([
  'tongdaxin-mcp',
  'google-calendar-mcp',
  'vercel-mcp',
  'github-cli',
  'stripe-mcp',
])

export function isCatalogIntegrationVisible(integration: CatalogIntegration): boolean {
  return !HIDDEN_UNTIL_TESTED_INTEGRATION_IDS.has(integration.id)
}

export const MCP_INTEGRATION_CATALOG: CatalogIntegration[] = [
  {
    id: 'github-mcp', name: 'GitHub', iconSlug: 'github', kind: 'mcp', authentication: 'oauth', oauthProvider: 'github', serverName: 'github',
    description: 'skills.catalog.github-mcp.description',
    capabilities: ['skills.catalog.github-mcp.capabilities.repos', 'skills.catalog.github-mcp.capabilities.issues', 'skills.catalog.github-mcp.capabilities.actions'],
    setupUrl: 'https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp-in-your-ide/set-up-the-github-mcp-server',
    entry: {
      ...remoteMcp('https://api.githubcopilot.com/mcp/'),
      oauth: {
        provider: 'github',
        authorizationEndpoint: 'https://github.com/login/oauth/authorize',
        tokenEndpoint: 'https://github.com/login/oauth/access_token',
        clientSecretRequired: true,
        scopes: ['repo', 'read:org', 'read:user', 'user:email', 'read:packages', 'write:packages', 'read:project', 'project', 'gist', 'notifications'],
      },
    },
  },
  {
    id: 'notion-mcp', name: 'Notion', iconSlug: 'notion', kind: 'mcp', authentication: 'oauth', oauthProvider: 'notion', serverName: 'notion',
    description: 'skills.catalog.notion-mcp.description',
    capabilities: ['skills.catalog.notion-mcp.capabilities.pages', 'skills.catalog.notion-mcp.capabilities.db', 'skills.catalog.notion-mcp.capabilities.comments'],
    setupUrl: 'https://developers.notion.com/guides/mcp/get-started-with-mcp',
    entry: remoteMcp('https://mcp.notion.com/mcp'),
  },
  {
    id: 'google-calendar-mcp', name: 'Google 日历', iconSlug: 'googlecalendar', kind: 'mcp', authentication: 'oauth', serverName: 'google-calendar',
    description: 'skills.catalog.google-calendar-mcp.description',
    capabilities: ['skills.catalog.google-calendar-mcp.capabilities.query', 'skills.catalog.google-calendar-mcp.capabilities.create', 'skills.catalog.google-calendar-mcp.capabilities.invites'],
    setupUrl: 'https://developers.google.com/workspace/calendar/api/guides/configure-mcp-server',
    entry: remoteMcp('https://calendarmcp.googleapis.com/mcp/v1'),
  },
  {
    id: 'linear-mcp', name: 'Linear', iconSlug: 'linear', kind: 'mcp', authentication: 'oauth', serverName: 'linear',
    description: 'skills.catalog.linear-mcp.description',
    capabilities: ['skills.catalog.linear-mcp.capabilities.issues', 'skills.catalog.linear-mcp.capabilities.projects', 'skills.catalog.linear-mcp.capabilities.status'],
    setupUrl: 'https://linear.app/docs/mcp',
    entry: remoteMcp('https://mcp.linear.app/mcp'),
  },
  {
    id: 'vercel-mcp', name: 'Vercel', iconSlug: 'vercel', kind: 'mcp', authentication: 'oauth', serverName: 'vercel', placement: 'bottom',
    description: 'skills.catalog.vercel-mcp.description',
    capabilities: ['skills.catalog.vercel-mcp.capabilities.deploys', 'skills.catalog.vercel-mcp.capabilities.logs', 'skills.catalog.vercel-mcp.capabilities.analytics'],
    setupUrl: 'https://vercel.com/docs/agent-resources/vercel-mcp',
    entry: remoteMcp('https://mcp.vercel.com'),
  },
  {
    id: 'supabase-mcp', name: 'Supabase', iconSlug: 'supabase', kind: 'mcp', authentication: 'oauth', serverName: 'supabase', placement: 'bottom',
    description: 'skills.catalog.supabase-mcp.description',
    capabilities: ['skills.catalog.supabase-mcp.capabilities.sql', 'skills.catalog.supabase-mcp.capabilities.auth', 'skills.catalog.supabase-mcp.capabilities.projects'],
    setupUrl: 'https://supabase.com/docs/guides/ai-tools/mcp',
    entry: remoteMcp('https://mcp.supabase.com/mcp'),
  },
  {
    id: 'stripe-mcp', name: 'Stripe', iconSlug: 'stripe', kind: 'mcp', authentication: 'oauth', serverName: 'stripe', placement: 'bottom',
    description: 'skills.catalog.stripe-mcp.description',
    capabilities: ['skills.catalog.stripe-mcp.capabilities.docs', 'skills.catalog.stripe-mcp.capabilities.accounts', 'skills.catalog.stripe-mcp.capabilities.payments'],
    setupUrl: 'https://docs.stripe.com/mcp',
    entry: remoteMcp('https://mcp.stripe.com'),
  },
  {
    id: 'tongdaxin-mcp', name: '通达信 MCP', iconSlug: 'asset:tongdaxin', kind: 'guided', authType: 'provider-login',
    description: 'skills.catalog.tongdaxin-mcp.description',
    capabilities: ['skills.catalog.tongdaxin-mcp.capabilities.market', 'skills.catalog.tongdaxin-mcp.capabilities.auth', 'skills.catalog.tongdaxin-mcp.capabilities.contract'],
    setupUrl: 'https://vip.tdx.com.cn/site/app/pc-mall/main.html#/page_product_mcp',
    agentPrompt: tongdaxinVipPrompt,
  },
  {
    id: 'wecom-cli', name: '企业微信 CLI', iconSlug: 'asset:wecom', kind: 'cli', featured: true, priority: 3,
    description: 'skills.catalog.wecom-cli.description',
    capabilities: ['skills.catalog.wecom-cli.capabilities.collab', 'skills.catalog.wecom-cli.capabilities.messages', 'skills.catalog.wecom-cli.capabilities.cli'],
    setupUrl: 'https://open.work.weixin.qq.com/help2/pc/21676',
    agentPrompt: cliSetupPrompt('企业微信 CLI', 'https://open.work.weixin.qq.com/help2/pc/21676', '设置 → 远程连接 → 配置企业微信 CLI'),
  },
  {
    id: 'dingtalk-cli', name: '钉钉 CLI', iconSlug: 'asset:dingtalk', kind: 'cli', featured: true, priority: 2,
    description: 'skills.catalog.dingtalk-cli.description',
    capabilities: ['skills.catalog.dingtalk-cli.capabilities.assistant', 'skills.catalog.dingtalk-cli.capabilities.codegen', 'skills.catalog.dingtalk-cli.capabilities.tools'],
    setupUrl: 'https://open.dingtalk.com/document/development/dingtalk-cli-performing-tasks-within',
    agentPrompt: cliSetupPrompt('钉钉 CLI', 'https://open.dingtalk.com/document/development/dingtalk-cli-performing-tasks-within', '设置 → 远程连接 → 配置钉钉 CLI'),
  },
  {
    id: 'exa-search-mcp', name: 'Exa Search', iconSlug: 'asset:exa', kind: 'credential', priority: 6,
    description: 'skills.catalog.exa-search-mcp.description',
    capabilities: ['skills.catalog.exa-search-mcp.capabilities.search', 'skills.catalog.exa-search-mcp.capabilities.extract'],
    setupUrl: 'https://dashboard.exa.ai/api-keys',
    serverName: 'exa',
    entry: remoteMcp('https://mcp.exa.ai/mcp'),
    credential: {
      label: 'skills.catalog.exa-search-mcp.credential.label',
      placeholder: 'skills.catalog.exa-search-mcp.credential.placeholder',
      helpText: 'skills.catalog.exa-search-mcp.credential.helpText',
      acquisitionUrl: 'https://dashboard.exa.ai/api-keys',
      acquisitionLabel: 'skills.catalog.exa-search-mcp.credential.acquisitionLabel',
      headerName: 'x-api-key',
      credentialStorageUrl: 'https://mcp.exa.ai/mcp',
    },
  },
  {
    id: 'brave-search-mcp', name: 'Brave Search', iconSlug: 'asset:brave', kind: 'credential', priority: 5,
    description: 'skills.catalog.brave-search-mcp.description',
    capabilities: ['skills.catalog.brave-search-mcp.capabilities.webNews', 'skills.catalog.brave-search-mcp.capabilities.imageVideo', 'skills.catalog.brave-search-mcp.capabilities.local'],
    setupUrl: 'https://api-dashboard.search.brave.com/app/keys',
    serverName: 'brave-search',
    entry: stdioMcp('npx', ['-y', '@brave/brave-search-mcp-server', '--transport', 'stdio']),
    credential: {
      label: 'skills.catalog.brave-search-mcp.credential.label',
      placeholder: 'skills.catalog.brave-search-mcp.credential.placeholder',
      helpText: 'skills.catalog.brave-search-mcp.credential.helpText',
      acquisitionUrl: 'https://api-dashboard.search.brave.com/app/keys',
      acquisitionLabel: 'skills.catalog.brave-search-mcp.credential.acquisitionLabel',
      headerName: '',
      envName: 'BRAVE_API_KEY',
      credentialStorageUrl: 'https://api.search.brave.com/',
    },
  },
  {
    id: 'tavily-search-mcp', name: 'Tavily Search', iconSlug: 'asset:tavily', kind: 'credential', priority: 4,
    description: 'skills.catalog.tavily-search-mcp.description',
    capabilities: ['skills.catalog.tavily-search-mcp.capabilities.search', 'skills.catalog.tavily-search-mcp.capabilities.extract', 'skills.catalog.tavily-search-mcp.capabilities.research'],
    setupUrl: 'https://app.tavily.com/home',
    serverName: 'tavily-search',
    entry: remoteMcp('https://mcp.tavily.com/mcp'),
    credential: {
      label: 'skills.catalog.tavily-search-mcp.credential.label',
      placeholder: 'skills.catalog.tavily-search-mcp.credential.placeholder',
      helpText: 'skills.catalog.tavily-search-mcp.credential.helpText',
      acquisitionUrl: 'https://app.tavily.com/home',
      acquisitionLabel: 'skills.catalog.tavily-search-mcp.credential.acquisitionLabel',
      headerName: 'Authorization',
      valuePrefix: 'Bearer ',
      credentialStorageUrl: 'https://mcp.tavily.com/mcp',
    },
  },
  {
    id: 'tencent-docs-mcp', name: '腾讯文档', iconSlug: 'asset:tencent-docs', kind: 'credential', priority: 10, placement: 'bottom',
    description: 'skills.catalog.tencent-docs-mcp.description',
    capabilities: ['skills.catalog.tencent-docs-mcp.capabilities.docs', 'skills.catalog.tencent-docs-mcp.capabilities.token', 'skills.catalog.tencent-docs-mcp.capabilities.verify'],
    setupUrl: 'https://docs.qq.com/open/document/mcp/get-token',
    serverName: 'tencent-docs',
    entry: remoteMcp('https://docs.qq.com/openapi/mcp'),
    credential: {
      label: 'skills.catalog.tencent-docs-mcp.credential.label',
      placeholder: 'skills.catalog.tencent-docs-mcp.credential.placeholder',
      helpText: 'skills.catalog.tencent-docs-mcp.credential.helpText',
      acquisitionUrl: 'https://docs.qq.com/open/document/mcp/get-token',
      acquisitionLabel: 'skills.catalog.tencent-docs-mcp.credential.acquisitionLabel',
      headerName: 'Authorization',
      credentialStorageUrl: 'https://docs.qq.com/openapi/mcp',
    },
  },
  {
    id: 'ctrip-wendao', name: '携程问道', iconSlug: 'asset:ctrip', kind: 'guided', authType: 'api-key', priority: 11,
    description: 'skills.catalog.ctrip-wendao.description',
    capabilities: ['skills.catalog.ctrip-wendao.capabilities.travel', 'skills.catalog.ctrip-wendao.capabilities.planning', 'skills.catalog.ctrip-wendao.capabilities.skill'],
    setupUrl: 'https://ctrip.com/wendao/openclaw',
    expectedSkillSlug: 'ctrip-wendao',
    agentPrompt: providerSetupPrompt('携程问道', 'https://ctrip.com/wendao/openclaw', '携程问道开放平台 API Token；获取后安装官方 Skill 封装并验证'),
  },
  {
    id: 'baidu-netdisk', name: '百度网盘', iconSlug: 'asset:baidu-netdisk', kind: 'guided', authType: 'api-key',
    description: 'skills.catalog.baidu-netdisk.description',
    capabilities: ['skills.catalog.baidu-netdisk.capabilities.files', 'skills.catalog.baidu-netdisk.capabilities.sharing', 'skills.catalog.baidu-netdisk.capabilities.oauth'],
    setupUrl: 'https://pan.baidu.com/union/doc/mcp-server/%E4%BD%BF%E7%94%A8%E6%A6%82%E8%BF%B0/',
    agentPrompt: providerSetupPrompt('百度网盘', 'https://pan.baidu.com/union/doc/mcp-server/%E4%BD%BF%E7%94%A8%E6%A6%82%E8%BF%B0/', '百度网盘 OAuth Access Token；SSE 模式不支持上传，上传需官方本地 stdio 方案'),
  },
  {
    id: 'qichacha-mcp', name: '企查查', iconSlug: 'asset:qichacha', kind: 'guided', authType: 'api-key',
    description: 'skills.catalog.qichacha-mcp.description',
    capabilities: ['skills.catalog.qichacha-mcp.capabilities.business', 'skills.catalog.qichacha-mcp.capabilities.risk', 'skills.catalog.qichacha-mcp.capabilities.api'],
    setupUrl: 'https://agent.qcc.com/',
    // 官方按业务域拆分 MCP；公司信息服务是安装流程写入的首个稳定 server key。
    serverName: 'qcc-company',
    agentPrompt: providerSetupPrompt('企查查', 'https://agent.qcc.com/', '开放平台 API Key 或企业应用授权'),
  },

  {
    id: 'eastmoney-miaoxiang', name: '东方财富妙想', iconSlug: 'lucide-trending-up', kind: 'guided', authType: 'api-key',
    description: 'skills.catalog.eastmoney-miaoxiang.description',
    capabilities: ['skills.catalog.eastmoney-miaoxiang.capabilities.skills', 'skills.catalog.eastmoney-miaoxiang.capabilities.market', 'skills.catalog.eastmoney-miaoxiang.capabilities.auth'],
    setupUrl: 'https://choice.eastmoney.com/mcp/',
    serverName: 'eastmoney-miaoxiang',
    agentPrompt: providerSetupPrompt('东方财富妙想', 'https://choice.eastmoney.com/mcp/', '东方财富妙想 Skills API Key 或平台预授权'),
  },
  {
    id: 'github-cli', name: 'GitHub CLI', iconSlug: 'github', kind: 'cli',
    description: 'skills.catalog.github-cli.description',
    capabilities: ['skills.catalog.github-cli.capabilities.pr', 'skills.catalog.github-cli.capabilities.automation', 'skills.catalog.github-cli.capabilities.auth'],
    setupUrl: 'https://cli.github.com/',
    agentPrompt: cliSetupPrompt('GitHub CLI', 'https://cli.github.com/', '设置 → 远程连接 → 配置 GitHub CLI'),
  },
  {
    id: 'feishu-cli', name: '飞书 CLI', iconSlug: 'asset:feishu', kind: 'cli', priority: 1,
    description: 'skills.catalog.feishu-cli.description',
    capabilities: ['skills.catalog.feishu-cli.capabilities.docs', 'skills.catalog.feishu-cli.capabilities.bitable', 'skills.catalog.feishu-cli.capabilities.profile'],
    setupUrl: 'https://www.feishu.cn/feishu-cli',
    agentPrompt: cliSetupPrompt('飞书 CLI', 'https://www.feishu.cn/feishu-cli', '设置 → 远程连接 → 配置飞书 CLI'),
  },
]

/**
 * 只有实际渲染的目录卡才能占用“目录服务器名”。被暂时隐藏的目录项不能吞掉
 * Agent 已写入的同名工作区 MCP，否则待 OAuth 的通用连接会既不在目录、也不在“我的 MCP”。
 */
export function getCatalogServerNames(): Set<string> {
  return new Set(MCP_INTEGRATION_CATALOG
    .filter(isCatalogIntegrationVisible)
    .flatMap((integration) => 'serverName' in integration && integration.serverName ? [integration.serverName] : []))
}
export function matchesCatalogSearch(integration: CatalogIntegration, query: string, translate: TranslateFn): boolean {
  if (!query) return true
  const haystack = [
    integration.name,
    translate(integration.description),
    ...integration.capabilities.map((capability) => translate(capability)),
    integration.kind,
  ].join(' ')
  return haystack.toLowerCase().includes(query.toLowerCase())
}
