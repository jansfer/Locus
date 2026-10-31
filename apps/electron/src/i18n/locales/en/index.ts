/**
 * English 词典汇总。
 *
 * 结构必须与 zh-CN 完全同形（MirrorStructure 强制编译期检查），
 * 运行时另有键集合一致性测试兜底。
 */

import { common } from './common'
import { settings } from './settings'
import { menu } from './menu'
import { tray } from './tray'
import { notifications } from './notifications'
import { automation } from './automation'
import { planning } from './planning'
import { prompts } from './prompts'
import { agent } from './agent'
import { chat } from './chat'
import { vault } from './vault'
import { browser } from './browser'
import { diff } from './diff'
import { files } from './files'
import { skills } from './skills'
import { onboarding } from './onboarding'
import { dialogs } from './dialogs'
import { search } from './search'
import { welcome } from './welcome'
import { appShell } from './appShell'
import { sessionPreview } from './sessionPreview'
import { environment } from './environment'
import { voice } from './voice'
import { updater } from './updater'
import type { MirrorStructure } from '../../types'
import type { zhCN } from '../zh-CN/index.ts'

export const en: MirrorStructure<typeof zhCN> = {
  common,
  settings,
  menu,
  tray,
  notifications,
  automation,
  planning,
  prompts,
  agent,
  chat,
  vault,
  browser,
  diff,
  files,
  skills,
  onboarding,
  dialogs,
  search,
  welcome,
  appShell,
  sessionPreview,
  environment,
  voice,
  updater,
}
