# 安装包与自动更新

## 平台与命名

安装包统一为 `Locus-<版本>-<系统>-<CPU>.<扩展名>`。`amd64` 表示 Intel / AMD 64 位处理器，`arm64` 表示 ARM 64 位处理器（包括 Apple Silicon）。Windows 安装包使用 `.exe`，Linux 使用 `.deb` 或 `.AppImage`，macOS 同时提供 `.dmg` 与 `.zip`。

| 系统 | CPU | 文件名示例 |
| --- | --- | --- |
| Windows | amd64 / arm64 | `Locus-<版本>-win-amd64.exe`、`Locus-<版本>-win-arm64.exe` |
| macOS | amd64 / arm64 | `Locus-<版本>-macos-amd64.dmg`、`Locus-<版本>-macos-arm64.dmg`，另提供对应 `.zip` |
| Linux | amd64 / arm64 | `Locus-<版本>-linux-amd64.deb`、`Locus-<版本>-linux-arm64.deb`，另提供对应 `.AppImage` |

`<版本>` 即 `apps/electron/package.json` 中的 `version`。Linux 的安装、沙箱与更新行为见 [Linux 说明](./linux.md)。

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

## 发布说明

推送 `v*` tag 触发 `release.yml` 后，`publish-release` 任务会按以下顺序确定 Release 正文：

1. 存在 `release-notes/v<版本>.md` 时，直接以该文件为正文发布；
2. 文件不存在时，回退到 GitHub 的 `releases/generate-notes` 自动生成；
3. 文件存在但内容为空时直接中止发布，不发出空说明。

之所以以文件优先，是因为 `generate-notes` 只按合并的 Pull Request 归纳内容。直接推送到 `main` 的提交没有 PR 元数据，生成结果只剩一行 compare 链接。面向用户的版本应在 `release-notes/` 下新增对应文件，按「新功能 / 修复 / 下载」组织，下载文件名与实际工件保持一致。

`release-notes/` 下的既有文件是历史发布记录，只增不改。

## 发布门禁

`publish-release` 需要全部平台构建与清单合并任务成功才会执行，并在公开前用 `apps/electron/scripts/release-assets-policy.ts` 校验工件清单：六个平台的安装包、四个更新清单，以及 exe/dmg/zip 各自的 `.blockmap` 必须齐全且状态为 `uploaded`，缺任意一项都会阻止发布。

手动运行 Release 工作流（`workflow_dispatch`）只产出 Actions artifacts，不创建 Release；仅推送 tag 时才会发布。默认 Skills 的版权排除和对应版本源码要求继续适用。

## macOS 签名

仓库未配置 `MAC_CERTS`、`MAC_CERTS_PASSWORD` 等 Secrets 时，工作流会在日志中给出告警并产出未签名安装包，构建不会因此失败。未签名的 `.dmg` 首次打开需要用户在「系统设置 → 隐私与安全性」手动放行，也无法完成公证。配置证书后同一条流程会自动签名并向 Apple 提交公证，无需修改工作流。
