# Locus Linux 支持说明

Linux 与其余平台一样按原生方式构建，提供 amd64 与 arm64 两个架构，每种架构都有 `.deb` 与 `AppImage`：

- `.deb`：Debian/Ubuntu 原生安装包，安装到 `/opt/Locus`，可从应用菜单启动，推荐日常使用；
- `AppImage`：便携运行包，适用于不希望安装系统包、或没有管理员权限的场景。

两个架构都在相同架构的构建机上原生编译，CLI、OfficeCLI、Electron 与原生模块的架构与目标一致，不依赖仿真。

## 下载与安装

从 [GitHub Releases](https://github.com/jansfer/Locus/releases) 下载对应版本：

```bash
# deb（推荐）：文件名包含系统与 CPU
sudo apt install ./Locus-<版本>-linux-amd64.deb
sudo apt install ./Locus-<版本>-linux-arm64.deb

# AppImage：便携运行
chmod +x ./Locus-<版本>-linux-amd64.AppImage
./Locus-<版本>-linux-amd64.AppImage
```

`<版本>` 即本次发布的版本号。用 `dpkg -i` 直接安装也可以，但 `apt install` 会自动解析并补齐依赖，更不容易停在缺少运行库的状态。

AppImage 建议放在用户有写权限的本地目录。从只读目录、网络盘或部分企业挂载目录运行时，应用内更新无法写回原文件，只能手动下载新版本。

## 系统范围

构建与测试的实际状态如下，未列出的组合没有做过验证：

| 构建目标 | 构建环境 | 状态 |
| --- | --- | --- |
| Linux amd64（x86_64） | Ubuntu 22.04 | 每次发布在原生 Runner 上构建并做运行时冒烟测试 |
| Linux arm64 | Ubuntu 22.04 arm64 | 每次发布在原生 Runner 上构建并做运行时冒烟测试 |
| Ubuntu 24.04 / Debian 12 | — | 构建产物未针对这些系统单独验证 |
| Fedora / RHEL / Arch | — | 未承诺 |

每次发布的冒烟测试在打包后的 Electron 中执行，覆盖二进制架构匹配、`node-pty` 与 `sharp` 原生模块加载、Pi SDK 入口、包内 CLI 与 OfficeCLI 可执行、PTY 创建与输出。它验证的是运行时依赖是否可用，**不代表桌面环境验收**：X11/Wayland 启动、输入法、剪贴板、窗口图标、任务栏关联仍需实机确认。

构建环境为 Ubuntu 22.04，产物的 glibc 基线与之对应，在新系统上通常可用，但更新的发行版可能已移除或改名某些依赖库。Ubuntu 22.04 与 24.04 的系统包名称不同（例如 `t64` 系列），不要跨版本复用依赖名；遇到缺少共享库时，优先通过 `.deb` 安装让 apt 解析依赖，而不是手工拷贝库文件。

AppImage 在 Ubuntu 22.04 可直接运行。Ubuntu 24.04 起默认不再预装 `libfuse2`，需要先安装（包名 `libfuse2t64`）；无法提供 FUSE 时可用 `--appimage-extract-and-run` 作为临时回退。

## Chromium sandbox

Locus 不在 Linux 上全局关闭 Chromium sandbox。

- `.deb` 的安装后脚本会把 `/opt/Locus/chrome-sandbox` 设为 `root:root` 与 `4755`，启用 SUID sandbox；
- AppImage 使用 `--no-sandbox`，因为 AppImage 的挂载文件系统无法可靠提供 SUID sandbox；
- 若 `/opt/Locus` 位于 `nosuid` 文件系统，或安装脚本无法修改权限，Chromium 的沙箱不可用，应用可能无法启动；这属于需要显式排查的问题，不建议把 `--no-sandbox` 当作长期默认方案。

AppImage 的隔离能力低于配置正确的 `.deb`。Locus 内嵌浏览器会加载不可信网页，涉及这一场景时优先使用 `.deb` 版本。

## 更新

- **`.deb`**：走 `DebUpdater`。应用检查到新版本后下载新的 `.deb`，再通过 `dpkg`（必要时回退到 `apt`）安装，因此会请求一次管理员授权（`pkexec` 或 `sudo` 密码）。升级只替换 `/opt/Locus` 下的程序文件，用户数据目录不受影响。
- **`AppImage`**：走 `AppImageUpdater`。新 AppImage 下载到可写目录后替换原文件；由于 `AppImageUpdater` 依赖 `APPIMAGE` 环境变量识别当前运行文件，必须是直接运行 AppImage 本体，解包后手动执行的场景不在此列。
- 两种格式共用同一组更新清单：`latest-linux.yml`（amd64）与 `latest-linux-arm64.yml`。更新前 Locus 会等待正在运行的 Agent 结束，避免中断任务或写坏会话。

## 数据位置

正式版本数据位于：

```text
~/.proma/
```

开发模式数据位于：

```text
~/.proma-dev/
```

会话、工作区、配置和 Skills 使用 JSON/JSONL 文件保存。目录名沿用上游 `~/.proma/`，是有意保留的兼容标识，重命名会导致已有用户数据丢失，因此不要在升级前手工改名。迁移前请退出 Locus，并备份对应目录。

Linux 下 `safeStorage` 依赖 GNOME Keyring、KWallet 或其他 Secret Service 实现。没有可用密钥环时，不建议在共享机器上保存 API Key；请先配置桌面密钥环并重新启动 Locus。

## 发布前验收清单

上述冒烟测试已覆盖运行时依赖，正式对外宣布支持某个发行版之前，仍应在干净实机环境完成：

1. `bun install --frozen-lockfile`；
2. `deb` 与 `AppImage` 两种格式在 amd64 与 arm64 上分别构建；
3. `deb` 安装、卸载与覆盖升级；
4. `AppImage` 启动与自动更新（含原文件位于可写目录与不可写目录两种情况）；
5. Chat/Agent 流式响应与 JSONL 落盘；
6. 工作区、Skills、MCP、内嵌终端与内嵌浏览器；
7. X11 与 Wayland 下的基本启动；
8. 中文输入、剪贴板、窗口图标与任务栏关联。
