/** aiElements 域文案（简体中文）。迁移时按功能补充键；叶子必须是 string。 */
export const aiElements = {
  /** 富文本输入框 */
  input: {
    placeholder: '有什么可以帮助到你的呢？',
    expandInput: '展开输入框',
    collapseInput: '折叠输入框',
  },
  /** 消息组件原语 */
  message: {
    thinking: '正在思考...',
    stopped: '已停止生成',
    expandAll: '展开全部',
    saveImage: '保存图片',
    imageLoading: '正在加载图片…',
    imageLoadFailed: '图片无法读取：{name}',
    quoteTitle: '点击跳转到原消息并高亮引用内容',
    quoteJumpTitle: '跳转到引用位置并高亮',
    quoteJumpAria: '跳转到{label}的引用位置并高亮',
    fallbackSession: '会话 {id}',
    fallbackTodo: 'Todo {id}',
    fallbackCalendarEvent: '日程 {id}',
  },
} as const
