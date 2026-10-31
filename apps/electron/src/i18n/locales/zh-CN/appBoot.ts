/** appBoot 域文案（简体中文）。启动画面与全局更新提示。 */
export const appBoot = {
  splash: {
    tagline: '让协作自然发生，让想法流动成形',
    starting: '正在启动 Locus',
  },
  update: {
    downloadedTitle: 'Locus 更新已下载',
    downloadedDesc: '所有 Agent 完成后即可自动安装。',
    viewUpdate: '查看更新',
    installWhenIdle: '空闲时更新',
    notReady: '更新尚未准备好，请稍后重试',
    scheduledTitle: '已安排空闲时更新',
    scheduledDesc: '当前任务结束后会自动重启安装。',
    cancelSchedule: '取消安排',
    scheduleFailed: '无法安排空闲更新，请稍后重试',
    fallbackVersion: '新版本',
  },
} as const
