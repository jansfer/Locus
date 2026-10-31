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
import { useT } from '@/i18n'
import type { MessageKey } from '@/i18n'
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
  /** 变体名称的文案键，渲染处用 t() 翻译 */
  nameKey: MessageKey
  /** 变体描述的文案键，渲染处用 t() 翻译 */
  descriptionKey: MessageKey
  src: string
  resourcePath: string
  previewBg: string
}

// ===== Logo 变体定义 =====

const LOGO_VARIANTS: readonly LogoVariant[] = [
  {
    id: 'brand',
    nameKey: 'settings.bots.logoBrand',
    descriptionKey: 'settings.bots.logoBrandDesc',
    src: locusBrandLogo,
    resourcePath: 'locus-logos/locus-brand.png',
    previewBg: 'bg-indigo-600',
  },
  {
    id: 'black',
    nameKey: 'settings.bots.logoBlack',
    descriptionKey: 'settings.bots.logoBlackDesc',
    src: locusBlackLogo,
    resourcePath: 'locus-logos/locus-black.png',
    previewBg: 'bg-neutral-900',
  },
  {
    id: 'white',
    nameKey: 'settings.bots.logoWhite',
    descriptionKey: 'settings.bots.logoWhiteDesc',
    src: locusWhiteLogo,
    resourcePath: 'locus-logos/locus-white.png',
    previewBg: 'bg-white',
  },
  {
    id: 'transparent',
    nameKey: 'settings.bots.logoTransparent',
    descriptionKey: 'settings.bots.logoTransparentDesc',
    src: locusTransparentLogo,
    resourcePath: 'locus-logos/locus-transparent.png',
    previewBg: 'bg-neutral-300',
  },
]

// ===== 组件 =====

function LogoCard({ logo }: { logo: LogoVariant }): React.ReactElement {
  const t = useT()
  const handleDownload = React.useCallback(async () => {
    try {
      const saved = await window.electronAPI.saveResourceFileAs(
        logo.resourcePath,
        `locus-${logo.id}.png`,
      )
      if (saved) {
        toast.success(t('settings.bots.logoSaved', { name: t(logo.nameKey) }))
      }
    } catch {
      toast.error(t('settings.bots.logoSaveFailed'))
    }
  }, [logo, t])

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
          alt={t(logo.nameKey)}
          className="w-full h-full object-contain"
          draggable={false}
        />
      </div>
      <div className="text-center">
        <div className="text-xs font-medium">{t(logo.nameKey)}</div>
        <div className="text-[10px] text-muted-foreground">{t(logo.descriptionKey)}</div>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="w-full gap-1.5 h-7 text-xs"
        onClick={handleDownload}
      >
        <Download size={12} />
        {t('settings.bots.download')}
      </Button>
    </div>
  )
}

export function LocusLogoSettings(): React.ReactElement {
  const t = useT()
  return (
    <>
      <SettingsSection
        title={t('settings.bots.logosTitle')}
        description={t('settings.bots.logosDesc')}
      >
        <div className="grid grid-cols-4 gap-4">
          {LOGO_VARIANTS.map((logo) => (
            <LogoCard key={logo.id} logo={logo} />
          ))}
        </div>
      </SettingsSection>

      <div className="my-6 border-t border-border/50" />

      <SettingsSection
        title={t('settings.bots.tipsTitle')}
        description={t('settings.bots.tipsDesc')}
      >
        <SettingsCard divided={false}>
          <div className="px-4 py-3 space-y-1.5 text-sm text-muted-foreground">
            <p>{t('settings.bots.tipPng')}</p>
            <p>{t('settings.bots.tipTransparent')}</p>
            <p>{t('settings.bots.tipBrand')}</p>
          </div>
        </SettingsCard>
      </SettingsSection>
    </>
  )
}
