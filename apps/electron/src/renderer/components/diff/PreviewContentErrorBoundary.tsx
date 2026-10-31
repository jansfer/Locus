import * as React from 'react'
import { AlertTriangle, RotateCw } from 'lucide-react'
import { t } from '@/i18n'

interface PreviewContentErrorBoundaryProps {
  /** 文件切换时自动清除上一个文件的错误状态。 */
  resetKey: string
  children: React.ReactNode
}

interface PreviewContentErrorBoundaryState {
  hasError: boolean
}

/**
 * 将单个文件预览的渲染异常限制在预览内容区域。
 *
 * 文件内容由外部路径提供，任何专用渲染器都不应使整个 Agent 会话或窗口失效。
 */
export class PreviewContentErrorBoundary extends React.Component<
  PreviewContentErrorBoundaryProps,
  PreviewContentErrorBoundaryState
> {
  constructor(props: PreviewContentErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): PreviewContentErrorBoundaryState {
    return { hasError: true }
  }

  override componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    console.error('[PreviewContentErrorBoundary] 文件预览渲染异常:', error, info.componentStack)
  }

  override componentDidUpdate(prevProps: PreviewContentErrorBoundaryProps): void {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false })
    }
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false })
  }

  override render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground">
          <AlertTriangle className="size-7 text-destructive/70" />
          <p className="text-[13px]">{t('diff.boundary.unsafeRender')}</p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            <RotateCw className="size-3.5" />
            {t('diff.boundary.retry')}
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
