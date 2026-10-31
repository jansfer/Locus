import * as React from 'react'
import { Brain } from 'lucide-react'
import { getGeminiModelCapability, type GeminiThinkingLevel } from '@proma/shared'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { inputToolbarActiveButtonClass, inputToolbarButtonClass } from '@/components/ai-elements/input-toolbar-styles'
import { useConversationThinkingEnabled, useConversationThinkingLevel } from '@/hooks/useConversationSettings'
import { cn } from '@/lib/utils'
import { useT } from '@/i18n'

/** 思考深度 → 词典键片段（显式字面量联合，保证模板串能收窄为 MessageKey） */
const THINKING_LEVEL_KEY_SUFFIX: Record<GeminiThinkingLevel, 'levelMinimal' | 'levelLow' | 'levelMedium' | 'levelHigh'> = {
  minimal: 'levelMinimal',
  low: 'levelLow',
  medium: 'levelMedium',
  high: 'levelHigh',
}

interface ChatThinkingPopoverProps {
  modelId?: string
}

/**
 * Chat 的思考设置。仅 Gemini 3 文本模型显示其官方支持的深度；其他模型仍保留原有开关。
 * 设置只写入当前对话 atom，不订阅流式内容或增加 IPC。
 */
export function ChatThinkingPopover({ modelId }: ChatThinkingPopoverProps): React.ReactElement {
  const t = useT()
  const [open, setOpen] = React.useState(false)
  const [thinkingEnabled, setThinkingEnabled] = useConversationThinkingEnabled()
  const [thinkingLevel, setThinkingLevel] = useConversationThinkingLevel()
  const capability = getGeminiModelCapability(modelId)
  const effectiveLevel = capability?.thinkingLevels.includes(thinkingLevel)
    ? thinkingLevel
    : capability?.defaultThinkingLevel

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(inputToolbarButtonClass, thinkingEnabled && inputToolbarActiveButtonClass)}
          aria-label={t('chat.thinking.ariaLabel')}
        >
          <Brain className="size-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="center" sideOffset={8} className="w-56 space-y-3 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">{t('chat.thinking.mode')}</p>
            <p className="text-xs text-muted-foreground">{thinkingEnabled ? t('common.enabled') : t('chat.thinking.off')}</p>
          </div>
          <Switch checked={thinkingEnabled} onCheckedChange={setThinkingEnabled} aria-label={t('chat.thinking.toggleAria')} />
        </div>
        {capability && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground">{t('chat.thinking.geminiDepth')}</p>
            <div className="grid grid-cols-2 gap-1">
              {capability.thinkingLevels.map((level) => (
                <Button
                  key={level}
                  type="button"
                  variant={effectiveLevel === level ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-8 justify-start px-2 text-xs"
                  disabled={!thinkingEnabled}
                  onClick={() => setThinkingLevel(level)}
                >
                  {t(`chat.thinking.${THINKING_LEVEL_KEY_SUFFIX[level]}`)}
                </Button>
              ))}
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {t('chat.thinking.defaultLevel', { level: t(`chat.thinking.${THINKING_LEVEL_KEY_SUFFIX[capability.defaultThinkingLevel]}`) })}
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
