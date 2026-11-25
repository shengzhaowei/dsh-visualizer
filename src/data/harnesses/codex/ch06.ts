// OpenAI Codex 第 6 章专属课程：四级配置 / MCP 客户端 + codex-app-server 多线程托管
// 与思维导图第 6 大分支 1:1 对齐
import { codexSrc, iso, kpi, lesson, steps, swim, tree } from '../../helpers';

// ---------------------------------------------------------------------------
// CH6 · 1/2 · 四级配置覆盖、AGENTS.md 与原生 MCP 客户端
// ---------------------------------------------------------------------------
export const L_CODEX_CONFIG_MCP = lesson(
  'codex-config-mcp',
  'codex-ch06',
  6,
  '配置层、MCP 与多端协作生态',
  1,
  2,
  '四级配置覆盖、AGENTS.md 与原生 MCP 客户端',
  '深入 codex-rs/core/src/config 与 codex-rs/mcp-client：看清企业托管、个人配置、仓库配置与 CLI 参数如何合并，以及外部 MCP 工具如何无缝并入 ToolRouter。',
  10,
  '核心',
  [
    { text: '掌握 MDM → ~/.codex → .codex → CLI 四级配置合并与安全锁死机制', completedAtStep: 2 },
    { text: '理解 AGENTS.md 为何位于初始环境层从而天然抗 compact.rs 压缩', completedAtStep: 3 },
    { text: '掌握 codex-mcp-client 如何将 stdio / HTTP MCP 工具统一纳入 ToolRouter 审批管线', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: '企业与个人如何共存',
      badge: 'PROBLEM',
      title: '开发者想本地调优模型，企业安全团队要锁死沙箱底线',
      paragraphs: [
        '一个开源 Coding Agent 要同时满足个人极客和企业合规：个人希望在 `~/.codex/config.toml` 配置顺手的默认模型、审批偏好和常用 MCP；团队希望在仓库里沉淀编码规范；企业安全部门则需要全局禁止 `danger-full-access`。',
        '`codex-rs/core/src/config/` 用清晰的**四级分层配置模型**解决冲突：既灵活覆盖，又让企业托管策略（MDM）拥有不可越权的安全上限。',
      ],
      kpis: [
        kpi('配置格式', 'TOML (config.toml)', 'good'),
        kpi('合并层级', '4 级分层叠加', 'good'),
        kpi('源码路径', 'codex-rs/core/src/config/', 'neutral'),
      ],
      scene: tree(
        'Codex 四级配置优先级与约束树',
        [
          { id: 'mdm', x: 500, y: 55, kind: 'root', label: '1 · 企业托管策略 (requirements.toml / MDM)', sublabel: '硬上限约束：可强制禁用 danger-full-access', status: 'active', badge: '最高安全边界' },
          { id: 'usr', x: 500, y: 185, kind: 'service', label: '2 · ~/.codex/config.toml + 全局 AGENTS.md', sublabel: '个人模型偏好、审批策略与全局 MCP 服务', parentId: 'mdm', status: 'done' },
          { id: 'prj', x: 500, y: 315, kind: 'plugin', label: '3 · 项目 .codex/config.toml + repo/AGENTS.md', sublabel: '仓库专属规范、测试命令与项目级 MCP', parentId: 'usr', status: 'done' },
          { id: 'cli', x: 500, y: 445, kind: 'event', label: '4 · CLI 启动参数 (-m / -a / -s / -c)', sublabel: '单次会话临时覆盖（不可突破 MDM 硬红线）', parentId: 'prj', status: 'highlight' },
        ],
        [
          { from: 'mdm', to: 'usr', animated: true },
          { from: 'usr', to: 'prj', animated: true },
          { from: 'prj', to: 'cli', animated: true },
        ],
      ),
    },
    {
      shortLabel: 'config.toml 实战结构',
      badge: 'TECHNIQUE',
      title: '一份 config.toml 统一声明模型、沙箱、Profile 与 MCP',
      paragraphs: [
        'Codex 选择 TOML 而非 JSON 做主配置文件：支持注释、分段 `[profiles.*]` 场景预设（例如一键切换 `codex -p ci` 或 `codex -p audit`）以及清晰声明 `[mcp_servers.*]` 外部工具。',
      ],
      sourceDrawer: codexSrc(
        '~/.codex/config.toml 分层配置与 MCP 声明示例',
        'codex-rs/core/src/config/types.rs',
        'toml',
        `model = "o3"
approval_policy = "on-request"
sandbox_mode = "workspace-write"

[sandbox_workspace_write]
network_access = false
writable_roots = []

[profiles.ci]
approval_policy = "never"
sandbox_mode = "workspace-write"

[mcp_servers.docs]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-filesystem", "./docs"]`,
        '通过 profiles 预设一键切换开发、只读审计与 CI 无人值守策略组合。',
      ),
      kpis: [
        kpi('场景预设', '[profiles.<name>]', 'good'),
        kpi('网络默认', 'network_access = false', 'good'),
        kpi('MCP 声明', '[mcp_servers.<id>]', 'good'),
      ],
      scene: iso(
        'config.toml Profiles 与 MCP 配置装配流',
        [
          { id: 'toml', x: 80, y: 210, label: 'config.toml', sublabel: 'model / profiles / mcp_servers', tone: 'blue', size: 'lg', icon: 'file-text' },
          { id: 'res', x: 420, y: 210, label: 'Config::load_with_cli_overrides()', sublabel: '合并 4 级配置 + 校验 MDM 约束', tone: 'violet', size: 'lg', active: true, icon: 'shield' },
          { id: 'ctx', x: 770, y: 210, label: 'TurnContext 不可变快照', sublabel: '下发给 ToolRouter 与沙箱', tone: 'green', size: 'lg', icon: 'cpu' },
        ],
        [
          { from: 'toml', to: 'res', status: 'active', packetCount: 1 },
          { from: 'res', to: 'ctx', status: 'active', packetCount: 2, packetLabel: 'Config' },
        ],
      ),
    },
    {
      shortLabel: 'AGENTS.md 抗压缩锚点',
      badge: 'SOLUTION',
      title: 'AGENTS.md：按目录向上发现，常驻 initial_context 永不被压丢',
      paragraphs: [
        'Codex 启动时会沿当前目录向上扫描到 Git 根目录收集 `AGENTS.md`（并支持 `AGENTS.override.md` 局部覆写），将其装入 `initial_context`。',
        '前章 `compact.rs` 在执行长会话压缩时，会**完整保留 `initial_context`**——这意味着项目架构规范与测试命令即使经过 5 次压缩也稳如磐石。',
      ],
      kpis: [
        kpi('发现方向', 'Git 根 → 子目录合并', 'good'),
        kpi('局部覆写', 'AGENTS.override.md', 'neutral'),
        kpi('抗压缩性', '100% 常驻 initial_context', 'good'),
      ],
      scene: iso(
        'AGENTS.md 注入 initial_context 抗压缩结构',
        [
          { id: 'ag', x: 80, y: 210, label: 'AGENTS.md 层级合并', sublabel: '~/.codex → repo 根 → 当前子目录', tone: 'blue', size: 'lg', icon: 'file-text' },
          { id: 'init', x: 430, y: 210, label: 'initial_context 保护层', sublabel: 'compact.rs 压缩时永不裁剪此段', tone: 'green', size: 'lg', active: true, icon: 'lock' },
          { id: 'llm', x: 770, y: 210, label: '每轮 Responses API 请求', tone: 'violet', size: 'lg', icon: 'brain' },
        ],
        [
          { from: 'ag', to: 'init', status: 'active', packetCount: 1 },
          { from: 'init', to: 'llm', status: 'active', packetCount: 2, packetLabel: '稳定前缀' },
        ],
      ),
    },
    {
      shortLabel: 'MCP 客户端管线',
      badge: 'TECHNIQUE',
      title: 'codex-mcp-client：外部工具一视同仁并入 ToolRouter',
      paragraphs: [
        '`codex-rs/mcp-client` 与 `core/src/mcp_connection_manager.rs` 在会话启动时并发拉起所有配置的 stdio / Streamable HTTP MCP Server，拉取 `tools/list` 后以 `mcp__<server>__<tool>` 命名注册进 `ToolRouter`。',
        '所有 MCP 调用同样受 `AskForApproval` 审批控制、受 `CancellationToken` 中断控制，超时或报错时优雅返回错误输出给模型，绝不拖垮主内核！',
      ],
      kpis: [
        kpi('连接管理', 'McpConnectionManager', 'good'),
        kpi('传输支持', 'stdio & Streamable HTTP', 'good'),
        kpi('命名隔离', 'mcp__<server>__<tool>', 'neutral'),
      ],
      scene: swim(
        'McpConnectionManager 启动发现与工具路由时序',
        [
          { id: 'core', label: 'codex-core', tone: 'violet' },
          { id: 'mgr', label: 'McpConnectionManager', tone: 'blue' },
          { id: 'srv', label: '外部 MCP Server', tone: 'green' },
        ],
        [
          { id: 'a1', laneId: 'mgr', start: 4, end: 28, label: '并发握手 initialize + tools/list', tone: 'blue', status: 'parallel' },
          { id: 'a2', laneId: 'core', start: 30, end: 48, label: '合并进 ToolRouter 工具定义表', tone: 'violet', status: 'done' },
          { id: 'a3', laneId: 'core', start: 52, end: 68, label: '审批通过 → 转发 tools/call', tone: 'orange', status: 'done' },
          { id: 'a4', laneId: 'srv', start: 70, end: 95, label: '执行外部查询并返回 JSON 结果', tone: 'green', status: 'done' },
        ],
      ),
    },
    {
      shortLabel: 'Codex 自身也是 MCP Server',
      badge: 'INSIGHT',
      title: '双向 MCP：codex mcp-server 让别的 Agent 调用 Codex',
      paragraphs: [
        'Codex 不只是 MCP 客户端——运行 `codex mcp-server` 时，它还可以反过来把自己暴露成一个标准 MCP 工具服务！外层编排器（例如 Claude Code、LangGraph 或 IDE 编排流）可以直接通过 MCP 委派一个受 OS 沙箱保护的 Codex 会话去修代码！',
      ],
      kpis: [
        kpi('作为 Client', '接入外部文档/DB/工单 MCP', 'good'),
        kpi('作为 Server', 'codex mcp-server 被外部编排', 'good'),
        kpi('生态互操作', '双向标准协议', 'good'),
      ],
      scene: iso(
        'Codex 双向 MCP 生态互操作',
        [
          { id: 'orch', x: 70, y: 210, label: '外部编排器 / IDE', sublabel: '以 MCP Client 调用 codex', tone: 'blue', size: 'lg', icon: 'globe' },
          { id: 'cdx', x: 420, y: 210, label: 'Codex (mcp-server + client)', sublabel: '双向标准协议桥梁 + OS 沙箱保护', tone: 'violet', size: 'lg', active: true, icon: 'plug' },
          { id: 'ext', x: 780, y: 210, label: 'GitHub / DB / Docs MCP', sublabel: '供 Codex 内部调用', tone: 'green', size: 'lg', icon: 'database' },
        ],
        [
          { from: 'orch', to: 'cdx', label: 'codex mcp-server', status: 'active', packetCount: 1 },
          { from: 'cdx', to: 'ext', label: 'mcp-client', status: 'active', packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: '配置与 MCP 复盘',
      badge: 'RECAP',
      title: '四级配置与 MCP 集成复盘',
      paragraphs: [
        'TOML 四级叠加兼顾企业红线与个人效率，`AGENTS.md` 常驻抗压缩，双向 MCP 让 Codex 既能连接一切外部工具，也能无缝成为更大系统的安全编码内核。',
      ],
      recapTable: [
        { question: 'CLI 临时参数能突破企业托管策略吗？', decision: '不能，MDM requirements 拥有最高硬上限约束', because: '确保企业安全基线绝不会被个人参数绕过。' },
        { question: '如何为日常开发与 CI 一键切换截然不同的策略？', decision: '在 config.toml 定义 [profiles.*] 用 -p 切换', because: '零重复敲长参数，策略组合版本化可复现。' },
        { question: '外部 MCP 工具出异常会拖垮 Codex 吗？', decision: '由 McpConnectionManager 隔离超时与错误，转为工具报错喂回模型', because: '保障核心状态机稳定性与审批一致性。' },
      ],
      kpis: [
        kpi('配置模型', '4 级分层 TOML', 'good'),
        kpi('指令锚点', 'AGENTS.md 抗压缩', 'good'),
        kpi('协议能力', 'MCP 双向互操作', 'good'),
      ],
      scene: iso('配置与 MCP 复盘', [
        { id: 'a', x: 200, y: 200, label: '4 级 config.toml', tone: 'blue' },
        { id: 'b', x: 500, y: 200, label: 'AGENTS.md', tone: 'green', active: true },
        { id: 'c', x: 800, y: 200, label: '双向 MCP', tone: 'violet' },
      ], [
        { from: 'a', to: 'b', packetCount: 1 },
        { from: 'b', to: 'c', packetCount: 1 },
      ]),
    },
  ]),
);

// ---------------------------------------------------------------------------
// CH6 · 2/2 · codex-app-server 多端协议与多 Worktree Thread 托管
// ---------------------------------------------------------------------------
export const L_CODEX_APP_SERVER = lesson(
  'codex-app-server',
  'codex-ch06',
  6,
  '配置层、MCP 与多端协作生态',
  2,
  2,
  'codex-app-server：JSON-RPC 与多 Worktree 线程托管',
  '深入 codex-rs/app-server：看懂 Codex 如何通过 Thread → Turn → Item 协议把单个 Rust 核心升级为 IDE、桌面端与多并行 Worktree 的统一后端。',
  10,
  '进阶',
  [
    { text: '理解 codex-app-server 为何抽象出 Thread → Turn → Item 三层稳定协议模型', completedAtStep: 2 },
    { text: '掌握 JSON-RPC 2.0 over stdio 如何无损桥接内部 SQ/EQ 双队列', completedAtStep: 4 },
    { text: '理解多并行 Thread 结合 Git Worktree + OS 沙箱实现安全多任务开发', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: '从单终端到多端底座',
      badge: 'PROBLEM',
      title: 'VS Code 扩展、桌面 App 与 CLI 难道要各自重写一套 Agent 引擎？',
      paragraphs: [
        '如果在终端用 Rust 写一套、在 VS Code 扩展用 TypeScript 再写一套、在桌面端又写一套，审批策略、沙箱规则和补丁算法很快就会分叉失控。',
        '`codex-rs/app-server` 给出了工业级解法：**把 `codex-core` 包装为标准 JSON-RPC 2.0 本地守护进程**，所有富客户端都是轻薄的协议前端，核心行为 100% 同源！',
      ],
      kpis: [
        kpi('协议标准', 'JSON-RPC 2.0 (JSONL)', 'good'),
        kpi('数据模型', 'Thread → Turn → Item', 'good'),
        kpi('代码位置', 'codex-rs/app-server/', 'neutral'),
      ],
      scene: iso(
        'codex-app-server 一核驱动多端客户端',
        [
          { id: 'vsc', x: 70, y: 95, label: 'VS Code / Cursor 扩展', tone: 'blue', icon: 'layers' },
          { id: 'desk', x: 70, y: 215, label: 'Codex Desktop App', tone: 'violet', icon: 'terminal' },
          { id: 'web', x: 70, y: 335, label: '自定义自动化客户端', tone: 'green', icon: 'globe' },
          { id: 'srv', x: 440, y: 215, label: 'codex-app-server', sublabel: 'JSON-RPC 路由器 + ThreadManager', tone: 'orange', size: 'lg', active: true, icon: 'cpu' },
          { id: 'core', x: 790, y: 215, label: 'codex-core 实例池', sublabel: '每 Thread 独立 SQ/EQ 与沙箱', tone: 'violet', size: 'lg', active: true, icon: 'lock' },
        ],
        [
          { from: 'vsc', to: 'srv', status: 'active', packetCount: 1 },
          { from: 'desk', to: 'srv', status: 'active', packetCount: 1 },
          { from: 'web', to: 'srv', dashed: true, packetCount: 1 },
          { from: 'srv', to: 'core', status: 'active', packetCount: 2, packetLabel: 'Thread Pool' },
        ],
      ),
    },
    {
      shortLabel: 'Thread → Turn → Item',
      badge: 'TECHNIQUE',
      title: '三层稳定数据模型：让 UI 渲染与断点重连极其优雅',
      paragraphs: [
        '相比底层的细碎事件流，`codex-app-server` 对外暴露了高度规整的三层对象模型：',
        '1. **Thread**：一条持久化会话线程（绑定工作区/Worktree、Rollout 文件与历史）；2. **Turn**：线程内的一次用户提问到收敛的完整执行轮次；3. **Item**：轮次内的原子展示单元（消息、推理、命令执行块、文件 Diff、审批请求）。',
      ],
      sourceDrawer: codexSrc(
        'codex-app-server JSON-RPC 交互帧示意',
        'codex-rs/app-server-protocol/src/lib.rs',
        'json',
        `// 1. 客户端在指定 Thread 上发起 Turn
{"jsonrpc":"2.0","id":7,"method":"turn/start","params":{
  "threadId":"thr_01j9x",
  "input":[{"type":"text","text":"修复 auth 单测并更新文档"}],
  "approvalPolicy":"on-request",
  "sandboxPolicy":{"type":"workspaceWrite","networkAccess":false}
}}

// 2. 服务端流式推送结构化 Item 增量通知
{"jsonrpc":"2.0","method":"item/agentMessage/delta","params":{"threadId":"thr_01j9x","delta":"正在定位..."}}
{"jsonrpc":"2.0","method":"item/commandExecution/requestApproval","params":{"callId":"call_42","command":"npm install"}}`,
        '强类型 Protocol Schema 可自动导出 TypeScript / JSON Schema 供任意前端零手写对接。',
      ),
      kpis: [
        kpi('Schema 生成', '自动生成 TS 类型定义', 'good'),
        kpi('双向审批', 'Server Request → Client Response', 'good'),
        kpi('多会话并发', '单进程托管多 Thread', 'good'),
      ],
      scene: tree(
        'App-Server 三层对象模型',
        [
          { id: 't', x: 500, y: 55, kind: 'root', label: 'Thread (持久化会话线程)', sublabel: 'thread/start · thread/resume · thread/fork', status: 'active' },
          { id: 'u1', x: 260, y: 205, kind: 'event', label: 'Turn #1 (完成)', sublabel: 'turn/start → turn/completed', parentId: 't', status: 'done' },
          { id: 'u2', x: 740, y: 205, kind: 'event', label: 'Turn #2 (运行中)', sublabel: '支持 turn/interrupt 即时打断', parentId: 't', status: 'active' },
          { id: 'i1', x: 140, y: 375, kind: 'assistant', label: 'Item: AgentMessage', parentId: 'u1' },
          { id: 'i2', x: 380, y: 375, kind: 'tool', label: 'Item: FileChange (Diff)', parentId: 'u1' },
          { id: 'i3', x: 740, y: 375, kind: 'tool', label: 'Item: CommandExecution', sublabel: '实时流输出 + 审批往返', parentId: 'u2', status: 'highlight' },
        ],
        [
          { from: 't', to: 'u1' },
          { from: 't', to: 'u2', animated: true },
          { from: 'u1', to: 'i1' },
          { from: 'u1', to: 'i2' },
          { from: 'u2', to: 'i3', animated: true },
        ],
      ),
    },
    {
      shortLabel: '多 Worktree 并行托管',
      badge: 'SOLUTION',
      title: '多 Thread × 独立 Git Worktree：同时推进 3 个任务零冲突',
      paragraphs: [
        '借助 `ThreadManager`，客户端可以为 3 个独立需求分别创建 3 条 Thread，并各自绑定一个独立 `git worktree` 目录与独立 OS 沙箱：',
        '每条 Thread 拥有独立的 `TurnDiffTracker` 和审批队列；人类开发者像技术负责人一样在界面里平行审阅 3 份净 Diff，满意哪份就一键合并哪份！',
      ],
      kpis: [
        kpi('目录隔离', '每 Thread 独立 Worktree', 'good'),
        kpi('Diff 隔离', '独立 TurnDiffTracker', 'good'),
        kpi('安全隔离', '各自独立 OS 沙箱', 'good'),
      ],
      scene: swim(
        '单台开发机上三条隔离 Thread 并行推进',
        [
          { id: 't1', label: 'Thread #1 (feat/oauth)', tone: 'blue' },
          { id: 't2', label: 'Thread #2 (fix/memory)', tone: 'green' },
          { id: 't3', label: 'Thread #3 (audit-ro)', tone: 'orange' },
        ],
        [
          { id: 'b1', laneId: 't1', start: 5, end: 74, label: 'Worktree A · workspace-write 改码跑测', tone: 'blue', status: 'parallel' },
          { id: 'b2', laneId: 't2', start: 12, end: 64, label: 'Worktree B · 定位泄漏并产出净 Diff', tone: 'green', status: 'parallel' },
          { id: 'b3', laneId: 't3', start: 8, end: 52, label: '主目录只读 · read-only 安全巡检', tone: 'orange', status: 'done' },
          { id: 'b4', laneId: 't1', start: 78, end: 96, label: '人类审阅 TurnDiff → 合并分支', tone: 'violet', status: 'done' },
        ],
      ),
    },
    {
      shortLabel: 'Thread Fork 与恢复',
      badge: 'TECHNIQUE',
      title: 'thread/resume 与 thread/fork：基于 Rollout 无损接续与分叉',
      paragraphs: [
        '依托底层的 Rollout JSONL 持久化日志，`codex-app-server` 天然提供 `thread/resume`（关机重启后秒速恢复全部上下文）和 `thread/fork`（从现有会话复制分叉出新 Thread，用不同模型或策略对比方案）。',
      ],
      kpis: [
        kpi('会话恢复', 'thread/resume', 'good'),
        kpi('方案分叉', 'thread/fork', 'good'),
        kpi('底层依赖', 'Rollout JSONL', 'neutral'),
      ],
      scene: iso(
        '基于 Rollout 日志的 Thread 恢复与分叉',
        [
          { id: 'log', x: 80, y: 210, label: 'Rollout JSONL', sublabel: '持久化的完整 ResponseItem 链', tone: 'dark', size: 'lg', icon: 'hard-drive' },
          { id: 'r', x: 480, y: 110, label: 'thread/resume', sublabel: '重启后无缝延续原会话', tone: 'green', size: 'lg', active: true, icon: 'refresh-cw' },
          { id: 'f', x: 480, y: 315, label: 'thread/fork', sublabel: '分叉新 Thread 对比不同模型/方案', tone: 'violet', size: 'lg', active: true, icon: 'git-branch' },
        ],
        [
          { from: 'log', to: 'r', status: 'active', packetCount: 1 },
          { from: 'log', to: 'f', status: 'active', packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: '六大支柱总览',
      badge: 'INSIGHT',
      title: '回看整张 Codex 源码思维导图：六大支柱如何咬合运转',
      paragraphs: [
        '从第 1 章到第 6 章，整套 `codex-rs` 架构严丝合缝：',
        '1. **SQ/EQ 双队列**解耦端与核；2. **submission_loop + ActiveTurn** 保障并发可中断；3. **AskForApproval × SandboxPolicy + Shell AST** 建立二维防线；4. **Seatbelt / Landlock+seccomp** 筑牢原生内核围栏；5. **apply_patch + TurnDiffTracker + compact.rs** 解决编辑与长程记忆；6. **config.toml + MCP + app-server** 撑起企业多端并行生态！',
      ],
      kpis: [
        kpi('架构完整度', '6 大核心分支闭环', 'good'),
        kpi('内核特性', '零容器 · 强类型 · 可中断', 'good'),
        kpi('互动体验', '顶部可切脑图与内核实验台', 'good'),
      ],
      scene: iso(
        'codex-rs 六大核心模块全景闭环',
        [
          { id: 'p1', x: 70, y: 95, label: '1 · SQ / EQ 协议', tone: 'violet', icon: 'inbox' },
          { id: 'p2', x: 380, y: 95, label: '2 · Turn 并发核', tone: 'blue', active: true, icon: 'cpu' },
          { id: 'p3', x: 690, y: 95, label: '3 · 正交策略 + AST', tone: 'orange', icon: 'shield' },
          { id: 'p4', x: 70, y: 315, label: '4 · OS 内核沙箱', tone: 'green', active: true, icon: 'lock' },
          { id: 'p5', x: 380, y: 315, label: '5 · Patch + Compact', tone: 'rose', icon: 'wrench' },
          { id: 'p6', x: 690, y: 315, label: '6 · MCP + App-Server', tone: 'blue', active: true, icon: 'globe' },
        ],
        [
          { from: 'p1', to: 'p2', status: 'active', packetCount: 1 },
          { from: 'p2', to: 'p3', status: 'active', packetCount: 1 },
          { from: 'p3', to: 'p4', status: 'active', packetCount: 1 },
          { from: 'p4', to: 'p5', packetCount: 1 },
          { from: 'p5', to: 'p6', status: 'active', packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: 'Codex 全课复盘',
      badge: 'RECAP',
      title: 'OpenAI Codex (codex-rs) 架构全景复盘',
      paragraphs: [
        '你已经对照源码思维导图完整走通 `openai/codex` 的全部 6 大源码分支。随时可以切回顶部 **「源码脑图」** 鸟瞰任意模块，或在 **「内核实验台」** 亲手发射 `Op` 指令验证双队列与内核沙箱！',
      ],
      recapTable: [
        { question: 'codex-app-server 为何抽象出 Thread → Turn → Item？', decision: '将底层细碎事件整理为强类型三层 UI 友好的对象树', because: 'IDE、桌面端与 Web 端无需各自重复维护复杂流状态机。' },
        { question: '多任务并行改代码如何做到互不踩踏？', decision: '每条 Thread 绑定独立 Git Worktree + 独立 OS 沙箱 + 独立 TurnDiffTracker', because: '物理目录、权限边界与净变更视图三重隔离。' },
        { question: '读完 Codex 源码最值得带走的工程原则？', decision: '协议解耦、策略正交、边界下沉到 OS 内核层', because: '只有内核物理兜底，高自治与强安全才能真正兼得。' },
      ],
      kpis: [
        kpi('全课覆盖', '6 章 10 课 60 步', 'good'),
        kpi('核心仓库', 'openai/codex', 'good'),
        kpi('专属工具', '脑图 + 内核实验台', 'good'),
      ],
      scene: iso('Codex 6 章总览', [
        { id: 'a', x: 180, y: 200, label: 'SQ/EQ + Turn', tone: 'violet' },
        { id: 'b', x: 480, y: 200, label: 'Policy × Kernel', tone: 'green', active: true },
        { id: 'c', x: 780, y: 200, label: 'Patch + App-Server', tone: 'blue' },
      ], [
        { from: 'a', to: 'b', packetCount: 1 },
        { from: 'b', to: 'c', packetCount: 1 },
      ]),
    },
  ]),
);
