/**
 * AppearanceSettings - 外观设置页
 *
 * 特殊风格选择 + 主题模式切换（浅色/深色/跟随系统/特殊风格）。
 * 通过 Jotai atom 管理状态，持久化到 ~/.proma/settings.json。
 */

import * as React from 'react'
import { useAtom, useAtomValue } from 'jotai'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import {
  SettingsSection,
  SettingsCard,
  SettingsRow,
  SettingsSegmentedControl,
} from './primitives'
import {
  themeModeAtom,
  themeStyleAtom,
  systemIsDarkAtom,
  updateThemeMode,
  updateThemeStyle,
  applyThemeToDOM,
} from '@/atoms/theme'
import {
  markdownFontSizeAtom,
  updateMarkdownFontSize,
} from '@/atoms/markdown-font-size'
import { cn } from '@/lib/utils'
import { detectIsWindows } from '@/lib/platform'
import { useT } from '@/i18n'
import type { ThemeMode, ThemeStyle, MarkdownFontSize } from '../../../types'

// ===== Logo 资源导入（用于图标选择器） =====
import locusAppIcon from '@/assets/locus-app-icon.png'
import locusBrandIcon from '@/assets/bots/locus-logos/locus-brand.png'
import locusBlackIcon from '@/assets/bots/locus-logos/locus-black.png'
import locusWhiteIcon from '@/assets/bots/locus-logos/locus-white.png'
import locusTransparentIcon from '@/assets/bots/locus-logos/locus-transparent.png'

// ===== 主题预览图片导入 =====
import themeCloudDancer from '@/assets/theme-previews/theme-cloud-dancer.webp'
import themeOceanLight from '@/assets/theme-previews/theme-ocean-light.webp'
import themeForestMorning from '@/assets/theme-previews/theme-forest-morning.webp'
import themeOceanDark from '@/assets/theme-previews/theme-ocean-dark.webp'
import themeForestNight from '@/assets/theme-previews/theme-forest-night.webp'
import themeMorandiNight from '@/assets/theme-previews/theme-morandi-night.webp'
import themeTerminalDark from '@/assets/theme-previews/theme-terminal-dark.png'

/** 主题模式选项；labelKey 为词典键片段，渲染处拼接 t() 键 */
const THEME_OPTIONS: ReadonlyArray<{ value: ThemeMode; labelKey: 'light' | 'dark' | 'system' | 'special' }> = [
  { value: 'light', labelKey: 'light' },
  { value: 'dark', labelKey: 'dark' },
  { value: 'system', labelKey: 'system' },
  { value: 'special', labelKey: 'special' },
]

/** Markdown 字号选项 */
const MARKDOWN_FONT_SIZE_OPTIONS: ReadonlyArray<{ value: MarkdownFontSize; labelKey: 'small' | 'medium' | 'large' }> = [
  { value: 'small', labelKey: 'small' },
  { value: 'medium', labelKey: 'medium' },
  { value: 'large', labelKey: 'large' },
]

/** 特殊风格 ID（排除 default） */
type SpecialStyleId = Exclude<ThemeStyle, 'default'>

/** 特殊风格名称的词典键片段（字面量联合，供模板拼接 t() 键） */
type SpecialStyleNameKey = 'cloudDancer' | 'oceanLight' | 'forestMorning' | 'oceanDark' | 'forestNight' | 'morandiNight' | 'terminalDark'

/** 特殊风格定义 */
interface SpecialStyle {
  id: SpecialStyleId
  nameKey: SpecialStyleNameKey
  variant: 'light' | 'dark'
  /** 主题预览图 */
  image: string
  /** 图片裁剪位置（默认居中） */
  objectPosition?: string
  /** 图片缩放比例（默认 1） */
  imageScale?: number
  /** Tooltip 提示的词典键片段（可选） */
  tooltipKey?: 'flickerTooltip'
}

const SPECIAL_STYLES: readonly SpecialStyle[] = [
  {
    id: 'slate-light',
    nameKey: 'cloudDancer',
    variant: 'light',
    image: themeCloudDancer,
    imageScale: 1.3,
  },
  {
    id: 'ocean-light',
    nameKey: 'oceanLight',
    variant: 'light',
    image: themeOceanLight,
  },
  {
    id: 'forest-light',
    nameKey: 'forestMorning',
    variant: 'light',
    image: themeForestMorning,
    imageScale: 1.45,
  },
  {
    id: 'ocean-dark',
    nameKey: 'oceanDark',
    variant: 'dark',
    image: themeOceanDark,
  },
  {
    id: 'forest-dark',
    nameKey: 'forestNight',
    variant: 'dark',
    image: themeForestNight,
  },
  {
    id: 'slate-dark',
    nameKey: 'morandiNight',
    variant: 'dark',
    image: themeMorandiNight,
    imageScale: 1.15,
    objectPosition: '44% 58%',
  },
  {
    id: 'terminal-dark',
    nameKey: 'terminalDark',
    variant: 'dark',
    image: themeTerminalDark,
    tooltipKey: 'flickerTooltip',
  },
]

