import * as React from 'react'
import { ChartCandlestick, Check, CircleDashed, Cloud, FileText, Mail, Orbit, Plane, Search, Terminal, TrendingUp, Unplug } from 'lucide-react'
import { useT } from '@/i18n'
import { Switch } from '@/components/ui/switch'
import tavilyIcon from '@/assets/integrations/tavily.png'
import braveIcon from '@/assets/integrations/brave.svg'
import exaIcon from '@/assets/integrations/exa.png'
import tongdaxinIcon from '@/assets/integrations/tongdaxin.png'
import qichachaIcon from '@/assets/integrations/qichacha.png'
import tencentDocsIcon from '@/assets/integrations/tencent-docs.png'
import wecomIcon from '@/assets/integrations/wecom.png'
import dingtalkIcon from '@/assets/integrations/dingtalk.png'
import ctripIcon from '@/assets/integrations/ctrip.png'
import baiduNetdiskIcon from '@/assets/integrations/baidu-netdisk.png'
import feishuIcon from '@/assets/bots/feishu.png'
import { cn } from '@/lib/utils'
import { compareCatalogConnectionCards, getCatalogCliConnectionStatus, getCatalogCliStatusRank, getCatalogGuidedConnectionStatus, getCatalogMcpConnectionStatus, getCatalogMcpStatusRank, type CatalogCliIntegration, type CatalogCliProbeState, type CatalogCredentialIntegration, type CatalogGuidedIntegration, type CatalogMcpIntegration } from './integration-catalog'

interface IntegrationCatalogProps {
  mcps: CatalogMcpIntegration[]
  clis: CatalogCliIntegration[]
  guided: CatalogGuidedIntegration[]
  credentials: CatalogCredentialIntegration[]
  embedded: boolean
  installedMcpNames: Set<string>
  enabledMcpNames: Set<string>
  verifiedMcpNames: Set<string>
  activeSkillSlugs: Set<string>
  connectedCliIds: Set<string>
  cliIntegrationProbeState: CatalogCliProbeState
  installingMcpId: string | null
  onInstallMcp: (integration: CatalogMcpIntegration) => void
  onGuideCli: (integration: CatalogCliIntegration) => void
  onDisconnectCli: (integration: CatalogCliIntegration) => void
  onGuide: (integration: CatalogGuidedIntegration) => void
  onRequestCredential: (integration: CatalogCredentialIntegration) => void
  onToggleMcp: (serverName: string, enabled: boolean) => void
}

// The normal capability center keeps its viewport breakpoint. The embedded view
// is inside a resizable SidePanel, so it switches columns from its own container.
export const EMBEDDED_CATALOG_TWO_COLUMN_MIN_WIDTH = '40rem'
const embeddedCatalogContainerQuery = `
  @container (min-width: ${EMBEDDED_CATALOG_TWO_COLUMN_MIN_WIDTH}) {
    .integration-catalog-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
`

/** 卡片连接状态的枚举值；显示文本走词典，逻辑分支只用枚举。 */
type CatalogStatusKey = 'connected' | 'pending' | 'unconfigured' | 'skillAvailable' | 'checking' | 'unavailable'

type CatalogCard =
  | { integration: CatalogMcpIntegration; status: string; statusKey: CatalogStatusKey; statusTone: 'success' | 'muted'; statusRank: number; actionLabel: string; commandLine: false; enabled: boolean; onAction: () => void; onToggle?: (enabled: boolean) => void; onDisconnect?: () => void }
  | { integration: CatalogCliIntegration; status: string; statusKey: CatalogStatusKey; statusTone: 'success' | 'muted'; statusRank: number; actionLabel: string; commandLine: true; enabled?: boolean; onAction: () => void; onToggle?: (enabled: boolean) => void; onDisconnect?: () => void }
  | { integration: CatalogGuidedIntegration; status: string; statusKey: CatalogStatusKey; statusTone: 'success' | 'muted'; statusRank: number; actionLabel: string; commandLine: false; enabled?: boolean; onAction: () => void; onToggle?: (enabled: boolean) => void; onDisconnect?: () => void }
  | { integration: CatalogCredentialIntegration; status: string; statusKey: CatalogStatusKey; statusTone: 'success' | 'muted'; statusRank: number; actionLabel: string; primaryActionLabel: string; commandLine: false; enabled: boolean; onAction: () => void; onToggle?: (enabled: boolean) => void; onDisconnect?: () => void }

