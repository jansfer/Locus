import { useCallback, useEffect, useRef, useState } from 'react'
import { useT } from '@/i18n'
import guideSubagentDelegation from '@/assets/onboarding/guide-subagent-delegation.png'
import guideSubagentWorkspace from '@/assets/onboarding/guide-subagent-workspace.png'
import guideSubagentSummary from '@/assets/onboarding/guide-subagent-summary.png'

interface ImageBounds {
  x: number
  y: number
  width: number
  height: number
}

/** 聚焦自然语言启动多个子会话的 Prompt，尺寸随截图渲染宽度同步变化。 */
function SubagentDelegationExampleImage() {
  const t = useT()
  const frameRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const [imageBounds, setImageBounds] = useState<ImageBounds | null>(null)

  const updateImageBounds = useCallback(() => {
    const frame = frameRef.current
    const image = imageRef.current
    if (!frame || !image) return

    const frameRect = frame.getBoundingClientRect()
    const imageRect = image.getBoundingClientRect()
    if (!imageRect.width || !imageRect.height) return

    const next = {
      x: imageRect.left - frameRect.left,
      y: imageRect.top - frameRect.top,
      width: imageRect.width,
      height: imageRect.height,
    }

    setImageBounds((current) => {
      if (
        current &&
        Math.abs(current.x - next.x) < 0.5 &&
        Math.abs(current.y - next.y) < 0.5 &&
        Math.abs(current.width - next.width) < 0.5 &&
        Math.abs(current.height - next.height) < 0.5
      ) {
        return current
      }

      return next
    })
  }, [])

  useEffect(() => {
    const image = imageRef.current
    if (!image) return

    updateImageBounds()
    const observer = new ResizeObserver(updateImageBounds)
    observer.observe(image)

    return () => observer.disconnect()
  }, [updateImageBounds])

  const anchor = { x: 0.46, y: 0.212 }
  const imageZoom = 1.28
  const sourceCropWidth = 0.30375
  const magnifierDiameter = imageBounds ? imageBounds.width * imageZoom * sourceCropWidth : 0
  const radius = magnifierDiameter / 2
  const verticalOffset = magnifierDiameter * 0.14
  const focusX = imageBounds ? imageBounds.x + anchor.x * imageBounds.width : 0
  const focusY = imageBounds ? imageBounds.y + anchor.y * imageBounds.height : 0
  const zoomedWidth = imageBounds ? imageBounds.width * imageZoom : 0
  const zoomedHeight = imageBounds ? imageBounds.height * imageZoom : 0

  const clampToLens = (position: number, contentSize: number) =>
    Math.min(0, Math.max(magnifierDiameter - contentSize, position))
  const imageLeft = imageBounds ? clampToLens(radius - anchor.x * zoomedWidth, zoomedWidth) : 0
  const imageTop = imageBounds ? clampToLens(radius - verticalOffset - anchor.y * zoomedHeight, zoomedHeight) : 0

  return (
    <div ref={frameRef} className="relative min-w-0">
      <figure className="overflow-hidden rounded-lg bg-[#f6f8f3] shadow-[0_14px_30px_rgba(27,63,45,0.12)]">
        <img
          ref={imageRef}
          src={guideSubagentDelegation}
          alt={t('onboarding.pages.subagent.image1Alt')}
          className="block h-auto w-full"
          onLoad={updateImageBounds}
        />
      </figure>

      {imageBounds && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-20"
          style={{
            left: focusX - radius,
            top: focusY - radius + verticalOffset,
            width: magnifierDiameter,
            height: magnifierDiameter,
            backgroundColor: '#eef4ea',
            clipPath: `circle(${radius}px at ${radius}px ${radius}px)`,
            overflow: 'hidden',
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.25))',
          }}
        >
          <img
            src={guideSubagentDelegation}
            alt=""
            draggable={false}
            className="max-w-none"
            style={{
              position: 'absolute',
              left: imageLeft,
              top: imageTop,
              width: zoomedWidth,
              height: zoomedHeight,
              objectFit: 'fill',
            }}
          />
          <div
            className="absolute inset-0 rounded-full border-[3px] border-[#1b3f2d]"
            style={{ clipPath: `circle(${radius}px at ${radius}px ${radius}px)` }}
          />
          <div
            className="absolute bottom-[-6px] right-[-6px] h-8 w-8 rounded-full border-[4px] border-[#1b3f2d]"
            style={{
              clipPath: 'none',
              background: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: 'transparent',
              transform: 'rotate(-45deg)',
            }}
          />
        </div>
      )}
    </div>
  )
}

