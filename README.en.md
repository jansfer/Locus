# Locus

A local-first desktop AI agent that puts multi-model chat, a general-purpose agent, workspaces, Skills, MCP, memory and automation into a single client. Data and configuration stay on your own machine by default.

> **This repository is a modified version of [Proma](https://github.com/proma-ai/Proma).** As required by AGPL-3.0 section 5(a): modified on 2026-10-29 by Jansfer. The complete corresponding source is this repository, which shares history with upstream. Upstream copyright belongs to Erlich Liu — see [LICENSE](./LICENSE) and the original commits in `git log`.

## Contents

- [What this is](#what-this-is)
- [Capabilities](#capabilities)
- [Designed for professional users](#designed-for-professional-users)
- [Download and install](#download-and-install)
- [Run from source](#run-from-source)
- [Differences from upstream Proma](#differences-from-upstream-proma)
- [Tutorials](#tutorials)
- [Contributing](#contributing)
- [Origin and credits](#origin-and-credits)
- [License](#license)

## What this is

Locus is a general-purpose desktop agent for professional users. It is not "a chat window with a few buttons": it puts what an agent actually needs — the file system, a terminal, a browser, Skills, memory, calendar and tasks — into one observable, interruptible interface.

Three assumptions shape the design:

- **Context quality determines output quality.** Most of the product exists to help you organise context: projects and their files, sessions and their files, layered memory, and per-project Skills.
- **Local first.** Configuration, sessions and memory live on your machine as portable JSON / JSONL. No remote account is required.
- **The agent's runtime should be visible.** Tool calls, file changes, sub-sessions, terminal and browser are shown in the interface instead of hidden behind a spinner.

## Capabilities

- **Chat mode** — lightweight multi-model conversation for quick questions and comparisons
- **Agent mode** — full execution with tools, file system, terminal and browser
- **Plan mode** — produce a reviewable plan first, then execute after approval
- **Project partitioning** — project root and project files, session and session files, kept layered
- **Memory** — project-level `AGENTS.md` plus a layered memory index that persists across sessions
- **Skills / MCP / CLI** — scoped per project, with support for common MCP servers and CLI tools
- **Embedded browser** — a real browser the agent can drive, including logged-in on-site search and interaction
- **Embedded terminal** — visible, interruptible terminal sessions
- **Scheduled tasks** — once, interval, daily / weekly / monthly, with active windows and run limits
- **Parallel exploration** — branch from any turn, bring conclusions back to the main session
- **Sub-sessions** — cleaner context boundaries than a traditional subagent, parallel and adversarial review
- **Remote access** — WeChat, Feishu, DingTalk, Slack
- **File preview and editing** — live Markdown editing; preview for PDF, Word, Excel and PowerPoint

## Designed for professional users

These capabilities are wired into the agent and are also directly usable by you:

- **Todo and calendar** — tasks and schedules belong to both you and the agent, with two-way sync to macOS Reminders and Calendar
- **Obsidian** — a built-in Obsidian-style Markdown editor with backlinks for knowledge work and research
- **File changes** — review agent edits by turn; diffs for code, one click to the terminal for worktrees
- **Worktree workflow** — parallel development on Git worktrees, with the diff against main shown in the session

The interface uses three columns: sessions and entry points on the left, the main agent interaction in the centre, and an auxiliary area on the right — project files, file changes, document previews, sub-sessions, browser, terminal, Obsidian, calendar, Todo, Skills — all in service of the centre column's output quality.

## Download and install

Get installers from [GitHub Releases](https://github.com/jansfer/Locus/releases):

- macOS (Apple Silicon / Intel): `.dmg`
- Windows (x64): `.exe` installer
- Ubuntu / Debian (x86_64): `.deb`
- Linux (x86_64): `.AppImage`

For Linux installation steps, security boundaries and support scope, see the [Linux guide](./docs/linux.md).

> This project does not ship a commercial edition or bundled model channels. Bring your own provider API keys and configure them under **Settings → Channels**.

## Run from source

Requires [Bun](https://bun.sh) (no npm / pnpm).

```bash
bun install
bun run dev          # development
bun run typecheck    # type check
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

## Differences from upstream Proma

Changes in this fork are limited to branding and distribution boundaries; runtime behaviour matches upstream:

- App identity is `Locus` / `com.locus.app`; icons, splash and UI copy replaced; no upstream brand assets are used
- Entry points, promo cards and copy pointing to the upstream commercial edition were removed
- Auto-update and release detection point at this repository, not upstream releases
- The upstream commercial API (`api.proma.cool`) is not called; the installer manifest is built in
- Packaged builds exclude the `docx` / `pdf` / `pptx` / `xlsx` Skills, which are copyright Anthropic; the files remain in the repo for local development
- Deliberately retained internal identifiers: `@proma/*` package names, the `~/.proma/` data directory, the `proma-file://` protocol, and the `Proma/` User-Agent prefix (some third-party channels whitelist that prefix server-side, so renaming breaks them)

## Tutorials

- [Getting started](./tutorial/tutorial.md) (Chinese): install, provider setup, choosing between Chat and Agent
- [Advanced guide](./tutorial/tutorial-v2.md) (Chinese): file design, Skills engineering, scheduled tasks, remote access

## Contributing

Bug fixes, docs and tests are welcome. Before opening a PR:

- Use Bun; do not mix npm / pnpm lockfiles
- State management uses Jotai
- Stay local-first; prefer config files and JSON / JSONL
- No `any` in TypeScript; prefer `interface` for object shapes
- When adding IPC, update shared types, the main handler, the preload bridge and the renderer call together
- Bump the patch version of the affected package when behaviour changes
- Add tests where behaviour is testable, especially shared logic, IPC contracts and persistence formats

## Origin and credits

Locus is derived from [Proma](https://github.com/proma-ai/Proma), started and maintained upstream by Erlich Liu. Its architecture, agent runtime integration and a large part of the feature implementation are the foundation of this project. The history of those original commits, including authorship and dates, is preserved in this repository.

This repository is not an official upstream project, and the upstream team is not responsible for changes made here.

## License

This project continues under the upstream [GNU Affero General Public License v3.0 (AGPL-3.0)](./LICENSE); the full terms are in the root `LICENSE` file. As a modified version, the project as a whole remains licensed under AGPL-3.0.

- **Use and modification**: free to use, modify and distribute, including commercially
- **Distribution obligations**: when distributing source or binaries, provide the complete corresponding source for that version (including changes made here) and keep the original copyright notices
- **Network services**: if you offer a modified version as a network service, users of that service must be able to obtain the complete source
- **Derivative works**: must remain under AGPL-3.0

If you need to use this project in a way that cannot satisfy AGPL-3.0 (closed-source integration, SaaS without publishing source), contact the upstream rights holder for a commercial license.
