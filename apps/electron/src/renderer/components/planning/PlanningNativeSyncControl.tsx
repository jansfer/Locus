import * as React from 'react'
import { CalendarDays, CheckCircle2, CircleAlert, ExternalLink, ListTodo, Loader2, Settings2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import type {
  PlanningNativeSyncEntity,
  PlanningNativeSyncPermissionResult,
  PlanningNativeSyncStatus,
  PlanningNativeSyncTarget,
  PlanningNativeConnection,
  PlanningNativeSyncConflict,
  PlanningSyncProfile,
} from '@proma/shared'
import { useT } from '@/i18n'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { detectIsMac } from '@/lib/platform'

/** 实体对应的 macOS 系统应用图标；名称文案在组件内按当前语言生成。 */
const ENTITY_ICONS: Record<PlanningNativeSyncEntity, typeof CalendarDays> = {
  calendar: CalendarDays,
  reminder: ListTodo,
}

/** targetLabel 是 macOS 系统应用内的目标类型名，中英文均保持英文原文。 */
const ENTITY_TARGET_LABELS: Record<PlanningNativeSyncEntity, string> = {
  calendar: 'Calendar',
  reminder: 'Reminders List',
}

export function PlanningNativeSyncControl({ entity }: { entity: PlanningNativeSyncEntity }): React.ReactElement | null {
  const t = useT()
  const isMac = React.useMemo(() => detectIsMac(), [])
  const [open, setOpen] = React.useState(false)
  const [status, setStatus] = React.useState<PlanningNativeSyncStatus | null>(null)
  const [profiles, setProfiles] = React.useState<PlanningSyncProfile[]>([])
  const [targets, setTargets] = React.useState<PlanningNativeSyncTarget[]>([])
  const [connectionTargets, setConnectionTargets] = React.useState<PlanningNativeSyncTarget[]>([])
  const [connections, setConnections] = React.useState<PlanningNativeConnection[]>([])
  const [conflicts, setConflicts] = React.useState<PlanningNativeSyncConflict[]>([])
  const [loading, setLoading] = React.useState(false)
  const [requesting, setRequesting] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  const copy = {
    calendar: { label: t('planning.ui.sync.calendar'), targetLabel: ENTITY_TARGET_LABELS.calendar },
    reminder: { label: t('planning.ui.sync.reminders'), targetLabel: ENTITY_TARGET_LABELS.reminder },
  }

  const permissionMessage = (permission: PlanningNativeSyncPermissionResult): string => {
    switch (permission.status) {
      case 'not-determined': return t('planning.ui.sync.permNotDetermined', { target: ENTITY_TARGET_LABELS[permission.entity] })
      case 'write-only': return t('planning.ui.sync.permWriteOnly')
      case 'denied': return t('planning.ui.sync.permDenied')
      case 'restricted': return t('planning.ui.sync.permRestricted')
      case 'unsupported': return t('planning.ui.sync.permUnsupported')
      case 'unavailable': return permission.error ? t('planning.ui.sync.permUnavailableWithError', { error: permission.error }) : t('planning.ui.sync.permUnavailable')
      case 'full-access': return t('planning.ui.sync.permFullAccess')
    }
  }

  const refresh = React.useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const [nextStatus, nextProfiles] = await Promise.all([
        window.electronAPI.getPlanningNativeSyncStatus(),
        window.electronAPI.listPlanningSyncProfiles(),
      ])
      setStatus(nextStatus)
      setProfiles(nextProfiles)
      if (nextStatus[entity].status === 'full-access') {
        const [nextTargets, nextConnectionTargets, nextConnections, nextConflicts] = await Promise.all([
          window.electronAPI.listPlanningNativeSyncTargets(entity),
          window.electronAPI.listPlanningNativeConnectionTargets(entity),
          window.electronAPI.listPlanningNativeConnections(entity),
          window.electronAPI.listPlanningNativeSyncConflicts(),
        ])
        setTargets(nextTargets); setConnectionTargets(nextConnectionTargets); setConnections(nextConnections); setConflicts(nextConflicts.filter((conflict) => conflict.entity === entity))
      } else { setTargets([]); setConnectionTargets([]); setConnections([]); setConflicts([]) }
    } catch (error) {
      console.error('[Planning 同步] 读取设置失败:', error)
      toast.error(t('planning.ui.sync.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [entity])

  React.useEffect(() => {
    if (open) void refresh()
  }, [open, refresh])

  const requestAccess = async (): Promise<void> => {
    setRequesting(true)
    try {
      const result = await window.electronAPI.requestPlanningNativeSyncAccess(entity)
      await refresh()
      if (result.status === 'full-access') toast.success(t('planning.ui.sync.authorized', { name: copy[entity].label }))
      else if (result.status === 'write-only') toast.error(t('planning.ui.sync.needFullAccess'))
      else if (result.status === 'unavailable') {
        toast.error(t('planning.ui.sync.requestUnresponsive'))
        await window.electronAPI.openPlanningNativeSyncPrivacySettings(entity)
      } else if (result.status !== 'not-determined') toast.error(permissionMessage(result))
    } catch (error) {
      console.error('[Planning 同步] 请求权限失败:', error)
      toast.error(t('planning.ui.sync.requestFailed'))
    } finally {
      setRequesting(false)
    }
  }

  const saveTarget = async (id: string): Promise<void> => {
    const target = targets.find((item) => item.id === id)
    if (!target) return
    setSaving(true)
    try {
      const saved = await window.electronAPI.savePlanningSyncProfile({ entity, target })
      setProfiles((current) => [...current.filter((item) => item.entity !== entity), saved])
      toast.success(t('planning.ui.sync.targetSaved', { name: copy[entity].label }))
      setOpen(false)
    } catch (error) {
      console.error('[Planning 同步] 保存目标失败:', error)
      toast.error(t('planning.ui.sync.targetSaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const connectExisting = async (id: string): Promise<void> => {
    const target = connectionTargets.find((item) => item.id === id)
    if (!target) return
    setSaving(true)
    try { await window.electronAPI.connectPlanningNativeConnection({ entity, target }); await refresh(); toast.success(t('planning.ui.sync.connected', { name: target.title })) }
    catch (error) { console.error('[Planning 同步] 连接失败:', error); toast.error(t('planning.ui.sync.connectFailed')) }
    finally { setSaving(false) }
  }
  const disconnect = async (id: string): Promise<void> => {
    setSaving(true)
    try { await window.electronAPI.disconnectPlanningNativeConnection(id); await refresh(); toast.success(t('planning.ui.sync.disconnected')) }
    catch (error) { console.error('[Planning 同步] 断开失败:', error); toast.error(t('planning.ui.sync.disconnectFailed')) }
    finally { setSaving(false) }
  }

  const resolveConflict = async (id: string, resolution: 'keep_proma' | 'keep_system'): Promise<void> => {
    setSaving(true)
    try { await window.electronAPI.resolvePlanningNativeSyncConflict({ id, resolution }); await refresh(); toast.success(resolution === 'keep_proma' ? t('planning.ui.sync.resolvedKeepLocus') : t('planning.ui.sync.resolvedKeepSystem')) }
    catch (error) { console.error('[Planning 同步] 解决冲突失败:', error); toast.error(t('planning.ui.sync.resolveFailed')) }
    finally { setSaving(false) }
  }

  const permission = status?.[entity]
  const profile = profiles.find((item) => item.entity === entity)
  const Icon = ENTITY_ICONS[entity]
  // 避免在非 macOS 上为每个 Todo / 日程增加无效控件；首次打开后也依照真实状态隐藏。
  if (!isMac || (status && !status.supported)) return null

  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <Button type="button" variant="outline" size="sm" className="h-8 text-xs">
        {profile ? <Settings2 className="size-3.5" /> : <Icon className="size-3.5" />}
        {profile ? t('planning.ui.sync.settingsButton') : t('planning.ui.sync.syncTo', { name: copy[entity].label })}
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" className="w-80 space-y-3 p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{t('planning.ui.sync.heading', { name: copy[entity].label })}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t('planning.ui.sync.description', { name: copy[entity].label })}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{t('planning.ui.sync.suggestion', { kind: entity === 'calendar' ? t('planning.ui.sync.kindCalendar') : t('planning.ui.sync.kindReminderList') })}</p>
      </div>
      {loading || !permission ? <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" />{t('planning.ui.sync.checking')}</div>
        : permission.status === 'full-access' ? <div className="space-y-2"><Select value={profile?.targetId ?? ''} onValueChange={(id) => void saveTarget(id)} disabled={saving || targets.length === 0}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder={targets.length ? t('planning.ui.sync.selectTarget', { target: copy[entity].targetLabel }) : t('planning.ui.sync.noWritableTargets')} /></SelectTrigger><SelectContent>{targets.map((target) => <SelectItem key={target.id} value={target.id}>{target.sourceTitle ? `${target.sourceTitle} · ` : ''}{target.title}{target.sourceType === 'local' ? t('planning.ui.sync.suffixLocal') : target.isCloudBacked ? t('planning.ui.sync.suffixCloud') : ''}</SelectItem>)}</SelectContent></Select>{profile && <p className="text-[11px] leading-relaxed text-muted-foreground">{t('planning.ui.sync.currentTarget', { name: `${profile.sourceTitle ? `${profile.sourceTitle} · ` : ''}${profile.targetTitle}` })}</p>}{!profile && <p className="text-[11px] leading-relaxed text-muted-foreground">{t('planning.ui.sync.publishHint')}</p>}
          <div className="border-t pt-2"><p className="mb-1 text-xs font-medium">{t('planning.ui.sync.connectExistingTitle')}</p><p className="mb-1.5 text-[11px] leading-relaxed text-muted-foreground">{t('planning.ui.sync.connectExistingDescription')}</p><Select value="" onValueChange={(id) => void connectExisting(id)} disabled={saving || connectionTargets.length === 0}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder={t('planning.ui.sync.connectPlaceholder')} /></SelectTrigger><SelectContent>{connectionTargets.filter((target) => profile?.targetId !== target.id && !connections.some((connection) => connection.targetId === target.id)).map((target) => <SelectItem key={target.id} value={target.id}>{target.sourceTitle ? `${target.sourceTitle} · ` : ''}{target.title}{target.canWrite ? '' : t('planning.ui.sync.suffixReadOnly')}</SelectItem>)}</SelectContent></Select>{connections.map((connection) => <div key={connection.id} className="mt-1.5 flex items-center justify-between gap-2 text-[11px]"><span className="truncate text-muted-foreground">{connection.sourceTitle ? `${connection.sourceTitle} · ` : ''}{connection.targetTitle}{connection.canWrite ? '' : t('planning.ui.sync.suffixReadOnly')}</span><Button type="button" variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" disabled={saving} onClick={() => void disconnect(connection.id)}>{t('planning.ui.sync.disconnect')}</Button></div>)}{conflicts.length > 0 && <div className="mt-2 space-y-1.5 rounded-md border border-amber-300/60 bg-amber-50/50 p-2 text-[11px] dark:bg-amber-950/20"><p className="font-medium text-amber-800 dark:text-amber-200">{t('planning.ui.sync.conflictCount', { n: conflicts.length })}</p>{conflicts.map((conflict) => <div key={conflict.id}><p className="truncate text-muted-foreground">{t('planning.ui.sync.conflictItem', { title: conflict.title, change: conflict.kind === 'deleted' ? t('planning.ui.sync.conflictDeleted') : t('planning.ui.sync.conflictModified') })}</p><div className="mt-1 flex gap-1"><Button type="button" variant="outline" size="sm" className="h-6 px-1.5 text-[10px]" disabled={saving} onClick={() => void resolveConflict(conflict.id, 'keep_proma')}>{t('planning.ui.sync.keepLocus')}</Button><Button type="button" variant="outline" size="sm" className="h-6 px-1.5 text-[10px]" disabled={saving} onClick={() => void resolveConflict(conflict.id, 'keep_system')}>{t('planning.ui.sync.keepSystem')}</Button></div></div>)}</div>}</div></div>
        : <div className="space-y-2.5 rounded-md bg-muted/55 p-2.5"><div className="flex gap-1.5 text-xs leading-relaxed text-muted-foreground"><CircleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-500" />{permissionMessage(permission)}</div>{permission.status === 'not-determined' && <Button type="button" size="sm" className="w-full" disabled={requesting} onClick={() => void requestAccess()}>{requesting ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}{t('planning.ui.sync.authorize')}</Button>}{(permission.status === 'write-only' || permission.status === 'denied') && <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => void window.electronAPI.openPlanningNativeSyncPrivacySettings(entity)}><ExternalLink className="size-3.5" />{t('planning.ui.sync.openPrivacySettings')}</Button>}</div>}
      {permission?.status === 'full-access' && <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="size-3.5" />{t('planning.ui.sync.fullAccessGranted')}</div>}
    </PopoverContent>
  </Popover>
}
