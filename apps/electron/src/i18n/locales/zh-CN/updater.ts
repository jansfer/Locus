/** updater 域文案（简体中文）。启动失败降级提示与更新相关主进程文案。 */
export const updater = {
  bootstrapError: {
    title: 'Locus 启动遇到错误',
    intro: '部分功能可能不可用：',
    logLocation: '日志位置：',
    causesTitle: '常见原因与排查：',
    cause1: '1. 旧版 Locus 进程未退出（终端运行 killall Locus 后重试）',
    cause2: '2. ~/.proma/ 配置损坏（重命名 ~/.proma 后重启）',
    cause3: '3. 系统 Keychain 无法解密保存的凭证（删除 ~/.proma/feishu.json 等后重新登录）',
    feedback: '如需协助请到 GitHub Issues 反馈。',
  },
} as const
