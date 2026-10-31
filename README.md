# Locus

<p align="center">
  <b>English</b> | <a href="./README.zh-CN.md">简体中文</a>
</p>

A local-first desktop AI Agent that brings multi-model Chat, a general-purpose Agent, workspaces, Skills, MCP, memory, and automation into a single client. Your data and configuration stay on your own machine by default.

> **This repository is a modified version of [Proma](https://github.com/proma-ai/Proma)**. As required by AGPL-3.0 Section 5(a), we state here: modified on 2026-10-29 by Jansfer. The complete corresponding source is this repository; its history shares the same origin as upstream and remains traceable. Upstream copyright belongs to Erlich Liu. See [LICENSE](./LICENSE) and the original commits in this repository's `git log`.

## Table of Contents

- [What is this](#what-is-this)
- [Core capabilities](#core-capabilities)
- [Designed for professional users](#designed-for-professional-users)
- [Download and install](#download-and-install)
- [Run from source](#run-from-source)
- [Differences from upstream Proma](#differences-from-upstream-proma)
- [Tutorials](#tutorials)
- [Contributing](#contributing)
- [Origin and acknowledgements](#origin-and-acknowledgements)
- [License](#license)

## What is this

Locus is a general-purpose desktop Agent for professional users. It is not a "chat window with a few buttons": it puts what an Agent actually needs — the file system, terminal, browser, Skills, memory, calendar and tasks — into a single observable, interruptible interface.

Three foundational beliefs shape its design:

- **Context quality determines output quality.** Most of the product exists to help you organize context: project and project files, session and session files, layered memory, and project-scoped Skills.
- **Local first.** Configuration, sessions, and memory are stored on your machine as portable JSON / JSONL by default; no remote account is required for full functionality.
- **An Agent's execution should be visible.** Tool calls, file changes, sub-sessions, the terminal, and the browser are all presented in the UI instead of hiding behind a loading spinner.

## Core capabilities

- **Chat mode**: lightweight multi-model conversations for quick questions and side-by-side comparisons
- **Agent mode**: full execution with tools, file system, terminal, and browser
- **Plan mode**: produce a reviewable plan first, execute after approval
- **Project partitioning**: layered management of project roots / project files and sessions / session files
- **Memory**: project-level `AGENTS.md` and layered memory indexes that persist across sessions
- **Skills / MCP / CLI**: project-scoped, with support for common MCP servers and CLI tools
- **Embedded browser**: a real browser the Agent can operate, including logged-in on-site search and interaction
- **Embedded terminal**: visible, interruptible terminal sessions
- **Scheduled automations**: once, interval, daily / weekly / monthly, with execution windows and run limits
- **Parallel exploration**: branch exploration from any turn and bring conclusions back to the main session
- **Sub-sessions and the main session**: cleaner context boundaries than traditional SubAgents; parallelizable and support adversarial review
- **Remote access**: WeChat, Feishu (Lark), DingTalk, and Slack
- **Interface language**: Simplified Chinese / English, following the system by default; switching applies instantly, and the Agent's default reply language follows the interface
- **File preview and editing**: live Markdown editing, plus PDF / Word / Excel / PPT preview

## Designed for professional users

These capabilities are wired into the Agent — it can call them directly, and you can operate them manually:

- **Todos and calendar**: tasks and schedules belong to both you and the Agent; two-way sync with macOS Reminders and Calendar
- **Obsidian**: a built-in Obsidian-style Markdown editor with wiki links, for knowledge management and research work
- **File changes**: review the Agent's changes per turn, with diffs for coding sessions and one-click terminal handoff for worktree sessions
- **Worktree workflow**: parallel development based on Git worktrees, with diffs against the mainline shown beside the session

The UI is organized in three columns: the left holds sessions and feature entries, the middle is the main area for interacting with the Agent, and the right is the auxiliary area — project files, file changes, document preview, sub-sessions, browser, terminal, Obsidian, calendar, todos, and Skills all live there, serving the quality of the middle column's results.

## Download and install

Get installers from [GitHub Releases](https://github.com/jansfer/Locus/releases):

- macOS (Apple Silicon / Intel): `.dmg`
- Windows (amd64 / arm64): `.exe` installer
- Ubuntu / Debian (amd64 / arm64): `.deb`
- Linux (amd64 / arm64): `.AppImage`

Linux installation steps, security boundaries, and supported scope are documented in [Linux notes](./docs/linux.md) (Chinese). macOS installers are not code-signed yet; on first launch, allow the app in "System Settings → Privacy & Security".

> This project does not provide a commercial edition or official model channels. You need to bring your own AI provider API Key and configure it under "Settings → Channels".

## Run from source

Requires [Bun](https://bun.sh) (npm / pnpm are not used).

```bash
bun install
bun run dev          # development mode
bun run typecheck    # type checking
bun test             # tests
bun run electron:build
```

Packaging:

```bash
cd apps/electron
bun run dist:mac     # macOS
bun run dist:win     # Windows
bun run dist:linux   # Linux
```

Native packaging for Windows, macOS, and Linux on amd64 / arm64 is supported, with version, OS, and CPU in the file name. Build commands, download selection, and auto-update compatibility are documented in [packaging notes](docs/packaging.md) (Chinese).

## Differences from upstream Proma

This fork's changes focus on branding and distribution boundaries; runtime capabilities match upstream:

- App identity changed to `Locus` / `com.locus.app`; icons, startup splash, and UI copy fully replaced — upstream brand assets are no longer used
- Removed upstream commercial edition entries, promo cards, and related copy
- Auto-update and release checks point to this repository instead of upstream Releases
- Update checks run ~3 seconds after startup and every 15 minutes afterwards, including on wake or network recovery, with a 2-minute cooldown; "no update" and network-error toasts are never repeated
- Starred sessions are exempt from auto-archiving (manual archiving still works); deleting a session cancels its browser operations and closes all of its managed browser tabs
- Projects support archiving and one-click restore (except the default project) with files, sessions, and background tasks preserved; the project list is searchable by name or folder path
- No more requests to the upstream commercial API (`api.proma.cool`); the installer manifest is built in
- Packaging excludes the `docx` / `pdf` / `pptx` / `xlsx` Skills, whose copyright belongs to Anthropic; the files remain in the repository for local development
- Internal identifiers intentionally kept: `@proma/*` package names, the `~/.proma/` data directory, the `proma-file://` protocol, and the `Proma/` User-Agent prefix (some third-party channels validate that prefix server-side; renaming it would break those channels)

## Tutorials

- [Getting started](./tutorial/tutorial.md) (Chinese): installation, provider configuration, choosing between Chat and Agent
- [Advanced guide](./tutorial/tutorial-v2.md) (Chinese): file design, Skills engineering, scheduled automations, remote usage

## Contributing

Bug fixes, documentation, and tests are welcome. Before opening a PR, please make sure that:

- Scripts run with Bun; do not mix in npm / pnpm lockfiles
- State management uses Jotai
- Local-first is preserved; prefer config files and JSON / JSONL
- TypeScript uses no `any`; prefer `interface` for object shapes
- New IPC changes update shared types, the main handler, the preload bridge, and the renderer call together
- Patch versions of affected packages are bumped when their behavior changes
- Behavior that can be tested gets tests, especially shared logic, IPC contracts, and persistence formats

## Origin and acknowledgements

Locus is derived from [Proma](https://github.com/proma-ai/Proma), created and maintained by Erlich Liu; its architecture, Agent runtime integration, and many features form the foundation of this project. The upstream release history shares the same origin as this repository, and every original commit's author and time can be traced via `git log`.

This repository is not the official upstream project; the upstream team is not responsible for changes made here.

## License

This project inherits the upstream [GNU Affero General Public License v3.0 (AGPL-3.0)](./LICENSE); the full text is in the root `LICENSE` file. As a modified version, this project as a whole remains licensed under AGPL-3.0.

- **Use and modification**: free to use, modify, and distribute, including commercially
- **Distribution obligation**: when distributing in source or binary form, you must provide the complete corresponding source for this version (including this project's modifications) and keep the original copyright notices
- **Network service**: if you offer a modified version as a network service, you must provide its users a way to obtain the complete source
- **Derivative works**: must continue to be licensed under AGPL-3.0

If you need to use this project in scenarios that cannot satisfy AGPL-3.0 obligations (closed-source integration, SaaS without public source), contact the upstream rights holder for a commercial license. See the upstream repository for contact details.
