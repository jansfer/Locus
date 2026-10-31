/**
 * MoveSessionDialog - 迁移会话到另一个工作区的对话框
 */

import * as React from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { LocalProjectBadge } from './LocalProjectBadge'
import { useT } from '@/i18n'
import type { AgentWorkspace, AgentSessionMeta } from '@proma/shared'

interface MoveSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId: string
  sourceWorkspaceId: string | undefined
  workspaces: AgentWorkspace[]
  onMoved: (updatedSession: AgentSessionMeta, targetWorkspaceName: string) => void | Promise<void>
}

export function MoveSessionDialog({
  open,
  onOpenChange,
  sessionId,
  sourceWorkspaceId,
  workspaces,
  onMoved,
}: MoveSessionDialogProps): React.ReactElement {
  const t = useT()
  const [selectedWorkspaceId, setSelectedWorkspaceId] = React.useState<string>('')
  const [moving, setMoving] = React.useState(false)

  // 过滤掉会话已属的工作区
  const availableWorkspaces = React.useMemo(
    () => workspaces.filter((ws) => ws.id !== sourceWorkspaceId),
    [workspaces, sourceWorkspaceId]
  )

  // 打开时重置选择
  React.useEffect(() => {
    if (open) {
      setSelectedWorkspaceId('')
      setMoving(false)
    }
  }, [open])

  const handleConfirm = async (): Promise<void> => {
    if (!selectedWorkspaceId || moving) return

    const targetWs = availableWorkspaces.find((ws) => ws.id === selectedWorkspaceId)
    setMoving(true)
    try {
      const updated = await window.electronAPI.moveAgentSessionToWorkspace({
        sessionId,
        targetWorkspaceId: selectedWorkspaceId,
      })
      await onMoved(updated, targetWs?.name ?? t('agentMisc.unknownProject'))
      onOpenChange(false)
    } catch (error) {
      console.error('[迁移会话] 迁移失败:', error)
      const message = error instanceof Error ? error.message : t('agentMisc.unknownError')
      toast.error(t('agentMisc.moveFailed'), { description: message })
      setMoving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('agentMisc.moveSessionTitle')}</DialogTitle>
          <DialogDescription>
            {t('agentMisc.moveSessionDescription')}
          </DialogDescription>
        </DialogHeader>

        {availableWorkspaces.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            {t('agentMisc.noOtherProjects')}
          </p>
        ) : (
          <Select value={selectedWorkspaceId} onValueChange={setSelectedWorkspaceId}>
            <SelectTrigger>
              <SelectValue placeholder={t('agentMisc.selectTargetProject')} />
            </SelectTrigger>
            <SelectContent>
              {availableWorkspaces.map((ws) => (
                <SelectItem key={ws.id} value={ws.id}>
                  <span className="flex items-center gap-1.5">
                    <span>{ws.name}</span>
                    <LocalProjectBadge
                      projectRootPath={ws.projectRootPath}
                      projectRootStatus={ws.projectRootStatus}
                    />
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={moving}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedWorkspaceId || moving || availableWorkspaces.length === 0}
          >
            {moving ? t('agentMisc.moving') : t('agentMisc.confirmMove')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
