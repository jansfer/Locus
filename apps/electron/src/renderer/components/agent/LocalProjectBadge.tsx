import type * as React from 'react'
import type { LocalProjectRootStatus } from '@proma/shared'
import type { MessageKey } from '@/i18n'
import { t } from '@/i18n'
import { cn } from '@/lib/utils'

interface LocalProjectBadgeProps {
  projectRootPath?: string | null
  projectRootStatus?: LocalProjectRootStatus
  className?: string
}

/** 状态 → 词典键映射；渲染时经 t() 求值以响应语言切换。 */
const UNAVAILABLE_STATUS_KEYS: Record<Exclude<LocalProjectRootStatus, 'available'>, MessageKey> = {
  missing: 'agentMisc.rootStatus.missing',
  not_directory: 'agentMisc.rootStatus.notDirectory',
  unavailable: 'agentMisc.rootStatus.unavailable',
}

export function LocalProjectBadge({
  projectRootPath,
  projectRootStatus,
  className,
}: LocalProjectBadgeProps): React.ReactElement | null {
  if (!projectRootPath) return null

  const isUnavailable = projectRootStatus !== undefined && projectRootStatus !== 'available'
  const label = isUnavailable ? t('agentMisc.rootUnavailable') : t('agentMisc.localProject')

  return (
    <span
      title={isUnavailable ? t(UNAVAILABLE_STATUS_KEYS[projectRootStatus]) : projectRootPath}
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-1.5 py-0 text-[10px] font-medium leading-4',
        isUnavailable ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-muted-foreground',
        className,
      )}
    >
      {label}
    </span>
  )
}
