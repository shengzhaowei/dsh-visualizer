// Claude Code (anthropics/claude-code) 交互式源码思维导图数据结构
// 与 4 章 8 课深度绑定，全部根节点、分支节点与末节点均附带对应配置、Hook 脚本或核心机制源码。
import type { MindNode } from '../../../types/mindmap';

export const CLAUDE_CODE_MINDMAP_DATA: MindNode = {
  id: 'root',
  label: 'Claude Code',
  sub: '单主循环 × 确定性 Hooks × 分层记忆 × 分治隔离',
  tone: 'amber',
  badge: 'ARCHITECTURE',
  file: '.claude/settings.json',
  lessonSlug: 'cc-master-loop',
  stepNumber: 1,
  summary:
    'Claude Code 的核心哲学是将「概率性指导（CLAUDE.md）」与「确定性强制（Hooks / 权限级联 / OS 沙箱）」彻底二分：用极简单线程主循环释放模型推理上限，用进程外 Unix 管道 Hooks 守住 100% 不可违背的工程红线，并用 Subagent + Git Worktree 消除上下文腐烂与并行冲突。',
  points: [
    'Gather → Act → Verify 单线程主循环 + Agentic Search（零过期向量索引）',
    'PreToolUse / PostToolUse / Stop Hooks 永远在权限模式之外强制执行',
    '按路径条件懒加载 .claude/rules + Subagent 上下文防火墙 + Git Worktree 并行隔离',
  ],
  codeLang: 'text',
  code: `repo/
├── CLAUDE.md                        # 项目根规范（≤200 行，稳定前缀常驻）
├── .mcp.json                        # MCP 外部工具声明（mcp__server__tool）
├── .claude/
│   ├── settings.json                # 权限级联（deny>ask>allow）+ Lifecycle Hooks
│   ├── rules/*.md                   # paths: 条件懒加载领域规则
│   ├── agents/*.md                  # 自定义 Subagent（含 isolation: worktree）
│   └── hooks/guard.sh               # Exit 0 / Exit 2 / updatedInput 护栏脚本
└── ~/.claude/projects/.../MEMORY.md # 跨 Worktree 共享的自动记忆笔记`,
  children: [
    {
      id: 'cc-b-loop',
      label: '1 · 单主循环与工具原语',
      sub: 'Master Loop · Agentic Search · MCP ToolSearch',
      tone: 'amber',
      badge: 'CH 1 · LOOP',
      file: '.mcp.json',
      lessonSlug: 'cc-master-loop',
      stepNumber: 1,
      summary:
        '拒绝僵硬 DAG 状态机与容易过期的向量 RAG：让 Claude 自己在单主循环里组合 Read / Grep / Glob / Edit / Bash 与 MCP 工具完成推理闭环。',
      points: [
        '稳定 System Prompt + 工具声明前缀最大化 Prompt Caching 命中率',
        'ToolSearch 按需懒加载上百个 MCP 工具 Schema，避免上下文被定义撑爆',
      ],
      codeLang: 'ts',
      code: `while (true) {
  const response = await callClaudeWithCaching({ systemPrefix, messages, tools });
  messages.push(response.assistantMessage);
  if (response.toolUses.length === 0) break;
  const results = await executeToolUsesThroughHooksAndPerms(response.toolUses);
  messages.push({ role: 'user', content: results });
}`,
      children: [
        {
          id: 'cc-agentic-search',
          label: 'Agentic Search（零索引实时检索）',
          sub: 'Glob / Grep(ripgrep) / Read',
          tone: 'amber',
          badge: 'SEARCH',
          file: 'CLAUDE.md',
          lessonSlug: 'cc-master-loop',
          stepNumber: 3,
          summary: '放弃离线的代码向量库，直接通过 ripgrep + Glob + Read 实时读取最新磁盘文件，零索引陈旧且符号追踪精确。',
          points: [
            '只读工具天然无副作用，支持并发免审批快速探索代码库',
            '模型自主迭代搜索词，像资深工程师一样顺着调用链定位根因',
          ],
          codeLang: 'json',
          code: `{
  "tool_use": [
    { "name": "Glob", "input": { "pattern": "src/auth/**/*.ts" } },
    { "name": "Grep", "input": { "pattern": "verifyJwt", "path": "src/auth" } }
  ]
}`,
        },
        {
          id: 'cc-edit-safety',
          label: '专用文件编辑与 mtime 冲突检测',
          sub: 'Read-before-Edit · 唯一锚定 · 检查点',
          tone: 'amber',
          badge: 'EDIT',
          file: '.claude/settings.json',
          lessonSlug: 'cc-tools-mcp',
          stepNumber: 1,
          summary: '相比用 Bash sed 盲改，专用 Edit 工具内置先读后改校验、mtime 外部修改检测与 /rewind 检查点快照。',
          points: [
            '编辑前强制校验文件已读且未被用户编辑器中途改写，防止静默覆盖',
            '每次编辑自动打检查点，出错可一键 /rewind 回退代码与对话',
          ],
          codeLang: 'ts',
          code: `if (!readTracker.hasRead(filePath)) {
  return toolError('Must call Read before Edit on this file');
}
if (fs.statSync(filePath).mtimeMs !== readTracker.lastMtime(filePath)) {
  return toolError('File modified externally since last Read; please re-read');
}`,
        },
        {
          id: 'cc-mcp-toolsearch',
          label: 'MCP 统一命名与 ToolSearch 懒加载',
          sub: 'mcp__<server>__<tool> · 按需加载 Schema',
          tone: 'amber',
          badge: 'MCP',
          file: '.mcp.json',
          lessonSlug: 'cc-tools-mcp',
          stepNumber: 4,
          summary: '外部 GitHub / Postgres / Linear MCP 工具统一归入 mcp__server__tool 命名空间，共用同一套 Hooks 与权限门。',
          points: [
            '接入上百个 MCP 工具时通过 ToolSearch 按需检索并加载目标 Schema，节省 80%+ 上下文',
            '支持按前缀细粒度授权（如 allow mcp__postgres__query，deny mcp__github__delete_*）',
          ],
          codeLang: 'json',
          code: `{
  "mcpServers": {
    "github": { "type": "http", "url": "https://api.githubcopilot.com/mcp/" },
    "postgres-ro": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "$DATABASE_URL"]
    }
  }
}`,
        },
      ],
    },
    {
      id: 'cc-b-hooks',
      label: '2 · Hooks 确定性护栏与权限级联',
      sub: 'PreToolUse · Exit 0/2 · deny > ask > allow · /sandbox',
      tone: 'rose',
      badge: 'CH 2 · GUARD',
      file: '.claude/settings.json',
      lessonSlug: 'cc-hooks-lifecycle',
      stepNumber: 1,
      summary:
        'CLAUDE.md 只是软建议，模型仍有小概率忽略；所有绝不能出错的工程铁律交给进程外 Lifecycle Hooks 与严格级联权限引擎。',
      points: [
        'Hooks 位于权限模式之外，即便开启 bypassPermissions 依然 100% 强制触发',
        '四层配置叠加遵循 deny > ask > Mode > allow，deny 拥有绝对一票否决权',
      ],
      codeLang: 'json',
      code: `{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash|Read|Edit",
      "hooks": [{ "type": "command", "command": ".claude/hooks/guard.sh" }]
    }],
    "PostToolUse": [{
      "matcher": "Edit|Write",
      "hooks": [{ "type": "command", "command": "npx prettier --write $CLAUDE_FILE_PATH" }]
    }]
  }
}`,
      children: [
        {
          id: 'cc-pretool-exit2',
          label: 'PreToolUse Exit 2 硬拦截',
          sub: 'stdin JSON → stderr 反馈模型自纠偏',
          tone: 'rose',
          badge: 'EXIT 2',
          file: '.claude/hooks/guard.sh',
          lessonSlug: 'cc-hooks-lifecycle',
          stepNumber: 3,
          summary: 'Hook 脚本通过 stdin 读取工具调用 JSON；返回退出码 2 时立即阻断执行，并把 stderr 原因喂回模型让其换合法路径。',
          points: [
            'Exit 0 放行；Exit 2 确定性阻断并将 stderr 注入下一轮上下文',
            '相比直接杀死整个会话，软反馈能引导模型自动改读 .env.example 继续推进',
          ],
          codeLang: 'sh',
          code: `#!/usr/bin/env bash
INPUT=$(cat)
TARGET=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.command // ""')
if echo "$TARGET" | grep -Eq '(^|/)\\.env($|\\.)|rm\\s+-rf\\s+/'; then
  echo "BLOCKED: 禁止访问敏感 .env 或执行高危删除，请改读 .env.example" >&2
  exit 2
fi
exit 0`,
        },
        {
          id: 'cc-updated-input',
          label: 'updatedInput 原地安全改参',
          sub: 'Exit 0 + stdout JSON 无感修正参数',
          tone: 'rose',
          badge: 'REWRITE',
          file: '.claude/hooks/rewrite-pytest.sh',
          lessonSlug: 'cc-hooks-lifecycle',
          stepNumber: 4,
          summary: 'PreToolUse 不仅能拦截，还能在 Exit 0 时向 stdout 输出 updatedInput，在工具真正执行前原地修正命令参数。',
          points: [
            '典型场景：自动给 pytest 注入 --tb=short -q，或给 curl 强制加超时参数',
            '模型无需经历「报错→重试」额外回合，零 Token 浪费',
          ],
          codeLang: 'json',
          code: `{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "updatedInput": {
      "command": "pytest tests/ --tb=short -q"
    }
  }
}`,
        },
        {
          id: 'cc-perm-cascade',
          label: 'deny > ask > Mode > allow 权限级联',
          sub: '五种模式：plan / default / acceptEdits / dontAsk / bypass',
          tone: 'rose',
          badge: 'PERMS',
          file: '.claude/settings.json',
          lessonSlug: 'cc-permission-cascade',
          stepNumber: 2,
          summary: '多来源配置合并时绝非后者覆盖前者，而是严格按 deny 一票否决 → ask 弹窗确认 → Permission Mode → allow 白名单求值。',
          points: [
            'Shift+Tab 随时在 plan（纯只读）与 acceptEdits（自动落盘）间切换',
            'CI 无人值守场景使用 dontAsk，未显式写入 allow 的操作一律静默拒绝',
          ],
          codeLang: 'json',
          code: `{
  "permissions": {
    "deny": ["Read(./.env)", "Bash(rm -rf *)", "Bash(git push --force*)"],
    "ask": ["Bash(git push *)", "Bash(npm publish*)"],
    "allow": ["Bash(npm run test*)", "Bash(git status)", "Bash(git diff*)"]
  }
}`,
        },
        {
          id: 'cc-os-sandbox',
          label: 'Bash OS 沙箱（Seatbelt / bwrap）',
          sub: '工作区写隔离 · 代理域名白名单',
          tone: 'rose',
          badge: 'SANDBOX',
          file: '.claude/settings.json',
          lessonSlug: 'cc-permission-cascade',
          stepNumber: 5,
          summary: '开启 /sandbox 后，Bash 子进程自动受限于 macOS Seatbelt 或 Linux bubblewrap，仅允许写当前工作区并经代理管控外网域名。',
          points: [
            '把重复的人工审批替换为确定性的 OS 物理围栏，既安全又不打断心流',
            'bypassPermissions 仅建议配合外层 Docker / VM 容器边界使用',
          ],
          codeLang: 'json',
          code: `{
  "sandbox": {
    "enabled": true,
    "autoAllowBashIfSandboxed": true,
    "network": { "allowedDomains": ["registry.npmjs.org", "github.com"] }
  }
}`,
        },
      ],
    },
    {
      id: 'cc-b-memory',
      label: '3 · 分层记忆与抗失忆压缩',
      sub: 'CLAUDE.md · .claude/rules · MEMORY.md · /compact',
      tone: 'violet',
      badge: 'CH 3 · MEMORY',
      file: '.claude/rules/api-security.md',
      lessonSlug: 'cc-memory-hierarchy',
      stepNumber: 1,
      summary:
        '在大型 Monorepo 中把规范拆成「根 CLAUDE.md + 按路径懒加载规则 + 自动记忆 MEMORY.md」，并通过 SessionStart(compact) Hook 彻底杜绝压缩失忆。',
      points: [
        '不触碰某子目录时，该目录规范与路径规则 0 Token 占用',
        '切全新任务果断 /clear，长任务保现场用 /compact <focus> + Hook 重注入',
      ],
      codeLang: 'text',
      code: `---
paths:
  - "packages/api/**"
  - "src/routes/**/*.ts"
---
# API 安全红线（仅触碰 API 文件时按需懒加载）
- 所有外部输入必须经过 Zod Schema 校验
- 严禁在日志中打印 Authorization Header 或用户 Token`,
      children: [
        {
          id: 'cc-lazy-rules',
          label: '按路径条件懒加载规则',
          sub: '.claude/rules/*.md (paths: glob)',
          tone: 'violet',
          badge: 'LAZY',
          file: '.claude/rules/sql-migration.md',
          lessonSlug: 'cc-memory-hierarchy',
          stepNumber: 2,
          summary: '前端、后端、SQL 迁移各自维护独立规则文件，只有 Claude 读取或编辑匹配路径时才动态注入上下文。',
          points: [
            '避免根 CLAUDE.md 膨胀到上千行导致模型注意力稀释',
            '子目录 CLAUDE.md 同样遵循按需加载策略',
          ],
          codeLang: 'text',
          code: `---
paths:
  - "db/migrations/**/*.sql"
---
- 禁止对千万级大表执行锁表 ALTER TABLE
- 每个 up.sql 必须成对提供可验证的 down.sql 回滚脚本`,
        },
        {
          id: 'cc-auto-memory',
          label: 'Auto Memory 跨 Worktree 自动笔记',
          sub: '~/.claude/projects/.../MEMORY.md',
          tone: 'violet',
          badge: 'AUTO MEM',
          file: '~/.claude/projects/repo/memory/MEMORY.md',
          lessonSlug: 'cc-memory-hierarchy',
          stepNumber: 4,
          summary: '除了人工编写的 CLAUDE.md，Claude 会将构建命令、踩坑修复和项目约定自动沉淀进本机 MEMORY.md（前 200 行自动注入）。',
          points: [
            '同一 Git 仓库下的多个 Worktree 共享同一份 Auto Memory',
            '高频经验放索引，长细节拆到主题文件按需读取',
          ],
          codeLang: 'text',
          code: `# Project Memory (Auto-maintained)
- 本地测试需先启动 docker compose up -d postgres
- pnpm test:unit 比全量 pnpm test 快 6 倍，改完单个模块优先跑单测
- 详见 memory/auth-quirks.md（JWT 时钟偏移处理）`,
        },
        {
          id: 'cc-compact-reinject',
          label: '/compact 与 SessionStart(compact) 重注入',
          sub: '聚焦摘要 + 自动重挂 CLAUDE.md + Hook 钉住现场',
          tone: 'violet',
          badge: 'COMPACT',
          file: '.claude/hooks/reinject-context.sh',
          lessonSlug: 'cc-compact-recovery',
          stepNumber: 3,
          summary: '压缩完成后自动重新加载磁盘上的 CLAUDE.md，并通过 SessionStart(compact) Hook 把当前 git 分支、脏文件与任务锚点重新钉入新窗口。',
          points: [
            '支持 /compact focus on auth refactor 定向保留关键决策与修改清单',
            '杜绝长会话压缩后「忘记自己在哪个分支、刚改到哪一步」',
          ],
          codeLang: 'sh',
          code: `#!/usr/bin/env bash
echo "=== Compact Recovery Snapshot ==="
echo "Branch: $(git branch --show-current)"
git status -s
echo "Recent commits:"
git log -n 3 --oneline`,
        },
      ],
    },
    {
      id: 'cc-b-subagent',
      label: '4 · Subagent 防火墙与 Worktree 并行',
      sub: '严格两层分治 · .claude/agents · git worktree',
      tone: 'emerald',
      badge: 'CH 4 · ISOLATE',
      file: '.claude/agents/code-reviewer.md',
      lessonSlug: 'cc-subagent-delegation',
      stepNumber: 1,
      summary:
        '把海量文件探索隔离在独立子窗口中，任务结束立即销毁 80K 过程噪音；需要多 Agent 并行改码时，用原生 Git Worktree 秒建独立分支目录。',
      points: [
        '严格限制两层扁平结构（子代理不可再派孙代理），防止多 Agent 递归黑洞',
        '支持在 Frontmatter 里声明只读 tools、独立 model 与 isolation: worktree',
      ],
      codeLang: 'text',
      code: `---
name: security-reviewer
description: 审查鉴权与 SQL 安全漏洞，只返回精确文件行号与修复建议
tools: Read, Grep, Glob
model: sonnet
---
你是一名安全审计专家。只读检索相关文件，不要修改任何代码，最终输出 ≤500 字的结构化发现清单。`,
      children: [
        {
          id: 'cc-context-firewall',
          label: 'Subagent 上下文防火墙',
          sub: '独立窗口销毁 80K 噪音 · 主循环只收结论',
          tone: 'emerald',
          badge: 'FIREWALL',
          file: '.claude/agents/explorer.md',
          lessonSlug: 'cc-subagent-delegation',
          stepNumber: 2,
          summary: '需要翻阅 30 个源码文件查根因时，委派 Explore Subagent 在干净子窗口执行，主 Agent 仅接收几百字精炼摘要。',
          points: [
            '主窗口上下文占用从 86% 降至 ~12%，大幅推迟上下文腐烂',
            '可按角色分配轻模型（haiku/sonnet）做只读探索，降低成本与延迟',
          ],
          codeLang: 'json',
          code: `{
  "tool": "Agent",
  "input": {
    "subagent_type": "Explore",
    "prompt": "追踪登录接口 JWT 过期刷新逻辑，只返回关键文件路径、行号与调用顺序"
  }
}`,
        },
        {
          id: 'cc-worktree-isolation',
          label: 'isolation: worktree 原生并行改码',
          sub: '独立分支工作目录 · 零文件/暂存区踩踏',
          tone: 'emerald',
          badge: 'WORKTREE',
          file: '.claude/agents/feature-worker.md',
          lessonSlug: 'cc-worktree-isolation',
          stepNumber: 2,
          summary: '多个 Subagent 并行开发不同需求时，声明 isolation: worktree 自动检出独立工作树目录，互不覆盖文件或 git 暂存区。',
          points: [
            '相比整仓重新 git clone 节省磁盘与时间，且共享底层 .git 对象库',
            '任务若无改动则自动清理临时 worktree，有改动保留独立分支待合并',
          ],
          codeLang: 'text',
          code: `---
name: feature-worker
description: 在独立 Git Worktree 中实现并自测独立功能模块
tools: Read, Edit, Write, Bash, Grep, Glob
isolation: worktree
---
在隔离分支完成编码并跑通单测后，汇总改动文件与测试结果返回主代理。`,
        },
        {
          id: 'cc-worktree-hook',
          label: 'WorktreeCreate 依赖预热钩子',
          sub: '自动链接 node_modules / 初始化测试环境',
          tone: 'emerald',
          badge: 'BOOTSTRAP',
          file: '.claude/hooks/worktree-setup.sh',
          lessonSlug: 'cc-worktree-isolation',
          stepNumber: 4,
          summary: '新 Worktree 刚检出时通常缺少构建缓存或依赖，挂载 WorktreeCreate Hook 可自动完成 pnpm install 或链接环境文件。',
          points: [
            '让并行 Subagent 开箱就能直接跑单测和类型检查',
            '搭配 SubagentStop Hook 验证测试全绿后再允许交卷',
          ],
          codeLang: 'sh',
          code: `#!/usr/bin/env bash
set -euo pipefail
WORKTREE_DIR="$1"
cd "$WORKTREE_DIR"
ln -sf "$CLAUDE_PROJECT_DIR/.env.test" .env.test
pnpm install --offline --prefer-offline`,
        },
      ],
    },
  ],
};
