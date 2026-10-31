/** prompts 域文案（简体中文）。注入 Agent 系统提示词的界面语言相关指令。 */
export const prompts = {
  /** 默认回复语言要求：作为独立整句嵌入系统提示词，随界面语言切换。 */
  defaultReplyInstruction: '默认以简体中文回复；用户明确指定的语言及项目指令优先。',
  /** 每条消息动态上下文中的界面语言说明。 */
  responseLanguage: '界面语言：简体中文。除非用户另有指定，用简体中文回复。',
} as const
