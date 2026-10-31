/**
 * FileDropZone — 文件拖拽上传区域
 *
 * 两个并排 drop zone：左侧接受文件上传（回形针），右侧接受文件夹附加（文件夹）。
 * 拖错区域会给出引导提示。
 */

import * as React from 'react'
import { toast } from 'sonner'
import { Paperclip, FolderPlus, Loader2 } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useT } from '@/i18n'
import { fileToBase64, formatFileNames } from '@/lib/file-utils'
import { MAX_ATTACHMENT_SIZE } from '@proma/shared'

interface FileDropZoneProps {
  workspaceSlug: string
  sessionId?: string
  target?: 'session' | 'workspace'
  onFilesUploaded: () => void
  onFilesAttached?: (filePaths: string[]) => Promise<void> | void
  onAttachFolder: () => void
  onFoldersDropped: (folderPaths: string[]) => void
}

export function FileDropZone({ workspaceSlug, sessionId, target = 'session', onFilesUploaded, onFilesAttached, onAttachFolder, onFoldersDropped }: FileDropZoneProps): React.ReactElement {
  const t = useT()
  const [isDragOver, setIsDragOver] = React.useState<'left' | 'right' | null>(null)
  const [isUploading, setIsUploading] = React.useState(false)

  const isWorkspace = target === 'workspace'

  const saveFiles = React.useCallback(async (files: globalThis.File[]): Promise<void> => {
    if (files.length === 0) return
    if (!isWorkspace && !sessionId) {
      console.error('[FileDropZone] session 模式下 sessionId 不能为空')
      return
    }

    const oversized: string[] = []
    const attachedLargeFiles: string[] = []
    const largeFilePaths: string[] = []
    const okFiles: globalThis.File[] = []

    for (const file of files) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        let sourcePath = ''
        try { sourcePath = window.electronAPI.getPathForFile(file) } catch { /* ignored */ }
        if (sourcePath && onFilesAttached) {
          largeFilePaths.push(sourcePath)
          attachedLargeFiles.push(file.name)
        } else {
          oversized.push(file.name)
        }
      } else {
        okFiles.push(file)
      }
    }

    if (oversized.length > 0) {
      toast.error(t('files.dropZone.oversizedSkipped', { names: formatFileNames(oversized) }), {
        description: t('files.dropZone.oversizedSkippedDescription'),
      })
    }

    if (okFiles.length === 0 && largeFilePaths.length === 0) return

    setIsUploading(true)
    try {
      if (largeFilePaths.length > 0 && onFilesAttached) {
        await onFilesAttached(largeFilePaths)
        toast.success(t('files.dropZone.attachedShownInFileArea', { names: formatFileNames(attachedLargeFiles) }))
      }

      const fileEntries: Array<{ filename: string; data: string }> = []
      for (const file of okFiles) {
        const base64 = await fileToBase64(file)
        fileEntries.push({ filename: file.name, data: base64 })
      }

      if (fileEntries.length > 0) {
        if (isWorkspace) {
          await window.electronAPI.saveFilesToWorkspaceFiles({
            workspaceSlug,
            files: fileEntries,
          })
        } else {
          await window.electronAPI.saveFilesToAgentSession({
            workspaceSlug,
            sessionId: sessionId!,
            files: fileEntries,
          })
        }

        onFilesUploaded()
        toast.success(t('files.dropZone.filesAdded', { count: okFiles.length }))
      }
    } catch (error) {
      console.error('[FileDropZone] 文件上传失败:', error)
      toast.error(t('files.dropZone.uploadFailed'))
    } finally {
      setIsUploading(false)
    }
  }, [workspaceSlug, sessionId, isWorkspace, onFilesUploaded, onFilesAttached, t])

  const handleDrop = React.useCallback(async (e: React.DragEvent, side: 'left' | 'right'): Promise<void> => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(null)
    if (isUploading) return

    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length === 0) {
      if (side === 'right') {
        toast.info(t('files.dropZone.unrecognizedDrop'))
      }
      return
    }

    const pathMap = new Map<string, globalThis.File>()
    const paths: string[] = []
    for (const f of droppedFiles) {
      try {
        const p = window.electronAPI.getPathForFile(f)
        if (p) {
          paths.push(p)
          pathMap.set(p, f)
        }
      } catch { /* 无法获取路径时忽略 */ }
    }

    if (paths.length > 0) {
      try {
        const { directories, files: filePaths } = await window.electronAPI.checkPathsType(paths)

        // 左侧：只上传文件，忽略目录
        if (side === 'left') {
          if (directories.length > 0) {
            toast.info(t('files.dropZone.folderToRightZone'))
          }
          const regularFiles = filePaths.flatMap((p) => {
            const f = pathMap.get(p)
            return f ? [f] : []
          })
          if (regularFiles.length > 0) {
            await saveFiles(regularFiles)
          }
        } else {
          // 右侧：附加文件夹，也支持将文件按原路径附加
          if (filePaths.length > 0) {
            if (onFilesAttached) {
              await onFilesAttached(filePaths)
              toast.success(t('files.dropZone.filesAttached', { count: filePaths.length }))
            } else {
              toast.info(t('files.dropZone.filesToLeftZone'))
            }
          }
          if (directories.length > 0) {
            onFoldersDropped(directories)
          }
        }
      } catch (error) {
        console.error('[FileDropZone] 路径检测失败，回退处理:', error)
        if (side === 'left') {
          await saveFiles(droppedFiles)
        } else {
          toast.warning(t('files.dropZone.unrecognizedFolder'))
        }
      }
    } else {
      if (side === 'left') {
        await saveFiles(droppedFiles)
      } else {
        toast.warning(t('files.dropZone.unrecognizedFolder'))
      }
    }
  }, [saveFiles, onFoldersDropped, onFilesAttached, isUploading, t])

  const handleDragOver = React.useCallback((e: React.DragEvent, side: 'left' | 'right'): void => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(side)
  }, [])

  const handleDragLeave = React.useCallback((e: React.DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    // 如果光标仍在同级容器内（切换到兄弟 zone），不清空 state；
    // 兄弟 zone 的 dragover 会把 side 切到正确值，避免 1 帧闪烁。
    const related = e.relatedTarget as Node | null
    const container = (e.currentTarget as HTMLElement).parentElement
    if (related && container && container.contains(related)) return
    setIsDragOver(null)
  }, [])

  const handleSelectFiles = React.useCallback(async (): Promise<void> => {
    try {
      const result = await window.electronAPI.openFileDialog()
      const largeFiles = result.largeFiles ?? []
      const skippedFiles = result.skippedFiles ?? []
      if (result.files.length === 0 && largeFiles.length === 0 && skippedFiles.length === 0) return

      if (largeFiles.length > 0) {
        if (onFilesAttached) {
          await onFilesAttached(largeFiles.map((f) => f.path))
          toast.success(t('files.dropZone.attachedShownInFileArea', { names: formatFileNames(largeFiles.map((f) => f.filename)) }))
        } else {
          toast.error(t('files.dropZone.oversizedNotCopied', { names: formatFileNames(largeFiles.map((f) => f.filename)) }), {
            description: t('files.dropZone.oversizedNotCopiedDescription'),
          })
        }
      }
      if (skippedFiles.length > 0) {
        toast.warning(t('files.dropZone.unreadableSkipped', { names: formatFileNames(skippedFiles.map((f) => f.filename)) }))
      }

      const oversized: string[] = []
      const okFiles = result.files.filter((f) => {
        if (f.size > MAX_ATTACHMENT_SIZE) {
          oversized.push(f.filename)
          return false
        }
        return true
      })

      if (oversized.length > 0) {
        toast.error(t('files.dropZone.oversizedNotCopied', { names: formatFileNames(oversized) }), {
          description: t('files.dropZone.oversizedNotCopiedDescription'),
        })
      }

      if (okFiles.length === 0) return

      setIsUploading(true)
      const fileEntries = okFiles.map((f) => ({
        filename: f.filename,
        data: f.data,
      }))

      if (isWorkspace) {
        await window.electronAPI.saveFilesToWorkspaceFiles({
          workspaceSlug,
          files: fileEntries,
        })
      } else {
        await window.electronAPI.saveFilesToAgentSession({
          workspaceSlug,
          sessionId: sessionId!,
          files: fileEntries,
        })
      }

      onFilesUploaded()
      toast.success(t('files.dropZone.filesAdded', { count: okFiles.length }))
    } catch (error) {
      console.error('[FileDropZone] 选择文件失败:', error)
      toast.error(t('files.dropZone.uploadFailed'))
    } finally {
      setIsUploading(false)
    }
  }, [workspaceSlug, sessionId, isWorkspace, onFilesUploaded, onFilesAttached, t])

  const zoneClass = (side: 'left' | 'right'): string =>
    cn(
      'flex-1 flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-2.5 transition-colors duration-200 cursor-pointer',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
      isDragOver === side
        ? 'bg-primary/25 ring-2 ring-primary/50'
        : 'bg-muted/40 hover:bg-muted/70',
      isUploading && 'pointer-events-none opacity-60',
    )

  const activateOnKey = (fn: () => void) => (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      fn()
    }
  }

  return (
    <div className="flex gap-2 px-3 pt-2 pb-1.5 flex-shrink-0">
      {isUploading ? (
        <div className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          {t('files.dropZone.uploading')}
        </div>
      ) : (
        <>
          {/* 添加文件 */}
          <Tooltip open={isDragOver === 'left' ? false : undefined}>
            <TooltipTrigger asChild>
              <div
                role="button"
                tabIndex={0}
                aria-label={isWorkspace ? t('files.dropZone.addFilesToProject') : t('files.dropZone.addFilesToSession')}
                className={zoneClass('left')}
                onDragOver={(e) => handleDragOver(e, 'left')}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 'left')}
                onClick={handleSelectFiles}
                onKeyDown={activateOnKey(handleSelectFiles)}
              >
                <span className="text-[11px] text-muted-foreground/75">{t('files.dropZone.addFiles')}</span>
                <Paperclip className="size-4 text-muted-foreground/60" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{isWorkspace ? t('files.dropZone.addFilesToProject') : t('files.dropZone.putFilesInAgentFolder')}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip open={isDragOver === 'right' ? false : undefined}>
            <TooltipTrigger asChild>
              <div
                role="button"
                tabIndex={0}
                aria-label={isWorkspace ? t('files.dropZone.attachProjectFolder') : t('files.dropZone.attachFolder')}
                className={zoneClass('right')}
                onDragOver={(e) => handleDragOver(e, 'right')}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 'right')}
                onClick={onAttachFolder}
                onKeyDown={activateOnKey(onAttachFolder)}
              >
                <span className="text-[11px] text-muted-foreground/75">{t('files.dropZone.attachFolder')}</span>
                <FolderPlus className="size-4 text-muted-foreground/60" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{isWorkspace ? t('files.dropZone.attachExternalFolderHint') : t('files.dropZone.tellAgentFolder')}</p>
            </TooltipContent>
          </Tooltip>
        </>
      )}
    </div>
  )
}
