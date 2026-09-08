# dsh-faststart

Windows 资源管理器插件：对任意文件夹提供“在 DSH 中打开”——以该文件夹为工作区启动或进入 DeepSeek Harness。仅支持 Windows。

## 安装 / 使用

前置：Windows 10/11，已安装 DeepSeek Harness（提供 `dsh` 命令）。

```bash
# 把 web 换成你要安装的 profile 名（dsh profile 可查）
dsh plugin --profile web add github:Ling-Ravers/DeepseekHarness-FastStart
```

安装完成后**重启一次 DSH**（新插件需重启加载），随后即可使用：

- 资源管理器任意文件夹右键 → **在 DSH 中打开**：以该文件夹为工作区启动或进入 DSH
- 系统托盘鲸鱼图标：唤起 web 端 / 退出
- 设置页 → **dsh-open-in-dsh** 卡片：启用开关 / **彻底删除**

彻底删除会一并移除右键菜单、托盘、日志与安装文件，并停止下次加载；需要再次使用时重复上面的安装命令即可（重装后自动以全新默认状态启用）。

## 功能介绍

- **文件夹右键菜单“在 DSH 中打开”**：将根目录作为工作区并启动DSH web(默认关闭，需在设置中启动)
- **彻底删除**：确认后删除注册表右键菜单、系统托盘、全部已生成的脚本/日志与该插件的安装文件，并移除插件自身的装载条目与 profile 引用；卡片即时消失，**重启 DSH 后插件不再加载**。需要再次使用时重新安装插件即可——重新装载会自动清除旧的卸载标记，以全新默认状态启用。
- **系统托盘 “DeepSeek-Harness”**：作为 DSH 的常驻总开关提供“唤起 web 端 / 退出”；自动登录并刷新会话，DSH 停止约 30 秒后托盘自行退出。

## 实现原理

**单包、双半侧**（与官方插件同一范式，经 `package.json` 的 `dsh.client` 与 `dsh.bundle` 配对）：

- **宿主侧**（`src/index.ts` + `src/host/integration.ts`）：注册 `dsh-shell-integration` 设置命名空间，按 `removed` / `enabled` 协调 Windows 表面；生成 PowerShell 启动器与托盘脚本并管理托盘进程；经 `dsh.bundle` 的 `cordis.patch.yml` 以包名挂载进任意 profile。
- **浏览器侧**（`src/client/`）：注册同命名空间的设置卡片（状态胶囊 + 开关 + 删除按钮），并处理 `?dsh-open=<目录>` 深链；两侧经设置命名空间通信（删除 = 写入 `removed`）。

**启动器（冷启动）**：TCP 探测 `origin` → 已有实例则直接打开深链；否则隐藏拉起 `dsh web`（`--no-open`、cwd = 文件夹、stdout/stderr 重定向到日志）。实例就绪后读取日志中打印的 `?token=…` 启动行，用**单个 URL**（token + `dsh-open`）打开浏览器：DSH 的 token 交换会签发会话 Cookie，其 303 跳转保留除 token 外的查询参数，因此**一个 tab** 即完成登录并落到“添加为工作区”确认页。

**确认页动作**：确认后调用宿主 `workspaces.create({ path })`（幂等）等待镜像，再 `uiWorkspace.startSession` 进入或复用会话。

**登录安全模型**：DSH 按进程签发一次性 token、要求浏览器先访问带 token 的 URL 换取签名 Cookie（否则一切请求 401）。插件只能对**自己启动的实例**自动读回该 token（日志位于用户 home 下、仅当前账户可读）；实例若由终端手动启动，需打开该终端打印的 URL 一次——token 按进程生成，外部无法代签。

**删除（永久卸载）**：设置卡片确认后写入 `removed=true` 作为墓碑 → 宿主依次：注销 `Directory` 与 `Directory\Background` 两侧注册表项 → 停止托盘进程（跟踪的 pid + 对残留托盘按命令行清扫，清扫自身经 `-EncodedCommand` 运行避免自匹配）→ 删除启动器/托盘脚本与日志（尽力而为；若日志被运行中实例占用，会调度一个脱离的延时清理进程，待其实例退出后自动删除）→ **从所有可达的装载层移除本插件条目**（home 补丁 `~/.dsh/cordis.patch.yml`、各 profile 补丁、`--patch` 覆盖层；按条目 id / 包名 / `file://` 指向自身包目录的三种形态匹配，其余条目与注释保留；删空后补丁保持为合法的顶层 YAML 数组 `[]`）→ **从各 profile 的 `package.json` 剥离本插件**（`dependencies` 与 `dsh.profile.bundles`，防止后续 `pnpm install` 重新拉回已删副本）→ **删除安装文件**（仅当插件位于 DSH home 内属安装副本时；从源码检出 `file://` 运行时保留源码、只移除装载）。删除成功即注销设置卡片（客户端无“已卸载”占位，直接消失）；重启 DSH 后插件不再加载。墓碑是刻意的：**重新装载插件时宿主在启动时检测到 `removed=true` 并自动清除**，让重装以全新默认状态开始。

**托盘**：`NotifyIcon` + 隐藏消息窗，单实例 Mutex 防重复，周期探测端口，端口关闭约 30 秒后自动退出；其“唤起 web 端”同样优先使用日志中的 token URL 完成登录。

**客户端 UI 与确认层**：卡片按官方插件容器（`settings.plugin.item`）与产品设计令牌实现，无额外运行时依赖；删除确认与深链确认共用同一居中确认层实现。
