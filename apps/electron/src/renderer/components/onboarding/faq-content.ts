/**
 * FAQ 内容数据：按主题分组，供 Onboarding FAQ 页与全局 FAQ 弹窗共用。
 *
 * 文案存放在 onboarding 词典（onboarding.faq.*），渲染处经 t() 解析为当前语言；
 * slug 是与语言无关的稳定标识，用于 React key、DOM id 与锚点跳转。
 */

import type { MessageKey } from '@/i18n'

/** onboarding 词典中的 FAQ 文案键（onboarding.faq.*）。 */
export type FaqMessageKey = Extract<MessageKey, `onboarding.faq.${string}`>

export interface FaqItem {
  q: FaqMessageKey
  a: FaqMessageKey
}

export interface FaqGroup {
  /** 与语言无关的稳定标识，用于 React key、DOM id 与锚点跳转。 */
  slug: string
  topic: FaqMessageKey
  items: FaqItem[]
}


export const FAQ_GROUPS: FaqGroup[] = [
  {
    slug: 'agent-chat',
    topic: 'onboarding.faq.topics.agentChat',
    items: [
      { q: 'onboarding.faq.agentChat.q1', a: 'onboarding.faq.agentChat.a1' },
      { q: 'onboarding.faq.agentChat.q2', a: 'onboarding.faq.agentChat.a2' },
      { q: 'onboarding.faq.agentChat.q3', a: 'onboarding.faq.agentChat.a3' },
    ],
  },
  {
    slug: 'agent-sessions',
    topic: 'onboarding.faq.topics.agentSessions',
    items: [
      { q: 'onboarding.faq.agentSessions.q1', a: 'onboarding.faq.agentSessions.a1' },
      { q: 'onboarding.faq.agentSessions.q2', a: 'onboarding.faq.agentSessions.a2' },
      { q: 'onboarding.faq.agentSessions.q3', a: 'onboarding.faq.agentSessions.a3' },
      { q: 'onboarding.faq.agentSessions.q4', a: 'onboarding.faq.agentSessions.a4' },
      { q: 'onboarding.faq.agentSessions.q5', a: 'onboarding.faq.agentSessions.a5' },
    ],
  },
  {
    slug: 'projects',
    topic: 'onboarding.faq.topics.projects',
    items: [
      { q: 'onboarding.faq.projects.q1', a: 'onboarding.faq.projects.a1' },
      { q: 'onboarding.faq.projects.q2', a: 'onboarding.faq.projects.a2' },
      { q: 'onboarding.faq.projects.q3', a: 'onboarding.faq.projects.a3' },
    ],
  },
  {
    slug: 'automation',
    topic: 'onboarding.faq.topics.automation',
    items: [
      { q: 'onboarding.faq.automation.q1', a: 'onboarding.faq.automation.a1' },
      { q: 'onboarding.faq.automation.q2', a: 'onboarding.faq.automation.a2' },
    ],
  },
  {
    slug: 'memory',
    topic: 'onboarding.faq.topics.memory',
    items: [
      { q: 'onboarding.faq.memory.q1', a: 'onboarding.faq.memory.a1' },
      { q: 'onboarding.faq.memory.q2', a: 'onboarding.faq.memory.a2' },
    ],
  },
  {
    slug: 'pi',
    topic: 'onboarding.faq.topics.pi',
    items: [
      { q: 'onboarding.faq.pi.q1', a: 'onboarding.faq.pi.a1' },
    ],
  },
  {
    slug: 'side-answer',
    topic: 'onboarding.faq.topics.sideAnswer',
    items: [
      { q: 'onboarding.faq.sideAnswer.q1', a: 'onboarding.faq.sideAnswer.a1' },
      { q: 'onboarding.faq.sideAnswer.q2', a: 'onboarding.faq.sideAnswer.a2' },
    ],
  },
  {
    slug: 'subagent',
    topic: 'onboarding.faq.topics.subagent',
    items: [
      { q: 'onboarding.faq.subagent.q1', a: 'onboarding.faq.subagent.a1' },
      { q: 'onboarding.faq.subagent.q2', a: 'onboarding.faq.subagent.a2' },
      { q: 'onboarding.faq.subagent.q3', a: 'onboarding.faq.subagent.a3' },
      { q: 'onboarding.faq.subagent.q4', a: 'onboarding.faq.subagent.a4' },
      { q: 'onboarding.faq.subagent.q5', a: 'onboarding.faq.subagent.a5' },
    ],
  },
  {
    slug: 'misc',
    topic: 'onboarding.faq.topics.misc',
    items: [
      { q: 'onboarding.faq.misc.q1', a: 'onboarding.faq.misc.a1' },
      { q: 'onboarding.faq.misc.q2', a: 'onboarding.faq.misc.a2' },
      { q: 'onboarding.faq.misc.q3', a: 'onboarding.faq.misc.a3' },
    ],
  },
]
