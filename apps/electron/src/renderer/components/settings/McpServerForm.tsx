/**
 * McpServerForm - MCP 服务器创建/编辑表单
 *
 * 支持 stdio / http / sse 三种传输类型，
 * 复用设置原语组件实现卡片化布局。
 */

import * as React from 'react'
import { ArrowLeft, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useT } from '@/i18n'
import type { McpOAuthConfiguration, McpServerEntry, McpTransportType, WorkspaceMcpConfig } from '@proma/shared'
import {
  SettingsSection,
  SettingsCard,
  SettingsInput,
  SettingsSelect,
  SettingsToggle,
} from './primitives'

/** 编辑中的服务器 */
interface EditingServer {
  name: string
  entry: McpServerEntry
}

interface McpServerFormProps {
  /** 编辑模式传入已有服务器，创建模式传 null */
  server: EditingServer | null
  /** 当前工作区 slug */
  workspaceSlug: string
  onSaved: () => void
  onChanged?: () => void | Promise<void>
  onCancel: () => void | Promise<void>
  /** 外部详情页请求关闭的递增标记；表单会先 flush 自动保存再触发 onCancel。 */
  closeRequestId?: number
  /** 由 MCP 内部详情页托管标题与返回操作时隐藏表单标题栏。 */
  showHeader?: boolean
}

/** 传输类型选项；labelKey 为词典键片段，渲染处拼接 t() 键 */
const TRANSPORT_OPTIONS: ReadonlyArray<{ value: string; labelKey: 'stdio' | 'http' | 'sse' }> = [
  { value: 'stdio', labelKey: 'stdio' },
  { value: 'http', labelKey: 'http' },
  { value: 'sse', labelKey: 'sse' },
]

/**
 * 解析多行文本为 key=value / key: value 的 Record
 *
 * 支持：
 * - KEY=VALUE（环境变量格式）
 * - Key: Value（HTTP 头格式）
 */
function parseKeyValueText(text: string, separator: '=' | ':'): Record<string, string> {
  const result: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const idx = trimmed.indexOf(separator)
    if (idx <= 0) continue
    const key = trimmed.slice(0, idx).trim()
    const value = trimmed.slice(idx + 1).trim()
    if (key) result[key] = value
  }
  return result
}

/**
 * 将 Record 序列化为多行 key=value / key: value 文本
 */
function serializeKeyValueText(record: Record<string, string> | undefined, separator: '=' | ':'): string {
  if (!record) return ''
  return Object.entries(record)
    .map(([key, value]) => `${key}${separator}${separator === ':' ? ' ' : ''}${value}`)
    .join('\n')
}

interface McpFormValues {
  transportType: McpTransportType
  enabled: boolean
  testResult: { success: boolean; message: string; timestamp?: number } | null
  isBuiltin: boolean
  /** OAuth 公开元数据不在此表单编辑，但保存其他字段时必须原样保留。 */
  oauth?: McpOAuthConfiguration
  command: string
  argsText: string
  envText: string
  timeoutStr: string
  url: string
  headersText: string
}

/** 根据当前表单值构建 McpServerEntry */
function buildEntryFromValues(values: McpFormValues, includeTestResult = false): McpServerEntry {
  const base: McpServerEntry = {
    type: values.transportType,
    enabled: values.enabled,
    ...(values.isBuiltin && { isBuiltin: true }),
    ...(values.oauth && { oauth: values.oauth }),
    ...(includeTestResult && values.testResult && {
      lastTestResult: {
        ...values.testResult,
        timestamp: values.testResult.timestamp ?? Date.now(),
      },
    }),
  }

  if (values.transportType === 'stdio') {
    base.command = values.command.trim()
    const args = values.argsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (args.length > 0) base.args = args
    const env = parseKeyValueText(values.envText, '=')
    if (Object.keys(env).length > 0) base.env = env
    const timeout = parseInt(values.timeoutStr, 10)
    if (!isNaN(timeout) && timeout > 0) base.timeout = timeout
  } else {
    base.url = values.url.trim()
    const headers = parseKeyValueText(values.headersText, ':')
    if (Object.keys(headers).length > 0) base.headers = headers
  }

  return base
}