export function IntegrationCatalog({ mcps, clis, guided, credentials, embedded, installedMcpNames, enabledMcpNames, verifiedMcpNames, activeSkillSlugs, connectedCliIds, cliIntegrationProbeState, installingMcpId, onInstallMcp, onGuideCli, onDisconnectCli, onGuide, onRequestCredential, onToggleMcp }: IntegrationCatalogProps): React.ReactElement {
  const t = useT()
  const cards: CatalogCard[] = [
    ...mcps.map((integration) => {
      const status = getCatalogMcpConnectionStatus(integration.serverName, installedMcpNames, enabledMcpNames, verifiedMcpNames)
      return {
        integration,
        status: status === 'connected' ? t('skills.catalog.statusConnected') : status === 'pending' ? t('skills.catalog.statusPending') : t('skills.catalog.statusUnconfigured'),
        statusKey: status,
        statusTone: status === 'connected' ? 'success' as const : 'muted' as const,
        statusRank: getCatalogMcpStatusRank(status),
        actionLabel: status === 'connected' ? t('skills.catalog.actionViewNamed', { name: integration.name }) : status === 'pending' ? t('skills.catalog.actionContinueNamed', { name: integration.name }) : t('skills.catalog.actionConnectNamed', { name: integration.name }),
        commandLine: false as const,
        enabled: enabledMcpNames.has(integration.serverName),
        onAction: () => onInstallMcp(integration),
        onToggle: status !== 'unconfigured' ? (enabled: boolean) => onToggleMcp(integration.serverName, enabled) : undefined,
      }
    }),
    ...guided.map((integration) => {
      const serverName = integration.serverName
      const status = getCatalogGuidedConnectionStatus(integration, activeSkillSlugs, installedMcpNames, enabledMcpNames, verifiedMcpNames)
      const skillAvailable = status === 'skill-available'
      const connected = status === 'connected'
      return {
        integration,
        status: skillAvailable ? t('skills.catalog.statusSkillAvailable') : connected ? t('skills.catalog.statusConnected') : status === 'pending' ? t('skills.catalog.statusPending') : t('skills.catalog.statusUnconfigured'),
        statusKey: skillAvailable ? 'skillAvailable' as const : connected ? 'connected' as const : status,
        statusTone: skillAvailable || connected ? 'success' as const : 'muted' as const,
        statusRank: skillAvailable || connected
          ? getCatalogMcpStatusRank('connected')
          : getCatalogMcpStatusRank(status === 'pending' ? 'pending' : 'unconfigured'),
        actionLabel: skillAvailable ? t('skills.catalog.actionViewUseNamed', { name: integration.name }) : connected ? t('skills.catalog.actionViewNamed', { name: integration.name }) : status === 'pending' ? t('skills.catalog.actionContinueNamed', { name: integration.name }) : t('skills.catalog.actionStartNamed', { name: integration.name }),
        commandLine: false as const,
        enabled: Boolean(serverName && enabledMcpNames.has(serverName)),
        onAction: () => onGuide(integration),
        onToggle: connected && serverName ? (enabled: boolean) => onToggleMcp(serverName, enabled) : undefined,
      }
    }),
    ...credentials.map((integration) => {
      const status = getCatalogMcpConnectionStatus(integration.serverName, installedMcpNames, enabledMcpNames, verifiedMcpNames)
      return {
        integration,
        status: status === 'connected' ? t('skills.catalog.statusConnected') : status === 'pending' ? t('skills.catalog.statusPending') : t('skills.catalog.statusUnconfigured'),
        statusKey: status,
        statusTone: status === 'connected' ? 'success' as const : 'muted' as const,
        statusRank: getCatalogMcpStatusRank(status),
        actionLabel: t('skills.catalog.actionConfigureNamed', { name: integration.name }),
        primaryActionLabel: t('skills.catalog.actionConfigure'),
        commandLine: false as const,
        enabled: enabledMcpNames.has(integration.serverName),
        onAction: () => onRequestCredential(integration),
        onToggle: status !== 'unconfigured' ? (enabled: boolean) => onToggleMcp(integration.serverName, enabled) : undefined,
      }
    }),
    ...clis.map((integration) => {
      const status = getCatalogCliConnectionStatus(integration.id, connectedCliIds, cliIntegrationProbeState)
      const connected = status === 'connected'
      return {
        integration,
        status: status === 'connected' ? t('skills.catalog.statusConnected') : status === 'checking' ? t('skills.catalog.statusChecking') : status === 'unavailable' ? t('skills.catalog.statusUnavailable') : t('skills.catalog.statusUnconfigured'),
        statusKey: status,
        statusTone: connected ? 'success' as const : 'muted' as const,
        statusRank: getCatalogCliStatusRank(status),
        actionLabel: connected ? t('skills.catalog.actionViewConfigNamed', { name: integration.name }) : t('skills.catalog.actionConfigureNamed', { name: integration.name }),
        commandLine: true as const,
        onAction: () => onGuideCli(integration),
        onDisconnect: connected ? () => onDisconnectCli(integration) : undefined,
      }
    }),
  ].sort((left, right) => compareCatalogConnectionCards(
    { placement: left.integration.placement, featured: left.integration.featured, priority: left.integration.priority, statusRank: left.statusRank },
    { placement: right.integration.placement, featured: right.integration.featured, priority: right.integration.priority, statusRank: right.statusRank },
  ))

  if (cards.length === 0) return <></>

  return (
    <section className="flex flex-col gap-4">
      {embedded && <style>{embeddedCatalogContainerQuery}</style>}
      <div className="px-1">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[15px] font-semibold text-foreground">{t('skills.catalog.title')}</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-foreground/45">{cards.length}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{t('skills.catalog.hint')}</p>
      </div>
      <div className={cn('grid grid-cols-1 gap-4', embedded ? 'integration-catalog-grid' : 'md:grid-cols-2')}>
        {cards.map((card) => (
          <IntegrationCard
            key={card.integration.id}
            name={card.integration.name}
            description={t(card.integration.description)}
            capabilities={card.integration.capabilities.map((capability) => t(capability))}
            iconSlug={card.integration.iconSlug}
            status={card.status}
            statusKey={card.statusKey}
            statusTone={card.statusTone}
            actionLabel={card.actionLabel}
            primaryActionLabel={'primaryActionLabel' in card ? card.primaryActionLabel : undefined}
            installing={'serverName' in card.integration && installingMcpId === card.integration.id}
            commandLine={card.commandLine}
            onAction={card.onAction}
            onToggle={card.onToggle}
            enabled={card.enabled}
            onDisconnect={card.onDisconnect}
          />
        ))}
      </div>
    </section>
  )
}

