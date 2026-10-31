import * as React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useT } from '@/i18n'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  loadingLabel?: string
  onConfirm: () => void | Promise<void>
  loading?: boolean
  variant?: 'destructive' | 'default'
  children?: React.ReactNode
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  loadingLabel,
  onConfirm,
  loading = false,
  variant = 'destructive',
  children,
}: ConfirmDialogProps): React.ReactElement {
  const t = useT()
  // 未显式传入时回退到 common 域通用按钮文案
  const finalConfirmLabel = confirmLabel ?? t('common.confirm')
  const finalCancelLabel = cancelLabel ?? t('common.cancel')
  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v && !loading) onOpenChange(v) }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {(description || children) && (
            <AlertDialogDescription asChild={!!children}>
              {children ?? description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{finalCancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className={variant === 'destructive' ? 'bg-destructive text-white hover:bg-destructive/90' : undefined}
          >
            {loading ? (loadingLabel ?? finalConfirmLabel) : finalConfirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
