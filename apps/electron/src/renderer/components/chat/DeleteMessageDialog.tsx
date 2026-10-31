/**
 * DeleteMessageDialog - 删除消息确认对话框
 *
 * AlertDialog 确认删除，黄色警告提示建议成对删除。
 * 移植自 proma-frontend 的 chat-view/delete-message-dialog.tsx。
 */

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

interface DeleteMessageDialogProps {
  /** 是否显示 */
  open: boolean
  /** 显示状态变更 */
  onOpenChange: (open: boolean) => void
  /** 确认删除回调 */
  onConfirm: () => void
  /** 是否正在删除 */
  isDeleting?: boolean
}

export function DeleteMessageDialog({
  open,
  onOpenChange,
  onConfirm,
  isDeleting = false,
}: DeleteMessageDialogProps): React.ReactElement {
  const t = useT()
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('chat.deleteDialog.title')}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>{t('chat.deleteDialog.description')}</p>
              <p className="text-yellow-600 dark:text-yellow-500">
                {t('chat.deleteDialog.pairWarning')}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isDeleting ? t('chat.deleteDialog.deleting') : t('common.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
