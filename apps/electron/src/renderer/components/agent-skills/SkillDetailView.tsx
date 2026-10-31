/**
 * SkillDetailView — Skills Tab 内的详情视图。
 *
 * 复用 Skills 列表所在的右侧工作区 Tab，不再以抽屉覆盖会话历史。
 */

import * as React from 'react'
import { toast } from 'sonner'
import { Sparkles, FolderOpen, RefreshCw, Trash2, ArrowLeft } from 'lucide-react'
import { useT } from '@/i18n'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { SettingsCard } from '@/components/settings/primitives'
import { SkillFilesPanel } from '@/components/settings/SkillFilesPanel'
import { LiveMarkdownEditor } from '@/components/markdown/LiveMarkdownEditor'
import { cn } from '@/lib/utils'
import type { SkillMeta } from '@proma/shared'
import { extractSkillBody, rebuildSkillMd } from './skillMdUtils'

export interface SkillDetailViewProps {
  skill: SkillMeta
  workspaceSlug: string
  /** 外部能力变更后由数据层递增，用于重新读取 SKILL.md 和静默刷新资源树。 */
  contentVersion: number
  isBuiltin: boolean
  updating: boolean
  onBack: () => void
  onToggle: (enabled: boolean) => void
  onUpdate: () => void
  onRequestDelete: () => void
  onOpenFolder: () => void
}

