# DSH Agent Loop Visualizer

An interactive Chinese architecture tutorial for **DeepSeek Harness (dsh)** — "one picture to understand DSH": everything is a plugin, on the Cordis motherboard.

- **14 lessons · 84 steps** in 6 chapters: plugin-everything, Cordis, agent loop, tools & approval, session & prompts, assembly & comparison.
- **3-column learning workbench**: curriculum sidebar, SVG stage, inspector panel — with step-driven lessons, KPI chips, source drawers, recap tables, Ctrl+K search, shareable hash deep links (`#/learn/<slug>/<step>`), and a one-page architecture cheatsheet.
- **Zero backend, static app**: progress + theme in `localStorage`. Light warm-paper / dark warm-espresso themes.
- **Stack**: React 19 + Vite 6 + TypeScript + lucide-react, Node 22+.

中文版说明见 [README.zh.md](./README.zh.md)。

## Quick start

```bash
npm ci
npm run dev      # http://localhost:5173
npm run build    # tsc --noEmit + vite build
npm run preview  # preview the production build
```

Deploy the `dist/` output to any static host (Vercel config included).

## Live site

Deployed on **Cloudflare Pages** (classic Pages flow, GitHub integration): <https://www.learnagentai.top> (custom domain; also live at <https://dsh-visualizer.pages.dev>)

- Production branch: `main` — every push redeploys automatically.
- Build command: `npm run build` · Build output directory: `dist` · Root directory: (empty) · Framework preset: Vite-equivalent values (Pages has no standalone "Vite" preset; same command + output dir).

## What it teaches

| Chapter | Lessons |
|---|---|
| 1 · 理念与分层 | 一切皆插件 · 分层叠加 profile / bundle / patch |
| 2 · Cordis 主板 | Context 与插件三种写法 · Fiber 一生六态 · 服务与依赖注入 · 五种事件与 waterfall 陷阱 |
| 3 · Agent 循环 | 一次提问「现在几点？」完整旅程 · AgentLoop 与 setFactory |
| 4 · 工具与审批 | tools/pre-execute 审批门 · 沙箱 fail-closed |
| 5 · 会话与提示词 | 会话事件溯源 · 系统提示词组装 |
| 6 · 组装与对照 | 从 spine 到 web / headless · 迷你版 vs 真 Cordis |

## Credits

- **DeepSeek Harness** by DeepSeek AI — <https://github.com/deepseek-ai/deepseek-harness> (MIT)
- **NamiDSH** and the seven-chapter teardown at <https://namiai.tech/dsh/> by **@antiAIvo** ([aa1143/NamiDSH](https://github.com/aa1143/NamiDSH)) — the content backbone of this site: the mini-Cordis, the 11-package mini-DSH, the "现在几点？" demo journey, and the 14-scenario compat tests against real Cordis.
- Style inspiration: **pi-visualizer** by Chasen Liao — <https://github.com/Chasen-Liao/pi-visualizer> (layout, three-column workbench, warm-paper themes). All code here is written from scratch for this project; no pi-visualizer source was copied.

## Upstream verification note

Content was verified against DSH **0.1.0-rc.5** via the NamiDSH docs and public DSH write-ups. API usage counts (e.g. `inject` 395, `ctx.on` 183), line counts (Cordis 2693 vs mini ~680), and plugin counts (~90 in dsh-base, ~159 default deployment) come from those sources and may change with newer versions. Token counts and timings are illustrative, not measured.

## License

MIT — see [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) for third-party attributions.
