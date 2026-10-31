/**
 * Windows 环境检测 Dialog
 *
 * 聊天里的错误卡片「打开环境检测」按钮 / 设置页入口都会打开它，
 * 复用 EnvironmentCheckPanel。
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useT } from '@/i18n'
import { EnvironmentCheckPanel } from './EnvironmentCheckPanel'

interface EnvironmentCheckDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EnvironmentCheckDialog({ open, onOpenChange }: EnvironmentCheckDialogProps) {
  const t = useT()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('environment.dialog.title')}</DialogTitle>
          <DialogDescription>
            {t('environment.dialog.description')}
          </DialogDescription>
        </DialogHeader>
        <EnvironmentCheckPanel autoDetectOnMount={open} />
      </DialogContent>
    </Dialog>
  )
}