/** 子会话章节的真实工作流示例。 */
export function SubagentGuideExamples() {
  const t = useT()
  return (
    <section className="border-t border-[#1b3f2d]/20 py-16 md:py-20">
      <div className="max-w-2xl">
        <div className="text-xs font-medium uppercase text-[#1b3f2d]">{t('onboarding.examples.realLabel')}</div>
        <h2 className="mt-4 text-3xl font-light text-neutral-900 md:text-4xl">{t('onboarding.pages.subagent.title')}</h2>
        <p className="mt-4 text-base leading-[1.7] text-neutral-600 md:text-lg">
          {t('onboarding.pages.subagent.intro')}
        </p>
      </div>

      <div className="mt-14 space-y-16 md:mt-16 md:space-y-20">
        <article className="grid gap-10 border-t border-[#1b3f2d]/15 pt-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center">
          <SubagentDelegationExampleImage />
          <div>
            <div className="text-xs font-medium uppercase text-[#1b3f2d]">{t('onboarding.pages.subagent.example1Label')}</div>
            <h3 className="mt-3 text-2xl font-medium text-neutral-900 md:text-3xl">{t('onboarding.pages.subagent.example1Title')}</h3>
            <p className="mt-4 text-base leading-[1.7] text-neutral-600 md:text-lg">
              {t('onboarding.pages.subagent.example1Desc')}
            </p>
            <div className="mt-5 border-l-2 border-[#1b3f2d]/35 pl-4">
              <div className="text-base font-medium leading-7 text-[#1b3f2d]">{t('onboarding.examples.promptHint')}</div>
              <p className="mt-1 text-base leading-7 text-neutral-500">{t('onboarding.pages.subagent.example1Quote')}</p>
            </div>
          </div>
        </article>

        <article className="grid gap-10 border-t border-[#1b3f2d]/15 pt-10 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-center">
          <div className="lg:order-1">
            <div className="text-xs font-medium uppercase text-[#1b3f2d]">{t('onboarding.pages.subagent.example2Label')}</div>
            <h3 className="mt-3 text-2xl font-medium text-neutral-900 md:text-3xl">{t('onboarding.pages.subagent.example2Title')}</h3>
            <p className="mt-4 text-base leading-[1.7] text-neutral-600 md:text-lg">
              {t('onboarding.pages.subagent.example2Desc')}
            </p>
            <div className="mt-5 border-l-2 border-[#1b3f2d]/35 pl-4">
              <div className="text-base font-medium leading-7 text-[#1b3f2d]">{t('onboarding.examples.promptHint')}</div>
              <p className="mt-1 text-base leading-7 text-neutral-500">{t('onboarding.pages.subagent.example2Quote')}</p>
            </div>
          </div>
          <figure className="overflow-hidden rounded-lg bg-[#f6f8f3] shadow-[0_14px_30px_rgba(27,63,45,0.12)] lg:order-2">
            <img src={guideSubagentWorkspace} alt={t('onboarding.pages.subagent.image2Alt')} className="block h-auto w-full" />
          </figure>
        </article>

        <article className="grid gap-10 border-t border-[#1b3f2d]/15 pt-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center">
          <figure className="overflow-hidden rounded-lg bg-[#f6f8f3] shadow-[0_14px_30px_rgba(27,63,45,0.12)]">
            <img src={guideSubagentSummary} alt={t('onboarding.pages.subagent.image3Alt')} className="block h-auto w-full" />
          </figure>
          <div>
            <div className="text-xs font-medium uppercase text-[#1b3f2d]">{t('onboarding.pages.subagent.example3Label')}</div>
            <h3 className="mt-3 text-2xl font-medium text-neutral-900 md:text-3xl">{t('onboarding.pages.subagent.example3Title')}</h3>
            <p className="mt-4 text-base leading-[1.7] text-neutral-600 md:text-lg">
              {t('onboarding.pages.subagent.example3Desc')}
            </p>
            <div className="mt-5 border-l-2 border-[#1b3f2d]/35 pl-4">
              <div className="text-base font-medium leading-7 text-[#1b3f2d]">{t('onboarding.examples.promptHint')}</div>
              <p className="mt-1 text-base leading-7 text-neutral-500">{t('onboarding.pages.subagent.example3Quote')}</p>
            </div>
          </div>
        </article>
      </div>
    </section>
  )
}