/** 图标变体名称的词典键片段；'default' 复用 common.default */
type IconNameKey = 'default' | 'brand' | 'black' | 'white' | 'transparent'

/** 图标变体定义 */
interface IconVariant {
  id: string
  nameKey: IconNameKey
  src: string
  previewBg: string
}

const ICON_VARIANTS: readonly IconVariant[] = [
  { id: 'default', nameKey: 'default', src: locusAppIcon, previewBg: 'bg-neutral-100' },
  { id: 'brand', nameKey: 'brand', src: locusBrandIcon, previewBg: 'bg-indigo-600' },
  { id: 'black', nameKey: 'black', src: locusBlackIcon, previewBg: 'bg-neutral-900' },
  { id: 'white', nameKey: 'white', src: locusWhiteIcon, previewBg: 'bg-white' },
  { id: 'transparent', nameKey: 'transparent', src: locusTransparentIcon, previewBg: 'bg-neutral-300' },
] as const

/** 根据平台判断是否 macOS（用于缩放快捷键提示选键） */
const isMac = navigator.userAgent.includes('Mac')

export function AppearanceSettings(): React.ReactElement {
  const t = useT()
  const [themeMode, setThemeMode] = useAtom(themeModeAtom)
  const [themeStyle, setThemeStyle] = useAtom(themeStyleAtom)
  const systemIsDark = useAtomValue(systemIsDarkAtom)
  const [markdownFontSize, setMarkdownFontSize] = useAtom(markdownFontSizeAtom)

  /** 切换主题模式 */
  const handleThemeChange = React.useCallback((value: string) => {
    const mode = value as ThemeMode
    setThemeMode(mode)
    updateThemeMode(mode)
    // 切换回普通模式时，重置特殊风格
    if (mode !== 'special') {
      setThemeStyle('default')
      updateThemeStyle('default')
      applyThemeToDOM(mode, 'default', systemIsDark)
    }
  }, [setThemeMode, setThemeStyle, systemIsDark])

  /** 选择特殊风格 */
  const handleStyleSelect = React.useCallback((style: ThemeStyle) => {
    // 同时切换到特殊风格模式
    setThemeMode('special')
    setThemeStyle(style)
    updateThemeMode('special')
    updateThemeStyle(style)
    applyThemeToDOM('special', style, systemIsDark)
  }, [setThemeMode, setThemeStyle, systemIsDark])

  /** 切换 Markdown 字号 */
  const handleMarkdownFontSizeChange = React.useCallback((value: string) => {
    const size = value as MarkdownFontSize
    setMarkdownFontSize(size)
    updateMarkdownFontSize(size)
  }, [setMarkdownFontSize])

  return (
    <div className="space-y-6">
      <SettingsSection
        title={t('settingsMisc.appearance.title')}
        description={t('settingsMisc.appearance.description')}
      >
        <SettingsCard>
          {/* 主题模式 - 最上面 */}
          <SettingsSegmentedControl
            label={t('settingsMisc.appearance.themeModeLabel')}
            description={t('settingsMisc.appearance.themeModeDesc')}
            value={themeMode}
            onValueChange={handleThemeChange}
            options={THEME_OPTIONS.map((option) => ({
              value: option.value,
              label: t(`settingsMisc.appearance.theme.${option.labelKey}`),
            }))}
          />

          {/* 特殊风格 - 标签在上，卡片在下 */}
          <div className="px-4 py-3 space-y-2">
            <div className="text-sm font-medium text-foreground">{t('settingsMisc.appearance.specialStylesLabel')}</div>
            <div className="grid grid-cols-7 gap-3">
              {SPECIAL_STYLES.map((style) => (
                <StyleCard
                  key={style.id}
                  style={style}
                  isSelected={themeMode === 'special' && themeStyle === style.id}
                  onSelect={() => handleStyleSelect(style.id)}
                />
              ))}
            </div>
          </div>

          <SettingsRow
            label={t('settingsMisc.appearance.zoomLabel')}
            description={isMac ? t('settingsMisc.appearance.zoomHintMac') : t('settingsMisc.appearance.zoomHintWindows')}
          />

          <SettingsSegmentedControl
            label={t('settingsMisc.appearance.fontSizeLabel')}
            description={t('settingsMisc.appearance.fontSizeDesc')}
            value={markdownFontSize}
            onValueChange={handleMarkdownFontSizeChange}
            options={MARKDOWN_FONT_SIZE_OPTIONS.map((option) => ({
              value: option.value,
              label: t(`settingsMisc.appearance.fontSize.${option.labelKey}`),
            }))}
          />

        </SettingsCard>
      </SettingsSection>

      <AppIconPicker />
    </div>
  )
}

