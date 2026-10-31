# Locus 工程约定

Locus 是一个本地优先的 Electron AI 桌面 Agent，基于 [Proma](https://github.com/proma-ai/Proma) 修改而来（AGPL-3.0）。仓库是 Bun monorepo；主应用在 `apps/electron`，共享包在 `packages/*`。

## 上游关系与合规底线

- 本仓库是上游 `proma-ai/Proma` 的 fork，原始版权归 Erlich Liu。上游提交历史与本仓库同源，保留原始提交与作者信息。
- 不得删除或改写原始版权声明。`apps/electron/electron-builder.yml` 的 `copyright` 必须同时包含原作者与本仓库修改方。
- 分发二进制或源码时，必须提供与该版本对应的完整源码（AGPL-3.0 第 6 条）；若通过网络提供服务，须提供源码获取方式（第 13 条）。应用内「关于/更新」页面的修改日期与源码地址必须真实可用。
- 派生作品整体继续以 AGPL-3.0 授权，不得整体改为其他许可证。

## 品牌与分发边界

- 应用标识：`productName: Locus`、`appId: com.locus.app`、deb 包名与可执行名 `locus`、发布仓库 `jansfer/Locus`。
- 不要重新引入指向上游商业版的入口、推广卡片、FAQ 或文案（`proma.cool` 系列链接）。
- 不要恢复对 `api.proma.cool` 的远程请求；安装包清单使用 `installer-manifest.ts` 内置的 fallback。
- 打包产物排除 `docx` / `pdf` / `pptx` / `xlsx` 四个 Skill（版权归 Anthropic，All rights reserved）。这些目录保留在仓库中供本地开发，但不得进入发布产物。
- 以下内部标识**有意保留**，不要顺手改名，改了会破坏兼容性或功能：
  - `@proma/*` 包名与 `~/.proma/` 数据目录（改包名波及全部 import；改数据目录会丢失用户数据）
  - `proma-file://` 自定义协议、`proma_entity_id`、`keep_proma` 等持久化字段值
  - User-Agent 的 `Proma/` 前缀：Kimi Coding Plan 等服务端按该前缀做白名单校验，改名会导致渠道不可用；仅括号内的仓库地址指向本项目
- 用户可见文案统一使用 Locus。批量替换时注意 `\bProma\b` 在中文标点（。，、」等）前不会匹配，需用 `s/Proma/Locus/g` 或脚本正则复核；含驼峰标识符的文件（如 `PromaUserAgent`、`PromaInput`）必须按行精确替换。

## 品牌资产

- 应用图标源文件是 `apps/electron/resources/icon.svg`（几何：圆角底板 + 定位环 + 中心点 + 四向刻度）。`icon.png`(1024)、`icon.ico`、`icon.icns` 必须与该 SVG 几何一致。
- 菜单栏图标与机器人头像变体在 `apps/electron/resources/locus-logos/`，同时渲染层有对应副本 `src/renderer/assets/bots/locus-logos/`；`resolveAppIconPath` 按 `locus-logos/locus-<id>.png` 查找，新增变体时两处都要放文件。
- 启动页 `resources/startup-splash/` 的背景图必须是原创或明确公有领域的素材，不得使用来源不明的绘画或摄影作品。

## 必须遵守

- 使用 **Bun**，不使用 npm/pnpm：`bun run dev`、`bun run typecheck`、`bun test`。
- 注释、日志和用户可见的工程文档优先使用中文，保留必要技术术语。
- 不使用 `any`；对象类型优先 `interface`，仅类型导入优先 `import type`。
- 状态管理统一使用 Jotai。保持组件化、可读、最小设计；避免过度抽象。
- 先调研再新增依赖，明确版本与维护状态；不要凭习惯加入依赖。
- 本地优先：持久化优先采用可移植的 JSON/JSONL 配置文件，不引入本地数据库。
- 修改 JSON 配置或会话元数据时，使用 `apps/electron/src/main/lib/safe-file.ts` 的原子写封装；不要直接 `writeFileSync`。
- 功能改动应有 BDD 风格的可执行测试，至少覆盖正常路径和主要边界。
- 改动 UI 时复用既有 Radix/shadcn primitives 与主题变量；重视空状态、键盘操作、加载态和深浅主题。

## 常用命令

```bash
# 开发
bun run dev

# 构建 / 类型检查 / 测试
bun run build
bun run electron:build
bun run typecheck
bun test

# 打包（apps/electron 内）
bun run dist:mac
bun run dist:win
bun run dist:linux
bun run dist:fast
```

对单一变更优先运行最小相关测试，再运行 `bun run typecheck`。改运行时依赖、external 清单或打包规则后，至少运行 `bun run electron:build`；涉及发布产物时运行目标平台的打包冒烟验证。

验证前端资源引用（图片、SVG 等）时，`bun run typecheck` 不够——TypeScript 对 `*.png` 走通配声明，路径写错也能通过。必须运行 `bun run --filter='@proma/electron' build:renderer`，由 Vite 真实解析资源。

## 目录与边界

```text
apps/electron/                    Electron 主应用
  src/main/lib/                   主进程服务、Agent/Pi runtime、持久化
  src/preload/                    类型安全 IPC bridge
  src/renderer/                   React + Vite + Tailwind UI
  default-skills/                 随应用分发的默认 Skills
  resources/                      图标、启动页、品牌素材与打包资源
packages/shared/                  类型、IPC 常量、通用工具
packages/core/                    Provider 适配器、SSE、代码高亮
packages/session-core/            会话通用能力
packages/ui/                      跨应用共享 UI
docs/                             使用说明与设计文档
tutorial/                         中文教程
release-notes/                    版本发布日志（上游历史，不要改写）
```

### IPC 是四层契约

新增/修改 IPC 时必须同步检查：

1. `packages/shared` 的通道常量和请求/响应类型；
2. `apps/electron/src/main/ipc.ts` 的 handler；
3. `apps/electron/src/preload/index.ts` 的 bridge；
4. renderer 的调用、错误处理与状态更新。

### Agent 与项目指令

- 仅使用 **Pi Agent runtime**。不要重新引入 Claude Agent SDK 或其专属配置、session 语义和打包依赖。
- 用户项目的 `AGENTS.md` 由 `project-instruction-resolver.ts` 在已授权项目根内显式解析；禁止恢复 cwd、祖先目录或附加目录的环境式规则发现。
- 受管工作区的 `AGENTS.md` 与用户项目的 `AGENTS.md` 有不同所有权边界，均须通过已验证的显式路径注入。
- 旧项目 `CLAUDE.md` 仅是兼容输入，不能自动覆盖、合并或删除用户文件。
- 改动 Agent 工具、权限或上下文路径时，检查工作区隔离、附加目录边界、会话恢复与 Automation/Collaboration 的回归。

### 默认 Skills

修改 `apps/electron/default-skills/<skill>/` 的任何内容时，必须同步递增该 Skill `SKILL.md` frontmatter 的 `version`（patch +1），否则老工作区不会收到升级。

## 版本、提交与文档

- **每次改动都必须递增版本号**：代码、UI、默认 Skills、文档或工程配置的任何提交，至少将对应交付物的 patch 版本 +1；跨多个可发布包时逐个递增受影响包。
- `apps/electron/package.json` 是桌面应用版本；`packages/*/package.json` 是各共享包版本；默认 Skill 改动还必须递增其 `SKILL.md` frontmatter 的 `version`。
- 仅在功能行为、安装方式或用户流程发生变化时更新 README / tutorial / release notes。
- 提交前检查 `git diff`，不要覆盖用户已有改动或提交无关文件。
- 不要改写 `release-notes/` 与 `proma-thinking/` 的历史内容：前者是既成发布记录，后者是上游作者署名文章，改写等于篡改历史与他人表述。

## 面向国际读者的英文信息（AI 提交与发布时遵守）

本仓库是公开的开源项目，历史提交、PR 与 Release 需要让国际读者可读。Agent 产出的以下内容**优先使用英文**：

- **Git commit message**：type(scope) 前缀与描述均用英文（如 `feat(i18n): add zh/en dictionaries`）；正文与 footer 同样英文。保留 `Made-with: Locus` trailer。
- **PR / MR 标题与描述**：用英文撰写；引用中文上下文（如用户原话、中文文件名）时可保留原文。
- **Release notes**：`release-notes/vX.Y.Z.md` 新增条目用英文；不迁移历史条目（改写历史等于篡改记录）。
- **不改变现有约定**：代码注释、console 日志与项目内中文工程文档仍优先中文（见「必须遵守」）；界面文案遵循 i18n 词典双语；用户消息与历史内容不翻译。
- **双语交付场景**：涉及用户可见行为变化时，README 已双语（`README.md` 英文 / `README.zh-CN.md` 中文），两个文件顶部互链，新增面向读者的说明需两份同步更新。

## 已知既有问题（改动前先确认，不要重复排查）

- `bun run typecheck` 在 `apps/electron` 有 3 处**既有**错误，根因是 `packages/shared` 的 `ProviderType` 未包含 `doubao` 与 `ark-coding-plan`：`main/lib/adapters/pi-provider-compat.ts`、`main/lib/channel-manager.ts`、`renderer/lib/model-logo.ts`。修改这三个文件前先确认错误是否为既有问题。
- `apps/electron/src/main/lib/updater/update-cache-cleanup.test.ts` 在 Windows 上有 3 个用例失败（依赖 chmod 制造权限拒绝与创建软链接），在 macOS / Linux 上正常。
- 应用内「关于/更新」读取 `github.com/jansfer/Locus` 的 Releases；该仓库没有发布任何 Release 前，版本历史为空且不返回更新，这是预期行为。
