/**
 * 简体中文词典汇总。
 *
 * 各域文件按功能分组；新增域时在此注册，并同步注册英文侧同名域。
 * MessageKey 从本对象推导，中文词典是文案键的单一来源。
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
import { agentView } from './agentView'
import { agentMessages } from './agentMessages'
import { agentMisc } from './agentMisc'
import { settingsIntegrations } from './settingsIntegrations'
import { settingsMisc } from './settingsMisc'
import { aiElements } from './aiElements'
import { aiElementsMisc } from './aiElementsMisc'
import { markdown } from './markdown'
import { obsidian } from './obsidian'
import { quickTask } from './quickTask'
import { misc } from './misc'
import { uiCommon } from './uiCommon'
import { appBoot } from './appBoot'

export const zhCN = {
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
  agentView,
  agentMessages,
  agentMisc,
  settingsIntegrations,
  settingsMisc,
  aiElements,
  aiElementsMisc,
  markdown,
  obsidian,
  quickTask,
  misc,
  uiCommon,
  appBoot,
} as const
