# 安装包与自动更新

## 平台与命名

安装包统一为 `Locus-版本-系统-CPU.扩展名`。`amd64` 表示 Intel / AMD 64 位处理器，`arm64` 表示 ARM 64 位处理器（包括 Apple Silicon）。Windows 安装包使用 `.exe`，Linux 使用 `.deb` 或 `.AppImage`。

| 系统 | CPU | 文件名示例 |
| --- | --- | --- |
| Windows | amd64 / arm64 | `Locus-0.19.70-win-amd64.exe`、`Locus-0.19.70-win-arm64.exe` |
| macOS | amd64 / arm64 | `Locus-0.19.70-macos-amd64.dmg`、`Locus-0.19.70-macos-arm64.dmg`，另提供对应 `.zip` |
| Linux | amd64 / arm64 | `Locus-0.19.70-linux-amd64.deb`、`Locus-0.19.70-linux-arm64.deb`，另提供对应 `.AppImage` |

所有目标均在相同平台与架构的 Runner 上原生构建，Linux 使用 Ubuntu 22.04 构建环境。CLI、OfficeCLI、Electron 与原生模块必须匹配目标架构。Windows ARM64 不依赖 x64 仿真来验证架构正确性。

## 本地打包

使用 Bun 的既有 `dist:mac`、`dist:win`、`dist:linux` 或 `pack` 命令，它们会调用统一的 `package:app` 入口。已有构建产物可在 `apps/electron` 下执行：

```bash
bun run package:app --linux --arm64 --publish never
bun run scripts/smoke-package.ts
```

每次只打包宿主架构。请勿绕过入口直接调用 electron-builder，否则缺少规范化文件名所需的环境变量。交互式 `dist:visual` 也遵循同一规则。

Linux ARM64 打包前需安装原生 Ruby 与 FPM：`sudo apt-get install ruby ruby-dev build-essential`，然后运行 `sudo gem install fpm --version 1.17.0 --no-document`。入口会强制使用系统 FPM，避免 electron-builder 下载不可执行的 x86 FPM。CI 两种 Linux 架构使用同一固定版本。

## 自动更新兼容

用户安装包改名，但更新清单继续使用 electron-updater 的既有名称：Windows 为 `latest.yml`，macOS 为 `latest-mac.yml`，Linux 分别为 `latest-linux.yml` 和 `latest-linux-arm64.yml`。

Windows 与 macOS 的两个原始架构清单通过 Actions artifact 收集，合并后才公开 Release。Windows 清单固定将 amd64 EXE 放在第一项，以兼容旧版 x64 更新器的回退选择；ARM64 客户端通过文件名中的 `arm64` 选择正确工件。macOS 清单同时提供两个架构的 ZIP。清单保留各自的 SHA-512、大小和准确文件名。

旧版本的差量更新可能因命名变化找不到旧 `.blockmap`；electron-updater 会回退完整下载。不要重命名历史 Release 的工件，也不要修改更新清单的通道名称。

手动运行 Release 工作流只生成 Actions artifacts，不发布 Release。六个平台均通过原生运行时冒烟测试、更新清单合并通过后，tag 发布流程才会检查工件齐全并公开新版本。默认 Skills 的版权排除和对应版本源码要求继续适用。
