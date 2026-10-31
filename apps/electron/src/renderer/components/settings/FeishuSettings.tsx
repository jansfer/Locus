/**
 * FeishuSettings - 飞书集成设置页
 *
 * 双 Tab 布局：
 * - Bot 配置：飞书应用凭证、连接状态、默认配置、创建引导、命令说明
 * - 绑定管理：查看/管理所有活跃的飞书聊天绑定（群聊/单聊的工作区/会话分配）
 */

import * as React from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, XCircle, ExternalLink, Users, User, Trash2, RefreshCw, Copy, Check, Power, PowerOff, Plus, ChevronRight, PlayCircle, QrCode, MessageSquare, AlertTriangle, Archive, ArchiveRestore, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SettingsSection } from './primitives/SettingsSection'
import { useT } from '@/i18n'
import type { TranslateFn } from '@/i18n'
import { SettingsCard } from './primitives/SettingsCard'
import { SettingsInput } from './primitives/SettingsInput'
import { SettingsSecretInput } from './primitives/SettingsSecretInput'
import { SettingsRow } from './primitives/SettingsRow'
import { LocalProjectBadge } from '@/components/agent/LocalProjectBadge'
import { feishuBotStatesAtom, feishuBindingsAtom } from '@/atoms/feishu-atoms'
import { agentWorkspacesAtom, agentSessionsAtom } from '@/atoms/agent-atoms'
import { cn } from '@/lib/utils'
import { copyTextToClipboard } from '@/lib/clipboard'
import {
  FEISHU_BINDING_PAGE_SIZE,
  filterFeishuBindings,
  groupFeishuBindings,
  type FeishuBindingSourceFilter,
  type FeishuBindingTypeFilter,
  type FeishuBindingViewMode,
} from '@/lib/feishu-bindings'
import type { AgentSessionMeta, AgentWorkspace, FeishuTestResult, FeishuChatBinding, FeishuBotConfig, FeishuBotBridgeState, FeishuDomain, FeishuRegisterAppQRCode, FeishuRegisterAppStatus, FeishuSessionMirrorSettings, FeishuSessionSyncMode } from '@proma/shared'

// ===== 常量 =====

type FeishuTab = 'config' | 'bindings'

const TAB_OPTIONS: Array<{ value: FeishuTab; labelKey: 'tabConfig' | 'tabBindings' }> = [
  { value: 'config', labelKey: 'tabConfig' },
  { value: 'bindings', labelKey: 'tabBindings' },
]

/** 连接状态颜色映射（label 存状态名，渲染处经词典转换；当前未直接渲染 label） */
const STATUS_CONFIG = {
  disconnected: { color: 'bg-gray-400', label: 'disconnected' },
  connecting: { color: 'bg-amber-400 animate-pulse', label: 'connecting' },
  connected: { color: 'bg-green-500', label: 'connected' },
  error: { color: 'bg-red-500', label: 'error' },
} as const


/** 飞书批量权限配置 JSON（用于一键复制粘贴到飞书开放平台） */
const FEISHU_SCOPES_JSON = JSON.stringify({
  scopes: {
    tenant: [
      'contact:contact.base:readonly',
      'drive:drive',
      'im:chat',
      'im:chat.announcement:write_only',
      'im:chat.managers:write_only',
      'im:chat.members:read',
      'im:chat.members:write_only',
      'im:chat.tabs:write_only',
      'im:chat.top_notice:write_only',
      'im:message',
      'im:message.group_at_msg:readonly',
      'im:message.group_msg',
      'im:message.p2p_msg:readonly',
      'im:message.reactions:write_only',
      'im:message:send_as_bot',
      'im:resource',
      'wiki:wiki',
    ],
    user: [],
  },
}, null, 2)

/**
 * 视频教程入口配置。
 * 后续把 url 填上即可在飞书配置页顶部显示视频教程卡片，留空则不渲染。
 * 支持 B 站 / YouTube 等任意 iframe 嵌入地址，例如：
 *   B 站：//player.bilibili.com/player.html?bvid=BVxxxxxx&autoplay=0
 *   YouTube：https://www.youtube.com/embed/VIDEO_ID
 *
 * TODO: 教程视频录制完成后，把 url 填回（之前测试用过 'https://www.bilibili.com/video/BV1z8G867Epv'）。
 */
const FEISHU_TUTORIAL_VIDEO = {
  url: '',
} as const

// ===== 视频教程组件 =====

