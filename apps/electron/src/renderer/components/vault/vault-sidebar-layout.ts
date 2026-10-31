import { t } from '@/i18n'

export const VAULT_SIDEBAR_COLLAPSED_WIDTH = 36

export function getVaultSidebarDisplayWidth(expandedWidth: number, collapsed: boolean): number {
  return collapsed ? VAULT_SIDEBAR_COLLAPSED_WIDTH : expandedWidth
}

export function getVaultSidebarToggleLabel(collapsed: boolean): string {
  return collapsed ? t('vault.sidebar.expand') : t('vault.sidebar.collapse')
}
