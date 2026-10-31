import type { DefaultAppInfo } from '@proma/shared'
import { t } from '@/i18n'

export function getDefaultAppOpenLabel(info: DefaultAppInfo | null): string {
  return info ? t('misc.openWith.withApp', { name: info.name }) : t('misc.openWith.systemDefault')
}