interface IntegrationCardProps {
  name: string
  description: string
  capabilities: string[]
  iconSlug: string
  status: string
  statusKey: CatalogStatusKey
  statusTone: 'success' | 'muted'
  actionLabel: string
  primaryActionLabel?: string
  installing: boolean
  commandLine: boolean
  onAction: () => void
  enabled?: boolean
  onToggle?: (enabled: boolean) => void
  onDisconnect?: () => void
}

function IntegrationCard({ name, description, capabilities, iconSlug, status, statusKey, statusTone, actionLabel, primaryActionLabel, installing, commandLine, onAction, enabled, onToggle, onDisconnect }: IntegrationCardProps): React.ReactElement {
  const t = useT()
  const [iconFailed, setIconFailed] = React.useState(false)
  const actionText = primaryActionLabel ?? (statusKey === 'pending'
    ? t('skills.catalog.actionContinue')
    : statusKey === 'unconfigured'
      ? (commandLine ? t('skills.catalog.actionConfigure') : t('skills.catalog.actionConnect'))
      : statusKey === 'checking'
        ? t('skills.catalog.statusChecking')
        : statusKey === 'unavailable'
          ? t('skills.catalog.actionRetry')
          : statusKey === 'skillAvailable'
            ? t('skills.catalog.actionUse')
            : t('skills.catalog.actionView'))
  const DomainIcon = {
    'lucide-orbit': Orbit,
    'lucide-plane': Plane,
    'lucide-chart-candlestick': ChartCandlestick,
    'lucide-trending-up': TrendingUp,
    'lucide-cloud': Cloud,
    'lucide-file-text': FileText,
    'lucide-mail': Mail,
    'lucide-search': Search,
  }[iconSlug]

  const localIcon = {
    'asset:brave': braveIcon,
    'asset:tavily': tavilyIcon,
    'asset:exa': exaIcon,
    'asset:tongdaxin': tongdaxinIcon,
    'asset:baidu-netdisk': baiduNetdiskIcon,
    'asset:tencent-docs': tencentDocsIcon,
    'asset:wecom': wecomIcon,
    'asset:feishu': feishuIcon,
    'asset:qichacha': qichachaIcon,
    'asset:dingtalk': dingtalkIcon,
    'asset:ctrip': ctripIcon,
  }[iconSlug]
  const imageIconSizeClass = iconSlug === 'asset:feishu' ? 'size-[34px]' : 'size-7'

  return (
    <article className={cn(
      'group relative flex min-h-[144px] flex-col gap-2 rounded-lg bg-card p-3 text-left shadow-md',
    )}>
      <div className="flex items-start gap-2">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {localIcon
            ? <img className={cn(imageIconSizeClass, 'object-contain')} src={localIcon} alt="" />
            : DomainIcon
              ? <DomainIcon size={28} strokeWidth={1.8} />
              : iconFailed
                ? commandLine
                  ? <Terminal size={28} className="text-muted-foreground" />
                  : <CircleDashed size={28} className="text-muted-foreground" />
                : <img className="size-7 object-contain" src={`https://cdn.simpleicons.org/${iconSlug}`} alt="" onError={() => setIconFailed(true)} />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold text-foreground [text-wrap:balance]">{name}</h3>
          <p className="mt-0.5 line-clamp-2 text-[12px] leading-4 text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="mt-1 flex flex-wrap gap-1">
        {capabilities.map((capability) => (
          <span key={capability} className="rounded-md bg-foreground/[0.045] px-1.5 py-0.5 text-[11px] text-foreground/60">{capability}</span>
        ))}
      </div>

      <div className="mt-auto flex items-center gap-1.5 pt-1.5">
        <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium', statusTone === 'success' ? 'text-primary' : 'text-muted-foreground')}>
          {statusTone === 'success' ? <Check size={12} strokeWidth={2.5} /> : <CircleDashed size={12} />}
          <span className="truncate">{status}</span>
        </span>
        <div className="ml-auto flex items-center gap-2">
          {onToggle && enabled !== undefined && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">{t('skills.catalog.toggleEnable')}</span>
              <Switch
                checked={enabled}
                disabled={installing}
                onCheckedChange={onToggle}
                aria-label={t('skills.catalog.toggleEnableAria', { name })}
                className="scale-90"
              />
            </div>
          )}
          {statusTone === 'success' && onDisconnect && (
            <button
              type="button"
              title={t('skills.catalog.disconnectAria', { name })}
              aria-label={t('skills.catalog.disconnectAria', { name })}
              disabled={installing}
              onClick={onDisconnect}
              className="pointer-events-none flex shrink-0 items-center gap-1.5 p-0 text-[12px] font-medium text-destructive opacity-0 transition-[color,opacity,background-color] hover:text-destructive/80 focus-visible:pointer-events-auto focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 disabled:cursor-wait disabled:opacity-60"
            >
              <Unplug size={14} />
              <span>{t('skills.catalog.disconnect')}</span>
            </button>
          )}
          {(!onDisconnect || statusTone !== 'success') && (
            <button type="button" title={actionLabel} aria-label={actionLabel} disabled={installing} onClick={onAction} className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md bg-primary px-2 text-[11px] font-medium text-primary-foreground shadow-sm transition-[transform,background-color,box-shadow] hover:bg-primary/90 hover:shadow active:scale-[0.96] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60">
              {installing ? <CircleDashed size={14} className="animate-spin" /> : <span>{actionText}</span>}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
