// Claude Code（anthropics/claude-code）交互式架构与机制教程：4 章 · 8 课 · 48 步
// 参考官方文档与仓库：https://github.com/anthropics/claude-code & https://docs.anthropic.com/en/docs/claude-code
import { ccSrc, chapter, iso, kpi, lesson, steps, swim, tree } from '../../helpers';
import type { Chapter } from '../../../types/lesson';

// ---------------------------------------------------------------------------
// CH1 · 1/2 · 单线程主循环：Gather → Act → Verify
// ---------------------------------------------------------------------------
const L_CC_LOOP = lesson(
  'cc-master-loop',
  'cc-ch01',
  1,
  '单主循环与工具原语',
  1,
  2,
  '单线程主循环：Gather → Act → Verify',
  'Claude Code 刻意拒绝复杂的硬编码多 Agent 状态机，把全部控制权交给一个极简的单线程主循环，由模型自己编排探索、编辑与验证。',
  10,
  '入门',
  [
    { text: '理解 Claude Code 为何采用扁平单线程主循环而非预设流程图', completedAtStep: 2 },
    { text: '掌握 Gather → Act → Verify 三段自驱闭环与 Prompt Caching 复利', completedAtStep: 4 },
    { text: '区分「概率性指导（CLAUDE.md）」与「确定性强制（Hooks / 权限）」的架构边界', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: '拒绝过度编排',
      badge: 'PROBLEM',
      title: '给模型画死 12 步状态机，反而锁死了它的智力',
      paragraphs: [
        '许多传统 Agent 框架习惯在代码里硬编码「规划节点 → 检索节点 → 写码节点 → 评审节点」。一旦真实报错偏离预设路径，僵硬的编排图立刻卡死。',
        'Anthropic 团队在构建 Claude Code 时得出一个反直觉的结论：**模型本身就是最好的编排器**。Harness 只需要提供极简的单线程 `while (stop_reason === "tool_use")` 主循环、高信噪比原子工具、确定性安全护栏和充足上下文。',
      ],
      callout: {
        kind: 'idea',
        title: '核心架构哲学：Guidance vs Enforcement',
        text: '软建议写进 `CLAUDE.md`（概率性指导）；硬红线写进 `Hooks` 与 `permissions`（确定性强制）。绝不混用！',
      },
      kpis: [
        kpi('主控制流', '单线程 Master Loop', 'good'),
        kpi('工作节奏', 'Gather → Act → Verify', 'good'),
        kpi('硬编码工作流', '0', 'good'),
      ],
      scene: iso(
        'Claude Code 单线程主循环全景',
        [
          { id: 'usr', x: 70, y: 210, label: '用户输入 + CLAUDE.md', sublabel: '分层指令 + 会话历史', tone: 'blue', size: 'lg', icon: 'users' },
          { id: 'llm', x: 390, y: 100, label: 'Claude 模型推理', sublabel: '自主决策探索 / 编辑 / 验证', tone: 'orange', size: 'lg', active: true, icon: 'brain' },
          { id: 'gate', x: 720, y: 210, label: 'Hooks + 权限级联', sublabel: 'PreToolUse → deny/ask/allow', tone: 'rose', size: 'lg', active: true, icon: 'shield' },
          { id: 'tool', x: 390, y: 335, label: '工具执行 + PostToolUse', sublabel: 'Read / Edit / Bash / Agent / MCP', tone: 'green', size: 'lg', icon: 'wrench' },
        ],
        [
          { from: 'usr', to: 'llm', status: 'active', packetCount: 1 },
          { from: 'llm', to: 'gate', label: 'tool_use', status: 'active', packetCount: 2, packetLabel: 'ToolCall' },
          { from: 'gate', to: 'tool', label: '放行/改参', status: 'active', packetCount: 1 },
          { from: 'tool', to: 'llm', label: 'tool_result 回流', status: 'active', packetCount: 2, packetLabel: 'Verify' },
        ],
      ),
    },
    {
      shortLabel: '主循环骨架',
      badge: 'TECHNIQUE',
      title: '简洁到极致的 Master Loop 控制流',
      paragraphs: [
        '只要模型返回的 `stop_reason` 仍是 `tool_use`，主循环就会依次通过 `PreToolUse` Hook、权限检查器、工具本体和 `PostToolUse` Hook，把结果组装为 `tool_result` 追加进消息数组，然后再次请求模型；直到 `stop_reason === "end_turn"` 且通过 `Stop` Hook 检查，才交还控制权给人类。',
      ],
      sourceDrawer: ccSrc(
        'Claude Code 单主循环核心执行模型示意',
        'architecture/master-loop.ts',
        'ts',
        `// Claude Code 单线程主循环抽象：模型驱动 Gather -> Act -> Verify
while (true) {
  const response = await anthropic.messages.stream({
    system: cachedSystemBlocks,     // 系统提示 + CLAUDE.md（Prompt Caching 前缀命中）
    tools: activeToolSchemas,       // 内置工具 + MCP 工具
    messages,
  });
  messages.push({ role: 'assistant', content: response.content });

  const toolUses = response.content.filter((b) => b.type === 'tool_use');
  if (toolUses.length === 0) {
    const stopCheck = await runHooks('Stop', { messages });
    if (stopCheck.decision === 'block') {
      messages.push({ role: 'user', content: stopCheck.reason });
      continue; // Stop Hook 可要求模型补跑测试后再停！
    }
    break;
  }
  const results = await executeToolsWithHooksAndPermissions(toolUses);
  messages.push({ role: 'user', content: results });
}`,
        '注意 Stop Hook 甚至可以在模型以为「做完了」时拦截并强制它补跑验证！',
      ),
      kpis: [
        kpi('循环终止', 'end_turn + Stop Hook 通过', 'good'),
        kpi('前缀缓存', 'Prompt Caching 降本提速', 'good'),
        kpi('可观测性', '每步 tool_result 透明入窗', 'neutral'),
      ],
      scene: swim(
        '一次真实修复任务里的 Gather → Act → Verify 闭环',
        [
          { id: 'g', label: '1 · Gather 探索', tone: 'blue' },
          { id: 'a', label: '2 · Act 改动', tone: 'orange' },
          { id: 'v', label: '3 · Verify 验证', tone: 'green' },
        ],
        [
          { id: 'b1', laneId: 'g', start: 4, end: 34, label: 'Grep / Glob / Read 定位根因（零索引预热）', tone: 'blue', status: 'done' },
          { id: 'b2', laneId: 'a', start: 36, end: 64, label: 'Edit 精准改码 + PostToolUse 自动 Lint', tone: 'orange', status: 'done' },
          { id: 'b3', laneId: 'v', start: 66, end: 96, label: 'Bash 跑单测 → 失败则自动回到 Act 修复', tone: 'green', status: 'running' },
        ],
      ),
    },
    {
      shortLabel: 'Agentic Search 胜过 RAG',
      badge: 'INSIGHT',
      title: '为什么 Claude Code 不用向量数据库做代码 RAG？',
      paragraphs: [
        '传统代码助手喜欢把仓库切块建 Embedding 向量库。但代码库每分钟都在变，向量索引极易过期、丢失精确符号引用，还需要额外部署和隐私上传风险。',
        'Claude Code 直接采用 **Agentic Search**：让模型自己组合 `Glob`、`Grep`（ripgrep）和 `Read`，像资深工程师一样顺着调用栈和导入路径实时精准检索——零索引维护、100% 反映磁盘最新字节！',
      ],
      kpis: [
        kpi('代码检索', 'ripgrep + Glob 实时搜', 'good'),
        kpi('索引过期率', '0%（直读最新磁盘）', 'good'),
        kpi('隐私暴露', '无需上传整库建索引', 'good'),
      ],
      scene: iso(
        '传统向量 RAG vs Claude Code Agentic Search',
        [
          { id: 'rag', x: 100, y: 115, label: '传统 Embedding RAG', sublabel: '需建索引 · 易过期 · 丢失精确调用链', tone: 'neutral', size: 'lg', dimmed: true, icon: 'database' },
          { id: 'ags', x: 100, y: 315, label: 'Agentic Search', sublabel: 'Glob + Grep + Read 多跳精准追查', tone: 'green', size: 'lg', active: true, icon: 'eye' },
          { id: 'fs', x: 560, y: 215, label: '本地最新源码树', sublabel: '100% 实时一致 · 零预索引开销', tone: 'blue', size: 'lg', active: true, icon: 'hard-drive' },
        ],
        [
          { from: 'rag', to: 'fs', label: '滞后快照', dashed: true, packetCount: 0 },
          { from: 'ags', to: 'fs', label: '实时精准定位', status: 'active', packetCount: 2, packetLabel: 'rg / Read' },
        ],
      ),
    },
    {
      shortLabel: 'Prompt Caching 复利',
      badge: 'SOLUTION',
      title: '单调追加 + 稳定前缀：把 Prompt Caching 命中率拉满',
      paragraphs: [
        '几十轮工具调用里，如果每轮都改动系统提示词或中间历史，API 就要把几万 Token 从头重算一遍（又慢又贵）。',
        'Claude Code 刻意把系统提示词、工具定义与 `CLAUDE.md` 固定在稳定前缀，每轮只在消息尾部追加 `tool_result`；配合 Anthropic Prompt Caching，多轮迭代缓存命中率极高，首字延迟和成本大幅下降。',
      ],
      kpis: [
        kpi('前缀结构', '固定 System + Tools + 历史前缀', 'good'),
        kpi('变化区域', '仅尾部新增增量', 'good'),
        kpi('缓存收益', '大幅降低成本与 TTFT', 'good'),
      ],
      scene: swim(
        '多轮循环中的 Prompt Cache 命中结构',
        [
          { id: 't1', label: 'Turn 1', tone: 'blue' },
          { id: 't2', label: 'Turn 2', tone: 'green' },
          { id: 't3', label: 'Turn 3', tone: 'violet' },
        ],
        [
          { id: 'c1', laneId: 't1', start: 4, end: 42, label: 'System + Tools + CLAUDE.md (写入缓存)', tone: 'orange', status: 'done' },
          { id: 'c2', laneId: 't2', start: 4, end: 42, label: 'CACHE HIT (零重算)', tone: 'green', status: 'done' },
          { id: 'c3', laneId: 't2', start: 44, end: 66, label: '+ Tool #1 增量', tone: 'blue', status: 'done' },
          { id: 'c4', laneId: 't3', start: 4, end: 66, label: 'CACHE HIT (整段命中)', tone: 'green', status: 'done' },
          { id: 'c5', laneId: 't3', start: 68, end: 92, label: '+ Tool #2 增量', tone: 'violet', status: 'running' },
        ],
      ),
    },
    {
      shortLabel: 'Esc 随时打断',
      badge: 'TECHNIQUE',
      title: '中途 Esc 打断与 Checkpoints 代码回滚',
      paragraphs: [
        '在单主循环运行期间，用户随时按 `Esc` 中断流式输出或当前工具调用，保留已完成上下文并直接输入新方向；如果模型改乱了文件，还可以通过双按 `Esc`（`/rewind`）回退到之前某个检查点的代码与对话状态。',
      ],
      kpis: [
        kpi('单按 Esc', '中断当前生成/工具', 'neutral'),
        kpi('双按 Esc', '/rewind 检查点回滚', 'good'),
        kpi('上下文安全', '支持只回滚代码或连对话一起回滚', 'good'),
      ],
      scene: iso(
        '单主循环内的即时打断与 Rewind 检查点',
        [
          { id: 'cp1', x: 80, y: 210, label: 'Checkpoint #1', sublabel: 'Edit 前自动快照', tone: 'blue', icon: 'database' },
          { id: 'cp2', x: 370, y: 210, label: 'Checkpoint #2', sublabel: '多轮改码中', tone: 'orange', active: true, icon: 'wrench' },
          { id: 'esc', x: 680, y: 115, label: '单按 Esc：原地转向', tone: 'green', icon: 'refresh-cw' },
          { id: 'rew', x: 680, y: 315, label: '双按 Esc：回滚代码与对话', tone: 'violet', icon: 'git-branch' },
        ],
        [
          { from: 'cp1', to: 'cp2', status: 'active', packetCount: 1 },
          { from: 'cp2', to: 'esc', packetCount: 1 },
          { from: 'cp2', to: 'rew', dashed: true, packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: '主循环复盘',
      badge: 'RECAP',
      title: '单线程主循环复盘',
      paragraphs: [
        '「极简单主循环 + Agentic Search + 高缓存命中 + 确定性 Hooks」构成了 Claude Code 高上限的根基：越是强模型，越少人为束缚就越能发挥推理潜力。',
      ],
      recapTable: [
        { question: '为什么不硬编码多阶段固定状态机？', decision: '极简单线程 Master Loop 让模型自主决定下一步', because: '面对真实仓库里的突发编译报错，自主循环比预设图更具韧性。' },
        { question: '为什么不用向量库 RAG 检索代码？', decision: '用 Glob/Grep/Read 实时 Agentic Search', because: '零索引过期、零部署成本、精确跟随符号与调用链。' },
        { question: '多轮循环怎么控制成本与延迟？', decision: '保持稳定前缀 + 尾部追加，最大化 Prompt Caching 命中', because: '让长程 30+ 轮探索依然保持秒级响应。' },
      ],
      kpis: [
        kpi('架构风格', '极简主循环', 'good'),
        kpi('代码搜索', 'Agentic Search', 'good'),
        kpi('缓存友好', '单调追加前缀', 'good'),
      ],
      scene: iso('主循环复盘', [
        { id: 'a', x: 200, y: 200, label: 'Gather', tone: 'blue' },
        { id: 'b', x: 500, y: 200, label: 'Act', tone: 'orange', active: true },
        { id: 'c', x: 800, y: 200, label: 'Verify', tone: 'green' },
      ], [
        { from: 'a', to: 'b', packetCount: 1 },
        { from: 'b', to: 'c', packetCount: 1 },
      ]),
    },
  ]),
);

// ---------------------------------------------------------------------------
// CH1 · 2/2 · 内置原子工具与 MCP 协议扩展
// ---------------------------------------------------------------------------
const L_CC_TOOLS = lesson(
  'cc-tools-mcp',
  'cc-ch01',
  1,
  '单主循环与工具原语',
  2,
  2,
  '内置工具体系与 MCP 无缝扩展',
  'Claude Code 把内置工具按「只读探索 / 精确编辑 / 命令执行 / 子代理委派」精细分层，并通过 MCP（Model Context Protocol）把外部世界统一接入同一套权限与 Hook 管线。',
  10,
  '入门',
  [
    { text: '理解为何 Claude Code 将专用文件工具（Read/Edit/Grep/Glob）与通用 Bash 区分对待', completedAtStep: 2 },
    { text: '掌握 MCP 工具的命名规则（mcp__<server>__<tool>）与统一权限治理', completedAtStep: 4 },
    { text: '了解 Tool Search 懒加载如何避免上百个 MCP 工具撑爆上下文', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: '专用工具的价值',
      badge: 'PROBLEM',
      title: '既然有 Bash，为什么还要专门做 Read / Edit / Grep / Glob？',
      paragraphs: [
        '虽然 `Bash` 理论上也能 `cat`、`sed`、`find`，但专用工具在安全权限与用户体验上有巨大优势：`Read`/`Grep`/`Glob` 天然是**只读无副作用**的，可以零弹窗并发放行；`Edit` 可以做结构化 Diff 预览、行号校验和自动检查点快照，而无需解析千奇百怪的 `sed` 脚本。',
      ],
      kpis: [
        kpi('只读工具', 'Read / Glob / Grep', 'good'),
        kpi('写盘工具', 'Edit / Write / NotebookEdit', 'neutral'),
        kpi('执行与委派', 'Bash / Agent / WebFetch', 'good'),
      ],
      scene: iso(
        'Claude Code 工具权限分级版图',
        [
          { id: 'ro', x: 80, y: 110, label: '只读探索类', sublabel: 'Read · Glob · Grep（默认免审批可并行）', tone: 'green', size: 'lg', active: true, icon: 'eye' },
          { id: 'ed', x: 80, y: 315, label: '结构化编辑类', sublabel: 'Edit · Write（支持 acceptEdits 档位）', tone: 'blue', size: 'lg', icon: 'file-text' },
          { id: 'sh', x: 540, y: 110, label: '高权执行类', sublabel: 'Bash · WebFetch（受沙箱与规则严控）', tone: 'orange', size: 'lg', active: true, icon: 'terminal' },
          { id: 'mcp', x: 540, y: 315, label: 'MCP & Subagent', sublabel: 'mcp__server__tool · Agent 委派', tone: 'violet', size: 'lg', icon: 'plug' },
        ],
        [
          { from: 'ro', to: 'ed', label: '先读后改', packetCount: 1 },
          { from: 'ed', to: 'sh', label: '改完验证', packetCount: 1 },
          { from: 'mcp', to: 'sh', label: '同走 Hooks & 权限门', dashed: true, packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: 'MCP 统一接入',
      badge: 'TECHNIQUE',
      title: 'MCP Server：把 GitHub、Jira、数据库变成原生工具',
      paragraphs: [
        '通过项目根目录的 `.mcp.json` 或 `~/.claude.json`，团队可以声明任意 stdio / HTTP / SSE MCP 服务器。Claude Code 启动时自动拉取工具 Schema，并统一命名空间为 `mcp__<server>__<tool>`。',
        '最关键的是：**MCP 工具绝不是法外之地**——它们与内置工具共用同一套 `PreToolUse` Hooks 和 `permissions` 规则（例如 `mcp__postgres__query` 允许，`mcp__github__delete_*` 禁止）。',
      ],
      sourceDrawer: ccSrc(
        '项目级 .mcp.json 配置与权限联动示例',
        '.mcp.json',
        'json',
        `{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/"
    },
    "postgres-ro": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "$DATABASE_URL"]
    }
  }
}`,
        'MCP 工具统一以 mcp__<server>__<tool> 命名，天然接受 PreToolUse Hook 与权限通配符约束。',
      ),
      kpis: [
        kpi('传输协议', 'stdio / Streamable HTTP', 'good'),
        kpi('命名空间', 'mcp__<server>__<tool>', 'neutral'),
        kpi('安全治理', '统一接入 Hooks 与权限规则', 'good'),
      ],
      scene: iso(
        'MCP 工具接入 Claude Code 统一管线',
        [
          { id: 's1', x: 70, y: 100, label: 'GitHub MCP', tone: 'blue', icon: 'globe' },
          { id: 's2', x: 70, y: 215, label: 'Postgres MCP', tone: 'green', icon: 'database' },
          { id: 's3', x: 70, y: 330, label: 'Sentry / Linear MCP', tone: 'violet', icon: 'plug' },
          { id: 'cc', x: 440, y: 215, label: 'Claude Code MCP Client', sublabel: '统一命名 + PreToolUse + 权限匹配', tone: 'orange', size: 'lg', active: true, icon: 'shield' },
          { id: 'loop', x: 790, y: 215, label: 'Master Loop', tone: 'green', icon: 'brain' },
        ],
        [
          { from: 's1', to: 'cc', packetCount: 1 },
          { from: 's2', to: 'cc', packetCount: 1 },
          { from: 's3', to: 'cc', packetCount: 1 },
          { from: 'cc', to: 'loop', status: 'active', packetCount: 2, packetLabel: 'Tool Schema' },
        ],
      ),
    },
    {
      shortLabel: 'MCP 工具防爆窗',
      badge: 'SOLUTION',
      title: 'Tool Search 懒加载：连 20 个 MCP Server 也不撑爆上下文',
      paragraphs: [
        '如果你同时接入了 GitHub、Slack、Linear、Sentry、Figma 五个 MCP 服务器，它们可能一共暴露 150 个工具——光工具 JSON Schema 就能吃掉 40,000 Token！',
        'Claude Code 引入了动态工具发现（Tool Search / Deferred Tools）：当工具定义占用上下文超过阈值时，默认只暴露一个轻量的 `ToolSearch` 工具，模型按关键词搜到需要的那 2 个 MCP 工具后再按需加载其完整 Schema。',
      ],
      kpis: [
        kpi('按需加载', 'ToolSearch 动态检索', 'good'),
        kpi('Token 节省', '可达 80%+ 工具开销', 'good'),
        kpi('接入上限', '支持数十个 MCP 服务', 'good'),
      ],
      scene: swim(
        '全量注入 vs ToolSearch 懒加载上下文开销',
        [
          { id: 'all', label: '全量注入 150 工具', tone: 'rose' },
          { id: 'lazy', label: 'ToolSearch 懒加载', tone: 'green' },
        ],
        [
          { id: 'a1', laneId: 'all', start: 4, end: 82, label: '150 个完整 Schema 吞掉 40K+ Token（每轮重传）', tone: 'rose', status: 'blocked' },
          { id: 'b1', laneId: 'lazy', start: 4, end: 18, label: '核心工具 + ToolSearch', tone: 'green', status: 'done' },
          { id: 'b2', laneId: 'lazy', start: 22, end: 36, label: '按需拉取 2 个目标 MCP Schema', tone: 'blue', status: 'running' },
        ],
      ),
    },
    {
      shortLabel: 'Read-before-Edit 纪律',
      badge: 'TECHNIQUE',
      title: '内置工具的隐形护栏：未读过的文件拒绝盲改',
      paragraphs: [
        'Claude Code 的 `Edit` 工具内置了「先读后改」和「并发修改冲突检测」：如果模型还没用 `Read` 读过某个文件就贸然调用 `Edit`，或者文件在读取之后被外部编辑器改过（mtime 变化），工具直接拒绝并提示重新 `Read`，防止静默覆盖开发者手写的代码。',
      ],
      kpis: [
        kpi('先读后改', '强制校验', 'good'),
        kpi('外部修改检测', '防静默覆盖', 'good'),
        kpi('唯一匹配', '防误替换同名片段', 'good'),
      ],
      scene: iso(
        'Edit 工具三重防误改校验',
        [
          { id: 'ed', x: 80, y: 215, label: 'Edit(file, old, new)', tone: 'blue', size: 'lg', icon: 'wrench' },
          { id: 'c1', x: 400, y: 95, label: '1 · 本会话已 Read？', tone: 'violet', icon: 'eye' },
          { id: 'c2', x: 400, y: 215, label: '2 · mtime 未被外部篡改？', tone: 'orange', active: true, icon: 'clock' },
          { id: 'c3', x: 400, y: 335, label: '3 · old_string 唯一命中？', tone: 'green', icon: 'shield' },
          { id: 'ok', x: 770, y: 215, label: '安全落盘 + 记录快照', tone: 'green', size: 'lg', icon: 'check-circle' },
        ],
        [
          { from: 'ed', to: 'c1', packetCount: 1 },
          { from: 'ed', to: 'c2', status: 'active', packetCount: 1 },
          { from: 'ed', to: 'c3', packetCount: 1 },
          { from: 'c1', to: 'ok', packetCount: 1 },
          { from: 'c2', to: 'ok', status: 'active', packetCount: 1 },
          { from: 'c3', to: 'ok', packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: 'Skills 与插件打包',
      badge: 'INSIGHT',
      title: 'Skills + Plugins：把工具、Hooks 和手册打包成可复用的团队套件',
      paragraphs: [
        '除了 MCP 提供外部能力，Claude Code 还支持 `.claude/skills/`（按需加载的领域指南与斜杠命令）以及完整 Plugin 包，可以把 MCP 配置、Hooks 护栏、自定义 Subagent 和 Skill 打包一键分发给整个研发团队。',
      ],
      kpis: [
        kpi('能力层', '内置工具 + MCP', 'good'),
        kpi('知识层', 'CLAUDE.md + Skills', 'good'),
        kpi('治理层', 'Hooks + Permissions', 'good'),
      ],
      scene: iso(
        'Claude Code 扩展三件套协同',
        [
          { id: 'mcp', x: 100, y: 210, label: 'MCP Servers', sublabel: '接入外部数据与 API', tone: 'blue', size: 'lg', icon: 'plug' },
          { id: 'sk', x: 420, y: 210, label: 'Skills & Slash Cmd', sublabel: '按需载入工作流知识', tone: 'green', size: 'lg', active: true, icon: 'file-text' },
          { id: 'hk', x: 740, y: 210, label: 'Hooks & Rules', sublabel: '确定性安全与格式校验', tone: 'orange', size: 'lg', active: true, icon: 'shield' },
        ],
        [
          { from: 'mcp', to: 'sk', label: '被工作流编排', packetCount: 1 },
          { from: 'sk', to: 'hk', label: '受确定性护栏约束', status: 'active', packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: '工具体系复盘',
      badge: 'RECAP',
      title: '内置工具与 MCP 扩展复盘',
      paragraphs: [
        '精细区分只读/编辑/执行工具、用 ToolSearch 解决 MCP 工具爆炸、所有工具统一走 Hooks 与权限门——这就是 Claude Code 工具层的稳健之道。',
      ],
      recapTable: [
        { question: '为何在 Bash 之外还要单独做 Read/Edit/Grep？', decision: '拆分只读探索、结构化编辑与通用 Shell', because: '实现只读零弹窗并行、编辑前冲突检测与清晰 Diff 预览。' },
        { question: '接入几十个 MCP 服务如何不撑爆上下文？', decision: 'ToolSearch 按需动态加载工具 Schema', because: '大幅节省每轮常驻上下文开销。' },
        { question: '第三方 MCP 工具的安全如何保障？', decision: '统一命名 mcp__server__tool 并走同一套权限与 Hook 管道', because: '内外工具没有安全特权盲区。' },
      ],
      kpis: [
        kpi('安全一致', '内置与 MCP 同管线', 'good'),
        kpi('防误改', 'Read-before-Edit', 'good'),
        kpi('上下文控制', 'ToolSearch 懒加载', 'good'),
      ],
      scene: iso('工具复盘', [
        { id: 'a', x: 200, y: 200, label: 'Built-in Tools', tone: 'green' },
        { id: 'b', x: 500, y: 200, label: 'MCP + ToolSearch', tone: 'violet', active: true },
        { id: 'c', x: 800, y: 200, label: 'Hooks & Perms', tone: 'orange' },
      ], [
        { from: 'a', to: 'c', packetCount: 1 },
        { from: 'b', to: 'c', packetCount: 1 },
      ]),
    },
  ]),
);

// ---------------------------------------------------------------------------
// CH2 · 1/2 · PreToolUse / PostToolUse Hooks 与退出码协议（★ 带互动实验台）
// ---------------------------------------------------------------------------
const L_CC_HOOKS = lesson(
  'cc-hooks-lifecycle',
  'cc-ch02',
  2,
  'Hooks 确定性拦截与权限级联',
  1,
  2,
  'Hooks 生命周期：PreToolUse 拦截与参数改写',
  'Claude Code 最强工程武器：把「绝不能靠模型自觉」的安全红线、自动格式化和审计日志，变成进程外确定性执行的 Hooks。',
  14,
  '核心',
  [
    { text: '掌握 Claude Code 完整 Hook 生命周期事件（PreToolUse / PostToolUse / Stop / PreCompact 等）', completedAtStep: 2 },
    { text: '理解退出码 0 / 2 与 JSON permissionDecision / updatedInput 的通信协议', completedAtStep: 4 },
    { text: '理解为何 Hooks 即使在 bypassPermissions 模式下依然强制执行', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: '提示词不是防火墙',
      badge: 'PROBLEM',
      title: '在 CLAUDE.md 里写「绝对不要碰 .env」——第 47 轮它还是忘了',
      paragraphs: [
        'LLM 本质上是概率模型。随着对话拉长或上下文压缩，你在 `CLAUDE.md` 里加粗写了三遍「禁止 `rm -rf`、禁止改生产配置、每次改完必须跑 prettier」，模型依然可能在某个边缘推理里忽略它。',
        'Claude Code 的 **Hooks** 把这些铁律从「求模型遵守」变成了「由 Harness 在生命周期节点强制执行你的脚本 / HTTP 接口」，100% 确定性生效！',
      ],
      callout: {
        kind: 'idea',
        title: '记住黄金法则',
        text: '如果某条规范被违反一次只算小瑕疵 → 写进 `CLAUDE.md`；如果违反一次就会出事故或必须 100% 自动执行 → 写进 **Hooks**。',
      },
      kpis: [
        kpi('执行确定性', '100%（不依赖模型意愿）', 'good'),
        kpi('通信方式', 'stdin JSON ⇄ stdout / exit code', 'good'),
        kpi('绕过可能', '0（bypassPermissions 下也跑）', 'good'),
      ],
      scene: iso(
        'Claude Code 全生命周期 Hook 挂载点',
        [
          { id: 'u', x: 70, y: 100, label: 'UserPromptSubmit', sublabel: '发给模型前校验或注入上下文', tone: 'blue', icon: 'users' },
          { id: 'pre', x: 380, y: 100, label: 'PreToolUse', sublabel: '工具前拦截 / 审批决策 / updatedInput 改参', tone: 'rose', size: 'lg', active: true, icon: 'shield' },
          { id: 'post', x: 710, y: 100, label: 'PostToolUse', sublabel: '工具后自动 Prettier / ESLint / 审计日志', tone: 'green', size: 'lg', active: true, icon: 'check-circle' },
          { id: 'stop', x: 220, y: 330, label: 'Stop / SubagentStop', sublabel: '收尾前强制验证测试是否通过', tone: 'orange', size: 'lg', icon: 'pause' },
          { id: 'cmp', x: 580, y: 330, label: 'PreCompact / SessionStart', sublabel: '压缩前后保存与重注入关键锚点', tone: 'violet', size: 'lg', icon: 'database' },
        ],
        [
          { from: 'u', to: 'pre', status: 'active', packetCount: 1 },
          { from: 'pre', to: 'post', label: '工具执行', status: 'active', packetCount: 2, packetLabel: 'stdin JSON' },
          { from: 'post', to: 'stop', dashed: true, packetCount: 1 },
          { from: 'stop', to: 'cmp', dashed: true, packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: 'settings.json 声明',
      badge: 'TECHNIQUE',
      title: '用 matcher 精准绑定特定工具与命令脚本',
      paragraphs: [
        'Hooks 声明在 `~/.claude/settings.json`（全局）或 `.claude/settings.json`（随仓库提交团队共享）。每条规则通过正则 `matcher` 匹配工具名（如 `"Bash"`、`"Edit|Write"`、`"mcp__.*"`），命中后以子进程拉起脚本并把完整事件 JSON 喂入 `stdin`。',
      ],
      sourceDrawer: ccSrc(
        'PreToolUse 防护 + PostToolUse 自动格式化配置',
        '.claude/settings.json',
        'json',
        `{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/guard.sh",
            "timeout": 10
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "npx prettier --write $CLAUDE_FILE_PATH" }
        ]
      }
    ]
  }
}`,
        '团队只需提交 .claude/settings.json，所有成员的 Claude Code 即刻获得统一护栏与自动格式化。',
      ),
      kpis: [
        kpi('匹配方式', 'Regex matcher', 'good'),
        kpi('处理器类型', 'command / http / prompt', 'good'),
        kpi('超时保护', '支持 timeout 秒数', 'neutral'),
      ],
      scene: swim(
        'PreToolUse → 工具执行 → PostToolUse 精确数据流',
        [
          { id: 'cc', label: 'Claude Code 引擎', tone: 'blue' },
          { id: 'pre', label: 'PreToolUse Hook', tone: 'rose' },
          { id: 'tl', label: '目标工具 (Edit/Bash)', tone: 'orange' },
          { id: 'post', label: 'PostToolUse Hook', tone: 'green' },
        ],
        [
          { id: 'a1', laneId: 'cc', start: 4, end: 18, label: '序列化 tool_name + tool_input', tone: 'blue', status: 'done' },
          { id: 'a2', laneId: 'pre', start: 20, end: 44, label: '读 stdin → 校验/改参/返回决策', tone: 'rose', status: 'running' },
          { id: 'a3', laneId: 'tl', start: 46, end: 70, label: '执行工具（使用可能被改写的参数）', tone: 'orange', status: 'done' },
          { id: 'a4', laneId: 'post', start: 72, end: 95, label: '运行 Formatter/Linter 并将诊断反馈给模型', tone: 'green', status: 'done' },
        ],
      ),
    },
    {
      shortLabel: '退出码与 JSON 协议',
      badge: 'SOLUTION',
      title: 'Exit 0 vs Exit 2 与 hookSpecificOutput 精细控制',
      paragraphs: [
        'Hook 脚本与 Claude Code 之间的协议极其简洁优雅：',
        '- **Exit Code 0**：放行；如果 `stdout` 输出了合法 JSON，还能通过 `hookSpecificOutput.permissionDecision` 显式返回 `"allow"` / `"deny"` / `"ask"`，甚至通过 `updatedInput` **原地改写工具参数**！',
        '- **Exit Code 2**：**硬拦截**！立即阻断工具调用，并把 `stderr` 错误文本直接反馈给 Claude，让模型立刻明白违规原因并自动换方案。',
      ],
      sourceDrawer: ccSrc(
        'PreToolUse 守卫脚本：拦截 .env 并用 updatedInput 注入安全参数',
        '.claude/hooks/guard.sh',
        'sh',
        `#!/usr/bin/env bash
INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name')
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# 1. 禁止读取或改写敏感 .env 密钥文件（退出码 2 = 硬拦截并反馈给 Claude）
if [[ "$FILE" == *".env"* ]]; then
  echo "安全拦截：禁止访问 .env 敏感文件，请改用 .env.example" >&2
  exit 2
fi

# 2. 对高危 rm -rf 直接返回 JSON deny 决策
if [[ "$TOOL" == "Bash" && "$CMD" =~ rm[[:space:]]+-rf ]]; then
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"禁止执行 rm -rf"}}'
  exit 0
fi`,
        '通过标准 Unix stdin/stdout/exit code，任何语言（Bash/Python/Node/Go）都能 10 行写出企业级 Hook。',
      ),
      kpis: [
        kpi('Exit 0', '放行或解析 JSON 决策', 'good'),
        kpi('Exit 2', '硬拦截 + stderr 反馈模型', 'warn'),
        kpi('参数改写', 'updatedInput 透明注入', 'good'),
      ],
      scene: iso(
        'PreToolUse 三路输出裁决',
        [
          { id: 'hk', x: 80, y: 215, label: 'Hook 脚本结束', sublabel: '检查 exit code 与 stdout JSON', tone: 'violet', size: 'lg', active: true, icon: 'shield' },
          { id: 'e2', x: 520, y: 80, label: 'Exit 2 / decision: deny', sublabel: '硬阻断 → stderr 写入 tool_result 让模型修正', tone: 'rose', size: 'lg', icon: 'alert-triangle' },
          { id: 'rw', x: 520, y: 215, label: 'Exit 0 + updatedInput', sublabel: '原地改写参数后安全执行', tone: 'blue', size: 'lg', active: true, icon: 'wrench' },
          { id: 'ok', x: 520, y: 350, label: 'Exit 0 (空输出)', sublabel: '交由后续权限规则级联评估', tone: 'green', size: 'lg', icon: 'check-circle' },
        ],
        [
          { from: 'hk', to: 'e2', status: 'error', packetCount: 1, packetLabel: 'BLOCK' },
          { from: 'hk', to: 'rw', status: 'active', packetCount: 1, packetLabel: 'REWRITE' },
          { from: 'hk', to: 'ok', packetCount: 1, packetLabel: 'PASS' },
        ],
      ),
    },
    {
      shortLabel: 'updatedInput 魔法',
      badge: 'INSIGHT',
      title: 'updatedInput：不用阻断，悄悄把不安全参数修安全',
      paragraphs: [
        '有时候直接 `deny` 会让模型白跑一轮重试。借助 `updatedInput`，Hook 可以在工具执行前透明修正参数：例如给所有 `curl` 自动加上 `--max-time 15`，把 `pytest` 自动补上 `--tb=short`，或将路径规范化为相对工作区路径，模型和人类都能获得最丝滑的体验！',
        '你可以在顶部切换到**「实验台」**亲自测试 Exit 0 / Exit 2 / `updatedInput` 与权限级联的完整交互！',
      ],
      kpis: [
        kpi('减少重试', '原地修参一次过', 'good'),
        kpi('审计透明', '记录改写后实际参数', 'neutral'),
        kpi('互动体验', '顶部可切换实验台', 'good'),
      ],
      scene: iso(
        'updatedInput 透明改写参数流',
        [
          { id: 'in', x: 80, y: 210, label: '模型原始输入', sublabel: 'Bash("pytest tests/")', tone: 'orange', size: 'lg', icon: 'brain' },
          { id: 'hk', x: 430, y: 210, label: 'PreToolUse Hook', sublabel: '返回 updatedInput: 追加 --tb=short -q', tone: 'violet', size: 'lg', active: true, icon: 'plug' },
          { id: 'ex', x: 770, y: 210, label: '实际执行命令', sublabel: 'pytest tests/ --tb=short -q', tone: 'green', size: 'lg', icon: 'terminal' },
        ],
        [
          { from: 'in', to: 'hk', status: 'active', packetCount: 1 },
          { from: 'hk', to: 'ex', status: 'active', packetCount: 2, packetLabel: 'updatedInput' },
        ],
      ),
    },
    {
      shortLabel: '绕不过的安全底线',
      badge: 'INSIGHT',
      title: '哪怕开启 bypassPermissions，PreToolUse Hook 依然执行！',
      paragraphs: [
        '在自动化流水线或高信任开发时，开发者常使用 `--dangerously-skip-permissions`（`bypassPermissions` 模式）跳过人工弹窗。但 Claude Code 刻意规定：**Hooks 位于权限模式之外，即便在 bypassPermissions 模式下仍强制运行**。',
        '这让企业安全团队可以把绝对红线（禁止删库、禁止推 main、禁止读密钥）钉死在组织级托管 Hook 里，永远不被个人开关绕过。',
      ],
      kpis: [
        kpi('bypassPermissions 下', 'Hooks 依然 100% 强制执行', 'good'),
        kpi('子 Agent 继承', '携带 agent_id / agent_type', 'good'),
        kpi('组织管控', '托管级 settings 优先', 'good'),
      ],
      scene: iso(
        'bypassPermissions 下的 Hook 硬底线',
        [
          { id: 'call', x: 80, y: 210, label: '工具调用请求', tone: 'blue', icon: 'wrench' },
          { id: 'hk', x: 380, y: 210, label: '1 · PreToolUse Hooks', sublabel: '始终强制执行（不可跳过！）', tone: 'rose', size: 'lg', active: true, icon: 'shield' },
          { id: 'pm', x: 720, y: 210, label: '2 · Permission Mode', sublabel: 'bypassPermissions 仅跳过弹窗确认', tone: 'orange', size: 'lg', icon: 'lock' },
        ],
        [
          { from: 'call', to: 'hk', status: 'active', packetCount: 2, packetLabel: '必经闸门' },
          { from: 'hk', to: 'pm', label: 'Hook 放行后才进入', status: 'active', packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: 'Hooks 复盘',
      badge: 'RECAP',
      title: 'Hooks 生命周期复盘',
      paragraphs: [
        'Hooks 让 Claude Code 从「会听话的助手」蜕变为「可工程化治理的确定性系统」：用标准 Unix 管道把安全、格式、测试门禁和审计全部编织进 Agent 循环。',
      ],
      recapTable: [
        { question: '什么时候用 CLAUDE.md，什么时候用 Hooks？', decision: '软偏好用 CLAUDE.md，硬红线与自动化用 Hooks', because: '提示词是概率性的，只有 Hooks 保证 100% 确定性执行。' },
        { question: 'PreToolUse 拦截为什么推荐返回 Exit 2 而不是直接杀进程？', decision: 'Exit 2 会把 stderr 理由传回模型上下文', because: '模型能立刻理解为何被拒并自主改用合规方式继续完成任务。' },
        { question: '如何用 PostToolUse 减少模型低级语法错误？', decision: '在 Edit/Write 后自动运行 Formatter/Linter', because: '确定性工具秒级修好格式并把真实类型报错喂回主循环。' },
      ],
      kpis: [
        kpi('核心协议', 'stdin JSON + Exit 0/2', 'good'),
        kpi('参数改写', 'updatedInput', 'good'),
        kpi('互动体验', '可切顶部实验台体验', 'good'),
      ],
      scene: iso('Hooks 复盘', [
        { id: 'a', x: 200, y: 200, label: 'PreToolUse', tone: 'rose', active: true },
        { id: 'b', x: 500, y: 200, label: 'Tool Execute', tone: 'orange' },
        { id: 'c', x: 800, y: 200, label: 'PostToolUse', tone: 'green', active: true },
      ], [
        { from: 'a', to: 'b', packetCount: 1 },
        { from: 'b', to: 'c', packetCount: 1 },
      ]),
    },
  ]),
);

// ---------------------------------------------------------------------------
// CH2 · 2/2 · 权限级联（deny → ask → allow）与 OS 沙箱边界
// ---------------------------------------------------------------------------
const L_CC_PERMS = lesson(
  'cc-permission-cascade',
  'cc-ch02',
  2,
  'Hooks 确定性拦截与权限级联',
  2,
  2,
  '权限级联（deny → ask → allow）与 OS 沙箱边界',
  '深入 Claude Code 的多层权限求值顺序、五种权限运行模式，以及针对 Bash 命令的原生 bubblewrap / Seatbelt 沙箱边界。',
  10,
  '核心',
  [
    { text: '掌握权限规则的严格求值顺序：Hooks → deny → ask → Permission Mode → allow', completedAtStep: 2 },
    { text: '区分 default / acceptEdits / plan / dontAsk / bypassPermissions 五种模式', completedAtStep: 4 },
    { text: '明确 Claude Code Shell 沙箱的覆盖范围与外层容器最佳实践', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: '冲突规则谁赢',
      badge: 'PROBLEM',
      title: '个人配置写了 allow Bash(*)，企业策略写了 deny Bash(rm *)，谁生效？',
      paragraphs: [
        'Claude Code 支持 4 层配置文件叠加（企业托管策略 → CLI 参数 → 项目本地 `settings.local.json` → 项目共享 `settings.json` → 全局 `~/.claude/settings.json`）。',
        '为了杜绝误放行，权限求值绝不采用「谁在后面谁覆盖」，而是严格按照 **`deny` 永远压倒 `ask`，`ask` 永远压倒 `allow`** 的安全优先级级联判定！',
      ],
      kpis: [
        kpi('求值优先级', 'deny > ask > allow', 'good'),
        kpi('配置层级', '企业托管 > 本地 > 项目 > 全局', 'good'),
        kpi('语法粒度', 'Tool(pattern) 精细匹配', 'neutral'),
      ],
      scene: iso(
        'Claude Code 权限级联瀑布',
        [
          { id: 'h', x: 60, y: 210, label: '1 · PreToolUse Hooks', tone: 'violet', size: 'sm', active: true, icon: 'plug' },
          { id: 'd', x: 255, y: 210, label: '2 · deny 规则', sublabel: '命中即死刑拒绝', tone: 'rose', size: 'sm', active: true, icon: 'shield' },
          { id: 'a', x: 455, y: 210, label: '3 · ask 规则', sublabel: '命中即强制问人', tone: 'orange', size: 'sm', icon: 'pause' },
          { id: 'm', x: 650, y: 210, label: '4 · Mode / allow', sublabel: '放行或默认弹窗', tone: 'green', size: 'sm', icon: 'check-circle' },
          { id: 'ex', x: 845, y: 210, label: '5 · 执行(+沙箱)', tone: 'blue', size: 'sm', icon: 'lock' },
        ],
        [
          { from: 'h', to: 'd', status: 'active', packetCount: 1 },
          { from: 'd', to: 'a', status: 'active', packetCount: 1 },
          { from: 'a', to: 'm', status: 'active', packetCount: 1 },
          { from: 'm', to: 'ex', status: 'active', packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: '声明式权限规则',
      badge: 'TECHNIQUE',
      title: 'Tool(pattern) 声明式权限配置',
      paragraphs: [
        '你可以在 `settings.json` 的 `permissions` 字段里精确到具体子命令、文件路径甚至特定域名的 `WebFetch`，从而只放开安全子集（例如允许 `npm test` 和 `git status`，拒绝读取 `.env` 和 `curl`）。',
      ],
      sourceDrawer: ccSrc(
        '声明式 permissions 级联配置示例',
        '.claude/settings.json',
        'json',
        `{
  "permissions": {
    "deny": [
      "Read(./.env)",
      "Read(./secrets/**)",
      "Bash(rm -rf *)",
      "Bash(git push --force*)"
    ],
    "ask": [
      "Bash(git push *)",
      "Bash(npm publish*)"
    ],
    "allow": [
      "Bash(npm run test*)",
      "Bash(git status)",
      "Bash(git diff*)",
      "WebFetch(domain:docs.anthropic.com)"
    ]
  }
}`,
        'deny 规则拥有一票否决权，哪怕 allow 中配置了更宽的通配符也绝不会被覆盖。',
      ),
      kpis: [
        kpi('路径保护', 'Read(./.env) 可精确禁读', 'good'),
        kpi('域名白名单', 'WebFetch(domain:...)', 'good'),
        kpi('一票否决', 'deny 压倒一切 allow', 'good'),
      ],
      scene: swim(
        '三条典型调用穿过 deny → ask → allow 级联',
        [
          { id: 'c1', label: 'Read(.env)', tone: 'rose' },
          { id: 'c2', label: 'Bash(git push)', tone: 'orange' },
          { id: 'c3', label: 'Bash(npm run test)', tone: 'green' },
        ],
        [
          { id: 'b1', laneId: 'c1', start: 5, end: 36, label: '命中 deny → 立刻拦截', tone: 'rose', status: 'blocked' },
          { id: 'b2', laneId: 'c2', start: 5, end: 64, label: '跳过 deny → 命中 ask → 弹窗确认', tone: 'orange', status: 'queued' },
          { id: 'b3', laneId: 'c3', start: 5, end: 94, label: '跳过 deny/ask → 命中 allow → 自动执行', tone: 'green', status: 'done' },
        ],
      ),
    },
    {
      shortLabel: '五种权限模式',
      badge: 'SOLUTION',
      title: 'Shift+Tab 秒切五种权限运行模式',
      paragraphs: [
        '在终端交互中，按 `Shift+Tab` 可以按当前任务阶段即时切换权限模式：`default`（写盘与命令均询问）、`acceptEdits`（自动放行文件编辑，仅命令询问）、`plan`（纯只读规划模式，禁止一切写入和修改命令）、`dontAsk`（未在 allow 列表的一律静默拒绝，绝不弹窗）、`bypassPermissions`（全自动放行，仅限受控沙箱）。',
      ],
      kpis: [
        kpi('规划首选', 'plan（强制只读）', 'good'),
        kpi('编码提速', 'acceptEdits（免确认改码）', 'good'),
        kpi('CI 严格模式', 'dontAsk（未授权即拒）', 'good'),
      ],
      scene: iso(
        '五种 Permission Modes 自治度光谱',
        [
          { id: 'm1', x: 50, y: 210, label: 'plan', sublabel: '纯只读分析规划', tone: 'blue', size: 'sm', icon: 'eye' },
          { id: 'm2', x: 240, y: 210, label: 'default', sublabel: '编辑/命令均问', tone: 'violet', size: 'sm', icon: 'shield' },
          { id: 'm3', x: 430, y: 210, label: 'acceptEdits', sublabel: '自动改码·命令问', tone: 'green', size: 'sm', active: true, icon: 'wrench' },
          { id: 'm4', x: 620, y: 210, label: 'dontAsk', sublabel: '只跑白名单其余拒', tone: 'orange', size: 'sm', icon: 'lock' },
          { id: 'm5', x: 810, y: 210, label: 'bypass', sublabel: '全自动(配外层沙箱)', tone: 'rose', size: 'sm', icon: 'alert-triangle' },
        ],
        [
          { from: 'm1', to: 'm2', packetCount: 1 },
          { from: 'm2', to: 'm3', status: 'active', packetCount: 1 },
          { from: 'm3', to: 'm4', packetCount: 1 },
          { from: 'm4', to: 'm5', dashed: true, packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: '原生 Bash 沙箱',
      badge: 'TECHNIQUE',
      title: '/sandbox：给 Bash 加上 OS 级文件与网络隔离',
      paragraphs: [
        'Claude Code 同样提供了原生 OS 沙箱（macOS 使用 Seatbelt，Linux 使用 `bubblewrap`）：启用后，`Bash` 工具启动的所有子进程被物理限制在当前工作目录写盘，且网络流量统一经过受控代理域名白名单，从而安全地减少 80% 以上的弹窗确认。',
      ],
      kpis: [
        kpi('macOS', 'Seatbelt', 'good'),
        kpi('Linux', 'bubblewrap (bwrap)', 'good'),
        kpi('网络控制', '域名白名单代理', 'good'),
      ],
      scene: iso(
        'Claude Code 原生 Bash 沙箱边界',
        [
          { id: 'bash', x: 90, y: 210, label: 'Bash 工具调用', tone: 'orange', size: 'lg', icon: 'terminal' },
          { id: 'box', x: 430, y: 210, label: 'Seatbelt / bubblewrap', sublabel: '文件写限定 cwd · 网络经代理域名过滤', tone: 'blue', size: 'lg', active: true, icon: 'lock' },
          { id: 'fs', x: 780, y: 110, label: '当前工作区读写', tone: 'green', icon: 'hard-drive' },
          { id: 'net', x: 780, y: 315, label: '白名单域名 / 阻断外联', tone: 'violet', icon: 'globe' },
        ],
        [
          { from: 'bash', to: 'box', status: 'active', packetCount: 2 },
          { from: 'box', to: 'fs', status: 'active', packetCount: 1 },
          { from: 'box', to: 'net', dashed: true, packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: '清晰认知沙箱边界',
      badge: 'INSIGHT',
      title: '透明边界：内置沙箱隔离 Bash，生产全隔离要加外层容器',
      paragraphs: [
        '架构师必须看清工具边界：Claude Code 的内置沙箱聚焦于隔离不可信的 `Bash` 子进程，而 Hooks、本地 MCP Server 和内置文件工具运行在主进程侧（由 `permissions` 规则保护）。因此在大规模无人值守生产场景，官方推荐将整个 Claude Code 进程放进外层 Docker / DevContainer / 云微虚拟机中双层隔离。',
      ],
      kpis: [
        kpi('内层隔离', 'Bash → bwrap / Seatbelt', 'good'),
        kpi('主进程防护', 'Hooks + deny/ask/allow', 'good'),
        kpi('生产终极态', '外层容器/VM 包裹整进程', 'good'),
      ],
      scene: iso(
        '内层 Bash 沙箱 + 外层容器双层边界',
        [
          { id: 'cc', x: 160, y: 190, label: 'Claude Code 主进程', sublabel: 'Hooks · Permissions · MCP · File Tools', tone: 'violet', size: 'lg', icon: 'cpu' },
          { id: 'sh', x: 560, y: 190, label: 'Bash 内层沙箱', sublabel: 'bwrap / Seatbelt 物理围栏', tone: 'blue', size: 'lg', active: true, icon: 'lock' },
        ],
        [{ from: 'cc', to: 'sh', status: 'active', packetCount: 2, packetLabel: 'spawn' }],
        undefined,
        [{ x: 90, y: 90, w: 760, h: 250, label: '外层生产容器 / DevContainer / Cloud VM', tone: 'green', dashed: true }],
      ),
    },
    {
      shortLabel: '权限复盘',
      badge: 'RECAP',
      title: '权限级联与沙箱复盘',
      paragraphs: [
        'Hooks 先行、deny 一票否决、五档权限按需切换、OS 沙箱收紧 Bash——Claude Code 让个人敏捷开发和企业合规管控得以共存。',
      ],
      recapTable: [
        { question: '多条权限规则冲突时按什么顺序裁决？', decision: 'Hooks → deny → ask → Permission Mode → allow', because: 'deny 一票否决，杜绝宽泛 allow 意外打开安全口子。' },
        { question: '做架构设计前不想让模型乱改文件怎么操作？', decision: 'Shift+Tab 切换到 plan 纯只读模式', because: '从运行时禁止写入与修改命令，先对齐方案再动手。' },
        { question: '如何把弹窗减少 80% 又不裸奔？', decision: '开启 /sandbox（Seatbelt / bwrap）并配合 allow 白名单', because: 'OS 沙箱物理兜底工作区和域名边界，大幅降低人工审批摩擦。' },
      ],
      kpis: [
        kpi('级联序', 'deny > ask > allow', 'good'),
        kpi('运行模式', '5 种秒切', 'good'),
        kpi('Bash 沙箱', 'Seatbelt / bwrap', 'good'),
      ],
      scene: iso('权限复盘', [
        { id: 'a', x: 200, y: 200, label: 'Hooks', tone: 'violet' },
        { id: 'b', x: 500, y: 200, label: 'deny → ask → allow', tone: 'rose', active: true },
        { id: 'c', x: 800, y: 200, label: 'OS Sandbox', tone: 'blue' },
      ], [
        { from: 'a', to: 'b', packetCount: 1 },
        { from: 'b', to: 'c', packetCount: 1 },
      ]),
    },
  ]),
);

// ---------------------------------------------------------------------------
// CH3 · 1/2 · CLAUDE.md 分层记忆与 Auto Memory
// ---------------------------------------------------------------------------
const L_CC_MEMORY = lesson(
  'cc-memory-hierarchy',
  'cc-ch03',
  3,
  '分层记忆与长会话压缩',
  1,
  2,
  'CLAUDE.md 分层记忆与 Auto Memory',
  '每次新开会话都是全新上下文窗口，Claude Code 如何记住团队架构规范、目录局部约定和你上周纠正过的偏好？答案是四层静态记忆 + 自动记忆。',
  9,
  '核心',
  [
    { text: '掌握 CLAUDE.md 从企业级到子目录按需懒加载的四层记忆层次', completedAtStep: 2 },
    { text: '理解 @import 模块化拆分与 .claude/rules/ 路径条件触发规则', completedAtStep: 4 },
    { text: '区分人写的 CLAUDE.md 与模型自维护的 Auto Memory（MEMORY.md）', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: '会话失忆问题',
      badge: 'PROBLEM',
      title: '每新开一次对话，都要重新交代一遍构建命令和代码风格？',
      paragraphs: [
        'LLM 本身是无状态的。如果每个新会话都要反复解释「用 pnpm 别用 npm」「测试跑 `vitest run`」「不要直接修改自动生成文件」，不仅烦人，还会因为人忘说而产出风格割裂的代码。',
        'Claude Code 设计了高度结构化的文件系统记忆层：所有记忆都是**纯 Markdown 文件**，可版本控制、可 Code Review、人类与模型双向可读。',
      ],
      kpis: [
        kpi('记忆载体', '纯文本 Markdown', 'good'),
        kpi('版本化', '随 Git 仓库共享', 'good'),
        kpi('记忆双轨', 'CLAUDE.md + Auto Memory', 'good'),
      ],
      scene: tree(
        'Claude Code 分层记忆加载树',
        [
          { id: 'org', x: 500, y: 55, kind: 'root', label: '1 · 组织托管级 CLAUDE.md', sublabel: '/etc/claude-code/CLAUDE.md（全公司合规基线）', status: 'done' },
          { id: 'usr', x: 240, y: 195, kind: 'service', label: '2 · 用户全局级', sublabel: '~/.claude/CLAUDE.md（个人编码偏好）', parentId: 'org', status: 'done' },
          { id: 'prj', x: 760, y: 195, kind: 'plugin', label: '3 · 项目共享级 + .local', sublabel: 'repo/CLAUDE.md & CLAUDE.local.md', parentId: 'org', status: 'active' },
          { id: 'sub', x: 500, y: 345, kind: 'event', label: '4 · 子目录 CLAUDE.md（按需懒加载！）', sublabel: '仅当 Claude 读取 packages/api/* 时自动载入', parentId: 'prj', status: 'highlight' },
          { id: 'auto', x: 500, y: 465, kind: 'log', label: '5 · Auto Memory (MEMORY.md)', sublabel: 'Claude 自动沉淀的跨会话经验与纠偏', parentId: 'sub', status: 'active' },
        ],
        [
          { from: 'org', to: 'usr' },
          { from: 'org', to: 'prj', animated: true },
          { from: 'prj', to: 'sub', animated: true },
          { from: 'sub', to: 'auto', animated: true },
        ],
      ),
    },
    {
      shortLabel: '按目录懒加载',
      badge: 'TECHNIQUE',
      title: 'Monorepo 救星：子目录 CLAUDE.md 与 paths 条件规则',
      paragraphs: [
        '大型 Monorepo 里同时有前端 React、后端 Go 和移动端 Swift。如果启动时把所有子项目规范全塞进上下文，90% 都是无关噪音。',
        'Claude Code 启动时只向上加载当前目录到根的 `CLAUDE.md`；而**子目录**里的 `CLAUDE.md` 以及 `.claude/rules/*.md`（带 `paths:` frontmatter 匹配）只在模型真正读取或编辑匹配路径的文件时才动态注入！',
      ],
      sourceDrawer: ccSrc(
        '按文件路径条件触发的模块化规则文件',
        '.claude/rules/api-security.md',
        'text',
        `---
paths:
  - "packages/api/src/**/*.ts"
  - "packages/auth/**"
---

# API 与鉴权改动铁律
- 所有新增路由必须挂接 authMiddleware 并校验 Zod Schema。
- 严禁在响应体或日志中打印用户 token / 密码原文。
- 改动完成后运行 \`pnpm --filter @app/api test\` 验证。`,
        '只有当模型触碰 packages/api 或 packages/auth 时，这条规则才会被按需注入上下文。',
      ),
      kpis: [
        kpi('目录懒加载', '读到对应子目录才注入', 'good'),
        kpi('路径匹配', '.claude/rules/ paths:', 'good'),
        kpi('模块化引用', '支持 @path/to/doc.md', 'neutral'),
      ],
      scene: iso(
        'Monorepo 按路径条件懒加载规则',
        [
          { id: 'r1', x: 80, y: 100, label: 'rules/frontend.md', sublabel: 'paths: apps/web/**', tone: 'blue', dimmed: true, icon: 'file-text' },
          { id: 'r2', x: 80, y: 215, label: 'rules/api-security.md', sublabel: 'paths: packages/api/**', tone: 'green', active: true, icon: 'shield' },
          { id: 'r3', x: 80, y: 330, label: 'rules/sql-migration.md', sublabel: 'paths: db/migrations/**', tone: 'orange', dimmed: true, icon: 'database' },
          { id: 'act', x: 540, y: 215, label: '模型 Read("packages/api/src/login.ts")', sublabel: '仅激活 api-security.md，其余零占用！', tone: 'violet', size: 'lg', active: true, icon: 'eye' },
        ],
        [
          { from: 'r2', to: 'act', label: '精准命中注入', status: 'active', packetCount: 2, packetLabel: 'Lazy Load' },
          { from: 'r1', to: 'act', dashed: true, packetCount: 0 },
          { from: 'r3', to: 'act', dashed: true, packetCount: 0 },
        ],
      ),
    },
    {
      shortLabel: 'Auto Memory 机制',
      badge: 'SOLUTION',
      title: 'Auto Memory：Claude 自己记笔记，下次不再犯同样错',
      paragraphs: [
        '除了人类维护的 `CLAUDE.md`，Claude Code 还为每个 Git 仓库维护一份本地自动记忆目录（`~/.claude/projects/<project>/memory/`），其中 `MEMORY.md` 是索引入口（启动时自动加载前 200 行），其余专题笔记按需读取。',
        '当你纠正它「别 mock Redis，测试请用内存 fake」时，它会把这条偏好沉淀到 Auto Memory，并在同一仓库的所有 Git Worktree 之间共享！',
      ],
      kpis: [
        kpi('写入主体', 'Claude 自动维护', 'good'),
        kpi('启动预算', 'MEMORY.md 前 200 行', 'good'),
        kpi('Worktree 共享', '同一仓库全共享', 'good'),
      ],
      scene: iso(
        'CLAUDE.md（人写）× Auto Memory（模型写）双轨对比',
        [
          { id: 'cm', x: 110, y: 205, label: 'CLAUDE.md', sublabel: '团队手工编写 · Git 共享 · 架构与规范红线', tone: 'blue', size: 'lg', active: true, icon: 'file-text' },
          { id: 'am', x: 550, y: 205, label: 'Auto Memory (MEMORY.md)', sublabel: 'Claude 自主总结 · 本地持久 · 跨会话纠偏与踩坑笔记', tone: 'violet', size: 'lg', active: true, icon: 'brain' },
        ],
        [{ from: 'cm', to: 'am', label: '互补协同，共同构建持久化上下文', dotted: true, packetCount: 1 }],
      ),
    },
    {
      shortLabel: '为何控制长度',
      badge: 'INSIGHT',
      title: '记忆工程铁律：CLAUDE.md 越精炼，遵从度越高',
      paragraphs: [
        '把 2000 行百科全书硬塞进 `CLAUDE.md` 是反模式——过长指令会稀释模型注意力，甚至让关键规则被淹没。最佳实践是将根 `CLAUDE.md` 控制在 200 行以内，把详细手册拆到 `.claude/rules/` 或 `Skills` 里按需加载。',
      ],
      kpis: [
        kpi('建议长度', '≤ 200 行精炼索引', 'good'),
        kpi('拆分手段', '@import + rules + skills', 'good'),
        kpi('遵从率', '信噪比越高越稳', 'good'),
      ],
      scene: swim(
        '臃肿指令 vs 精炼分层索引的注意力对比',
        [
          { id: 'bad', label: '2000 行巨型文档', tone: 'rose' },
          { id: 'good', label: '150 行索引 + 按需规则', tone: 'green' },
        ],
        [
          { id: 'x1', laneId: 'bad', start: 4, end: 94, label: '每轮耗费巨量 Token，关键红线被淹没稀释', tone: 'rose', status: 'blocked' },
          { id: 'x2', laneId: 'good', start: 4, end: 28, label: '核心铁律常驻', tone: 'green', status: 'done' },
          { id: 'x3', laneId: 'good', start: 32, end: 54, label: '按路径动态加载专题规则', tone: 'blue', status: 'running' },
        ],
      ),
    },
    {
      shortLabel: '压缩不丢记忆',
      badge: 'INSIGHT',
      title: '抗压缩特性：/compact 后 CLAUDE.md 原文自动重挂',
      paragraphs: [
        '因为 `CLAUDE.md` 属于磁盘事实源而非临时对话消息，即使会话经历了 `/compact` 压缩，Claude Code 也会从磁盘重新载入最新 `CLAUDE.md` 锚点，确保团队规范在 100 轮长任务里始终如一。',
      ],
      kpis: [
        kpi('事实源', '本地磁盘文件', 'good'),
        kpi('热更新', '编辑后重读生效', 'good'),
        kpi('抗压缩', '压缩后自动重挂', 'good'),
      ],
      scene: iso(
        '磁盘 CLAUDE.md 在压缩后的重挂机制',
        [
          { id: 'disk', x: 100, y: 210, label: '磁盘 CLAUDE.md', tone: 'blue', size: 'lg', icon: 'hard-drive' },
          { id: 'cmp', x: 430, y: 210, label: '/compact 压缩重建', tone: 'orange', size: 'lg', active: true, icon: 'refresh-cw' },
          { id: 'ctx', x: 760, y: 210, label: '新上下文（规范零丢失）', tone: 'green', size: 'lg', icon: 'check-circle' },
        ],
        [
          { from: 'disk', to: 'cmp', label: '重新读取原文', status: 'active', packetCount: 1 },
          { from: 'cmp', to: 'ctx', status: 'active', packetCount: 2 },
        ],
      ),
    },
    {
      shortLabel: '记忆复盘',
      badge: 'RECAP',
      title: '分层记忆体系复盘',
      paragraphs: [
        'Claude Code 证明了「纯 Markdown + 分层路径按需加载 + 自动笔记索引」就能构建出比复杂向量记忆更透明、更可控的工程级长期记忆。',
      ],
      recapTable: [
        { question: 'Monorepo 里如何避免无关目录的规范污染上下文？', decision: '子目录 CLAUDE.md 与 .claude/rules/ 按 paths 懒加载', because: '模型只接触与当前改动文件直接相关的规则。' },
        { question: 'CLAUDE.md 和 Auto Memory 分工有何不同？', decision: '前者是人写并随 Git 共享的硬规范，后者是模型沉淀的本地个人经验', because: '兼顾团队统一标准与个人开发习惯自适应。' },
        { question: '为什么根目录 CLAUDE.md 要保持精短？', decision: '控制在 200 行以内，其余拆到按需规则或 Skills', because: '高信噪比直接提升模型指令遵从率。' },
      ],
      kpis: [
        kpi('记忆层级', '5 层互补', 'good'),
        kpi('加载策略', '祖先预载 + 子目录懒载', 'good'),
        kpi('可审计性', '100% 纯文本', 'good'),
      ],
      scene: iso('记忆复盘', [
        { id: 'a', x: 200, y: 200, label: 'CLAUDE.md', tone: 'blue' },
        { id: 'b', x: 500, y: 200, label: 'rules (paths)', tone: 'green', active: true },
        { id: 'c', x: 800, y: 200, label: 'MEMORY.md', tone: 'violet' },
      ], [
        { from: 'a', to: 'b', packetCount: 1 },
        { from: 'b', to: 'c', packetCount: 1 },
      ]),
    },
  ]),
);

// ---------------------------------------------------------------------------
// CH3 · 2/2 · /compact 上下文压缩与 PreCompact 锚点重注入
// ---------------------------------------------------------------------------
const L_CC_COMPACT = lesson(
  'cc-compact-recovery',
  'cc-ch03',
  3,
  '分层记忆与长会话压缩',
  2,
  2,
  '/compact 压缩机制与 PreCompact 锚点重注入',
  '当上下文逼近满窗，Claude Code 通过「微压缩清理旧工具输出 → 完整摘要压缩 → 钩子重注入关键锚点」三步实现长程不失忆。',
  9,
  '进阶',
  [
    { text: '理解微压缩（清理陈旧工具输出）与完整 /compact 摘要的渐进层次', completedAtStep: 2 },
    { text: '学会用 /compact <focus> 引导摘要保留最关键的技术上下文', completedAtStep: 4 },
    { text: '掌握利用 PreCompact 与 SessionStart(compact) Hook 锁死核心状态', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: '上下文腐烂',
      badge: 'PROBLEM',
      title: '还没撞上限，但模型在 80% 满窗时已经开始变迟钝',
      paragraphs: [
        '长对话最大的敌人不仅是 100% 溢出报错，更是「上下文腐烂（Context Rot）」：前面 20 轮已经读完并过时的巨型测试日志、文件全文持续占据 150K Token，导致模型推理质量明显下降。',
      ],
      kpis: [
        kpi('第一道防线', '微压缩清理旧工具输出', 'good'),
        kpi('第二道防线', '自动 / 手动 /compact', 'good'),
        kpi('第三道防线', 'Subagent 分治防污染', 'good'),
      ],
      scene: iso(
        'Claude Code 三级上下文预算防线',
        [
          { id: 'l1', x: 80, y: 210, label: '1 · 微压缩', sublabel: '优先清除陈旧大块工具输出', tone: 'blue', size: 'lg', icon: 'layers' },
          { id: 'l2', x: 420, y: 210, label: '2 · Auto / 手动 Compact', sublabel: '提炼结构化摘要 + 重挂 CLAUDE.md', tone: 'orange', size: 'lg', active: true, icon: 'refresh-cw' },
          { id: 'l3', x: 760, y: 210, label: '3 · PreCompact / SessionStart', sublabel: 'Hook 注入 Git 分支/任务清单锚点', tone: 'green', size: 'lg', active: true, icon: 'plug' },
        ],
        [
          { from: 'l1', to: 'l2', label: '仍接近阈值', status: 'active', packetCount: 1 },
          { from: 'l2', to: 'l3', label: '压缩后恢复锚点', status: 'active', packetCount: 2, packetLabel: 'Re-inject' },
        ],
      ),
    },
    {
      shortLabel: '聚焦压缩指令',
      badge: 'TECHNIQUE',
      title: '/compact <自定义焦点> + CLAUDE.md 压缩指引',
      paragraphs: [
        '工程师在阶段切换（例如「架构调研结束，准备动手写代码」）时，可以主动输入 `/compact 保留 API 鉴权改造方案、已修改文件路径和失败用例，丢弃早期探索日志`，或者直接在 `CLAUDE.md` 中写一段 `Compact Instructions`，永久指定每次自动压缩时必须保留哪些字段。',
      ],
      sourceDrawer: ccSrc(
        '利用 SessionStart(compact) Hook 压缩后自动重注入实时工作现场',
        '.claude/settings.json',
        'json',
        `{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "compact",
        "hooks": [
          {
            "type": "command",
            "command": "echo '当前分支:' $(git branch --show-current) && git status -s"
          }
        ]
      }
    ]
  }
}`,
        '每次压缩完成后，SessionStart(matcher: "compact") 自动把最新 Git 分支与改动文件清单注入上下文！',
      ),
      kpis: [
        kpi('手动聚焦', '/compact <focus>', 'good'),
        kpi('触发 Hook', 'SessionStart(compact)', 'good'),
        kpi('现场还原', '自动重注入 git 状态', 'good'),
      ],
      scene: swim(
        '自动压缩与 SessionStart(compact) 锚点重注入时序',
        [
          { id: 'ctx', label: '上下文窗口', tone: 'blue' },
          { id: 'cmp', label: 'Compactor', tone: 'orange' },
          { id: 'hk', label: 'Hooks', tone: 'violet' },
        ],
        [
          { id: 'a1', laneId: 'ctx', start: 4, end: 28, label: '达到自动压缩阈值 (~95%)', tone: 'rose', status: 'blocked' },
          { id: 'a2', laneId: 'hk', start: 30, end: 44, label: 'PreCompact 备份关键现场', tone: 'violet', status: 'done' },
          { id: 'a3', laneId: 'cmp', start: 46, end: 72, label: '生成结构化摘要 + 重读 CLAUDE.md', tone: 'orange', status: 'done' },
          { id: 'a4', laneId: 'hk', start: 74, end: 95, label: 'SessionStart(compact) 注入最新 git/TODO', tone: 'green', status: 'running' },
        ],
      ),
    },
    {
      shortLabel: '何时 /clear 优于 /compact',
      badge: 'INSIGHT',
      title: '切换无关任务时，果断 /clear 而不是 /compact',
      paragraphs: [
        '压缩是为了在同一项长任务中延续上下文；如果上一个需求已经 PR 合并，准备做完全不相关的新功能，强行 `/compact` 只会把旧任务的残留噪音带进新任务。此时 `/clear` 一键归零对话、保留 `CLAUDE.md`，模型注意力回到 100% 巅峰！',
      ],
      kpis: [
        kpi('同一长任务', '/compact 延续现场', 'good'),
        kpi('切换新任务', '/clear 彻底清零', 'good'),
        kpi('大范围探索', '派 Subagent 隔离噪音', 'good'),
      ],
      scene: iso(
        '/compact vs /clear vs Subagent 场景决策',
        [
          { id: 's1', x: 80, y: 100, label: '同一长任务阶段切换', tone: 'orange', icon: 'refresh-cw' },
          { id: 's2', x: 80, y: 215, label: '开始全新独立需求', tone: 'blue', icon: 'layers' },
          { id: 's3', x: 80, y: 330, label: '翻阅 30 个文件做调研', tone: 'violet', icon: 'git-branch' },
          { id: 'd1', x: 540, y: 100, label: '→ /compact <focus>', tone: 'orange', active: true, icon: 'check-circle' },
          { id: 'd2', x: 540, y: 215, label: '→ /clear', tone: 'blue', active: true, icon: 'check-circle' },
          { id: 'd3', x: 540, y: 330, label: '→ 派 Task Subagent 隔窗探索', tone: 'violet', active: true, icon: 'users' },
        ],
        [
          { from: 's1', to: 'd1', packetCount: 1 },
          { from: 's2', to: 'd2', packetCount: 1 },
          { from: 's3', to: 'd3', status: 'active', packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: '全量 Transcript 落盘',
      badge: 'TECHNIQUE',
      title: '压缩不丢原始账本：JSONL Transcript 永久保留',
      paragraphs: [
        '和 DSH、Pi 一样，Claude Code 的本地会话 Transcript 同样持久化在 `~/.claude/projects/` 的 JSONL 文件中。压缩只改变后续发送给 API 的上下文视图，任何时候都可以通过 `claude --resume` 找回历史会话。',
      ],
      kpis: [
        kpi('本地记录', '~/.claude/projects/*.jsonl', 'neutral'),
        kpi('恢复命令', 'claude --resume / --continue', 'good'),
        kpi('物理损失', '0', 'good'),
      ],
      scene: iso(
        '物理 Transcript 与压缩视图分离',
        [
          { id: 'log', x: 100, y: 210, label: '本地 JSONL Transcript', sublabel: '完整记录每一轮原始消息与工具输出', tone: 'dark', size: 'lg', icon: 'hard-drive' },
          { id: 'view', x: 560, y: 210, label: 'API 上下文视图', sublabel: '压缩后轻装上阵，支持随时 --resume', tone: 'green', size: 'lg', active: true, icon: 'brain' },
        ],
        [{ from: 'log', to: 'view', label: '投影压缩视图', status: 'active', packetCount: 1 }],
      ),
    },
    {
      shortLabel: '防失忆清单',
      badge: 'INSIGHT',
      title: '把任务进度写进文件，比指望上下文记忆更靠谱',
      paragraphs: [
        '高阶 Claude Code 工作流常常结合 `PLAN.md` 或内置 Task 清单工具：把已完成步骤、验证命令和剩余风险外化到持久载体里，即使压缩三次，模型重新读一眼清单就能秒速接续。',
      ],
      kpis: [
        kpi('外化记忆', 'Task List / PLAN.md', 'good'),
        kpi('跨压缩延续', '100% 稳定', 'good'),
        kpi('可中断恢复', '随时暂停第二天接着跑', 'good'),
      ],
      scene: iso(
        '外化计划文件作为跨压缩锚点',
        [
          { id: 'p', x: 120, y: 210, label: '外化状态 (Task / PLAN.md)', tone: 'green', size: 'lg', active: true, icon: 'file-text' },
          { id: 'c', x: 560, y: 210, label: '压缩后的新上下文窗口', sublabel: '一句话读回完整进度与待办', tone: 'blue', size: 'lg', icon: 'refresh-cw' },
        ],
        [{ from: 'p', to: 'c', status: 'active', packetCount: 1, packetLabel: '秒速恢复' }],
      ),
    },
    {
      shortLabel: '压缩复盘',
      badge: 'RECAP',
      title: '长会话压缩与恢复复盘',
      paragraphs: [
        '上下文窗口是 Agent 最宝贵的稀缺内存。微压缩 + 聚焦 `/compact` + `SessionStart(compact)` 钩子重注入 + 外化计划，构成了长程开发的完整内存管理法。',
      ],
      recapTable: [
        { question: '自动压缩后如何保证不丢当前 Git 分支与待办？', decision: '用 SessionStart(matcher: "compact") Hook 自动重注入', because: '用确定性命令把实时工作现场钉回压缩后的上下文。' },
        { question: '什么时候该用 /clear 而不是 /compact？', decision: '完成旧任务切换全新无关需求时用 /clear', because: '彻底清除历史噪音，避免上下文腐烂拖累新任务。' },
        { question: '怎样减少触发压缩的频率？', decision: '把大范围只读探索交给独立上下文的 Subagent', because: '探索过程中的几十万 Token 不会污染主窗口！' },
      ],
      kpis: [
        kpi('三级防线', '微压缩/Compact/Hook', 'good'),
        kpi('防腐烂', '/clear + Subagent', 'good'),
        kpi('规范保活', 'CLAUDE.md 自动重挂', 'good'),
      ],
      scene: iso('压缩复盘', [
        { id: 'a', x: 200, y: 200, label: '微压缩', tone: 'blue' },
        { id: 'b', x: 500, y: 200, label: '/compact', tone: 'orange', active: true },
        { id: 'c', x: 800, y: 200, label: 'Hook 重注入', tone: 'green' },
      ], [
        { from: 'a', to: 'b', packetCount: 1 },
        { from: 'b', to: 'c', packetCount: 1 },
      ]),
    },
  ]),
);

// ---------------------------------------------------------------------------
// CH4 · 1/2 · Task Subagent 独立上下文分治
// ---------------------------------------------------------------------------
const L_CC_SUBAGENT = lesson(
  'cc-subagent-delegation',
  'cc-ch04',
  4,
  'Subagent 分治与 Worktree 隔离',
  1,
  2,
  'Subagent 分治：独立上下文窗口与结论收敛',
  'Claude Code 处理复杂仓库的终极上下文管理术：把高噪音代码探索、安全审查或专项测试委派给独立上下文的 Subagent，只把精炼结论带回主循环。',
  11,
  '进阶',
  [
    { text: '理解 Subagent 为何是「上下文窗口隔离器」而非单纯并行器', completedAtStep: 2 },
    { text: '掌握 .claude/agents/*.md 自定义专家 Subagent 的工具裁剪与模型异构配置', completedAtStep: 4 },
    { text: '了解 Subagent 禁止无限递归嵌套与父级 Hooks 继承机制', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: '主窗口被探索淹没',
      badge: 'PROBLEM',
      title: '为了修 10 行 Bug，先读了 35 个文件——主上下文瞬间爆掉',
      paragraphs: [
        '排查跨模块 Bug 时，模型往往要翻遍 30 个源码文件、跑 5 次日志搜索，最终才锁定真正相关的 2 个函数。如果这 30 个文件的全文全留在主对话窗口，主 Agent 还没开始写代码就已经背负了 100K 噪音 Token！',
        'Claude Code 通过 **Subagent（Agent / Task 工具）** 破局：主 Agent 派发一个带全新空上下文窗口的子 Agent 去翻完这 30 个文件，子 Agent 跑完后把 100K 中间过程就地销毁，**只向主循环回传 500 字精炼定位报告**！',
      ],
      callout: {
        kind: 'idea',
        title: 'Subagent 的第一性原理：上下文防火墙',
        text: '它把「高噪音探索过程」封在一次性子窗口里，让主 Agent 的上下文永远保持高信噪比、高专注度。',
      },
      kpis: [
        kpi('上下文关系', '完全独立空窗口', 'good'),
        kpi('回传内容', '仅精炼最终结论', 'good'),
        kpi('支持并行', '可同时派多个探索子代理', 'good'),
      ],
      scene: iso(
        '主 Agent 通过 Subagent 隔离探索噪音',
        [
          { id: 'main', x: 80, y: 215, label: '主 Agent（主窗口）', sublabel: '保持干净架构决策与改码上下文', tone: 'orange', size: 'lg', active: true, icon: 'brain' },
          { id: 's1', x: 520, y: 95, label: 'Explore Subagent A', sublabel: '独立窗口读 25 个前端文件（80K 噪音就地释放）', tone: 'blue', size: 'lg', active: true, icon: 'users' },
          { id: 's2', x: 520, y: 325, label: 'Review Subagent B', sublabel: '独立窗口核查安全与单测（只读工具集）', tone: 'violet', size: 'lg', icon: 'shield' },
        ],
        [
          { from: 'main', to: 's1', label: '委派探索任务', status: 'active', packetCount: 1 },
          { from: 's1', to: 'main', label: '回传 500 字精炼结论', status: 'active', packetCount: 2, packetLabel: 'Summary' },
          { from: 'main', to: 's2', label: '委派审查', dashed: true, packetCount: 1 },
          { from: 's2', to: 'main', label: '回传审查清单', dashed: true, packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: '自定义专家 Subagent',
      badge: 'TECHNIQUE',
      title: '.claude/agents/*.md：用一份 Markdown 声明专属角色、工具与模型',
      paragraphs: [
        '除了内置的 `Explore`（高速只读检索，默认可用轻量快速模型）和 `Plan` 子代理，团队可以在 `.claude/agents/` 目录下用 YAML Frontmatter + Prompt 自由定义领域专家（例如 `security-reviewer.md`、`db-migrator.md`），精确指定它能用的 `tools` 白名单和专属 `model`！',
      ],
      sourceDrawer: ccSrc(
        '声明一个只读安全审查 Subagent',
        '.claude/agents/security-reviewer.md',
        'text',
        `---
name: security-reviewer
description: 审查 PR diff 中的鉴权漏洞、SQL 注入与密钥泄漏风险
tools: Read, Grep, Glob, Bash
disallowedTools: Edit, Write
model: sonnet
---

你是一名专注应用安全的资深代码审查员。
1. 使用 \`git diff\` 获取本次全部变更。
2. 逐项检查输入校验、越权访问、命令注入与敏感信息日志。
3. 只输出按严重级别排序的精炼问题清单与具体文件行号。`,
        '通过 tools / disallowedTools 与 model 实现「最小权限 + 异构模型成本优化」。',
      ),
      kpis: [
        kpi('定义方式', 'YAML Frontmatter + Prompt', 'good'),
        kpi('权限裁剪', 'tools / disallowedTools', 'good'),
        kpi('模型异构', '探索用 Haiku/Sonnet，主控用 Opus', 'good'),
      ],
      scene: tree(
        '内置与自定义 Subagent 角色家族',
        [
          { id: 'r', x: 500, y: 60, kind: 'root', label: '主循环 (Master Agent)', status: 'active' },
          { id: 'e', x: 180, y: 245, kind: 'service', label: 'Explore (内置只读)', sublabel: '快速搜库 · 低延迟模型', parentId: 'r', status: 'done' },
          { id: 'p', x: 500, y: 245, kind: 'plugin', label: 'Plan (内置规划)', sublabel: '只读调研 · 输出实施方案', parentId: 'r', status: 'done' },
          { id: 'c', x: 820, y: 245, kind: 'event', label: '.claude/agents/*.md', sublabel: '团队定制专家（裁剪工具 + 专属 Prompt）', parentId: 'r', status: 'active' },
        ],
        [
          { from: 'r', to: 'e', animated: true },
          { from: 'r', to: 'p' },
          { from: 'r', to: 'c', animated: true },
        ],
      ),
    },
    {
      shortLabel: '防递归爆炸',
      badge: 'SOLUTION',
      title: '硬约束：Subagent 不可无限递归派生子 Subagent',
      paragraphs: [
        '多 Agent 系统最怕「A 调 B、B 调 C、C 调 D」形成失控的 Token 黑洞与死循环。Claude Code 刻意采用**扁平两层拓扑**：Subagent 内部不再拥有再次派生子 Agent 的无限嵌套能力，全部协调收口回单一主循环，成本与状态一眼可见！',
      ],
      kpis: [
        kpi('层级深度', '严格 2 层（主 → 子）', 'good'),
        kpi('递归失控', '结构性免疫', 'good'),
        kpi('Hooks 监管', '携带 agent_id 向上受父 Hook 管辖', 'good'),
      ],
      scene: swim(
        '主 Agent 并行派发 3 个独立 Subagent 再汇总',
        [
          { id: 'm', label: '主 Agent', tone: 'orange' },
          { id: 's1', label: 'Subagent #1 (API)', tone: 'blue' },
          { id: 's2', label: 'Subagent #2 (UI)', tone: 'green' },
          { id: 's3', label: 'Subagent #3 (Test)', tone: 'violet' },
        ],
        [
          { id: 'm1', laneId: 'm', start: 4, end: 18, label: '拆解并并行派发 3 个任务', tone: 'orange', status: 'done' },
          { id: 'a1', laneId: 's1', start: 20, end: 64, label: '独立窗口排查后端', tone: 'blue', status: 'parallel' },
          { id: 'a2', laneId: 's2', start: 20, end: 56, label: '独立窗口排查前端', tone: 'green', status: 'parallel' },
          { id: 'a3', laneId: 's3', start: 20, end: 70, label: '独立窗口跑回归用例', tone: 'violet', status: 'parallel' },
          { id: 'm2', laneId: 'm', start: 74, end: 96, label: '汇总 3 份精炼报告 → 精准决策', tone: 'orange', status: 'running' },
        ],
      ),
    },
    {
      shortLabel: '安全监管穿透',
      badge: 'INSIGHT',
      title: '子 Agent 逃不出父级安全网：agent_id 与 SubagentStop',
      paragraphs: [
        '和 DSH 的 `dsh-scope` 向上冒泡理念异曲同工：Claude Code 里子 Agent 执行工具时，父级 `settings.json` 定义的 `PreToolUse` Hooks 与 `deny` 规则**完全继承生效**，并在事件 JSON 里附带 `agent_id` 与 `agent_type` 供审计区分；子 Agent 结束时还会触发 `SubagentStop` 钩子做收口校验。',
      ],
      kpis: [
        kpi('安全继承', '父级 deny 与 Hooks 全生效', 'good'),
        kpi('可审计标识', 'agent_id + agent_type', 'good'),
        kpi('收口钩子', 'SubagentStop', 'neutral'),
      ],
      scene: iso(
        'Subagent 安全监管继承机制',
        [
          { id: 'sub', x: 90, y: 210, label: 'Subagent 工具调用', sublabel: '携带 agent_id & agent_type', tone: 'violet', size: 'lg', icon: 'users' },
          { id: 'hk', x: 430, y: 210, label: '父级 PreToolUse & deny 门', sublabel: '绝不允许子 Agent 绕过组织红线', tone: 'rose', size: 'lg', active: true, icon: 'shield' },
          { id: 'end', x: 770, y: 210, label: 'SubagentStop 校验收敛', tone: 'green', size: 'lg', icon: 'check-circle' },
        ],
        [
          { from: 'sub', to: 'hk', status: 'active', packetCount: 2, packetLabel: 'agent_id' },
          { from: 'hk', to: 'end', status: 'active', packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: '后台异步子代理',
      badge: 'TECHNIQUE',
      title: 'Foreground vs Background Subagent',
      paragraphs: [
        '对于耗时较长的文档生成、全量测试分析或日志扫描，Subagent 还支持在后台异步运行，完成后主动通知主循环，让人类和主 Agent 不必干等。',
      ],
      kpis: [
        kpi('前台同步', '立即等待精炼结论', 'neutral'),
        kpi('后台异步', '不阻塞主对话继续推进', 'good'),
        kpi('上下文隔离', '同样完全隔离', 'good'),
      ],
      scene: iso(
        '前台同步 vs 后台异步 Subagent',
        [
          { id: 'fg', x: 110, y: 120, label: 'Foreground Subagent', sublabel: '主循环阻塞等待结论 → 适合强依赖调研', tone: 'blue', size: 'lg', icon: 'clock' },
          { id: 'bg', x: 110, y: 315, label: 'Background Subagent', sublabel: '后台独立跑完后异步通知 → 适合长耗时扫描', tone: 'green', size: 'lg', active: true, icon: 'refresh-cw' },
          { id: 'm', x: 560, y: 215, label: '主循环按需汇合结论', tone: 'orange', size: 'lg', icon: 'brain' },
        ],
        [
          { from: 'fg', to: 'm', packetCount: 1 },
          { from: 'bg', to: 'm', status: 'active', dashed: true, packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: 'Subagent 复盘',
      badge: 'RECAP',
      title: 'Subagent 分治复盘',
      paragraphs: [
        'Subagent 不是为了堆砌花哨的「角色扮演群聊」，而是用严格两层隔离解决上下文污染、工具最小权限与异构模型成本优化三大真问题。',
      ],
      recapTable: [
        { question: 'Subagent 最核心的价值是什么？', decision: '作为上下文防火墙，把海量探索噪音关在独立子窗口里', because: '主窗口只接收精炼结论，长程推理质量大幅提升。' },
        { question: '如何防止多 Agent 无限递归烧干预算？', decision: '强制扁平两层拓扑，禁止子代理再无限嵌套派生', because: '成本、延迟和状态汇聚全部可控。' },
        { question: '如何用 Subagent 同时省钱又提速？', decision: '为只读探索子代理指定轻量快模型，主架构决策留给旗舰模型', because: '把最贵的推理算力花在刀刃上。' },
      ],
      kpis: [
        kpi('拓扑结构', '严格 2 层扁平', 'good'),
        kpi('配置格式', '.claude/agents/*.md', 'good'),
        kpi('噪音隔离', '100% 独立窗口', 'good'),
      ],
      scene: iso('Subagent 复盘', [
        { id: 'a', x: 200, y: 200, label: 'Master Loop', tone: 'orange', active: true },
        { id: 'b', x: 520, y: 120, label: 'Explore Subagent', tone: 'blue' },
        { id: 'c', x: 520, y: 280, label: 'Reviewer Subagent', tone: 'violet' },
      ], [
        { from: 'a', to: 'b', packetCount: 1 },
        { from: 'a', to: 'c', packetCount: 1 },
      ]),
    },
  ]),
);

// ---------------------------------------------------------------------------
// CH4 · 2/2 · Git Worktree 并行隔离与团队工程流
// ---------------------------------------------------------------------------
const L_CC_WORKTREE = lesson(
  'cc-worktree-isolation',
  'cc-ch04',
  4,
  'Subagent 分治与 Worktree 隔离',
  2,
  2,
  'Git Worktree 并行隔离与团队工作流',
  '多个并行 Agent 如果共享同一个工作目录，改文件立刻互相打架。Claude Code 原生集成 Git Worktree 隔离，让每个会话和 Subagent 拥有独立工作树与分支。',
  9,
  '进阶',
  [
    { text: '理解多个写盘 Agent 共享工作目录时的文件系统竞态问题', completedAtStep: 2 },
    { text: '掌握 isolation: worktree 与 claude --worktree 的目录隔离机制', completedAtStep: 4 },
    { text: '了解 WorktreeCreate / WorktreeRemove Hooks 如何自动预热依赖环境', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: '目录写冲突',
      badge: 'PROBLEM',
      title: '两个 Agent 同时改代码跑测试，互相覆盖还踩坏 git staging',
      paragraphs: [
        '只读探索 Subagent 可以放心共享同一目录并行跑；但一旦两个子任务都要**修改文件、切换分支或跑构建测试**，共享同一个工作目录立刻灾难爆发：A 刚改完 `index.ts`，B 的 `git checkout` 或格式化脚本直接把它踩烂！',
        'Claude Code 直接借用 Git 原生能力：**`git worktree`**——共享同一份 `.git` 对象库（秒级创建、几乎不占磁盘），却给每个 Agent 分配完全独立的物理目录与分支！',
      ],
      kpis: [
        kpi('隔离方式', 'Git Worktree 独立目录', 'good'),
        kpi('启动命令', 'claude --worktree <name>', 'good'),
        kpi('子代理配置', 'isolation: worktree', 'good'),
      ],
      scene: iso(
        '同一仓库下的多 Worktree 并行隔离',
        [
          { id: 'git', x: 100, y: 215, label: '共享 .git 对象库', sublabel: '秒级检出 · 零重复克隆', tone: 'dark', size: 'lg', icon: 'database' },
          { id: 'w1', x: 520, y: 85, label: '主工作树 (main)', sublabel: '人类或主 Agent 正常开发', tone: 'blue', size: 'lg', icon: 'git-branch' },
          { id: 'w2', x: 520, y: 215, label: 'Worktree A (feat/auth)', sublabel: 'Subagent A 独立改码 + 跑单测', tone: 'green', size: 'lg', active: true, icon: 'users' },
          { id: 'w3', x: 520, y: 345, label: 'Worktree B (fix/cache)', sublabel: 'Subagent B 独立修 Bug + 提 PR', tone: 'violet', size: 'lg', active: true, icon: 'users' },
        ],
        [
          { from: 'git', to: 'w1', packetCount: 1 },
          { from: 'git', to: 'w2', status: 'active', packetCount: 2, packetLabel: '独立目录' },
          { from: 'git', to: 'w3', status: 'active', packetCount: 2, packetLabel: '独立目录' },
        ],
      ),
    },
    {
      shortLabel: 'Subagent 声明隔离',
      badge: 'TECHNIQUE',
      title: '一行 isolation: worktree 让子 Agent 安全并行改代码',
      paragraphs: [
        '在自定义 Subagent 定义中加上 `isolation: worktree`，Claude Code 在启动该子 Agent 时自动创建临时 Git Worktree 和独立分支。如果子 Agent 最终没有产生任何修改，退出时自动清理目录；如果有提交，则返回分支名和工作树路径供主 Agent 或人类审阅合并！',
      ],
      sourceDrawer: ccSrc(
        '带 Worktree 隔离的并行编码 Subagent 配置',
        '.claude/agents/feature-worker.md',
        'text',
        `---
name: feature-worker
description: 在独立 Git Worktree 中完成子模块编码与单元测试
isolation: worktree
tools: Read, Edit, Write, Bash, Grep, Glob
---

你在专属的隔离 Worktree 分支中工作，不会干扰主工作区。
完成后请确保本地测试全部通过，并汇报改动摘要与分支名。`,
        '一行 isolation: worktree，即可把危险的并发文件写入变成完全隔离的分支并行开发。',
      ),
      kpis: [
        kpi('零变更回收', '自动清理临时 Worktree', 'good'),
        kpi('有变更保留', '返回分支名与路径', 'good'),
        kpi('主工作区干扰', '0', 'good'),
      ],
      scene: swim(
        'Worktree 隔离 Subagent 完整生命周期',
        [
          { id: 'wt', label: 'Worktree 生命周期', tone: 'blue' },
          { id: 'hk', label: 'Worktree Hooks', tone: 'violet' },
          { id: 'ag', label: 'Subagent 执行', tone: 'green' },
        ],
        [
          { id: 'a1', laneId: 'wt', start: 4, end: 22, label: 'git worktree add', tone: 'blue', status: 'done' },
          { id: 'a2', laneId: 'hk', start: 24, end: 42, label: 'WorktreeCreate（拷贝 .env / 链接依赖）', tone: 'violet', status: 'done' },
          { id: 'a3', laneId: 'ag', start: 44, end: 78, label: '独立编码 + 跑完整单测 + commit', tone: 'green', status: 'running' },
          { id: 'a4', laneId: 'wt', start: 80, end: 96, label: '有改动留分支 / 无改动自动清理', tone: 'orange', status: 'done' },
        ],
      ),
    },
    {
      shortLabel: 'WorktreeCreate Hook',
      badge: 'SOLUTION',
      title: 'WorktreeCreate Hook：解决新工作树缺 node_modules 的痛点',
      paragraphs: [
        '新切出的 `git worktree` 默认不含被 `.gitignore` 忽略的 `node_modules` 或本地测试配置。借助 `WorktreeCreate` 生命周期 Hook，团队可以自动软链依赖或复制非敏感本地配置，让隔离出来的子 Agent 一秒就能跑 `pnpm test`！',
      ],
      kpis: [
        kpi('初始化钩子', 'WorktreeCreate', 'good'),
        kpi('销毁钩子', 'WorktreeRemove', 'neutral'),
        kpi('环境就绪', '全自动零手工', 'good'),
      ],
      scene: iso(
        'WorktreeCreate 自动预热依赖环境',
        [
          { id: 'cr', x: 80, y: 210, label: '新建 Worktree 目录', tone: 'blue', size: 'lg', icon: 'git-branch' },
          { id: 'hk', x: 420, y: 210, label: 'WorktreeCreate Hook', sublabel: 'pnpm install --offline / 初始化本地配置', tone: 'violet', size: 'lg', active: true, icon: 'plug' },
          { id: 'rd', x: 760, y: 210, label: '开箱可测的独立工作树', tone: 'green', size: 'lg', icon: 'check-circle' },
        ],
        [
          { from: 'cr', to: 'hk', status: 'active', packetCount: 1 },
          { from: 'hk', to: 'rd', status: 'active', packetCount: 2, packetLabel: 'Ready' },
        ],
      ),
    },
    {
      shortLabel: '共享 Auto Memory',
      badge: 'INSIGHT',
      title: '代码目录隔离，但 Auto Memory 跨 Worktree 共享',
      paragraphs: [
        '细心设计体现在细节里：虽然每个 Worktree 的源码文件互相物理隔离，但 Claude Code 通过识别共同的 Git 仓库根，把 `MEMORY.md`（Auto Memory）跨所有 Worktree 共享——在一个分支学到的构建坑点，另一个分支立刻知道！',
      ],
      kpis: [
        kpi('文件系统', '按 Worktree 强隔离', 'good'),
        kpi('经验记忆', '按仓库跨 Worktree 共享', 'good'),
        kpi('重复踩坑', '大幅减少', 'good'),
      ],
      scene: iso(
        '代码隔离 × 记忆共享的精妙平衡',
        [
          { id: 'w1', x: 110, y: 110, label: 'Worktree A 代码目录', tone: 'green', icon: 'git-branch' },
          { id: 'w2', x: 110, y: 315, label: 'Worktree B 代码目录', tone: 'blue', icon: 'git-branch' },
          { id: 'mem', x: 560, y: 210, label: '共享 Auto Memory (MEMORY.md)', sublabel: '同一 Git Repo 下所有 Worktree 互通经验', tone: 'violet', size: 'lg', active: true, icon: 'brain' },
        ],
        [
          { from: 'w1', to: 'mem', status: 'active', packetCount: 1 },
          { from: 'w2', to: 'mem', status: 'active', packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: '无头 CI 与 Agent SDK',
      badge: 'TECHNIQUE',
      title: 'claude -p + Agent SDK：把终端助手变成自动化流水线节点',
      paragraphs: [
        '在 GitHub Actions 或后台服务里，通过 `claude -p "<prompt>" --output-format stream-json` 或官方 Claude Agent SDK，可以把整套单主循环、Hooks、MCP、Subagent 和 Worktree 能力无缝嵌入自动化 PR 审查、故障自愈与批量代码迁移。',
      ],
      kpis: [
        kpi('无头模式', 'claude -p --output-format json', 'good'),
        kpi('编程集成', 'Claude Agent SDK (TS/Py)', 'good'),
        kpi('能力复用', '100% 复用 Hooks/MCP/Agents', 'good'),
      ],
      scene: iso(
        'Claude Code 多形态部署架构',
        [
          { id: 'eng', x: 380, y: 210, label: 'Claude Code Core Engine', sublabel: 'Master Loop · Hooks · MCP · Subagent', tone: 'orange', size: 'lg', active: true, icon: 'cpu' },
          { id: 'cli', x: 70, y: 100, label: '本地终端 CLI', tone: 'blue', icon: 'terminal' },
          { id: 'ide', x: 70, y: 320, label: 'VS Code / JetBrains', tone: 'violet', icon: 'layers' },
          { id: 'ci', x: 740, y: 100, label: 'CI / GitHub Actions', sublabel: 'claude -p 无头流式输出', tone: 'green', icon: 'globe' },
          { id: 'sdk', x: 740, y: 320, label: 'Claude Agent SDK', sublabel: '嵌入自有业务与后台服务', tone: 'blue', icon: 'package' },
        ],
        [
          { from: 'cli', to: 'eng', packetCount: 1 },
          { from: 'ide', to: 'eng', packetCount: 1 },
          { from: 'eng', to: 'ci', status: 'active', packetCount: 1 },
          { from: 'eng', to: 'sdk', status: 'active', packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: 'Claude Code 复盘',
      badge: 'RECAP',
      title: 'Claude Code 架构全景复盘',
      paragraphs: [
        '单主循环释放模型上限，Hooks + 权限级联守住确定性底线，`CLAUDE.md` 懒加载构建团队记忆，Subagent + Worktree 实现安全并行分治——四根支柱浑然一体。',
      ],
      recapTable: [
        { question: 'Claude Code 如何在极简循环上实现企业级可控？', decision: '单主循环 + 确定性 Hooks + deny>ask>allow 权限级联', because: '把概率推理留给模型，把确定性规则交给进程外代码与权限引擎。' },
        { question: '多个并行改码 Agent 如何互不干扰？', decision: 'isolation: worktree 配合 WorktreeCreate Hook 自动预热环境', because: '原生 Git Worktree 秒级提供独立物理目录与分支。' },
        { question: '与 DSH、Codex 相比，Claude Code 最鲜明的特色是？', decision: '极致的「概率指导 vs 确定性 Hooks」分离 + Subagent 上下文防火墙', because: '团队无需改内核源码，仅靠 Markdown + JSON + Shell Hook 即可深度定制。' },
      ],
      kpis: [
        kpi('全课覆盖', '4 章 8 课 48 步', 'good'),
        kpi('核心仓库', 'anthropics/claude-code', 'good'),
        kpi('核心哲学', '单主循环 · Hooks 确定性护栏', 'good'),
      ],
      scene: iso('Claude Code 全景', [
        { id: 'c1', x: 140, y: 210, label: 'Master Loop', tone: 'orange', active: true },
        { id: 'c2', x: 440, y: 210, label: 'Hooks + Perms', tone: 'rose', active: true },
        { id: 'c3', x: 740, y: 210, label: 'CLAUDE.md + Subagent', tone: 'violet' },
      ], [
        { from: 'c1', to: 'c2', packetCount: 1 },
        { from: 'c2', to: 'c3', packetCount: 1 },
      ]),
    },
  ]),
);

export const CLAUDE_CODE_CHAPTERS: Chapter[] = [
  chapter('cc-ch01', 1, '单主循环与工具原语', 'amber', [L_CC_LOOP, L_CC_TOOLS]),
  chapter('cc-ch02', 2, 'Hooks 确定性拦截与权限级联', 'coral', [L_CC_HOOKS, L_CC_PERMS]),
  chapter('cc-ch03', 3, '分层记忆与长会话压缩', 'blue', [L_CC_MEMORY, L_CC_COMPACT]),
  chapter('cc-ch04', 4, 'Subagent 分治与 Worktree 隔离', 'violet', [L_CC_SUBAGENT, L_CC_WORKTREE]),
];
