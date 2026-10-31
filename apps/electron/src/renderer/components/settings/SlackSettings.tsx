import * as React from 'react'
import { useAtomValue } from 'jotai'
import { CheckCircle2, Copy, ExternalLink, Hash, Loader2, Plus, Power, PowerOff, Trash2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { SlackBotBridgeState, SlackBotSettingsConfig, SlackBridgeStatus, SlackTestResult } from '@proma/shared'
import { Button } from '@/components/ui/button'
import { SettingsCard } from './primitives/SettingsCard'
import { SettingsInput } from './primitives/SettingsInput'
import { SettingsSecretInput } from './primitives/SettingsSecretInput'
import { SettingsSection } from './primitives/SettingsSection'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { copyTextToClipboard } from '@/lib/clipboard'
import { cn } from '@/lib/utils'
import { useT } from '@/i18n'
import { slackBotStatesAtom } from '@/atoms/slack-atoms'

const STATUS: Record<SlackBridgeStatus, { label: SlackBridgeStatus; color: string }> = {
  disconnected: { label: 'disconnected', color: 'bg-muted-foreground/50' },
  connecting: { label: 'connecting', color: 'bg-amber-400 animate-pulse' },
  connected: { label: 'connected', color: 'bg-emerald-500' },
  error: { label: 'error', color: 'bg-red-500' },
}

function openLink(url: string): void {
  window.electronAPI.openExternal(url)
}

function Link({ href, children }: { href: string; children: React.ReactNode }): React.ReactElement {
  return <button type="button" className="inline-flex items-center gap-1 text-primary hover:underline active:scale-[0.96] transition-transform" onClick={() => openLink(href)}>
    {children}<ExternalLink className="size-3" />
  </button>
}

export function SlackSettings(): React.ReactElement {
  const t = useT()
  const states = useAtomValue(slackBotStatesAtom)
  const [bots, setBots] = React.useState<SlackBotSettingsConfig[]>([])
  const [loading, setLoading] = React.useState(true)

  const reload = React.useCallback(async () => {
    try {
      setBots((await window.electronAPI.getSlackConfig()).bots)
    } catch (error) {
      console.error('[SlackSettings] 加载配置失败:', error)
      toast.error(t('settingsIntegrations.slack.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  React.useEffect(() => { void reload() }, [reload])

  const addBot = React.useCallback(async () => {
    try {
      const saved = await window.electronAPI.saveSlackBotConfig({
        name: 'Locus',
        enabled: false,
        botToken: '',
        appToken: '',
      })
      setBots((previous) => [...previous, saved])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('settingsIntegrations.slack.createFailed'))
    }
  }, [bots.length, t])

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>

  return <div className="space-y-8 antialiased">
    <SettingsSection
      title="Slack Bot"
      description={t('settingsIntegrations.slack.description')}
      action={<Button size="sm" variant="outline" onClick={addBot} className="active:scale-[0.96] transition-transform"><Plus className="mr-1.5 size-4" />{t('settingsIntegrations.shared.addBot')}</Button>}
    >
      {bots.length === 0 ? <SettingsCard divided={false}>
        <div className="px-4 py-10 text-center">
          <Hash className="mx-auto mb-3 size-7 text-muted-foreground/60" />
          <p className="text-sm font-medium text-foreground">{t('settingsIntegrations.slack.emptyTitle')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t('settingsIntegrations.slack.emptyDesc')}</p>
        </div>
      </SettingsCard> : <div className="space-y-3">
        {bots.map((bot) => <SlackBotCard key={bot.id} bot={bot} state={states[bot.id]} onChanged={reload} />)}
      </div>}
    </SettingsSection>

    <SettingsSection title={t('settingsIntegrations.slack.guideTitle')} description={t('settingsIntegrations.slack.guideDesc')}>
      <SettingsCard divided={false}>
        <ol className="space-y-4 px-4 py-5 text-sm text-muted-foreground">
          <li className="flex gap-3"><Step n="1" /><span>{t('settingsIntegrations.slack.guide1Before')}<strong className="font-medium text-foreground">{t('settingsIntegrations.shared.addBot')}</strong>{t('settingsIntegrations.slack.guide1Mid')}<code className="rounded bg-muted px-1 py-0.5">Locus</code>{t('settingsIntegrations.slack.guide1After')}</span></li>
          <li className="flex gap-3"><Step n="2" /><span>{t('settingsIntegrations.slack.guide2Before')}<Link href="https://api.slack.com/apps">Slack API</Link>{t('settingsIntegrations.slack.guide2Mid1')}<strong className="font-medium text-foreground">Create New App → From an app manifest</strong>{t('settingsIntegrations.slack.guide2Mid2')}<strong className="font-medium text-foreground">Save Changes</strong>{t('settingsIntegrations.slack.guide2After')}</span></li>
          <li className="flex gap-3"><Step n="3" /><span>{t('settingsIntegrations.slack.guide3Before')}<strong className="font-medium text-foreground">Socket Mode</strong>{t('settingsIntegrations.slack.guide3Mid1')}<strong className="font-medium text-foreground">App Level Token</strong> → <strong className="font-medium text-foreground">Generate Token and Scopes</strong>{t('settingsIntegrations.slack.guide3Mid2')}<code className="rounded bg-muted px-1 py-0.5">connections:write</code>{t('settingsIntegrations.slack.guide3Mid3')}<code className="rounded bg-muted px-1 py-0.5">xapp-…</code>{t('settingsIntegrations.slack.guide3End')}</span></li>
          <li className="flex gap-3"><Step n="4" /><span>{t('settingsIntegrations.slack.guide4Before')}<strong className="font-medium text-foreground">Install App</strong>{t('settingsIntegrations.slack.guide4Mid1')}<strong className="font-medium text-foreground">Install to Workspace</strong>{t('settingsIntegrations.slack.guide4Mid2')}<code className="rounded bg-muted px-1 py-0.5">xoxb-…</code>{t('settingsIntegrations.slack.guide4End')}</span></li>
          <li className="flex gap-3"><Step n="5" /><span>{t('settingsIntegrations.slack.guide5Before')}<code className="rounded bg-muted px-1 py-0.5">xoxb-…</code>{t('settingsIntegrations.slack.guide5Mid1')}<code className="rounded bg-muted px-1 py-0.5">xapp-…</code>{t('settingsIntegrations.slack.guide5Mid2')}<strong className="font-medium text-foreground">{t('settingsIntegrations.slack.testToken')}</strong>{t('settingsIntegrations.slack.guide5Mid3')}<strong className="font-medium text-foreground">{t('settingsIntegrations.slack.saveAndConnect')}</strong>{t('settingsIntegrations.slack.guide5End')}</span></li>
          <li className="flex gap-3"><Step n="6" /><span>{t('settingsIntegrations.slack.guide6Before')}<strong className="font-medium text-foreground">@Locus</strong>{t('settingsIntegrations.slack.guide6After')}</span></li>
        </ol>
      </SettingsCard>
    </SettingsSection>
  </div>
}

function Step({ n }: { n: string }): React.ReactElement {
  return <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{n}</span>
}

function SlackBotCard({ bot, state, onChanged }: { bot: SlackBotSettingsConfig; state?: SlackBotBridgeState; onChanged: () => Promise<void> }): React.ReactElement {
  const t = useT()
  const [name, setName] = React.useState(bot.name)
  const [botToken, setBotToken] = React.useState('')
  const [appToken, setAppToken] = React.useState('')
  const [homeChannel, setHomeChannel] = React.useState(bot.homeChannelId ?? '')
  const [expanded, setExpanded] = React.useState(!bot.hasBotToken || !bot.hasAppToken)
  const [testing, setTesting] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [testResult, setTestResult] = React.useState<SlackTestResult | null>(null)
  const [manifestCopied, setManifestCopied] = React.useState(false)

  const status = STATUS[state?.status ?? 'disconnected']
  const connected = state?.status === 'connected' || state?.status === 'connecting'
  const hasBotToken = Boolean(bot.hasBotToken || botToken.trim())
  const hasAppToken = Boolean(bot.hasAppToken || appToken.trim())

  const copyManifest = React.useCallback(async () => {
    const { json } = await window.electronAPI.getSlackManifest({ botName: name.trim() || 'Locus' })
    await copyTextToClipboard(json)
    setManifestCopied(true)
    window.setTimeout(() => setManifestCopied(false), 1600)
    toast.success(t('settingsIntegrations.slack.manifestCopiedToast'))
  }, [name, t])

  const save = React.useCallback(async () => {
    if (!name.trim() || !hasBotToken || !hasAppToken) {
      toast.error(t('settingsIntegrations.slack.fillRequired'))
      return
    }
    setSaving(true)
    try {
      await window.electronAPI.saveSlackBotConfig({
        id: bot.id,
        name: name.trim(),
        enabled: true,
        botToken: botToken.trim(),
        appToken: appToken.trim(),
        homeChannelId: homeChannel.trim() || undefined,
      })
      await onChanged()
      toast.success(t('settingsIntegrations.slack.savedConnecting'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('settingsIntegrations.slack.saveFailed'))
    } finally {
      setSaving(false)
    }
  }, [appToken, bot.id, botToken, hasAppToken, hasBotToken, homeChannel, name, onChanged, t])

  const test = React.useCallback(async () => {
    setTesting(true); setTestResult(null)
    try { setTestResult(await window.electronAPI.testSlackConnection(botToken.trim())) }
    catch (error) { setTestResult({ success: false, message: error instanceof Error ? error.message : t('settingsIntegrations.slack.testFailedFallback') }) }
    finally { setTesting(false) }
  }, [botToken, t])

  const toggle = React.useCallback(async () => {
    try {
      if (connected) await window.electronAPI.stopSlackBot(bot.id)
      else await window.electronAPI.startSlackBot(bot.id)
    } catch (error) { toast.error(error instanceof Error ? error.message : t('settingsIntegrations.slack.toggleFailed')) }
  }, [bot.id, connected, t])

  const remove = React.useCallback(async () => {
    await window.electronAPI.removeSlackBot(bot.id)
    await onChanged()
    toast.success(t('settingsIntegrations.slack.deleted'))
  }, [bot.id, onChanged, t])

  const detailsId = `slack-bot-details-${bot.id}`

  return <SettingsCard>
    <div className="flex min-h-12 items-center px-4 py-3">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-controls={detailsId}
        className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className={cn('size-2 shrink-0 rounded-full', status.color)} />
          <span className="truncate text-sm font-medium">{bot.name || 'Locus'}</span>
          <span className="hidden text-xs text-muted-foreground sm:inline">{t(`settingsIntegrations.shared.status.${status.label}`)}</span>
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">{expanded ? t('common.collapse') : t('settingsIntegrations.slack.configure')}</span>
      </button>
      {bot.hasBotToken && <Button type="button" size="sm" variant="outline" onClick={() => void toggle()} className="ml-3 min-h-9 shrink-0 active:scale-[0.96] transition-transform">
        {connected ? <><PowerOff className="mr-1 size-3.5" />{t('settingsIntegrations.shared.stop')}</> : <><Power className="mr-1 size-3.5" />{t('settingsIntegrations.shared.start')}</>}
      </Button>}
    </div>
    {expanded && <div id={detailsId} className="space-y-4 border-t border-border/60 px-4 pb-5 pt-4">
      <SettingsInput label={t('settingsIntegrations.slack.appName')} description={t('settingsIntegrations.slack.appNameDesc')} value={name} onChange={setName} placeholder="Locus" />
      <div className="rounded-lg bg-primary/5 px-3 py-3">
        <p className="text-sm font-medium text-foreground">{t('settingsIntegrations.slack.createFirst')}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{t('settingsIntegrations.slack.manifestDesc')}</p>
        <Button type="button" size="sm" variant="outline" onClick={() => void copyManifest()} className="mt-3 min-h-9 active:scale-[0.96] transition-transform">{manifestCopied ? <CheckCircle2 className="mr-1 size-3.5" /> : <Copy className="mr-1 size-3.5" />}{manifestCopied ? t('settingsIntegrations.slack.manifestCopied') : t('settingsIntegrations.slack.copyManifest')}</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2"><SettingsSecretInput label="Bot Token" value={botToken} onChange={setBotToken} placeholder={bot.hasBotToken ? t('settingsIntegrations.slack.tokenSavedPlaceholder') : 'xoxb-…'} /><SettingsSecretInput label="App Token" value={appToken} onChange={setAppToken} placeholder={bot.hasAppToken ? t('settingsIntegrations.slack.tokenSavedPlaceholder') : 'xapp-…'} /></div>
      {(bot.hasBotToken || bot.hasAppToken) && <p className="-mt-2 text-xs text-muted-foreground">{t('settingsIntegrations.slack.tokenNote')}</p>}
      <div className="rounded-lg bg-muted/45 px-3 py-2.5 text-sm"><p className="font-medium">{t('settingsIntegrations.slack.channelAccessTitle')}</p><p className="mt-0.5 text-xs text-muted-foreground">{t('settingsIntegrations.slack.channelAccessBefore')}<code>@{bot.name || 'Locus'}</code>{t('settingsIntegrations.slack.channelAccessAfter')}</p></div>
      <SettingsInput label={t('settingsIntegrations.slack.homeChannelLabel')} description={t('settingsIntegrations.slack.homeChannelDesc')} value={homeChannel} onChange={setHomeChannel} placeholder={t('settingsIntegrations.slack.homeChannelPlaceholder')} />
      <div className="flex flex-wrap items-center gap-2"><Button type="button" size="sm" variant="outline" disabled={testing || !botToken.trim()} onClick={() => void test()} className="min-h-9 active:scale-[0.96] transition-transform">{testing && <Loader2 className="mr-1 size-3.5 animate-spin" />}{t('settingsIntegrations.slack.testToken')}</Button><Button type="button" size="sm" disabled={saving} onClick={() => void save()} className="min-h-9 active:scale-[0.96] transition-transform">{saving && <Loader2 className="mr-1 size-3.5 animate-spin" />}{t('settingsIntegrations.slack.saveAndConnect')}</Button><AlertDialog><AlertDialogTrigger asChild><Button type="button" size="sm" variant="destructive" className="min-h-9 active:scale-[0.96] transition-transform"><Trash2 className="mr-1 size-3.5" />{t('common.delete')}</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('settingsIntegrations.slack.deleteTitle')}</AlertDialogTitle><AlertDialogDescription>{t('settingsIntegrations.slack.deleteDesc')}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => void remove()}>{t('common.delete')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>
      {testResult && <div className={cn('flex items-start gap-2 rounded-lg p-3 text-sm', testResult.success ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-red-500/10 text-red-700 dark:text-red-300')}>
        {testResult.success ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <XCircle className="mt-0.5 size-4 shrink-0" />}<span>{testResult.message}</span>
      </div>}
      {state?.errorMessage && <p className="text-xs text-red-500">{state.errorMessage}</p>}
    </div>}
  </SettingsCard>
}
