# DSH Agent Loop Visualizer

一张图看懂 **DeepSeek Harness（dsh）** 的交互式中文架构教程：一切皆插件，Cordis 主板上的 Agent 循环。

- **14 课 · 84 步**，共 6 章：理念与分层、Cordis 主板、Agent 循环、工具与审批、会话与提示词、组装与对照。
- **三栏学习工作台**：左侧课程目录、中间 SVG 舞台、右侧解读面板；每课 6 步，配 KPI 指标卡、源码抽屉、复盘表；支持 Ctrl+K 搜索、可分享的 hash 深链（`#/learn/<slug>/<step>`）与一页架构速查表。
- **零后端纯静态**：进度与主题存在 `localStorage`。浅色暖纸 / 深色暖浓缩两种主题。
- **技术栈**：React 19 + Vite 6 + TypeScript + lucide-react，Node 22+。

English version: [README.md](./README.md).

## 快速开始

```bash
npm ci
npm run dev      # http://localhost:5173
npm run build    # tsc --noEmit + vite build
npm run preview  # 预览生产构建
```

把 `dist/` 部署到任意静态托管即可（已含 Vercel 配置）。

## 线上地址

已部署在 **Cloudflare Pages**（经典 Pages 流程，GitHub 集成）：<https://dsh-visualizer.pages.dev>

- 生产分支：`main`，每次推送自动重新部署。
- 构建命令：`npm run build` · 构建输出目录：`dist` · 根目录：（空）· 框架预设：与 Vite 预设相同的值（Pages 预设列表里没有独立的 "Vite" 项）。

## 课程表

| 章 | 内容 |
|---|---|
| 第 1 章 理念与分层 | 一切皆插件 · 分层叠加 profile / bundle / patch |
| 第 2 章 Cordis 主板 | Context 与插件三种写法 · Fiber 一生六态 · 服务与依赖注入 · 五种事件与 waterfall 陷阱 |
| 第 3 章 Agent 循环 | 一次提问「现在几点？」完整旅程 · AgentLoop 与 setFactory |
| 第 4 章 工具与审批 | tools/pre-execute 审批门 · 沙箱 fail-closed |
| 第 5 章 会话与提示词 | 会话事件溯源（模型可见即已记录）· 系统提示词组装 |
| 第 6 章 组装与对照 | 从 spine 到 web / headless · 迷你版 vs 真 Cordis |

## 致谢

- **DeepSeek Harness**（DeepSeek AI）：<https://github.com/deepseek-ai/deepseek-harness>（MIT）
- **NamiDSH** 与七篇拆解（<https://namiai.tech/dsh/>），作者 **@antiAIvo**（[aa1143/NamiDSH](https://github.com/aa1143/NamiDSH)）：本站的内容骨架——迷你版 Cordis、11 个包的迷你版 DSH、「现在几点？」演示旅程、与真 Cordis 对照的 14 个兼容场景。
- 风格灵感：**pi-visualizer**（Chasen Liao）：<https://github.com/Chasen-Liao/pi-visualizer>（三栏工作台布局、暖纸主题）。本站全部代码均为重新编写，未复制 pi-visualizer 的源码。

## 上游核对说明

内容以 DSH **0.1.0-rc.5** 为基线，依据 NamiDSH 文档与 DSH 公开资料核对。API 用量统计（如 `inject` 395 处、`ctx.on` 183 次）、行数（Cordis 2693 行 vs 迷你版约 680 行）、插件数量（dsh-base 约 90 个、默认部署约 159 个）均来自上述来源，随版本变化；token 数与耗时为示意，未实测。

## 许可证

MIT，第三方声明见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。