/** 应用图标选择器 */
function AppIconPicker(): React.ReactElement {
  const t = useT()
  const [activeIcon, setActiveIcon] = React.useState<string>('default')
  const [isLoading, setIsLoading] = React.useState(false)

  // 初始化时读取当前设置
  React.useEffect(() => {
    window.electronAPI.getSettings().then((settings) => {
      setActiveIcon(settings.appIconVariant ?? 'default')
    })
  }, [])

  const isWindows = React.useMemo(() => detectIsWindows(), [])

  const handleIconSelect = React.useCallback(async (variantId: string) => {
    if (isWindows) {
      toast.error(t('settingsMisc.appearance.icon.windowsUnsupported'))
      return
    }
    if (variantId === activeIcon || isLoading) return
    setIsLoading(true)
    try {
      const success = await window.electronAPI.setAppIcon(variantId)
      if (success) {
        setActiveIcon(variantId)
        toast.success(t('settingsMisc.appearance.icon.changed'))
      } else {
        toast.error(t('settingsMisc.appearance.icon.changeFailed'))
      }
    } catch {
      toast.error(t('settingsMisc.appearance.icon.changeFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [activeIcon, isLoading, isWindows])

  return (
    <SettingsSection
      title={t('settingsMisc.appearance.icon.title')}
      description={t('settingsMisc.appearance.icon.description')}
    >
      <SettingsCard divided={false}>
        <div className="px-4 py-3">
          <div className="grid grid-cols-5 gap-3">
            {ICON_VARIANTS.map((variant) => (
              <IconCard
                key={variant.id}
                variant={variant}
                isSelected={activeIcon === variant.id}
                onSelect={() => handleIconSelect(variant.id)}
              />
            ))}
          </div>
        </div>
      </SettingsCard>
    </SettingsSection>
  )
}

/** 图标选项卡片 */
function IconCard({
  variant,
  isSelected,
  onSelect,
}: {
  variant: IconVariant
  isSelected: boolean
  onSelect: () => void
}): React.ReactElement {
  const t = useT()
  /** 图标名称；'default' 复用 common 键，其余走 appearance.icon 分组 */
  const iconName =
    variant.nameKey === 'default'
      ? t('common.default')
      : t(`settingsMisc.appearance.icon.${variant.nameKey}`)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'relative flex flex-col items-center gap-1.5 rounded-lg p-2 transition-all',
        isSelected
          ? 'ring-2 ring-primary bg-primary/5'
          : 'hover:bg-muted/50'
      )}
    >
      <div
        className={cn(
          'w-12 h-12 rounded-xl overflow-hidden border border-border/50 flex items-center justify-center',
          variant.previewBg,
        )}
      >
        <img
          src={variant.src}
          alt={iconName}
          className="w-full h-full object-contain"
          draggable={false}
        />
      </div>
      <span className="text-[10px] font-medium text-muted-foreground leading-tight text-center">
        {iconName}
      </span>
      {isSelected && (
        <div className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-primary flex items-center justify-center">
          <Check className="size-2.5 text-primary-foreground" />
        </div>
      )}
    </button>
  )
}

/** 特殊风格卡片 - 竖长条图片预览 + 名字放在卡片下方 */
function StyleCard({
  style,
  isSelected,
  onSelect,
}: {
  style: SpecialStyle
  isSelected: boolean
  onSelect: () => void
}): React.ReactElement {
  const t = useT()
  const styleName = t(`settingsMisc.appearance.style.${style.nameKey}`)

  return (
    <button
      type="button"
      onClick={onSelect}
      title={style.tooltipKey ? t(`settingsMisc.appearance.style.${style.tooltipKey}`) : undefined}
      className="group flex flex-col items-center gap-2 focus-visible:outline-none"
    >
      {/* 图片卡片本体 */}
      <div
        className={cn(
          'relative rounded-lg overflow-hidden w-[99px] h-[183px] transition-all duration-150',
          isSelected
            ? 'ring-2 ring-primary shadow-lg shadow-primary/20'
            : 'ring-1 ring-border/50 group-hover:ring-border group-focus-visible:ring-2 group-focus-visible:ring-primary group-focus-visible:ring-offset-1'
        )}
      >
        <div
          className="w-full h-full"
          style={style.imageScale ? { transform: `scale(${style.imageScale})` } : undefined}
        >
          <img
            src={style.image}
            alt={styleName}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
            style={style.objectPosition ? { objectPosition: style.objectPosition } : undefined}
            draggable={false}
          />
        </div>
        {isSelected && (
          <div className="absolute top-1 right-1 size-4 rounded-full bg-primary flex items-center justify-center z-10">
            <Check className="size-2.5 text-primary-foreground" />
          </div>
        )}
      </div>
      {/* 名字放在卡片下方，吃 token，自动跟主题切色 */}
      <span
        className={cn(
          'text-xs font-medium transition-colors',
          isSelected ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
        )}
      >
        {styleName}
      </span>
    </button>
  )
}
