/**
 * LocusLogoSettings - Locus 品牌 Logo 下载
 *
 * 展示 Locus Logo 的颜色变体网格，用户可下载用作机器人头像。
 * 变体位图与 resources/locus-logos/ 中的资源一一对应，
 * 下载时通过 saveResourceFileAs 从随包资源目录读取原图。
 */

import * as React from 'react'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { SettingsSection } from './primitives/SettingsSection'
import { SettingsCard } from './primitives/SettingsCard'
import { Button } from '@/components/ui/button'

// ===== Logo 资源导入 =====

import locusBrandLogo from '@/assets/bots/locus-logos/locus-brand.png'
import locusBlackLogo from '@/assets/bots/locus-logos/locus-black.png'
import locusWhiteLogo from '@/assets/bots/locus-logos/locus-white.png'
import locusTransparentLogo from '@/assets/bots/locus-logos/locus-transparent.png'

// ===== 类型 =====

interface LogoVariant {
  id: string
  name: string
  description: string
  src: string
  resourcePath: string
  previewBg: string
}

// ===== Logo 变体定义 =====

const LOGO_VARIANTS: readonly LogoVariant[] = [
  {
    id: 'brand',
    name: '品牌色',
    description: '与应用图标一致',
    src: locusBrandLogo,
    resourcePath: 'locus-logos/locus-brand.png',
    previewBg: 'bg-indigo-600',
  },
  {
    id: 'black',
    name: '经典黑',
    description: '深色底，适合浅色平台',
    src: locusBlackLogo,
    resourcePath: 'locus-logos/locus-black.png',
    previewBg: 'bg-neutral-900',
  },
  {
    id: 'white',
    name: '纯白版',
    description: '白色底，适合深色平台',
    src: locusWhiteLogo,
    resourcePath: 'locus-logos/locus-white.png',
    previewBg: 'bg-white',
  },
  {
    id: 'transparent',
    name: '透明底',
    description: '适配任意底色',
    src: locusTransparentLogo,
    resourcePath: 'locus-logos/locus-transparent.png',
    previewBg: 'bg-neutral-300',
  },
]

// ===== 组件 =====

function LogoCard({ logo }: { logo: LogoVariant }): React.ReactElement {
  const handleDownload = React.useCallback(async () => {
    try {
      const saved = await window.electronAPI.saveResourceFileAs(
        logo.resourcePath,
        `locus-${logo.id}.png`,
      )
      if (saved) {
        toast.success(`${logo.name} 已保存`)
      }
    } catch {
      toast.error('保存失败，请重试')
    }
  }, [logo])

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          'w-20 h-20 rounded-xl overflow-hidden border border-border/50 flex items-center justify-center',
          logo.previewBg,
        )}
      >
        <img
          src={logo.src}
          alt={logo.name}
          className="w-full h-full object-contain"
          draggable={false}
        />
      </div>
      <div className="text-center">
        <div className="text-xs font-medium">{logo.name}</div>
        <div className="text-[10px] text-muted-foreground">{logo.description}</div>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="w-full gap-1.5 h-7 text-xs"
        onClick={handleDownload}
      >
        <Download size={12} />
        下载
      </Button>
    </div>
  )
}

export function LocusLogoSettings(): React.ReactElement {
  return (
    <>
      <SettingsSection
        title="品牌 Logo"
        description="下载 Locus Logo 用作机器人头像，让用户一眼认出你的 AI 助手"
      >
        <div className="grid grid-cols-4 gap-4">
          {LOGO_VARIANTS.map((logo) => (
            <LogoCard key={logo.id} logo={logo} />
          ))}
        </div>
      </SettingsSection>

      <div className="my-6 border-t border-border/50" />

      <SettingsSection
        title="使用提示"
        description="在机器人平台设置头像时参考"
      >
        <SettingsCard divided={false}>
          <div className="px-4 py-3 space-y-1.5 text-sm text-muted-foreground">
            <p>建议使用 PNG 格式，飞书/钉钉头像推荐 200x200 以上。</p>
            <p>透明底版本适合需要自定义背景色的平台。</p>
            <p>品牌色版本在深色与浅色界面上辨识度都较高。</p>
          </div>
        </SettingsCard>
      </SettingsSection>
    </>
  )
}