/** 把任意视频链接归一化为可 iframe 嵌入的 URL（B 站 / YouTube / 直链皆支持） */
function normalizeVideoEmbedUrl(raw: string): { embedUrl: string; isIframe: boolean } | null {
  const url = raw.trim()
  if (!url) return null

  // B 站普通页：https://www.bilibili.com/video/BVxxxxxx[?p=N] → player.bilibili.com
  const bvMatch = url.match(/bilibili\.com\/video\/(BV[0-9A-Za-z]+)/)
  if (bvMatch) {
    const pMatch = url.match(/[?&]p=(\d+)/)
    const pageParam = pMatch ? `&page=${pMatch[1]}` : ''
    return { embedUrl: `https://player.bilibili.com/player.html?bvid=${bvMatch[1]}&autoplay=0&high_quality=1&danmaku=0${pageParam}`, isIframe: true }
  }
  // B 站短链（b23.tv/xxx）：无法在前端跟随重定向，让 iframe 自己处理
  if (/^https?:\/\/b23\.tv\//.test(url)) {
    return { embedUrl: url, isIframe: true }
  }
  // B 站 player 直链
  if (/^https?:\/\/player\.bilibili\.com\//.test(url)) {
    return { embedUrl: url, isIframe: true }
  }
  // YouTube watch / shorts / youtu.be → embed
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/)
  if (ytMatch) {
    return { embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}`, isIframe: true }
  }
  // YouTube embed 直链
  if (/^https?:\/\/(www\.)?youtube\.com\/embed\//.test(url)) {
    return { embedUrl: url, isIframe: true }
  }
  // mp4 / webm / m3u8 直链：用 video 标签
  if (/\.(mp4|webm|m3u8)(\?.*)?$/i.test(url)) {
    return { embedUrl: url, isIframe: false }
  }
  // 默认尝试当作 iframe 渲染
  return { embedUrl: url, isIframe: true }
}

/** 飞书配置页顶部的视频教程卡片，URL 留空时不渲染。
 *  默认展开方便新用户上手；检测到任一 Bot 已 connected（视为配置完成）会自动收起一次，
 *  之后用户随时可以手动展开/收起。 */
function FeishuTutorialVideo(): React.ReactElement | null {
  const t = useT()
  const video = React.useMemo(() => normalizeVideoEmbedUrl(FEISHU_TUTORIAL_VIDEO.url), [])
  const botStates = useAtomValue(feishuBotStatesAtom)
  const hasConnectedBot = React.useMemo(
    () => Object.values(botStates).some((b) => b.status === 'connected'),
    [botStates],
  )
  const [expanded, setExpanded] = React.useState(true)
  const autoCollapsedRef = React.useRef(false)

  React.useEffect(() => {
    if (hasConnectedBot && !autoCollapsedRef.current) {
      autoCollapsedRef.current = true
      setExpanded(false)
    }
  }, [hasConnectedBot])

  if (!video) return null

  return (
    <SettingsSection
      title={
        <span className="flex items-center gap-2">
          <PlayCircle size={16} className="text-primary" />
          {t('settingsIntegrations.feishu.tutorial.title')}
        </span>
      }
      description={t('settingsIntegrations.feishu.tutorial.description')}
    >
      <SettingsCard divided={false}>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer text-left"
        >
          <span className="text-sm text-muted-foreground">
            {expanded ? t('settingsIntegrations.feishu.tutorial.collapse') : t('settingsIntegrations.feishu.tutorial.expand')}
          </span>
          <ChevronRight size={16} className={cn('text-muted-foreground transition-transform duration-200', expanded && 'rotate-90')} />
        </button>
        {expanded && (
          <div className="px-4 pb-4 animate-in fade-in-0 slide-in-from-top-1 duration-200">
            <div className="relative w-full overflow-hidden rounded-md bg-black" style={{ aspectRatio: '16 / 9' }}>
              {video.isIframe ? (
                <iframe
                  src={video.embedUrl}
                  title={t('settingsIntegrations.feishu.tutorial.title')}
                  className="absolute inset-0 w-full h-full border-0"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture"
                  referrerPolicy="no-referrer"
                  sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                />
              ) : (
                <video
                  src={video.embedUrl}
                  controls
                  preload="metadata"
                  className="absolute inset-0 w-full h-full"
                />
              )}
            </div>
          </div>
        )}
      </SettingsCard>
    </SettingsSection>
  )
}

// ===== 工具组件 =====

/** 安全地用系统浏览器打开链接 */
function openLink(url: string): void {
  window.electronAPI.openExternal(url)
}

/** 可点击的外部链接组件 */
function Link({ href, children }: { href: string; children: React.ReactNode }): React.ReactElement {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-primary hover:underline cursor-pointer"
      onClick={() => openLink(href)}
    >
      {children}
      <ExternalLink className="size-3 flex-shrink-0" />
    </button>
  )
}

// ===== 权限配置步骤组件 =====

/** 权限列表展示 + 一键复制批量权限 JSON */
function PermissionsStep(): React.ReactElement {
  const t = useT()
  const [copied, setCopied] = React.useState(false)
  const [expanded, setExpanded] = React.useState(false)

  const handleCopy = React.useCallback(() => {
    copyTextToClipboard(FEISHU_SCOPES_JSON).then(() => {
      setCopied(true)
      toast.success(t('settingsIntegrations.feishu.permissions.copiedToast'))
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      toast.error(t('settingsIntegrations.shared.copyFailed'))
    })
  }, [t])

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">4</span>
        <span className="font-medium text-foreground">{t('settingsIntegrations.feishu.permissions.stepTitle')}</span>
      </div>
      <div className="pl-7 space-y-3 text-muted-foreground">
        <p>
          {t('settingsIntegrations.feishu.permissions.intro1')}
          <span className="text-foreground font-medium">{t('settingsIntegrations.feishu.permissions.batchOpen')}</span>
          {t('settingsIntegrations.feishu.permissions.intro2')}
        </p>

        {/* 主操作：一键复制按钮（更显眼） */}
        <Button
          size="default"
          onClick={handleCopy}
          className={cn(
            'gap-2 transition-all',
            copied && 'bg-green-600 hover:bg-green-600 text-white'
          )}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          <span className="font-medium">{copied ? t('settingsIntegrations.feishu.permissions.copied') : t('settingsIntegrations.feishu.permissions.copyJson')}</span>
        </Button>

        {/* 次要：展开查看每个权限对应的能力 */}
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <ChevronRight size={14} className={cn('transition-transform duration-200', expanded && 'rotate-90')} />
          <span>{expanded ? t('settingsIntegrations.feishu.permissions.collapseDetails') : t('settingsIntegrations.feishu.permissions.expandDetails')}</span>
        </button>
        {expanded && (
          <div className="bg-muted/50 rounded-md p-3 font-mono text-xs space-y-0.5 animate-in fade-in-0 slide-in-from-top-1 duration-200">
            <div><span className="text-foreground/70">im:message</span> — {t('settingsIntegrations.feishu.permissions.scopes.imMessage')}</div>
            <div><span className="text-foreground/70">im:message:send_as_bot</span> — {t('settingsIntegrations.feishu.permissions.scopes.imMessageSendAsBot')}</div>
            <div><span className="text-foreground/70">im:message.p2p_msg:readonly</span> — {t('settingsIntegrations.feishu.permissions.scopes.imMessageP2pReadonly')}</div>
            <div><span className="text-foreground/70">im:message.group_at_msg:readonly</span> — {t('settingsIntegrations.feishu.permissions.scopes.imMessageGroupAtMsg')}</div>
            <div><span className="text-foreground/70">im:message.group_msg</span> — {t('settingsIntegrations.feishu.permissions.scopes.imMessageGroupMsg')}</div>
            <div><span className="text-foreground/70">im:message.reactions:write_only</span> — {t('settingsIntegrations.feishu.permissions.scopes.imMessageReactions')}</div>
            <div><span className="text-foreground/70">im:chat</span> — {t('settingsIntegrations.feishu.permissions.scopes.imChat')}</div>
            <div><span className="text-foreground/70">im:chat.members:read</span> — {t('settingsIntegrations.feishu.permissions.scopes.imChatMembersRead')}</div>
            <div><span className="text-foreground/70">im:chat.members:write_only</span> — {t('settingsIntegrations.feishu.permissions.scopes.imChatMembersWrite')}</div>
            <div><span className="text-foreground/70">im:chat.managers:write_only</span> — {t('settingsIntegrations.feishu.permissions.scopes.imChatManagers')}</div>
            <div><span className="text-foreground/70">im:chat.announcement:write_only</span> — {t('settingsIntegrations.feishu.permissions.scopes.imChatAnnouncement')}</div>
            <div><span className="text-foreground/70">im:chat.tabs:write_only</span> — {t('settingsIntegrations.feishu.permissions.scopes.imChatTabs')}</div>
            <div><span className="text-foreground/70">im:chat.top_notice:write_only</span> — {t('settingsIntegrations.feishu.permissions.scopes.imChatTopNotice')}</div>
            <div><span className="text-foreground/70">im:resource</span> — {t('settingsIntegrations.feishu.permissions.scopes.imResource')}</div>
            <div><span className="text-foreground/70">contact:contact.base:readonly</span> — {t('settingsIntegrations.feishu.permissions.scopes.contactBase')}</div>
            <div><span className="text-foreground/70">drive:drive</span> — {t('settingsIntegrations.feishu.permissions.scopes.drive')}</div>
            <div><span className="text-foreground/70">wiki:wiki</span> — {t('settingsIntegrations.feishu.permissions.scopes.wiki')}</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ===== 飞书 CLI 预置 Prompt =====

const FEISHU_CLI_PROMPT = `请帮我配置飞书 CLI 开发环境，按以下步骤执行：

1. 安装飞书 CLI 到全局
npm install -g @larksuite/cli

2. 将 SKILL 安装到当前项目的 Locus 工作区 Skills 目录。先下载，再按系统提示给出的 Skills 目录将下载内容移动过去；不要使用全局安装，以免在无关项目预置上下文。
npx skills add https://github.com/larksuite/cli -y

3. 初始化 CLI 配置（创建一个全新的飞书 CLI 应用，与 Locus 飞书 Bot 互不影响）
lark-cli config init --new

4. 一键申请全部领域的所有权限（文档/表格/日历/任务/邮件/通讯录/会议/审批/OKR/Wiki/多维表格/幻灯片/考勤/项目板等都包含在内）
lark-cli auth login --domain all

执行第 3 步时浏览器会弹出授权页面，引导用户完成应用创建并扫码授权；
执行第 4 步时浏览器会再次弹出，引导用户一次性确认所有领域的权限——这一步是体验关键，跳过会导致后续 Agent 调用飞书文档/日历/邮件等能力时报权限不足。`

/** 飞书 CLI 配置引导 */
function FeishuCliSection(): React.ReactElement {
  const t = useT()
  const [expanded, setExpanded] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  const handleSendToAgent = React.useCallback(() => {
    copyTextToClipboard(FEISHU_CLI_PROMPT).then(() => {
      setCopied(true)
      toast.success(t('settingsIntegrations.feishu.cli.copiedToast'))
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      toast.error(t('settingsIntegrations.shared.copyFailed'))
    })
  }, [t])

  return (
    <SettingsSection
      title={t('settingsIntegrations.feishu.cli.title')}
      description={t('settingsIntegrations.feishu.cli.description')}
    >
      <SettingsCard divided={false}>
        <div className="px-4 py-4 space-y-2 text-sm text-muted-foreground">
          <p className="text-xs">
            {t('settingsIntegrations.feishu.cli.introBefore')}
            <strong>{t('settingsIntegrations.feishu.cli.introHighlight')}</strong>
            {t('settingsIntegrations.feishu.cli.introAfter')}
          </p>
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            onClick={() => setExpanded(!expanded)}
          >
            <ChevronRight size={14} className={cn('transition-transform duration-200', expanded && 'rotate-90')} />
            <span>{expanded ? t('settingsIntegrations.feishu.cli.collapseSteps') : t('settingsIntegrations.feishu.cli.expandSteps')}</span>
          </button>

          {expanded && (
            <div className="bg-muted/50 rounded-md p-3 font-mono text-xs space-y-1.5 animate-in fade-in-0 slide-in-from-top-1 duration-200">
              <div><span className="text-foreground/70 font-semibold">{t('settingsIntegrations.shared.stepN', { n: 1 })}</span> — {t('settingsIntegrations.feishu.cli.step1Desc')}</div>
              <div className="pl-3 text-foreground/60">npm install -g @larksuite/cli</div>
              <div className="pt-1"><span className="text-foreground/70 font-semibold">{t('settingsIntegrations.shared.stepN', { n: 2 })}</span> — {t('settingsIntegrations.feishu.cli.step2Desc')}</div>
              <div className="pl-3 text-foreground/60">npx skills add https://github.com/larksuite/cli -y</div>
              <div className="pt-1"><span className="text-foreground/70 font-semibold">{t('settingsIntegrations.shared.stepN', { n: 3 })}</span> — {t('settingsIntegrations.feishu.cli.step3Desc')}</div>
              <div className="pl-3 text-foreground/60">lark-cli config init --new</div>
              <div className="pt-1"><span className="text-foreground/70 font-semibold">{t('settingsIntegrations.shared.stepN', { n: 4 })}</span> — {t('settingsIntegrations.feishu.cli.step4Desc')}</div>
              <div className="pl-3 text-foreground/60">lark-cli auth login --domain all</div>
            </div>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={handleSendToAgent}
            className="gap-1.5"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? t('settingsIntegrations.feishu.cli.copied') : t('settingsIntegrations.feishu.cli.copyPrompt')}</span>
          </Button>
        </div>
      </SettingsCard>
    </SettingsSection>
  )
}

// ===== 绑定卡片组件 =====

interface FeishuBindingCardProps {
  binding: FeishuChatBinding
  workspaces: AgentWorkspace[]
  workspaceById: Map<string, AgentWorkspace>
  sessionById: Map<string, AgentSessionMeta>
  sessionsByWorkspaceId: Map<string, AgentSessionMeta[]>
  onUpdate: (chatId: string, updates: { workspaceId?: string; sessionId?: string }) => void
  onArchive: (chatId: string, archived: boolean) => void
  onRemove: (chatId: string) => void
}

const FeishuBindingCard = React.memo(function FeishuBindingCard({
  binding,
  workspaces,
  workspaceById,
  sessionById,
  sessionsByWorkspaceId,
  onUpdate,
  onArchive,
  onRemove,
}: FeishuBindingCardProps): React.ReactElement {
  const t = useT()
  const [workspaceSelectOpen, setWorkspaceSelectOpen] = React.useState(false)
  const [sessionSelectOpen, setSessionSelectOpen] = React.useState(false)
  const isGroup = binding.chatType === 'group'
  const displayName = isGroup ? (binding.groupName ?? t('settingsIntegrations.feishu.binding.unknownGroup')) : t('settingsIntegrations.feishu.binding.directChat')
  const isArchived = !!binding.archived

  // 当前绑定工作区下的会话列表
  const workspaceSessions = React.useMemo(
    () => sessionsByWorkspaceId.get(binding.workspaceId) ?? [],
    [sessionsByWorkspaceId, binding.workspaceId]
  )

  const currentWorkspace = workspaceById.get(binding.workspaceId)
  const currentSession = sessionById.get(binding.sessionId)
  const lastUsedAt = binding.lastUsedAt ?? binding.createdAt

  return (
    <div className={cn('px-4 py-3 space-y-3', isArchived && 'opacity-75')}>
      {/* 头部：类型图标 + 名称 + 删除 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            'flex items-center justify-center w-8 h-8 rounded-lg',
            isGroup ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-green-500/10 text-green-600 dark:text-green-400'
          )}>
            {isGroup ? <Users size={16} /> : <User size={16} />}
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">{displayName}</div>
            <div className="text-xs text-muted-foreground">
              {isGroup ? t('settingsIntegrations.feishu.binding.groupChat') : t('settingsIntegrations.feishu.binding.privateChat')}
              {' · '}
              {t('settingsIntegrations.feishu.binding.lastUsed', { date: new Date(lastUsedAt).toLocaleDateString('zh-CN') })}
              {binding.source === 'session-mirror' && t('settingsIntegrations.feishu.binding.sessionMirror')}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground"
            onClick={() => onArchive(binding.chatId, !isArchived)}
            title={isArchived ? t('settingsIntegrations.feishu.binding.unarchive') : t('settingsIntegrations.feishu.binding.archive')}
          >
            {isArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                <Trash2 size={14} />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('settingsIntegrations.feishu.binding.unbindTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('settingsIntegrations.feishu.binding.unbindDesc', { name: displayName })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={() => onRemove(binding.chatId)}>
                  {t('settingsIntegrations.feishu.binding.confirmUnbind')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* 项目选择 */}
      <div className="grid grid-cols-[80px_1fr] gap-2 items-center text-sm">
        <span className="text-muted-foreground">{t('settingsIntegrations.feishu.binding.workspaceLabel')}</span>
        <Select
          value={binding.workspaceId}
          open={workspaceSelectOpen}
          onOpenChange={setWorkspaceSelectOpen}
          onValueChange={(value) => onUpdate(binding.chatId, { workspaceId: value })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder={t('settingsIntegrations.feishu.binding.selectWorkspace')}>
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate">{currentWorkspace?.name ?? t('settingsIntegrations.feishu.binding.unknownWorkspace')}</span>
                <LocalProjectBadge
                  projectRootPath={currentWorkspace?.projectRootPath}
                  projectRootStatus={currentWorkspace?.projectRootStatus}
                />
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {workspaceSelectOpen && workspaces.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                <span className="flex items-center gap-1.5">
                  <span>{w.name}</span>
                  <LocalProjectBadge
                    projectRootPath={w.projectRootPath}
                    projectRootStatus={w.projectRootStatus}
                  />
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-muted-foreground">{t('settingsIntegrations.feishu.binding.sessionLabel')}</span>
        <Select
          value={binding.sessionId}
          open={sessionSelectOpen}
          onOpenChange={setSessionSelectOpen}
          onValueChange={(value) => onUpdate(binding.chatId, { sessionId: value })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder={t('settingsIntegrations.feishu.binding.selectSession')}>
              {currentSession?.title ?? binding.sessionId.slice(0, 8)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {sessionSelectOpen && workspaceSessions.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
})

// ===== 绑定管理 Tab =====

function FeishuBindingsTab(): React.ReactElement {
  const t = useT()
  const bindings = useAtomValue(feishuBindingsAtom)
  const setBindings = useSetAtom(feishuBindingsAtom)
  const workspaces = useAtomValue(agentWorkspacesAtom)
  const sessions = useAtomValue(agentSessionsAtom)
  const [refreshing, setRefreshing] = React.useState(false)
  const [viewMode, setViewMode] = React.useState<FeishuBindingViewMode>('active')
  const [query, setQuery] = React.useState('')
  const [chatTypeFilter, setChatTypeFilter] = React.useState<FeishuBindingTypeFilter>('all')
  const [sourceFilter, setSourceFilter] = React.useState<FeishuBindingSourceFilter>('all')
  const [visibleLimit, setVisibleLimit] = React.useState(FEISHU_BINDING_PAGE_SIZE)

  const activeCount = React.useMemo(
    () => bindings.filter((binding) => !binding.archived).length,
    [bindings],
  )
  const archivedCount = React.useMemo(
    () => bindings.filter((binding) => binding.archived).length,
    [bindings],
  )

  const workspaceById = React.useMemo(
    () => new Map(workspaces.map((workspace) => [workspace.id, workspace])),
    [workspaces],
  )
  const sessionById = React.useMemo(
    () => new Map(sessions.map((session) => [session.id, session])),
    [sessions],
  )
  const sessionsByWorkspaceId = React.useMemo(() => {
    const grouped = new Map<string, AgentSessionMeta[]>()
    for (const session of sessions) {
      if (!session.workspaceId) continue
      const list = grouped.get(session.workspaceId) ?? []
      list.push(session)
      grouped.set(session.workspaceId, list)
    }
    for (const list of grouped.values()) {
      list.sort((a, b) => b.updatedAt - a.updatedAt)
    }
    return grouped
  }, [sessions])

  const filteredBindings = React.useMemo(
    () => filterFeishuBindings(bindings, {
      viewMode,
      chatType: chatTypeFilter,
      source: sourceFilter,
      query,
    }),
    [bindings, chatTypeFilter, query, sourceFilter, viewMode],
  )

  const visibleBindings = React.useMemo(
    () => filteredBindings.slice(0, visibleLimit),
    [filteredBindings, visibleLimit],
  )
  const { groupBindings, p2pBindings } = React.useMemo(
    () => groupFeishuBindings(visibleBindings),
    [visibleBindings],
  )

  React.useEffect(() => {
    setVisibleLimit(FEISHU_BINDING_PAGE_SIZE)
  }, [chatTypeFilter, query, sourceFilter, viewMode])

  // 刷新绑定列表
  const refreshBindings = React.useCallback(async () => {
    setRefreshing(true)
    try {
      const list = await window.electronAPI.listFeishuBindings()
      setBindings(list)
    } catch {
      toast.error(t('settingsIntegrations.feishu.binding.loadFailed'))
    } finally {
      setRefreshing(false)
    }
  }, [setBindings, t])

  // 进入 Tab 时自动刷新
  React.useEffect(() => {
    refreshBindings()
  }, [refreshBindings])

  // 更新绑定
  const handleUpdate = React.useCallback(async (chatId: string, updates: { workspaceId?: string; sessionId?: string }) => {
    try {
      const result = await window.electronAPI.updateFeishuBinding({ chatId, ...updates })
      if (result) {
        setBindings((prev) => prev.map((b) => b.chatId === chatId ? result : b))
        toast.success(t('settingsIntegrations.feishu.binding.updatedToast'))
      }
    } catch {
      toast.error(t('settingsIntegrations.feishu.binding.updateFailed'))
    }
  }, [setBindings, t])

  // 归档 / 恢复绑定
  const handleArchive = React.useCallback(async (chatId: string, archived: boolean) => {
    try {
      const result = await window.electronAPI.updateFeishuBinding({ chatId, archived })
      if (result) {
        setBindings((prev) => prev.map((binding) => binding.chatId === chatId ? result : binding))
        toast.success(t(archived ? 'settingsIntegrations.feishu.binding.archivedToast' : 'settingsIntegrations.feishu.binding.restoredToast'))
      }
    } catch {
      toast.error(t(archived ? 'settingsIntegrations.feishu.binding.archiveFailed' : 'settingsIntegrations.feishu.binding.restoreFailed'))
    }
  }, [setBindings, t])

  // 移除绑定
  const handleRemove = React.useCallback(async (chatId: string) => {
    try {
      const ok = await window.electronAPI.removeFeishuBinding(chatId)
      if (ok) {
        setBindings((prev) => prev.filter((b) => b.chatId !== chatId))
        toast.success(t('settingsIntegrations.feishu.binding.unboundToast'))
      }
    } catch {
      toast.error(t('settingsIntegrations.feishu.binding.unbindFailed'))
    }
  }, [setBindings, t])

  return (
    <div className="space-y-8">
      <SettingsSection
        title={t('settingsIntegrations.feishu.tabBindings')}
        description={t('settingsIntegrations.feishu.binding.summary', { active: activeCount, archived: archivedCount })}
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={refreshBindings}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={cn(refreshing && 'animate-spin')} />
            <span className="ml-1.5">{t('common.refresh')}</span>
          </Button>
        }
      >
        <SettingsCard divided={false}>
          <div className="px-4 py-3 space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="inline-flex rounded-lg bg-muted p-1 gap-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('active')}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    viewMode === 'active' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t('settingsIntegrations.feishu.binding.activeCount', { n: activeCount })}
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('archived')}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    viewMode === 'archived' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t('settingsIntegrations.feishu.binding.archivedCount', { n: archivedCount })}
                </button>
              </div>

              <div className="relative min-w-0 flex-1">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t('settingsIntegrations.feishu.binding.searchPlaceholder')}
                  className="h-9 pl-8 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                <Select value={chatTypeFilter} onValueChange={(value) => setChatTypeFilter(value as FeishuBindingTypeFilter)}>
                  <SelectTrigger className="h-9 w-full sm:w-[118px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('settingsIntegrations.feishu.filter.allTypes')}</SelectItem>
                    <SelectItem value="group">{t('settingsIntegrations.feishu.binding.groupChat')}</SelectItem>
                    <SelectItem value="p2p">{t('settingsIntegrations.feishu.binding.p2p')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sourceFilter} onValueChange={(value) => setSourceFilter(value as FeishuBindingSourceFilter)}>
                  <SelectTrigger className="h-9 w-full sm:w-[138px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('settingsIntegrations.feishu.filter.allSources')}</SelectItem>
                    <SelectItem value="feishu">{t('settingsIntegrations.feishu.filter.sourceFeishu')}</SelectItem>
                    <SelectItem value="session-mirror">{t('settingsIntegrations.feishu.filter.sourceMirror')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </SettingsCard>

        {bindings.length === 0 ? (
          <SettingsCard divided={false}>
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t('settingsIntegrations.feishu.binding.empty')}
            </div>
          </SettingsCard>
        ) : filteredBindings.length === 0 ? (
          <SettingsCard divided={false}>
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t('settingsIntegrations.feishu.binding.noMatch')}
            </div>
          </SettingsCard>
        ) : (
          <div className="space-y-4">
            {/* 群聊绑定 */}
            {groupBindings.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('settingsIntegrations.feishu.binding.groupCount', { n: groupBindings.length })}
                </div>
                <SettingsCard>
                  {groupBindings.map((binding) => (
                    <FeishuBindingCard
                      key={binding.chatId}
                      binding={binding}
                      workspaces={workspaces}
                      workspaceById={workspaceById}
                      sessionById={sessionById}
                      sessionsByWorkspaceId={sessionsByWorkspaceId}
                      onUpdate={handleUpdate}
                      onArchive={handleArchive}
                      onRemove={handleRemove}
                    />
                  ))}
                </SettingsCard>
              </div>
            )}

            {/* 单聊绑定 */}
            {p2pBindings.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('settingsIntegrations.feishu.binding.p2pCount', { n: p2pBindings.length })}
                </div>
                <SettingsCard>
                  {p2pBindings.map((binding) => (
                    <FeishuBindingCard
                      key={binding.chatId}
                      binding={binding}
                      workspaces={workspaces}
                      workspaceById={workspaceById}
                      sessionById={sessionById}
                      sessionsByWorkspaceId={sessionsByWorkspaceId}
                      onUpdate={handleUpdate}
                      onArchive={handleArchive}
                      onRemove={handleRemove}
                    />
                  ))}
                </SettingsCard>
              </div>
            )}

            {visibleBindings.length < filteredBindings.length && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVisibleLimit((limit) => limit + FEISHU_BINDING_PAGE_SIZE)}
                >
                  {t('settingsIntegrations.feishu.binding.loadMore', { shown: visibleBindings.length, total: filteredBindings.length })}
                </Button>
              </div>
            )}
          </div>
        )}
      </SettingsSection>
    </div>
  )
}

// ===== 扫码注册 Dialog =====

/** 扫码成功页底部的"下一步推荐"：把 CLI 提示词一键复制，让用户去 Agent 会话里跑 */
function CliRecommendationCard(): React.ReactElement {
  const t = useT()
  const [copied, setCopied] = React.useState(false)

  const handleCopy = React.useCallback(() => {
    copyTextToClipboard(FEISHU_CLI_PROMPT).then(() => {
      setCopied(true)
      toast.success(t('settingsIntegrations.feishu.cli.copiedToastShort'))
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      toast.error(t('settingsIntegrations.shared.copyFailed'))
    })
  }, [t])

  return (
    <div className="w-full rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-3 space-y-2">
      <div className="flex items-start gap-2">
        <div className="flex-1 text-xs text-foreground/80 leading-relaxed">
          <div className="font-medium text-foreground mb-0.5">{t('settingsIntegrations.feishu.cli.recommendTitle')}</div>
          {t('settingsIntegrations.feishu.cli.recommendDesc')}
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={handleCopy}
        className="gap-1.5 w-full"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        <span>{copied ? t('settingsIntegrations.feishu.cli.copied') : t('settingsIntegrations.feishu.cli.copyPrompt')}</span>
      </Button>
    </div>
  )
}

interface RegisterFeishuDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 注册成功后回调，返回主进程拿到的 App ID/Secret、平台域与扫码用户身份；上层应在此处保存配置并启动 Bot */
  onSuccess: (result: { appId: string; appSecret: string; tenantBrand?: FeishuDomain; operatorOpenId?: string }) => void
}

/** 扫码注册飞书 Bot：弹窗内全程引导，扫码成功后自动保存配置并启动 Bot */
function RegisterFeishuDialog({ open, onOpenChange, onSuccess }: RegisterFeishuDialogProps): React.ReactElement {
  const t = useT()
  const [qrcode, setQrcode] = React.useState<FeishuRegisterAppQRCode | null>(null)
  const [status, setStatus] = React.useState<FeishuRegisterAppStatus | null>(null)
  const [phase, setPhase] = React.useState<'idle' | 'qrcode' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = React.useState<string>('')

  // 用 ref 持有最新的 onSuccess，避免依赖 onSuccess 后回调引用变化触发整个 effect 重启
  // 重启会调 cancelFeishuRegistration 中断当前正在等待扫码的流程
  const onSuccessRef = React.useRef(onSuccess)
  React.useLayoutEffect(() => {
    onSuccessRef.current = onSuccess
  })

  // 弹窗打开 → 监听推送 + 启动注册；关闭 → 解监听 + 取消
  React.useEffect(() => {
    if (!open) return

    let cancelled = false
    setPhase('idle')
    setErrorMsg('')
    setQrcode(null)
    setStatus(null)

    const offQr = window.electronAPI.onFeishuRegisterQrcode((payload) => {
      setQrcode(payload)
      setPhase('qrcode')
    })
    const offStatus = window.electronAPI.onFeishuRegisterStatus((payload) => {
      setStatus(payload)
    })

    window.electronAPI.registerFeishuApp()
      .then((result) => {
        if (cancelled) return
        setPhase('success')
        onSuccessRef.current({
          appId: result.appId,
          appSecret: result.appSecret,
          tenantBrand: result.tenantBrand,
          operatorOpenId: result.operatorOpenId,
        })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : String(err)
        // SDK 在 abort 时抛出的错误，关闭弹窗时不显示
        if (msg.includes('aborted') || msg.includes('Abort')) return
        setPhase('error')
        setErrorMsg(msg)
      })

    return () => {
      cancelled = true
      offQr()
      offStatus()
      window.electronAPI.cancelFeishuRegistration().catch(() => {})
    }
  }, [open])

  const handleOpenInBrowser = React.useCallback(() => {
    if (qrcode?.url) {
      window.electronAPI.openExternal(qrcode.url)
    }
  }, [qrcode])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode size={18} className="text-primary" />
            {t('settingsIntegrations.feishu.register.title')}
          </DialogTitle>
          <DialogDescription>
            {t('settingsIntegrations.feishu.register.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 py-2">
          {phase === 'idle' && (
            <div className="flex flex-col items-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 size={24} className="animate-spin" />
              <span>{t('settingsIntegrations.feishu.register.requestingQr')}</span>
            </div>
          )}

          {phase === 'qrcode' && qrcode && (
            <>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                {qrcode.dataUrl ? (
                  <img
                    src={qrcode.dataUrl}
                    alt={t('settingsIntegrations.feishu.register.qrAlt')}
                    className="w-[240px] h-[240px] block"
                  />
                ) : (
                  <div className="w-[240px] h-[240px] flex items-center justify-center text-xs text-muted-foreground">
                    {t('settingsIntegrations.feishu.register.qrFailed')}
                  </div>
                )}
              </div>
              <div className="text-sm text-foreground text-center">
                {t('settingsIntegrations.feishu.register.scanHint')}
              </div>
              <div className="text-xs text-muted-foreground text-center">
                {status?.status === 'polling' && t('settingsIntegrations.feishu.register.statusPolling')}
                {status?.status === 'slow_down' && t('settingsIntegrations.feishu.register.statusSlowDown')}
                {status?.status === 'domain_switched' && t('settingsIntegrations.feishu.register.statusDomainSwitched')}
                {!status && t('settingsIntegrations.feishu.register.statusReady')}
              </div>
              <Button
                variant="link"
                size="sm"
                onClick={handleOpenInBrowser}
                className="h-auto p-0 text-xs"
              >
                {t('settingsIntegrations.feishu.register.openInBrowser')}
              </Button>
            </>
          )}

          {phase === 'success' && (
            <div className="w-full flex flex-col items-center gap-4 py-2">
              <div className="flex flex-col items-center gap-2 text-sm">
                <CheckCircle2 size={32} className="text-green-600" />
                <span className="text-foreground font-medium">{t('settingsIntegrations.feishu.register.successTitle')}</span>
                <span className="text-xs text-muted-foreground">{t('settingsIntegrations.feishu.register.startingBot')}</span>
              </div>

              {/* 推荐：补全飞书 CLI 获得完整生态体验 */}
              <CliRecommendationCard />
            </div>
          )}

          {phase === 'error' && (
            <div className="flex flex-col items-center gap-2 py-8 text-sm">
              <XCircle size={32} className="text-red-600" />
              <span className="text-foreground font-medium">{t('settingsIntegrations.feishu.register.errorTitle')}</span>
              <span className="text-xs text-muted-foreground text-center max-w-[300px]">{errorMsg || t('settingsIntegrations.feishu.register.unknownError')}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {phase === 'success' ? t('common.close') : t('common.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// 用于将新名称生成的占位符（参考 handleAddBot 的命名规则保持一致）
function defaultBotName(t: TranslateFn, index: number): string {
  return t('settingsIntegrations.feishu.defaultBotName', { n: index + 1 })
}

// ===== Session 镜像设置 =====

function normalizeSessionMirrorSettings(settings: FeishuSessionMirrorSettings | undefined): FeishuSessionMirrorSettings {
  return settings?.mode === 'stream'
    ? { mode: 'stream', botId: settings.botId }
    : { mode: 'off' }
}

function SessionMirrorSection({ bots }: { bots: FeishuBotConfig[] }): React.ReactElement {
  const t = useT()
  const [settings, setSettings] = React.useState<FeishuSessionMirrorSettings>({ mode: 'off' })
  const [bindings, setBindings] = React.useState<FeishuChatBinding[]>([])
  const enabledBots = React.useMemo(
    () => bots.filter((bot) => bot.enabled && bot.appId),
    [bots],
  )
  const selectedBot = React.useMemo(
    () => enabledBots.find((bot) => bot.id === settings.botId),
    [enabledBots, settings.botId],
  )
  const selectedBotHasBinding = React.useMemo(
    () => Boolean(settings.botId && bindings.some((binding) =>
      !binding.archived && binding.botId === settings.botId && binding.userId && binding.userId !== 'unknown'
    )),
    [bindings, settings.botId],
  )
  const showBotBindingWarning = settings.mode === 'stream' && Boolean(settings.botId) && !selectedBotHasBinding

  React.useEffect(() => {
    window.electronAPI.getSettings()
      .then((appSettings) => {
        setSettings(normalizeSessionMirrorSettings(appSettings.feishuSessionMirror))
      })
      .catch(() => {})

    window.electronAPI.listFeishuBindings()
      .then(setBindings)
      .catch(() => {})
  }, [])

  const saveSettings = React.useCallback(async (next: FeishuSessionMirrorSettings) => {
    setSettings(next)
    try {
      await window.electronAPI.updateSettings({ feishuSessionMirror: next })
      toast.success(t('settingsIntegrations.feishu.sync.savedToast'))
    } catch {
      toast.error(t('settingsIntegrations.feishu.sync.saveFailed'))
    }
  }, [t])

  const handleModeChange = React.useCallback((value: string) => {
    const mode = value as FeishuSessionSyncMode
    const fallbackBotId = settings.botId ?? enabledBots[0]?.id
    const next: FeishuSessionMirrorSettings = mode === 'stream'
      ? { mode, botId: fallbackBotId }
      : { mode, botId: settings.botId }
    saveSettings(next).catch(() => {})
  }, [enabledBots, saveSettings, settings.botId])

  const handleBotChange = React.useCallback((botId: string) => {
    saveSettings({ ...settings, botId }).catch(() => {})
  }, [saveSettings, settings])

  return (
    <SettingsSection
      title={t('settingsIntegrations.feishu.sync.title')}
      description={t('settingsIntegrations.feishu.sync.description')}
    >
      <SettingsCard divided={false}>
        <div className="px-4 py-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-[180px_1fr] md:items-center">
            <div className="text-sm font-medium text-foreground">{t('settingsIntegrations.feishu.sync.modeLabel')}</div>
            <Select value={settings.mode} onValueChange={handleModeChange}>
              <SelectTrigger className="h-9">
                <SelectValue>{t(`settingsIntegrations.feishu.syncMode.${settings.mode}`)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">{t('settingsIntegrations.feishu.syncMode.off')}</SelectItem>
                <SelectItem value="stream">{t('settingsIntegrations.feishu.syncMode.stream')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 md:grid-cols-[180px_1fr] md:items-center">
            <div className="text-sm font-medium text-foreground">{t('settingsIntegrations.feishu.sync.botLabel')}</div>
            <Select
              value={settings.botId ?? ''}
              onValueChange={handleBotChange}
              disabled={enabledBots.length === 0}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder={enabledBots.length === 0 ? t('settingsIntegrations.feishu.sync.enableBotFirst') : t('settingsIntegrations.feishu.sync.selectBot')} />
              </SelectTrigger>
              <SelectContent>
                {enabledBots.map((bot) => (
                  <SelectItem key={bot.id} value={bot.id}>{bot.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-blue-500/10 px-3 py-3 text-xs text-blue-700 dark:text-blue-300">
            <MessageSquare size={15} className="mt-0.5 flex-shrink-0" />
            <div className="leading-relaxed">
              {t('settingsIntegrations.feishu.sync.streamNote')}
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-3 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
            <div className="space-y-1 leading-relaxed">
              <div className="font-medium text-amber-900 dark:text-amber-200">{t('settingsIntegrations.feishu.sync.permissionTitle')}</div>
              <div>
                {t('settingsIntegrations.feishu.sync.permissionIntro')}
              </div>
              <div className="flex flex-col gap-1 pl-1">
                <div>
                  <code className="rounded bg-amber-500/15 px-1 py-0.5 text-[11px] text-amber-900 dark:text-amber-100">im:message.group_msg</code>
                  {' '}{t('settingsIntegrations.feishu.sync.permGroupMsg')}
                </div>
                <div>
                  <code className="rounded bg-amber-500/15 px-1 py-0.5 text-[11px] text-amber-900 dark:text-amber-100">im:chat</code>
                  {' '}{t('settingsIntegrations.feishu.sync.permChat')}
                </div>
              </div>
              <div>
                {t('settingsIntegrations.feishu.sync.permissionFooter')}
              </div>
            </div>
          </div>

          {showBotBindingWarning && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-3 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
              <div className="leading-relaxed">
                {t('settingsIntegrations.feishu.sync.bindingWarning', { botName: selectedBot?.name ?? t('settingsIntegrations.feishu.sync.defaultBotName') })}
              </div>
            </div>
          )}
        </div>
      </SettingsCard>
    </SettingsSection>
  )
}

// ===== 单个 Bot 配置卡片 =====

interface BotConfigCardProps {
  bot: FeishuBotConfig
  state: FeishuBotBridgeState | undefined
  onSaved: () => void
  onRemoved: () => void
}

function BotConfigCard({ bot, state, onSaved, onRemoved }: BotConfigCardProps): React.ReactElement {
  const t = useT()
  const setBotStates = useSetAtom(feishuBotStatesAtom)
  const [name, setName] = React.useState(bot.name)
  const [appId, setAppId] = React.useState(bot.appId)
  const [domain, setDomain] = React.useState<FeishuDomain>(bot.domain ?? 'feishu')
  const [appSecret, setAppSecret] = React.useState('')
  const [testing, setTesting] = React.useState(false)
  const [testResult, setTestResult] = React.useState<FeishuTestResult | null>(null)
  const [expanded, setExpanded] = React.useState(!bot.appId) // 新建的 Bot 默认展开

  // 加载已有 secret（使用 bot-specific API）
  React.useEffect(() => {
    if (bot.appSecret && bot.id) {
      window.electronAPI.getDecryptedFeishuBotSecret?.(bot.id)
        .then((s: string) => { if (s) setAppSecret(s) })
        .catch(() => {
          // 回退到旧 API（兼容迁移前的首个 Bot）
          window.electronAPI.getDecryptedFeishuSecret?.()
            .then((s: string) => { if (s) setAppSecret(s) })
            .catch(() => {})
        })
    }
  }, [bot.id, bot.appSecret])

  const statusConfig = state ? STATUS_CONFIG[state.status] : STATUS_CONFIG.disconnected
  const isConnected = state?.status === 'connected' || state?.status === 'connecting'

  const handleSave = React.useCallback(async () => {
    if (!appId.trim() || !name.trim()) return
    try {
      await window.electronAPI.saveFeishuBotConfig({
        id: bot.id,
        name: name.trim(),
        enabled: true,
        appId: appId.trim(),
        appSecret: appSecret || '',
        domain,
        defaultWorkspaceId: bot.defaultWorkspaceId,
        defaultChannelId: bot.defaultChannelId,
        defaultModelId: bot.defaultModelId,
      })
      toast.success(t('settingsIntegrations.shared.botSaved', { name }))
      onSaved()
    } catch {
      toast.error(t('settingsIntegrations.shared.saveFailed'))
    }
  }, [bot.id, name, appId, appSecret, domain, onSaved, t])

  const handleTest = React.useCallback(async () => {
    if (!appId.trim() || !appSecret.trim()) return
    setTesting(true)
    setTestResult(null)
    try {
      const result = await window.electronAPI.testFeishuConnection(appId.trim(), appSecret.trim(), domain)
      setTestResult(result)
    } catch (err) {
      setTestResult({ success: false, message: t('settingsIntegrations.shared.testFailed', { message: err instanceof Error ? err.message : String(err) }) })
    } finally {
      setTesting(false)
    }
  }, [appId, appSecret, domain, t])

  /** 操作完成后主动拉取最新状态，确保 UI 同步 */
  const refreshBotStates = React.useCallback(async () => {
    try {
      const multiState = await window.electronAPI.getFeishuMultiStatus?.()
      if (multiState?.bots) {
        setBotStates(multiState.bots)
      }
    } catch { /* 忽略 */ }
  }, [setBotStates])

  const handleToggle = React.useCallback(async () => {
    if (isConnected) {
      await window.electronAPI.stopFeishuBot(bot.id)
      toast.success(t('settingsIntegrations.shared.botStopped', { name: bot.name }))
      await refreshBotStates()
    } else {
      // 启动是异步的（10-15秒），不阻塞等待完成
      // 先发起启动请求，然后轮询状态直到连接成功或失败
      window.electronAPI.startFeishuBot(bot.id).catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : t('settingsIntegrations.shared.startFailed'))
        refreshBotStates()
      })
      // 短暂等待让主进程设置 connecting 状态
      await new Promise((r) => setTimeout(r, 300))
      await refreshBotStates()
      // 轮询直到状态不再是 connecting
      const poll = setInterval(async () => {
        try {
          const multiState = await window.electronAPI.getFeishuMultiStatus?.()
          if (multiState?.bots) {
            setBotStates(multiState.bots)
            const botState = multiState.bots[bot.id]
            if (!botState || botState.status !== 'connecting') {
              clearInterval(poll)
              if (botState?.status === 'connected') {
                toast.success(t('settingsIntegrations.shared.botConnected', { name: bot.name }))
              }
            }
          }
        } catch {
          clearInterval(poll)
        }
      }, 1000)
      // 安全超时：60秒后停止轮询
      setTimeout(() => clearInterval(poll), 60_000)
    }
  }, [bot.id, bot.name, isConnected, refreshBotStates, setBotStates, t])

  const handleRemove = React.useCallback(async () => {
    try {
      await window.electronAPI.removeFeishuBot(bot.id)
      toast.success(t('settingsIntegrations.shared.botDeleted', { name: bot.name }))
      onRemoved()
    } catch {
      toast.error(t('settingsIntegrations.shared.deleteFailed'))
    }
  }, [bot.id, bot.name, onRemoved, t])

  return (
    <SettingsCard>
      {/* 头部：名称 + 状态 + 展开/折叠 */}
      <div
        role="button"
        tabIndex={0}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(!expanded) } }}
      >
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusConfig.color}`} />
          <span className="font-medium text-sm">{bot.name || t('settingsIntegrations.shared.unnamedBot')}</span>
          <span className="text-xs text-muted-foreground">{bot.appId ? bot.appId.slice(0, 12) + '...' : t('settingsIntegrations.shared.notConfigured')}</span>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleToggle() }}>
              <PowerOff size={14} className="mr-1" />
              {t('settingsIntegrations.shared.stop')}
            </Button>
          ) : bot.appId ? (
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleToggle() }}
              disabled={state?.status === 'connecting'}>
              {state?.status === 'connecting' ? <Loader2 size={14} className="animate-spin mr-1" /> : <Power size={14} className="mr-1" />}
              {t('settingsIntegrations.shared.start')}
            </Button>
          ) : null}
          <span className="text-xs text-muted-foreground">{expanded ? '▾' : '▸'}</span>
        </div>
      </div>

      {/* 展开的配置表单 */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
          <SettingsInput
            label={t('settingsIntegrations.shared.botName')}
            value={name}
            onChange={setName}
            placeholder={t('settingsIntegrations.shared.botNamePlaceholder')}
          />
          <SettingsInput
            label="App ID"
            value={appId}
            onChange={setAppId}
            placeholder="cli_xxxxxxxxxx"
          />
          <SettingsSecretInput
            label="App Secret"
            value={appSecret}
            onChange={setAppSecret}
            placeholder={t('settingsIntegrations.feishu.enterAppSecret')}
          />

          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('settingsIntegrations.feishu.domainLabel')}</label>
            <Select value={domain} onValueChange={(value) => setDomain(value as FeishuDomain)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="feishu">{t('settingsIntegrations.feishu.domainFeishu')}</SelectItem>
                <SelectItem value="lark">{t('settingsIntegrations.feishu.domainLark')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" onClick={handleTest}
              disabled={testing || !appId.trim() || !appSecret.trim()}>
              {testing && <Loader2 size={14} className="animate-spin" />}
              <span>{testing ? t('settingsIntegrations.shared.testing') : t('settingsIntegrations.shared.testConnection')}</span>
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!appId.trim() || !name.trim()}>
              {t('settingsIntegrations.shared.saveConfig')}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive">
                  <Trash2 size={14} className="mr-1" />
                  {t('common.delete')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('settingsIntegrations.shared.confirmDelete')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('settingsIntegrations.feishu.deleteBotDesc', { name: bot.name })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRemove}>{t('common.delete')}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {testResult && (
            <div className={cn(
              'p-3 rounded-lg flex items-start gap-2 text-sm',
              testResult.success ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-red-500/10 text-red-700 dark:text-red-400'
            )}>
              {testResult.success
                ? <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
                : <XCircle size={16} className="flex-shrink-0 mt-0.5" />
              }
              <span>{testResult.message}{testResult.botName && t('settingsIntegrations.shared.testBotNameSuffix', { name: testResult.botName })}</span>
            </div>
          )}

          {state?.status === 'error' && state.errorMessage && (
            <div className="p-2.5 rounded-lg bg-red-500/10 text-red-700 dark:text-red-400 text-sm">
              {state.errorMessage}
            </div>
          )}
        </div>
      )}
    </SettingsCard>
  )
}