export function SkillDetailView({
  skill,
  workspaceSlug,
  contentVersion,
  isBuiltin,
  updating,
  onBack,
  onToggle,
  onUpdate,
  onRequestDelete,
  onOpenFolder,
}: SkillDetailViewProps): React.ReactElement {
  const t = useT()
  const [content, setContent] = React.useState<string | null>(null)
  const [loadingContent, setLoadingContent] = React.useState(true)
  const [editName, setEditName] = React.useState(skill.name)
  const [editDescription, setEditDescription] = React.useState(skill.description ?? '')
  const [editBody, setEditBody] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [saveFailed, setSaveFailed] = React.useState(false)

  const [detailTab, setDetailTab] = React.useState<'body' | 'files'>('body')
  const [fileCount, setFileCount] = React.useState<number | null>(null)
  const contentRef = React.useRef<string | null>(null)
  const skillSlugRef = React.useRef(skill.slug)
  const loadRequestRef = React.useRef(0)
  const saveRequestRef = React.useRef(0)
  // 写入开始和完成都会使此前发起的读取失效，避免 watcher 的旧快照回滚正文。
  const writeRevisionRef = React.useRef(0)
  const saveInFlightRef = React.useRef(false)
  const flushPendingRef = React.useRef(false)
  const failedSnapshotRef = React.useRef<{ name: string; description: string; body: string } | null>(null)
  const mountedRef = React.useRef(true)
  const saveDraftRef = React.useRef<() => void>(() => {})
  const draftRef = React.useRef({ name: skill.name, description: skill.description ?? '', body: '' })
  const savedRef = React.useRef({ name: skill.name, description: skill.description ?? '', body: '' })

  const updateDraft = React.useCallback((next: Partial<typeof draftRef.current>) => {
    draftRef.current = { ...draftRef.current, ...next }
    failedSnapshotRef.current = null
    setSaveFailed(false)
    if (next.name !== undefined) setEditName(next.name)
    if (next.description !== undefined) setEditDescription(next.description)
    if (next.body !== undefined) setEditBody(next.body)
  }, [])

  // 切换 Skill 或外部能力刷新时，只替换未修改的字段，避免覆盖本地的自动保存缓冲区。
  React.useEffect(() => {
    const isDifferentSkill = skillSlugRef.current !== skill.slug
    if (isDifferentSkill) {
      skillSlugRef.current = skill.slug
      const next = { name: skill.name, description: skill.description ?? '', body: '' }
      draftRef.current = next
      savedRef.current = next
      contentRef.current = null
      setContent(null)
      setEditName(next.name)
      setEditDescription(next.description)
      setEditBody(next.body)
      setSaveFailed(false)
      return
    }

    const next: Partial<typeof draftRef.current> = {}
    if (draftRef.current.name === savedRef.current.name) {
      savedRef.current.name = skill.name
      next.name = skill.name
    }
    if (draftRef.current.description === savedRef.current.description) {
      const description = skill.description ?? ''
      savedRef.current.description = description
      next.description = description
    }
    if (Object.keys(next).length > 0) updateDraft(next)
  }, [skill.slug, skill.name, skill.description, updateDraft])

  React.useEffect(() => {
    const requestId = ++loadRequestRef.current
    const writeRevision = writeRevisionRef.current
    let cancelled = false
    const isCurrentRead = (): boolean => !cancelled
      && loadRequestRef.current === requestId
      && writeRevisionRef.current === writeRevision
    // 同一文档的 watcher 刷新不能卸载滚动容器和 CodeMirror，否则会丢失
    // 滚动位置、焦点、选区及撤销历史。仅首次读取使用阻塞式加载占位。
    if (contentRef.current === null) setLoadingContent(true)
    window.electronAPI.readSkillContent(workspaceSlug, skill.slug)
      .then((text) => {
        if (!isCurrentRead()) return
        const externalBody = extractSkillBody(text)
        contentRef.current = text
        setContent(text)
        // 只在该字段未被本地修改时接收外部内容，避免覆盖自动保存等待中的草稿。
        if (draftRef.current.body === savedRef.current.body) {
          savedRef.current.body = externalBody
          updateDraft({ body: externalBody })
        }
      })
      .catch((err) => {
        if (!isCurrentRead()) return
        // 后台读取失败不清空已加载内容，让当前草稿仍然可以继续编辑和保存。
        console.error('[SkillDetail] 加载内容失败:', err)
      })
      .finally(() => {
        if (!cancelled && loadRequestRef.current === requestId) setLoadingContent(false)
      })
    return () => { cancelled = true }
  }, [contentVersion, skill.slug, workspaceSlug, updateDraft])

  const saveDraft = React.useCallback((): void => {
    const draft = draftRef.current
    const saved = savedRef.current
    const hasChanges = draft.name !== saved.name
      || draft.description !== saved.description
      || draft.body !== saved.body
    const failed = failedSnapshotRef.current
    const isKnownFailure = failed?.name === draft.name
      && failed.description === draft.description
      && failed.body === draft.body
    if (!contentRef.current || !hasChanges || isKnownFailure) return

    if (saveInFlightRef.current) {
      flushPendingRef.current = true
      return
    }

    const requestId = ++saveRequestRef.current
    const snapshot = { ...draft }
    const nextContent = rebuildSkillMd(
      rebuildSkillMd(contentRef.current as string, { name: snapshot.name, description: snapshot.description }),
      { body: snapshot.body },
    )

    // 700ms 防抖后串行写入，避免快速连续输入造成写入乱序。
    saveInFlightRef.current = true
    ++writeRevisionRef.current
    if (mountedRef.current) setSaving(true)
    void window.electronAPI.writeSkillContent(workspaceSlug, skill.slug, nextContent)
      .then(() => {
        if (saveRequestRef.current !== requestId) return
        ++writeRevisionRef.current
        contentRef.current = nextContent
        savedRef.current = snapshot
        failedSnapshotRef.current = null
        if (mountedRef.current) {
          setContent(nextContent)
          setSaveFailed(false)
        }
      })
      .catch((err) => {
        if (saveRequestRef.current !== requestId) return
        failedSnapshotRef.current = snapshot
        console.error('[SkillDetail] 自动保存失败:', err)
        if (mountedRef.current) {
          setSaveFailed(true)
          toast.error(t('skills.skillDetail.autoSaveFailed'))
        }
      })
      .finally(() => {
        saveInFlightRef.current = false
        if (mountedRef.current && saveRequestRef.current === requestId) setSaving(false)
        if (flushPendingRef.current) {
          flushPendingRef.current = false
          saveDraftRef.current()
        }
      })
  }, [workspaceSlug, skill.slug])

  saveDraftRef.current = saveDraft

  const retrySave = React.useCallback(() => {
    failedSnapshotRef.current = null
    setSaveFailed(false)
    saveDraft()
  }, [saveDraft])

  React.useEffect(() => {
    const draft = draftRef.current
    const saved = savedRef.current
    const hasChanges = draft.name !== saved.name
      || draft.description !== saved.description
      || draft.body !== saved.body
    if (!contentRef.current || !hasChanges) return

    const timer = window.setTimeout(() => saveDraft(), 700)
    return () => window.clearTimeout(timer)
  }, [content, editName, editDescription, editBody, saveDraft])

  React.useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      saveDraftRef.current()
    }
  }, [])

  const sourceLabel = isBuiltin
    ? t('skills.skillDetail.builtinSource')
    : skill.importSource
      ? t('skills.skillDetail.importedFrom', { name: skill.importSource.sourceWorkspaceName })
      : t('skills.skillDetail.currentProjectSource')

  return (
    <div
      className="flex h-full flex-col min-h-0"
      onKeyDownCapture={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
          event.preventDefault()
          event.stopPropagation()
          retrySave()
        }
      }}
    >
      {/* 头部 */}
      <div className="shrink-0 border-b border-border/60 px-5 pb-4 pt-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-10 gap-1.5 px-2" type="button" onClick={onBack}>
            <ArrowLeft size={16} />
            {t('skills.skillDetail.backToSkills')}
          </Button>
          <h3 className="text-lg font-medium text-foreground">{t('skills.skillDetail.title')}</h3>
        </div>

        <div className="mt-4 flex items-start gap-3">
          <div className="rounded-xl bg-amber-500/12 p-2 text-amber-500 shadow-sm shrink-0">
            <Sparkles size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-base font-semibold text-foreground">{skill.name}</h3>
              {skill.version && (
                <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  v{skill.version}
                </span>
              )}
            </div>
            <div className="mt-0.5 truncate text-xs text-muted-foreground">{skill.slug}</div>
          </div>
        </div>

        {/* 操作行 */}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex items-center gap-2 mr-auto">
            <Switch checked={skill.enabled} onCheckedChange={onToggle} />
            <span className="text-xs text-muted-foreground">{skill.enabled ? t('common.enabled') : t('common.disabled')}</span>
          </div>
          {skill.hasUpdate && (
            <Button size="sm" variant="outline" onClick={onUpdate} disabled={updating}>
              <RefreshCw size={14} className={cn(updating && 'animate-spin')} />
              {updating ? t('skills.skillCard.updating') : t('skills.skillDetail.update')}
            </Button>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="ghost" onClick={onOpenFolder}>
                <FolderOpen size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{t('skills.skillDetail.openFolder')}</TooltipContent>
          </Tooltip>
          {!isBuiltin && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onRequestDelete}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{t('skills.skillDetail.uninstall')}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {loadingContent ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">{t('common.loading')}</div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
          <div className="flex flex-col gap-4 p-5">
            {/* 元数据 */}
            <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('skills.skillDetail.metadata')}</h4>
              {saveFailed ? (
                <Button size="sm" variant="outline" onClick={retrySave} disabled={saving}>
                  {t('skills.skillDetail.retrySave')}
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground" aria-live="polite">
                  {saving ? t('skills.skillDetail.savingNow') : t('skills.skillDetail.autoSaved')}
                </span>
              )}
            </div>
            <SettingsCard divided>
              <MetaEditRow label={t('skills.skillDetail.nameLabel')} value={editName} onChange={(name) => updateDraft({ name })} />
              <MetaEditRow label={t('skills.skillDetail.descriptionLabel')} value={editDescription} onChange={(description) => updateDraft({ description })} multiline />
              <MetaRow label={t('skills.skillDetail.sourceLabel')} value={sourceLabel} />
              <MetaRow label={t('skills.skillDetail.locationLabel')} value={`skills/${skill.slug}`} />
            </SettingsCard>
          </div>

          {/* 说明 / 资源文件 */}
          <Tabs value={detailTab} onValueChange={(v) => setDetailTab(v as 'body' | 'files')} className="flex flex-col">
            <TabsList className="self-start shrink-0">
              <TabsTrigger value="body">{t('skills.skillDetail.bodyTab')}</TabsTrigger>
              <TabsTrigger value="files">
                {t('skills.skillDetail.filesTab')}
                {fileCount !== null && (
                  <span className="ml-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-muted-foreground/15 px-1 text-[10px] font-medium">
                    {fileCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="body" className="mt-3">
              <div className="flex flex-col">
                <div className="flex min-h-[28px] shrink-0 items-center px-1 pb-2">
                  <div className="font-mono text-xs text-muted-foreground">SKILL.md</div>
                </div>
                <SettingsCard divided={false}>
                  <div className="p-4">
                    <LiveMarkdownEditor
                      value={editBody}
                      onChange={(body) => updateDraft({ body })}
                      onSave={retrySave}
                      className="live-markdown-external-scroll skill-detail-live-markdown"
                    />
                  </div>
                </SettingsCard>
              </div>
            </TabsContent>

            <TabsContent value="files" className="mt-3">
              <div className="min-h-[480px]">
                <SkillFilesPanel
                  workspaceSlug={workspaceSlug}
                  skillSlug={skill.slug}
                  contentVersion={contentVersion}
                  onFileCountChange={setFileCount}
                />
              </div>
            </TabsContent>
          </Tabs>
          </div>
        </div>
      )}
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="flex items-start gap-4 px-4 py-2.5">
      <span className="w-16 shrink-0 pt-0.5 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 break-words text-sm text-foreground">{value}</span>
    </div>
  )
}

function MetaEditRow({ label, value, onChange, multiline }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }): React.ReactElement {
  return (
    <div className="flex items-start gap-4 px-4 py-2.5">
      <span className="w-16 shrink-0 pt-2 text-xs text-muted-foreground">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 resize-y rounded-md border border-border bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          rows={3}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-border bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      )}
    </div>
  )
}
