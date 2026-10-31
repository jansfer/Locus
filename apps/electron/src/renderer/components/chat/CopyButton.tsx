/**
 * CopyButton - 复制消息内容按钮
 *
 * 使用 MessageAction + Copy/Check 图标切换。
 * 移植自 proma-frontend 的 chat-view/copy-button.tsx。
 */

import { useState, useCallback } from 'react'
import { CopyIcon, CheckIcon } from 'lucide-react'
import { MessageAction } from '@/components/ai-elements/message'
import { copyTextToClipboard } from '@/lib/clipboard'
import { useT } from '@/i18n'

interface CopyButtonProps {
  /** 要复制的内容 */
  content: string
}

export function CopyButton({ content }: CopyButtonProps): React.ReactElement {
  const t = useT()
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await copyTextToClipboard(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('复制失败:', error)
    }
  }, [content])

  return (
    <MessageAction
      tooltip={copied ? t('common.copied') : t('common.copy')}
      onClick={handleCopy}
    >
      {copied ? (
        <CheckIcon className="size-4" />
      ) : (
        <CopyIcon className="size-4" />
      )}
    </MessageAction>
  )
}
