import { useT } from '@/i18n'
import automationDailyCodeQualityExample from '@/assets/onboarding/guide-automation-daily-code-quality.png'
import automationYesterdayCommitReviewExample from '@/assets/onboarding/guide-automation-yesterday-commit-review.png'
import automationCalendarExample from '@/assets/onboarding/guide-automation-calendar.png'

/** 自动任务章节的真实工作流示例；由父页面负责放入章节容器和导航。 */
export function AutomationGuideExamples() {
  const t = useT()
  return (
    <>
      <div className="max-w-2xl">
        <div className="text-xs font-medium uppercase tracking-[0.2em] text-[#1b3f2d]">{t('onboarding.examples.realLabel')}</div>
        <h2 className="mt-4 text-3xl font-light tracking-tight text-neutral-900 md:text-4xl">{t('onboarding.pages.automation.title')}</h2>
        <p className="mt-4 text-base leading-[1.7] text-neutral-600 md:text-lg">
          {t('onboarding.pages.automation.intro')}
        </p>
      </div>

      <div className="mt-14 space-y-16 md:mt-16 md:space-y-20">
        <article className="grid gap-10 border-t border-[#1b3f2d]/15 pt-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center">
          <figure className="min-w-0 overflow-hidden rounded-lg bg-[#f6f8f3] shadow-[0_14px_30px_rgba(27,63,45,0.12)]">
            <img src={automationDailyCodeQualityExample} alt={t('onboarding.pages.automation.image1Alt')} className="block h-auto w-full" />
          </figure>
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-[#1b3f2d]">{t('onboarding.pages.automation.example1Label')}</div>
            <h3 className="mt-3 text-2xl font-medium text-neutral-900 md:text-3xl">{t('onboarding.pages.automation.example1Title')}</h3>
            <p className="mt-4 text-base leading-[1.7] text-neutral-600 md:text-lg">
              {t('onboarding.pages.automation.example1Desc')}
            </p>
            <div className="mt-5 border-l-2 border-[#1b3f2d]/35 pl-4">
              <div className="text-base font-medium text-[#1b3f2d]">{t('onboarding.examples.promptHint')}</div>
              <p className="mt-1 text-base leading-7 text-neutral-500">{t('onboarding.pages.automation.example1Quote')}</p>
            </div>
          </div>
        </article>

        <article className="grid gap-10 border-t border-[#1b3f2d]/15 pt-10 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-center">
          <div className="min-w-0 lg:order-1">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-[#1b3f2d]">{t('onboarding.pages.automation.example2Label')}</div>
            <h3 className="mt-3 text-2xl font-medium text-neutral-900 md:text-3xl">{t('onboarding.pages.automation.example2Title')}</h3>
            <p className="mt-4 text-base leading-[1.7] text-neutral-600 md:text-lg">
              {t('onboarding.pages.automation.example2Desc')}
            </p>
            <div className="mt-5 border-l-2 border-[#1b3f2d]/35 pl-4">
              <div className="text-base font-medium text-[#1b3f2d]">{t('onboarding.examples.promptHint')}</div>
              <p className="mt-1 text-base leading-7 text-neutral-500">{t('onboarding.pages.automation.example2Quote')}</p>
            </div>
          </div>
          <figure className="min-w-0 overflow-hidden rounded-lg bg-[#f6f8f3] shadow-[0_14px_30px_rgba(27,63,45,0.12)] lg:order-2">
            <img src={automationYesterdayCommitReviewExample} alt={t('onboarding.pages.automation.image2Alt')} className="block h-auto w-full" />
          </figure>
        </article>

        <article className="grid gap-10 border-t border-[#1b3f2d]/15 pt-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center">
          <figure className="min-w-0 overflow-hidden rounded-lg bg-[#f6f8f3] shadow-[0_14px_30px_rgba(27,63,45,0.12)]">
            <img src={automationCalendarExample} alt={t('onboarding.pages.automation.image3Alt')} className="block h-auto w-full" />
          </figure>
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-[#1b3f2d]">{t('onboarding.pages.automation.example3Label')}</div>
            <h3 className="mt-3 text-2xl font-medium text-neutral-900 md:text-3xl">{t('onboarding.pages.automation.example3Title')}</h3>
            <p className="mt-4 text-base leading-[1.7] text-neutral-600 md:text-lg">
              {t('onboarding.pages.automation.example3Desc')}
            </p>
          </div>
        </article>
      </div>
    </>
  )
}