// ===== Bot 配置 Tab（多 Bot 版本）=====

function FeishuConfigTab(): React.ReactElement {
  const t = useT()
  const botStates = useAtomValue(feishuBotStatesAtom)
  const setBotStates = useSetAtom(feishuBotStatesAtom)
  const [bots, setBots] = React.useState<FeishuBotConfig[]>([])
  const [loading, setLoading] = React.useState(true)

  const loadBots = React.useCallback(async () => {
    try {
      const config = await window.electronAPI.getFeishuMultiConfig()
      setBots(config.bots)
    } catch {
      // fallback: 旧 API
      try {
        const oldConfig = await window.electronAPI.getFeishuConfig()
        if (oldConfig.appId) {
          setBots([{
            id: 'legacy',
            name: t('settingsIntegrations.feishu.legacyBotName'),
            enabled: oldConfig.enabled,
            appId: oldConfig.appId,
            appSecret: oldConfig.appSecret,
          }])
        }
      } catch { /* ignore */ }
    } finally {
      setLoading(false)
    }
  }, [t])

  // 进入 Tab 时同步最新状态，避免因启动时序问题导致颜色显示错误
  const refreshStates = React.useCallback(async () => {
    try {
      const multiState = await window.electronAPI.getFeishuMultiStatus?.()
      if (multiState?.bots) {
        setBotStates(multiState.bots)
      }
    } catch { /* 忽略 */ }
  }, [setBotStates])

  React.useEffect(() => {
    loadBots()
    refreshStates()
  }, [loadBots, refreshStates])

  const handleAddBot = React.useCallback(async () => {
    try {
      const saved = await window.electronAPI.saveFeishuBotConfig({
        name: defaultBotName(t, bots.length),
        enabled: false,
        appId: '',
        appSecret: '',
        defaultWorkspaceId: undefined,
        defaultChannelId: undefined,
        defaultModelId: undefined,
      })
      setBots((prev) => [...prev, saved])
    } catch {
      toast.error(t('settingsIntegrations.shared.createBotFailed'))
    }
  }, [bots.length, t])

  const [registerOpen, setRegisterOpen] = React.useState(false)

  /** 扫码成功后：保存配置 + 自动启动 Bot */
  const handleRegisterSuccess = React.useCallback(async (result: { appId: string; appSecret: string; tenantBrand?: FeishuDomain; operatorOpenId?: string }) => {
    try {
      const saved = await window.electronAPI.saveFeishuBotConfig({
        name: defaultBotName(t, bots.length),
        enabled: true,
        appId: result.appId,
        appSecret: result.appSecret,
        defaultWorkspaceId: undefined,
        defaultChannelId: undefined,
        defaultModelId: undefined,
        domain: result.tenantBrand === 'lark' ? 'lark' : 'feishu',
        operatorOpenId: result.operatorOpenId,
      })
      setBots((prev) => [...prev, saved])
      toast.success(t('settingsIntegrations.shared.botCreated', { name: saved.name }))
      // 自动启动 Bot（不阻塞 UI）
      window.electronAPI.startFeishuBot(saved.id).catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : t('settingsIntegrations.feishu.autoStartFailed'))
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('settingsIntegrations.shared.saveFailed'))
    }
  }, [bots.length, t])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* 视频教程（顶部最显眼处，未配置 URL 时自动隐藏） */}
      <FeishuTutorialVideo />

      <RegisterFeishuDialog
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        onSuccess={handleRegisterSuccess}
      />

      {/* Bot 列表 */}
      <SettingsSection
        title={t('settingsIntegrations.feishu.botListTitle')}
        description={t('settingsIntegrations.feishu.botListDesc')}
        action={
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setRegisterOpen(true)}>
              <QrCode size={14} className="mr-1.5" />
              {t('settingsIntegrations.feishu.scanCreate')}
            </Button>
            <Button size="sm" variant="outline" onClick={handleAddBot}>
              <Plus size={14} className="mr-1.5" />
              {t('settingsIntegrations.feishu.addManually')}
            </Button>
          </div>
        }
      >
        {bots.length === 0 ? (
          <SettingsCard divided={false}>
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t('settingsIntegrations.feishu.botListEmpty')}
            </div>
          </SettingsCard>
        ) : (
          <div className="space-y-3">
            {bots.map((bot) => (
              <BotConfigCard
                key={bot.id}
                bot={bot}
                state={botStates[bot.id]}
                onSaved={loadBots}
                onRemoved={loadBots}
              />
            ))}
          </div>
        )}
      </SettingsSection>

      <SessionMirrorSection bots={bots} />

      {/* 手动创建飞书 Bot 引导 */}
      <SettingsSection
        title={t('settingsIntegrations.feishu.guide.title')}
        description={t('settingsIntegrations.feishu.guide.description')}
      >
        <SettingsCard divided={false}>
          <div className="px-4 py-4 space-y-5 text-sm">
            {/* 步骤 1 */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">1</span>
                <span className="font-medium text-foreground">{t('settingsIntegrations.feishu.guide.step1Title')}</span>
              </div>
              <p className="pl-7 text-muted-foreground">
                {t('settingsIntegrations.feishu.guide.step1Before')}
                <Link href="https://open.feishu.cn/app">{t('settingsIntegrations.feishu.guide.step1FeishuOpen')}</Link>
                {t('settingsIntegrations.feishu.guide.step1Overseas')}
                <Link href="https://open.larksuite.com/app">{t('settingsIntegrations.feishu.guide.step1LarkOpen')}</Link>
                {t('settingsIntegrations.feishu.guide.step1After')}
              </p>
            </div>

            {/* 步骤 2 */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">2</span>
                <span className="font-medium text-foreground">{t('settingsIntegrations.feishu.guide.step2Title')}</span>
              </div>
              <p className="pl-7 text-muted-foreground">
                {t('settingsIntegrations.feishu.guide.step2Before')}
                <span className="text-foreground font-medium">App ID</span>
                {t('settingsIntegrations.feishu.guide.step2Mid')}
                <span className="text-foreground font-medium">App Secret</span>
                {t('settingsIntegrations.feishu.guide.step2After')}
              </p>
            </div>

            {/* 步骤 3 */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">3</span>
                <span className="font-medium text-foreground">{t('settingsIntegrations.feishu.guide.step3Title')}</span>
              </div>
              <p className="pl-7 text-muted-foreground">
                {t('settingsIntegrations.feishu.guide.step3Desc')}
              </p>
            </div>

            {/* 步骤 4 */}
            <PermissionsStep />

            {/* 步骤 5 */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">5</span>
                <span className="font-medium text-foreground">{t('settingsIntegrations.feishu.guide.step5Title')}</span>
              </div>
              <div className="pl-7 space-y-2 text-muted-foreground">
                <p>
                  {t('settingsIntegrations.feishu.guide.step5Intro')}
                </p>
                <div className="space-y-1.5">
                  <div className="text-foreground/80 font-medium text-xs">{t('settingsIntegrations.feishu.guide.step5EventTitle')}</div>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>
                      {t('settingsIntegrations.feishu.guide.step5EventBefore')}
                      <span className="text-foreground font-medium">{t('settingsIntegrations.feishu.guide.step5EventMethod')}</span>
                      {t('settingsIntegrations.feishu.guide.step5EventAfter')}
                    </li>
                    <li>
                      {t('settingsIntegrations.feishu.guide.step5EventAddBefore')}
                      <code className="bg-muted/50 px-1.5 py-0.5 rounded text-xs text-foreground/80">im.message.receive_v1</code>
                      {t('settingsIntegrations.feishu.guide.step5EventAddAfter')}
                    </li>
                  </ol>
                </div>
                <div className="space-y-1.5">
                  <div className="text-foreground/80 font-medium text-xs">{t('settingsIntegrations.feishu.guide.step5CallbackTitle')}</div>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>
                      {t('settingsIntegrations.feishu.guide.step5CallbackBefore')}
                      <span className="text-foreground font-medium">{t('settingsIntegrations.feishu.guide.step5CallbackMethod')}</span>
                    </li>
                    <li>
                      {t('settingsIntegrations.feishu.guide.step5CallbackAddBefore')}
                      <code className="bg-muted/50 px-1.5 py-0.5 rounded text-xs text-foreground/80">card.action.trigger</code>
                      {t('settingsIntegrations.feishu.guide.step5CallbackAddAfter')}
                    </li>
                  </ol>
                </div>
              </div>
            </div>

            {/* 步骤 6 */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">6</span>
                <span className="font-medium text-foreground">{t('settingsIntegrations.feishu.guide.step6Title')}</span>
              </div>
              <p className="pl-7 text-muted-foreground">
                {t('settingsIntegrations.feishu.guide.step6Before')}
                <Link href="https://feishu.cn/admin">{t('settingsIntegrations.feishu.guide.step6AdminConsole')}</Link>
                {t('settingsIntegrations.feishu.guide.step6After')}
              </p>
            </div>

            {/* 提示 */}
            <div className="pl-7 p-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs">
              {t('settingsIntegrations.feishu.guide.tip')}
            </div>
          </div>
        </SettingsCard>
      </SettingsSection>

      {/* 飞书 CLI 配置引导 */}
      <FeishuCliSection />

    </div>
  )
}

// ===== 主组件 =====

export function FeishuSettings(): React.ReactElement {
  const t = useT()
  const [activeTab, setActiveTab] = React.useState<FeishuTab>('config')

  return (
    <div className="space-y-6">
      {/* Tab 切换栏 */}
      <div className="inline-flex rounded-lg bg-muted p-1 gap-0.5">
        {TAB_OPTIONS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              activeTab === tab.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t(`settingsIntegrations.feishu.${tab.labelKey}`)}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      {activeTab === 'config' ? <FeishuConfigTab /> : <FeishuBindingsTab />}
    </div>
  )
}
