# dsh-owlrunkit

把 **OwlCoda RunKit** 技能提供给 DeepSeek Harness（`dsh`）会话的插件包。

OwlRunKit 把当前目标、WorkItem、候选身份、验证回执、交接、返工和交付阶段保存
在项目工件里，而不是聊天记忆中。技能教 Agent 正确调用项目本地的 `owlrunkit`
CLI，并让执行、证据和权限保持分离。这个插件只通过 DSH 插件系统提供技能，
不安装 CLI 的第二份副本。

## 它增加什么

- 一条 Host 插件行 `dsh-owlrunkit`，在 `ctx.skills` 上注册技能提供者。
- 会话技能目录中的一个技能 `owlcoda-runkit`，其 `references/`、
  `assets/templates/`、`agents/` 资源解析到包内副本。
- 没有工具、后台进程、网络访问或凭据读取。

提供者使用内置技能的标准优先级（600），因此项目、自定义或用户目录里的同名
技能优先级更高。项目可以自行固定另一个 RunKit 版本，而不用改这个包。

## 要求

- DeepSeek Harness `>=0.2.1-rc.1 <0.3.0`。
- Node.js 20.19 或更高（`owlrunkit` CLI 也要求）。
- 使用技能的项目里要有项目本地的 `owlrunkit` 安装。技能正文覆盖
  `bootstrap`、`doctor`、回执和 Project Driver 命令。

## 安装

从 npm 安装：

```sh
dsh plugin --profile web add dsh-owlrunkit
```

从公开源码树安装（可复现安装请固定 commit）：

```sh
dsh plugin --profile web add 'git+https://github.com/yeemio/dsh-owlrunkit.git#v0.24.1'
```

本地开发链接：

```sh
dsh plugin --profile web add 'link:/absolute/path/to/dsh-owlrunkit'
```

装好包后，在 Web 的 **Plugins** 页启用 **OwlRunKit** 这个 bundle（从
Discover 安装时插件管理器会自动选中）。启用后它会出现在 profile 的
`dsh.profile.bundles` 中。

## 使用

插件生效后，`owlcoda-runkit` 出现在会话技能目录。任务与描述匹配时模型会加载
它；支持显式调用的客户端也可以由用户主动调用。

这个技能刻意保持克制：

- 普通工作保持轻量，不是每个任务都需要 RunKit 证据；
- RunKit 不解释结果的业务含义；
- 除非另一个有授权的系统执行外部动作，所有结果保持
  `authorizationGranted=false`；
- 源码验收、集成、部署、线上读回和产品验收彼此独立。

## 版本

包版本跟随内置技能版本。`dsh-owlrunkit@0.24.1` 包含 OwlCoda RunKit 技能包
`0.24.1`，它记录 `owlrunkit@0.24.1` 和合约 `0.2`。技能与 CLI 生命周期分离；
在假设 Core 版本前，请阅读技能正文中的版本说明。

## 更新与移除

```sh
dsh plugin --profile web add dsh-owlrunkit@latest   # 或 git 目标
dsh plugin --profile web remove dsh-owlrunkit
```

如果存在同名的用户或项目技能，需要移除或更新它，才能看到本包内的改动。

## 许可证

本包和内置技能副本采用 `MIT-0`；见 `LICENSE` 与 `assets/LICENSE`。
`owlrunkit` CLI 是独立的 `GPL-3.0-or-later` 作品。仓库根目录的 GPL 许可证
不覆盖本目录的 MIT-0 授权。
