import { describe, expect, test } from 'bun:test'
import { getI18nLanguage, setI18nLanguage, t, formatDate, formatNumber, currentLocaleTag } from './core'
import { resolveLanguage } from './resolve-language'
import { APP_LANGUAGES, isAppLanguage, type MessageKey } from './types'
import { zhCN } from './locales/zh-CN'
import { en } from './locales/en'

/** 把嵌套词典扁平化为点分键集合。 */
function flattenKeys(dict: unknown, prefix = ''): Set<string> {
  const keys = new Set<string>()
  if (!dict || typeof dict !== 'object') return keys
  for (const [key, value] of Object.entries(dict as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') {
      keys.add(path)
    } else {
      for (const nested of flattenKeys(value, path)) keys.add(nested)
    }
  }
  return keys
}

/** 提取模板中的插值参数名。 */
function extractParams(template: string): Set<string> {
  return new Set([...template.matchAll(/\{(\w+)\}/g)].map((match) => match[1]!))
}

describe('Given the i18n dictionaries When comparing zh-CN and en Then key sets are identical', () => {
  const zhKeys = flattenKeys(zhCN)
  const enKeys = flattenKeys(en)

  test('Given both dictionaries Then they expose the same flat key set', () => {
    const missingInEn = [...zhKeys].filter((key) => !enKeys.has(key))
    const missingInZh = [...enKeys].filter((key) => !zhKeys.has(key))
    expect(missingInEn).toEqual([])
    expect(missingInZh).toEqual([])
  })

  test('Given every key Then interpolation parameters match across languages', () => {
    for (const key of zhKeys) {
      const zhTemplate = lookup(zhCN, key)
      const enTemplate = lookup(en, key)
      expect(zhTemplate).toBeDefined()
      expect(enTemplate).toBeDefined()
      expect([...extractParams(zhTemplate ?? '')].sort()).toEqual([...extractParams(enTemplate ?? '')].sort())
    }
  })

  test('Given the zh-CN dictionary Then MessageKey typing stays in sync with flat keys', () => {
    // 抽样验证：这些键必须在编译期就是合法 MessageKey（抽样即可证明类型推导正常）。
    const samples: MessageKey[] = ['common.confirm', 'menu.file.closeTab', 'tray.quit', 'settings.general.language.label', 'prompts.defaultReplyInstruction']
    for (const key of samples) {
      expect(zhKeys.has(key)).toBe(true)
    }
  })
})

describe('Given the t function When translating Then it interpolates and falls back correctly', () => {
  test('Given a plain key in Chinese Then returns the Chinese text', () => {
    setI18nLanguage('zh-CN')
    expect(t('common.confirm')).toBe('确定')
  })

  test('Given a key with params Then placeholders are replaced', () => {
    setI18nLanguage('zh-CN')
    expect(t('settings.general.archiveDays', { n: 30 })).toBe('30 天')
  })

  test('Given English mode Then returns English text', () => {
    setI18nLanguage('en')
    expect(t('common.confirm')).toBe('Confirm')
    expect(t('menu.file.label')).toBe('File')
  })

  test('Given a missing key Then falls back to the key name itself', () => {
    setI18nLanguage('zh-CN')
    expect(t('nonexistent.key' as MessageKey)).toBe('nonexistent.key')
  })

  test('Given language switching Then subscribers and locale tag update', () => {
    let notified = 0
    const unsubscribe = (() => {
      // 直接订阅 core 的语言变化
      const { subscribeI18n } = require('./core') as typeof import('./core')
      return subscribeI18n(() => { notified += 1 })
    })()
    setI18nLanguage('en')
    expect(getI18nLanguage()).toBe('en')
    expect(currentLocaleTag()).toBe('en')
    setI18nLanguage('zh-CN')
    expect(getI18nLanguage()).toBe('zh-CN')
    expect(currentLocaleTag()).toBe('zh-CN')
    // 相同语言重复设置不触发通知
    setI18nLanguage('zh-CN')
    unsubscribe()
    expect(notified).toBe(2)
  })
})

describe('Given Intl formatting helpers When formatting Then they follow the active language', () => {
  test('Given zh-CN Then numbers use zh grouping', () => {
    setI18nLanguage('zh-CN')
    expect(formatNumber(12345)).toBe('12,345')
  })

  test('Given en Then dates format in English locale', () => {
    setI18nLanguage('en')
    const text = formatDate(new Date(2026, 0, 15), { year: 'numeric', month: 'long', day: 'numeric' })
    expect(text).toContain('2026')
    expect(text).toContain('January')
  })
})

describe('Given language resolution When resolving preference and OS locale Then returns the effective language', () => {
  test('Given explicit zh-CN preference Then ignores OS locale', () => {
    expect(resolveLanguage('zh-CN', 'en-US')).toBe('zh-CN')
  })

  test('Given explicit en preference Then ignores OS locale', () => {
    expect(resolveLanguage('en', 'zh-CN')).toBe('en')
  })

  test('Given system preference with Chinese locale Then resolves zh-CN', () => {
    expect(resolveLanguage('system', 'zh-CN')).toBe('zh-CN')
    expect(resolveLanguage('system', 'zh-TW')).toBe('zh-CN')
    expect(resolveLanguage('system', 'zh')).toBe('zh-CN')
  })

  test('Given system preference with non-Chinese locale Then resolves en', () => {
    expect(resolveLanguage('system', 'en-US')).toBe('en')
    expect(resolveLanguage('system', 'ja-JP')).toBe('en')
  })

  test('Given system preference with missing locale Then defaults to en', () => {
    expect(resolveLanguage('system', undefined)).toBe('en')
  })

  test('Given legacy config without language field Then treats it as system', () => {
    expect(resolveLanguage(undefined, 'zh-CN')).toBe('zh-CN')
    expect(resolveLanguage(undefined, 'en-US')).toBe('en')
  })
})

describe('Given the language type guard When validating settings values Then only valid values pass', () => {
  test('Given valid values Then accepted', () => {
    for (const language of APP_LANGUAGES) expect(isAppLanguage(language)).toBe(true)
  })

  test('Given invalid values Then rejected', () => {
    expect(isAppLanguage('fr')).toBe(false)
    expect(isAppLanguage('ZH-CN')).toBe(false)
    expect(isAppLanguage(42)).toBe(false)
    expect(isAppLanguage(undefined)).toBe(false)
  })
})

/** 在嵌套词典中按点分路径取值。 */
function lookup(dict: unknown, key: string): string | undefined {
  let current: unknown = dict
  for (const part of key.split('.')) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }
  return typeof current === 'string' ? current : undefined
}
