import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { mock } from 'bun:test'

// 把设置文件指到临时目录，避免触碰真实的 ~/.proma/settings.json。
const tempDir = mkdtempSync(join(tmpdir(), 'locus-settings-i18n-'))
const settingsPath = join(tempDir, 'settings.json')
mock.module('./config-paths', () => ({ getSettingsPath: () => settingsPath }))

const { getSettings, updateSettings, sanitizeAppLanguage } = await import('./settings-service')

describe('Given app settings When reading language Then legacy and invalid values migrate to system', () => {
  afterEach(() => {
    if (existsSync(settingsPath)) rmSync(settingsPath)
  })

  test('Given a legacy settings file without language Then defaults to system', () => {
    writeFileSync(settingsPath, JSON.stringify({ themeMode: 'dark' }), 'utf-8')
    expect(getSettings().language).toBe('system')
  })

  test('Given an invalid language value Then normalizes to system', () => {
    writeFileSync(settingsPath, JSON.stringify({ themeMode: 'dark', language: 'fr' }), 'utf-8')
    expect(getSettings().language).toBe('system')
  })

  test('Given a valid persisted language Then round-trips', () => {
    writeFileSync(settingsPath, JSON.stringify({ themeMode: 'dark', language: 'en' }), 'utf-8')
    expect(getSettings().language).toBe('en')
  })

  test('Given a missing settings file Then defaults to system', () => {
    if (existsSync(settingsPath)) rmSync(settingsPath)
    expect(getSettings().language).toBe('system')
  })
})

describe('Given updateSettings When persisting language Then writes atomically and sanitizes input', () => {
  afterEach(() => {
    if (existsSync(settingsPath)) rmSync(settingsPath)
  })

  test('Given a language update Then it persists and no .tmp remains', () => {
    updateSettings({ language: 'en' })
    const stored = JSON.parse(readFileSync(settingsPath, 'utf-8'))
    expect(stored.language).toBe('en')
    expect(existsSync(`${settingsPath}.tmp`)).toBe(false)
  })

  test('Given an invalid language in updates Then stored value is normalized to system', () => {
    updateSettings({ language: 'klingon' as never })
    const stored = JSON.parse(readFileSync(settingsPath, 'utf-8'))
    expect(stored.language).toBe('system')
  })

  test('Given other updates Then the language field is preserved', () => {
    updateSettings({ language: 'zh-CN' })
    updateSettings({ archiveAfterDays: 14 })
    const stored = JSON.parse(readFileSync(settingsPath, 'utf-8'))
    expect(stored.language).toBe('zh-CN')
    expect(stored.archiveAfterDays).toBe(14)
  })

  test('Given sanitizeAppLanguage Then invalid input yields system', () => {
    expect(sanitizeAppLanguage(undefined)).toBe('system')
    expect(sanitizeAppLanguage(null)).toBe('system')
    expect(sanitizeAppLanguage('en')).toBe('en')
    expect(sanitizeAppLanguage('system')).toBe('system')
  })
})

describe('Given a failing atomic write When updating language Then the update fails without partial state', () => {
  test('Given writeJsonFileAtomic throws Then updateSettings propagates the error', async () => {
    writeFileSync(settingsPath, JSON.stringify({ themeMode: 'dark', language: 'zh-CN' }), 'utf-8')
    // 动态重入本模块，把原子写 mock 成失败，验证错误向上传播且原文件未被破坏。
    mock.module('./safe-file', () => ({
      writeJsonFileAtomic: () => { throw new Error('simulated disk failure') },
      readJsonFileSafe: () => null,
      writeTextFileAtomic: () => {},
    }))
    const { updateSettings: updateWithBrokenWrite } = await import('./settings-service')
    expect(() => updateWithBrokenWrite({ language: 'en' })).toThrow('写入应用设置失败')
    const stored = JSON.parse(readFileSync(settingsPath, 'utf-8'))
    expect(stored.language).toBe('zh-CN')
    // 恢复真实 safe-file，避免影响同文件内其他用例。
    mock.restore()
  })
})