export function McpServerForm({ server, workspaceSlug, onSaved, onChanged, onCancel, closeRequestId, showHeader = true }: McpServerFormProps): React.ReactElement {
  const t = useT()
  const isEdit = server !== null
  const isBuiltin = server?.entry.isBuiltin === true
  const oauth = server?.entry.oauth

  // 表单状态
  const [name, setName] = React.useState(server?.name ?? '')
  const [transportType, setTransportType] = React.useState<McpTransportType>(server?.entry.type ?? 'stdio')
  const [enabled, setEnabled] = React.useState(server?.entry.enabled ?? false) // 默认关闭
  const explicitlyDisabledRef = React.useRef(false)
  // Strict Mode 会重复执行 mount effect；只有真实用户操作才能解锁自动保存，
  // 以保证“查看配置”不会触发 SAVE_MCP_CONFIG → 禁用 → 验证 → 重启用。
  const hasUserEditedRef = React.useRef(false)
  const markUserEdited = React.useCallback((): void => {
    hasUserEditedRef.current = true
  }, [])
  const handleEnabledChange = React.useCallback((nextEnabled: boolean): void => {
    markUserEdited()
    if (!nextEnabled) explicitlyDisabledRef.current = true
    setEnabled(nextEnabled)
  }, [markUserEdited])

  // stdio 字段
  const [command, setCommand] = React.useState(server?.entry.command ?? '')
  const [argsText, setArgsText] = React.useState(server?.entry.args?.join(', ') ?? '')
  const [envText, setEnvText] = React.useState(serializeKeyValueText(server?.entry.env, '='))
  const [timeoutStr, setTimeoutStr] = React.useState(
    server?.entry.timeout != null ? String(server.entry.timeout) : ''
  )

  // http/sse 字段
  const [url, setUrl] = React.useState(server?.entry.url ?? '')
  const [headersText, setHeadersText] = React.useState(serializeKeyValueText(server?.entry.headers, ':'))

  // UI 状态
  const [saving, setSaving] = React.useState(false)
  const [testing, setTesting] = React.useState(false)
  const [testResult, setTestResult] = React.useState<{ success: boolean; message: string; timestamp?: number } | null>(
    server?.entry.lastTestResult ?? null
  )

  // 自动保存状态（仅编辑模式）
  const AUTO_SAVE_DELAY = 600
  const autoSaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = React.useRef(true)
  const [saveStatus, setSaveStatus] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // 保留最新表单值，供 unmount 时 flush 待保存变更
  const latestValuesRef = React.useRef({
    name, transportType, command, url, argsText, envText, headersText, timeoutStr, enabled, testResult, isBuiltin, oauth,
  })
  React.useEffect(() => {
    latestValuesRef.current = {
      name, transportType, command, url, argsText, envText, headersText, timeoutStr, enabled, testResult, isBuiltin, oauth,
    }
  }, [name, transportType, command, url, argsText, envText, headersText, timeoutStr, enabled, testResult, isBuiltin, oauth])

  // 监听配置改变，清空测试结果（避免展示过期的测试结果）
  React.useEffect(() => {
    if (!server) return // 新建时不需要清空

    // 检查关键配置是否改变（包括连接相关的所有字段）
    // 注意：server.entry.command/url 可能为 undefined，需要与空字符串统一比较
    const configChanged =
      transportType !== server.entry.type ||
      (transportType === 'stdio' && command !== (server.entry.command ?? '')) ||
      (transportType !== 'stdio' && url !== (server.entry.url ?? '')) ||
      argsText !== (server.entry.args?.join(', ') ?? '') ||
      envText !== serializeKeyValueText(server.entry.env, '=') ||
      headersText !== serializeKeyValueText(server.entry.headers, ':')

    if (configChanged) {
      setTestResult(null)
    }
  }, [transportType, command, url, argsText, envText, headersText, server])

  /** 构建 McpServerEntry */
  const buildEntry = (includeTestResult = false): McpServerEntry => {
    return buildEntryFromValues(
      {
        transportType,
        enabled,
        testResult,
        isBuiltin,
        oauth,
        command,
        argsText,
        envText,
        timeoutStr,
        url,
        headersText,
      },
      includeTestResult,
    )
  }

  const saveGenerationRef = React.useRef(0)

  /** 执行自动保存 */
  const doSaveEntry = React.useCallback(async (serverName: string, entry: McpServerEntry) => {
    const generation = ++saveGenerationRef.current
    try {
      const config = await window.electronAPI.getWorkspaceMcpConfig(workspaceSlug)
      const newConfig: WorkspaceMcpConfig = {
        servers: { ...config.servers, [serverName]: entry },
      }
      const options = explicitlyDisabledRef.current && !entry.enabled
        ? { explicitlyDisabledServerNames: [serverName] }
        : undefined
      await window.electronAPI.saveWorkspaceMcpConfig(workspaceSlug, newConfig, options)
      if (generation === saveGenerationRef.current && mountedRef.current) {
        // 编辑抽屉外的 MCP 卡片使用独立快照；每次持久化后通知其局部重读，
        // 让测试结果无需离开再进入页面即可同步显示。
        await onChanged?.()
        setSaveStatus('saved')
        setTimeout(() => {
          if (generation === saveGenerationRef.current && mountedRef.current) {
            setSaveStatus('idle')
          }
        }, 3000)
      }
    } catch (error) {
      console.error('[MCP 表单] 自动保存失败:', error)
      if (generation === saveGenerationRef.current && mountedRef.current) {
        toast.error(t('settingsMisc.mcp.autoSaveFailed'))
        setSaveStatus('error')
      }
    }
  }, [workspaceSlug, onChanged, t])

  const doSaveEntryRef = React.useRef(doSaveEntry)
  React.useEffect(() => { doSaveEntryRef.current = doSaveEntry }, [doSaveEntry])

  // 编辑模式下监听配置字段变化，防抖自动保存。
  // 测试结果只展示在当前表单，不能触发完整 mcp.json 保存；后者会重新验证其他已启用 MCP。
  React.useEffect(() => {
    // 仅用户修改配置后保存；不要让详情预览的挂载（含 Strict Mode 二次 effect）写回配置。
    if (!isEdit || !hasUserEditedRef.current) return
    const serverName = name.trim()
    if (!serverName) return
    if (transportType === 'stdio' && !command.trim()) return
    if (transportType !== 'stdio' && !url.trim()) return
    setSaveStatus('idle')
    autoSaveTimerRef.current = setTimeout(() => {
      const vals = latestValuesRef.current
      const entry = buildEntryFromValues(vals, true)
      void doSaveEntryRef.current(vals.name.trim(), entry)
    }, AUTO_SAVE_DELAY)
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
        autoSaveTimerRef.current = null
      }
    }
  }, [
    isEdit,
    name,
    transportType,
    command,
    url,
    argsText,
    envText,
    headersText,
    timeoutStr,
    enabled,
  ])

  // Strict Mode 会执行一次 setup → cleanup → setup；每次 setup 都恢复 mounted 状态。
  // 正常“返回”会先走 handleCancel 的 await flush，再卸载，不依赖这里的异步兜底同步 UI。
  React.useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
        autoSaveTimerRef.current = null
        const vals = latestValuesRef.current
        const serverName = vals.name.trim()
        if (!serverName) return
        if (vals.transportType === 'stdio' && !vals.command.trim()) return
        if (vals.transportType !== 'stdio' && !vals.url.trim()) return
        const entry = buildEntryFromValues(vals, true)
        void doSaveEntryRef.current(serverName, entry)
      }
    }
  }, [])
  const handleTest = async (): Promise<void> => {
    const serverName = name.trim()
    if (!serverName) return

    // stdio 需要 command，http/sse 需要 url
    if (transportType === 'stdio' && !command.trim()) return
    if (transportType !== 'stdio' && !url.trim()) return

    setTesting(true)
    setTestResult(null)

    try {
      const entry = buildEntry(false) // 测试时不包含旧的测试结果
      const result = await window.electronAPI.testMcpServer(workspaceSlug, serverName, entry)
      // 连接测试是孤立诊断：不能被视为配置编辑而触发完整 mcp.json 保存。
      // 否则 SAVE_MCP_CONFIG 会重新验证全部已启用条目，造成其他 MCP 重连。
      setTestResult({
        success: result.success,
        message: result.message,
        timestamp: Date.now(),
      })
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : t('settingsMisc.mcp.testFailed'),
        timestamp: Date.now(),
      })
    } finally {
      setTesting(false)
    }
  }

  /** 提交表单（仅创建模式） */
  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (isEdit) return

    const serverName = name.trim()
    if (!serverName) return

    // stdio 需要 command，http/sse 需要 url
    if (transportType === 'stdio' && !command.trim()) return
    if (transportType !== 'stdio' && !url.trim()) return

    setSaving(true)
    try {
      // 读取现有配置
      const config = await window.electronAPI.getWorkspaceMcpConfig(workspaceSlug)
      const entry = buildEntry(true) // 保存时包含测试结果

      console.log(`[MCP 表单] 保存 MCP: ${serverName}, enabled: ${entry.enabled}, testResult: ${testResult?.success ?? '未测试'}`)

      const newConfig: WorkspaceMcpConfig = {
        servers: {
          ...config.servers,
          [serverName]: entry,
        },
      }
      await window.electronAPI.saveWorkspaceMcpConfig(workspaceSlug, newConfig)
      onSaved()
    } catch (error) {
      console.error('[MCP 表单] 保存失败:', error)
    } finally {
      setSaving(false)
    }
  }

  /** 判断表单是否可提交 */
  const canSubmit = (): boolean => {
    if (!name.trim()) return false
    if (transportType === 'stdio' && !command.trim()) return false
    if (transportType !== 'stdio' && !url.trim()) return false
    return true
  }

  /** 判断是否可以测试 */
  const canTest = (): boolean => {
    return canSubmit()
  }

  /** 返回/关闭：编辑模式下先 flush 待保存变更 */
  const handleCancel = React.useCallback(async (): Promise<void> => {
    if (isEdit && autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
      const vals = latestValuesRef.current
      const serverName = vals.name.trim()
      if (serverName) {
        const isValid =
          (vals.transportType === 'stdio' && vals.command.trim()) ||
          (vals.transportType !== 'stdio' && vals.url.trim())
        if (isValid) {
          const entry = buildEntryFromValues(vals, true)
          await doSaveEntryRef.current(serverName, entry)
        }
      }
    }
    await onCancel()
  }, [isEdit, onCancel])

  const handledCloseRequestRef = React.useRef(closeRequestId ?? 0)
  React.useEffect(() => {
    if (closeRequestId === undefined || closeRequestId === handledCloseRequestRef.current) return
    handledCloseRequestRef.current = closeRequestId
    void handleCancel()
  }, [closeRequestId, handleCancel])

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 标题栏 + 操作按钮。内部详情页已提供统一标题与返回入口。 */}
      {showHeader && (
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" type="button" onClick={() => void handleCancel()}>
            <ArrowLeft size={18} />
          </Button>
          <h3 className="text-lg font-medium text-foreground flex-1">
            {isEdit ? t('settingsMisc.mcp.editTitle') : t('settingsMisc.mcp.addTitle')}
          </h3>
          {isEdit && (saveStatus === 'saved' || saveStatus === 'error') && (
            <div className={cn(
              'flex items-center gap-1.5 text-xs',
              saveStatus === 'error' ? 'text-destructive' : 'text-muted-foreground',
            )}>
              {saveStatus === 'saved' && <CheckCircle2 size={12} className="text-emerald-600" />}
              {saveStatus === 'error' && <XCircle size={12} />}
              <span>
                {saveStatus === 'saved' && t('settingsMisc.mcp.saved')}
                {saveStatus === 'error' && t('settingsMisc.mcp.saveFailed')}
              </span>
            </div>
          )}
          {!isEdit && (
            <Button size="sm" type="submit" disabled={saving || !canSubmit()}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              <span>{t('settingsMisc.mcp.create')}</span>
            </Button>
          )}
        </div>
      )}

      {/* 基本信息 */}
      <SettingsSection title={t('settingsMisc.mcp.basicInfo')}>
        <SettingsCard>
          <SettingsInput
            label={t('settingsMisc.mcp.serverName')}
            value={name}
            onChange={(value) => { markUserEdited(); setName(value) }}
            placeholder={t('settingsMisc.mcp.namePlaceholder')}
            required
            disabled={isEdit}
          />
          <SettingsSelect
            label={t('settingsMisc.mcp.transportLabel')}
            value={transportType}
            onValueChange={(v) => { markUserEdited(); setTransportType(v as McpTransportType) }}
            options={TRANSPORT_OPTIONS.map((option) => ({
              value: option.value,
              label: t(`settingsMisc.mcp.transport.${option.labelKey}`),
            }))}
            placeholder={t('settingsMisc.mcp.transportPlaceholder')}
            disabled={isBuiltin}
          />

          {/* stdio 专用字段 */}
          {transportType === 'stdio' && (
            <>
              <SettingsInput
                label={t('settingsMisc.mcp.command')}
                value={command}
                onChange={(value) => { markUserEdited(); setCommand(value) }}
                placeholder={t('settingsMisc.mcp.commandPlaceholder')}
                required
                disabled={isBuiltin}
              />
              <SettingsInput
                label={t('settingsMisc.mcp.args')}
                value={argsText}
                onChange={(value) => { markUserEdited(); setArgsText(value) }}
                placeholder={t('settingsMisc.mcp.argsPlaceholder')}
                description={t('settingsMisc.mcp.argsDesc')}
                disabled={isBuiltin}
              />
              {/* 环境变量多行输入 */}
              <div className="px-4 py-3 space-y-2">
                <div>
                  <div className="text-sm font-medium text-foreground">{t('settingsMisc.mcp.env')}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t('settingsMisc.mcp.envDesc')}</div>
                </div>
                <textarea
                  value={envText}
                  onChange={(e) => { markUserEdited(); setEnvText(e.target.value) }}
                  placeholder="GITHUB_TOKEN=ghp_xxx&#10;DEBUG=true"
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y font-mono"
                />
              </div>
              <SettingsInput
                label={t('settingsMisc.mcp.timeout')}
                description={t('settingsMisc.mcp.timeoutDesc')}
                value={timeoutStr}
                onChange={(value) => { markUserEdited(); setTimeoutStr(value) }}
                placeholder="30"
                type="number"
              />
            </>
          )}

          {/* http/sse 专用字段 */}
          {transportType !== 'stdio' && (
            <>
              <SettingsInput
                label="URL"
                value={url}
                onChange={(value) => { markUserEdited(); setUrl(value) }}
                placeholder={t('settingsMisc.mcp.urlPlaceholder')}
                required
              />
              {/* 请求头多行输入 */}
              <div className="px-4 py-3 space-y-2">
                <div>
                  <div className="text-sm font-medium text-foreground">{t('settingsMisc.mcp.headers')}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t('settingsMisc.mcp.headersDesc')}</div>
                </div>
                <textarea
                  value={headersText}
                  onChange={(e) => { markUserEdited(); setHeadersText(e.target.value) }}
                  placeholder="Authorization: Bearer xxx&#10;X-Custom-Header: value"
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y font-mono"
                />
              </div>
            </>
          )}

          {/* 测试连接区域 */}
          <div className="px-4 py-3 space-y-3 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">{t('settingsMisc.mcp.connectionTest')}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {t('settingsMisc.mcp.connectionTestDesc')}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTest}
                disabled={testing || !canTest()}
              >
                {testing && <Loader2 size={14} className="animate-spin" />}
                <span>{testing ? t('settingsMisc.mcp.testing') : t('settingsMisc.mcp.testConnection')}</span>
              </Button>
            </div>

            {/* 测试结果显示 */}
            {testResult && (
              <div
                className={cn(
                  'flex items-start gap-2 px-3 py-2 rounded-md text-sm',
                  testResult.success
                    ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                    : 'bg-red-500/10 text-red-700 dark:text-red-400'
                )}
              >
                {testResult.success ? (
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                ) : (
                  <XCircle size={16} className="mt-0.5 shrink-0" />
                )}
                <div className="flex-1">
                  <div className="font-medium">
                    {testResult.success ? t('settingsMisc.mcp.testSuccess') : t('settingsMisc.mcp.testFailed')}
                  </div>
                  <div className="text-xs mt-0.5 opacity-90">{testResult.message}</div>
                </div>
              </div>
            )}

            {/* 未测试警告 */}
            {!testResult && !testing && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-md text-sm bg-amber-500/10 text-amber-700 dark:text-amber-400">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <div className="text-xs">
                  {t('settingsMisc.mcp.notTestedHint')}
                </div>
              </div>
            )}
          </div>

          {/* 启用开关 */}
          <SettingsToggle
            label={t('settingsMisc.mcp.enableServer')}
            description={
              enabled
                ? t('settingsMisc.mcp.enableDescOn')
                : t('settingsMisc.mcp.enableDescOff')
            }
            checked={enabled}
            onCheckedChange={handleEnabledChange}
          />
        </SettingsCard>
      </SettingsSection>
    </form>
  )
}
