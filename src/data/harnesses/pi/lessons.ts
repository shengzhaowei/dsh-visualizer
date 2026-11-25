// Pi Agent（badlogic/pi-mono）交互式源码教程：4 章 · 8 课 · 48 步
// 对应仓库：https://github.com/badlogic/pi-mono
import { iso, kpi, lesson, piSrc, steps, swim, tree } from '../../helpers';
import type { Chapter } from '../../../types/lesson';
import { chapter } from '../../helpers';

// ---------------------------------------------------------------------------
// CH1 · 1/2 · 四层积木架构（pi-ai / pi-agent-core / coding-agent / tui）
// ---------------------------------------------------------------------------
const L_PI_ARCH = lesson(
  'pi-layered-arch',
  'pi-ch01',
  1,
  '极简架构与分层',
  1,
  2,
  '四层积木架构：pi-ai 到 coding-agent',
  'Pi 没有把模型 SDK、循环引擎、会话文件和终端 UI 揉成一个单体，而是用四层零循环依赖的 Monorepo 包逐层组装。',
  10,
  '入门',
  [
    { text: '说出 pi-mono 四个核心包（ai / agent / coding-agent / tui）的职责边界', completedAtStep: 3 },
    { text: '理解为什么 Agent Core 不直接绑定任何文件系统或终端 UI', completedAtStep: 5 },
    { text: '掌握 Pi「极简内核 + 扩展组合」的设计哲学', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: '单体的痛点',
      badge: 'PROBLEM',
      title: '把模型调用、循环与 UI 写在一起会发生什么？',
      paragraphs: [
        '很多 Coding Agent 起步时把 Anthropic/OpenAI SDK、工具执行循环、JSONL 持久化和终端渲染全部写在一个入口文件里。前期很快，但只要想换模型、切 RPC 模式或做单元测试，就会牵一发动全身。',
        '`badlogic/pi-mono` 从第一天就做了严格分层：底层统一多厂商模型流协议，中间层只跑纯内存事件循环，上层再装配编码工具、树形会话和终端渲染器。',
      ],
      callout: {
        kind: 'idea',
        title: 'Pi 的克制哲学',
        text: '内核越小，边界越硬。`pi-agent-core` 连磁盘都不会直接读——文件读写是上层注入的普通工具，持久化是订阅事件流的独立模块。',
      },
      kpis: [
        kpi('核心分层', '4 个独立包', 'good'),
        kpi('循环依赖', '0', 'good'),
        kpi('运行形态', 'TUI / RPC / SDK', 'neutral'),
      ],
      scene: iso(
        'pi-mono 四层单向依赖架构',
        [
          { id: 'tui', x: 100, y: 70, label: 'packages/tui', sublabel: '差异化终端 UI 与快捷键层', tone: 'blue', size: 'lg', icon: 'terminal' },
          { id: 'coding', x: 560, y: 70, label: 'packages/coding-agent', sublabel: '4 原语工具 · SessionManager · 扩展', tone: 'violet', size: 'lg', active: true, icon: 'package' },
          { id: 'agent', x: 330, y: 245, label: 'packages/agent', sublabel: 'agentLoop 双层循环 · Steering / Follow-up', tone: 'green', size: 'lg', active: true, icon: 'refresh-cw' },
          { id: 'ai', x: 180, y: 425, label: 'packages/ai (统一 LLM 网关层)', sublabel: 'Anthropic / OpenAI / Google / Bedrock 统一流式接口与 Token 计费', tone: 'dark', size: 'platform', icon: 'brain' },
        ],
        [
          { from: 'tui', to: 'coding', label: '订阅事件渲染', packetCount: 1, packetLabel: 'UI Event' },
          { from: 'coding', to: 'agent', label: '驱动循环与工具', status: 'active', packetCount: 2, packetLabel: 'AgentContext' },
          { from: 'agent', to: 'ai', label: 'streamSimple()', status: 'active', packetCount: 2, packetLabel: 'Message[]' },
        ],
        [{ x: 520, y: 365, text: '依赖严格向下：agent-core 完全不知道终端与磁盘的存在', tone: 'green' }],
      ),
    },
    {
      shortLabel: 'pi-ai 统一流层',
      badge: 'TECHNIQUE',
      title: 'packages/ai：抹平 20+ 模型提供商的流式差异',
      paragraphs: [
        '各家模型 API 的思考块（thinking）、工具调用增量 JSON、缓存 token 统计格式千差万别。`packages/ai` 把它们全部归一化为统一的 `AssistantMessageEventStream`。',
        '上层循环只需要消费标准事件（`text_delta`、`thinking_delta`、`toolcall_end`、`done`、`error`），切换模型就像换一个 `Model` 对象一样简单，甚至支持在同一个会话中途无缝切换模型。',
      ],
      sourceDrawer: piSrc(
        '统一消息模型与流式入口（pi-ai）',
        'packages/ai/src/types.ts',
        'ts',
        `export type Message = UserMessage | AssistantMessage | ToolResultMessage;

export interface AssistantMessage {
  role: 'assistant';
  content: (TextContent | ThinkingContent | ToolCall)[];
  api: Api;
  provider: Provider;
  model: string;
  usage: Usage;
  stopReason: 'stop' | 'length' | 'toolUse' | 'error' | 'aborted';
}`,
        '依据 badlogic/pi-mono 的 packages/ai 统一类型定义整理。',
      ),
      kpis: [
        kpi('统一角色', '3 种标准消息', 'good'),
        kpi('跨模型切换', '会话内无感切换', 'good'),
        kpi('思考块支持', 'ThinkingContent', 'neutral'),
      ],
      scene: iso(
        'packages/ai 统一抽象多厂商流',
        [
          { id: 'anth', x: 70, y: 80, label: 'Anthropic API', sublabel: 'Messages + Thinking', tone: 'orange', icon: 'globe' },
          { id: 'oai', x: 390, y: 80, label: 'OpenAI Responses', sublabel: 'Reasoning + Function', tone: 'violet', icon: 'globe' },
          { id: 'gem', x: 710, y: 80, label: 'Google Gemini', sublabel: 'GenerateContent Stream', tone: 'blue', icon: 'globe' },
          { id: 'ai', x: 350, y: 265, label: 'pi-ai streamSimple()', sublabel: '协议适配 + Token/成本核算', tone: 'green', size: 'lg', active: true, icon: 'layers' },
          { id: 'stream', x: 350, y: 430, label: 'EventStream', sublabel: 'text_delta / toolcall_end / done', tone: 'blue', size: 'lg', icon: 'refresh-cw' },
        ],
        [
          { from: 'anth', to: 'ai', packetCount: 1 },
          { from: 'oai', to: 'ai', packetCount: 1 },
          { from: 'gem', to: 'ai', packetCount: 1 },
          { from: 'ai', to: 'stream', label: '统一事件流', status: 'active', packetCount: 2, packetLabel: 'AssistantEvent' },
        ],
      ),
    },
    {
      shortLabel: 'pi-agent-core',
      badge: 'SOLUTION',
      title: 'packages/agent：纯状态机与双层执行循环',
      paragraphs: [
        '`packages/agent` 是整个系统的心脏，由两部分构成：无状态函数 `agentLoop()`（定义一次执行的完整控制流）和有状态包装类 `Agent`（持有消息、队列、AbortController 与订阅者）。',
        '它不关心工具是不是读写磁盘，只关心每个 `AgentTool` 实现了 `execute(toolCallId, params, signal, onUpdate)`；也不关心 UI 是 CLI 还是网页，只向外发射 `AgentEvent`。',
      ],
      sourceDrawer: piSrc(
        'Agent 状态容器核心字段',
        'packages/agent/src/agent.ts',
        'ts',
        `export class Agent {
  private _state: AgentState;
  private steeringQueue: AgentMessage[] = [];
  private followUpQueue: AgentMessage[] = [];
  public transformContext?: (messages: AgentMessage[], signal?: AbortSignal) => Promise<AgentMessage[]>;
  public convertToLlm: (messages: AgentMessage[]) => Message[] | Promise<Message[]>;

  steer(msg: AgentMessage) { this.steeringQueue.push(msg); }
  followUp(msg: AgentMessage) { this.followUpQueue.push(msg); }
}`,
        'packages/agent/src/agent.ts 把状态、双队列与两段上下文转换管线解耦。',
      ),
      kpis: [
        kpi('控制流', 'agentLoop()', 'good'),
        kpi('状态封装', 'Agent class', 'good'),
        kpi('UI 耦合', '0', 'good'),
      ],
      scene: iso(
        'Agent 状态包装器与 agentLoop',
        [
          { id: 'state', x: 80, y: 120, label: 'AgentState', sublabel: 'messages / tools / model / isStreaming', tone: 'blue', size: 'lg', icon: 'database' },
          { id: 'queues', x: 80, y: 340, label: 'Steering & FollowUp', sublabel: '双输入队列（打断 vs 续接）', tone: 'orange', size: 'lg', icon: 'inbox' },
          { id: 'loop', x: 430, y: 225, label: 'agentLoop()', sublabel: '外层续接 + 内层工具循环', tone: 'green', size: 'lg', active: true, icon: 'refresh-cw' },
          { id: 'sub', x: 760, y: 225, label: 'Listeners', sublabel: 'TUI / Session / Logger', tone: 'violet', icon: 'eye' },
        ],
        [
          { from: 'state', to: 'loop', label: '上下文快照', packetCount: 1 },
          { from: 'queues', to: 'loop', label: 'getSteering / getFollowUp', status: 'active', packetCount: 2, packetLabel: 'Queue' },
          { from: 'loop', to: 'sub', label: 'emit(AgentEvent)', status: 'active', packetCount: 2, packetLabel: 'Event' },
        ],
      ),
    },
    {
      shortLabel: 'coding-agent 装配',
      badge: 'TECHNIQUE',
      title: 'packages/coding-agent：把通用循环装成编程助手',
      paragraphs: [
        '直到第三层 `packages/coding-agent`，才真正出现「编程助手」的概念：`AgentSession` 把 `Agent`、`SessionManager`（JSONL 树形持久化）、内置四工具、`AGENTS.md` 加载器和扩展系统黏合在一起。',
        '因为底层协议干净，同一个 `AgentSession` 可以直接跑在交互式终端（Interactive）、无头打印（Print）、JSON-RPC（供 IDE 集成）三种模式里，复用 100% 核心逻辑。',
      ],
      kpis: [
        kpi('会话编排', 'AgentSession', 'good'),
        kpi('运行模式', 'TUI / Print / RPC', 'good'),
        kpi('持久化', 'SessionManager', 'neutral'),
      ],
      scene: tree(
        'AgentSession 装配关系树',
        [
          { id: 'sess', x: 500, y: 60, kind: 'root', label: 'AgentSession', sublabel: 'packages/coding-agent 核心装配器', status: 'active' },
          { id: 'core', x: 180, y: 230, kind: 'service', label: 'Agent Core', sublabel: 'agentLoop + 双队列', parentId: 'sess' },
          { id: 'sm', x: 500, y: 230, kind: 'log', label: 'SessionManager', sublabel: '树形 JSONL 持久化', parentId: 'sess' },
          { id: 'ext', x: 820, y: 230, kind: 'plugin', label: 'ExtensionRunner', sublabel: '钩子 / 命令 / 工具覆盖', parentId: 'sess' },
          { id: 'tools', x: 180, y: 410, kind: 'tool', label: 'read / write / edit / bash', sublabel: '4 个内置原子工具', parentId: 'core' },
          { id: 'modes', x: 660, y: 410, kind: 'event', label: 'TUI / Print / RPC Mode', sublabel: '多入口无感复用', parentId: 'sm' },
        ],
        [
          { from: 'sess', to: 'core', animated: true },
          { from: 'sess', to: 'sm', animated: true },
          { from: 'sess', to: 'ext', animated: true },
          { from: 'core', to: 'tools' },
          { from: 'sm', to: 'modes' },
          { from: 'ext', to: 'modes' },
        ],
      ),
    },
    {
      shortLabel: '多模式复用',
      badge: 'INSIGHT',
      title: '同一内核，三种入口零分叉',
      paragraphs: [
        '当用户直接运行 `pi` 时，启动的是 `InteractiveMode`（基于 `packages/tui` 的差量终端渲染）；当 CI 脚本运行 `pi -p "fix tests"` 时，走的是 `PrintMode`；当编辑器插件调用 `pi --mode rpc` 时，走的是标准输入输出 JSON 行协议。',
        '这三种模式都不改一行 `agentLoop` 或工具代码，它们只是对 `AgentSession` 事件流的不同消费者。',
      ],
      kpis: [
        kpi('核心复用率', '100%', 'good'),
        kpi('RPC 协议', 'stdin/stdout JSONL', 'neutral'),
        kpi('终端刷新', '差量渲染 TUI', 'good'),
      ],
      scene: swim(
        '同一次工具调用在三种模式下的消费路径',
        [
          { id: 'loop', label: 'agentLoop', sublabel: '核心循环', tone: 'green' },
          { id: 'tui', label: 'TUI 模式', sublabel: '交互终端', tone: 'blue' },
          { id: 'rpc', label: 'RPC 模式', sublabel: 'IDE / 外部宿主', tone: 'violet' },
        ],
        [
          { id: 'b1', laneId: 'loop', start: 5, end: 42, label: 'LLM 流式生成', tone: 'green', status: 'running' },
          { id: 'b2', laneId: 'loop', start: 46, end: 78, label: '执行 bash 工具', tone: 'orange', status: 'done' },
          { id: 'b3', laneId: 'tui', start: 8, end: 85, label: 'Markdown 增量渲染 + 工具折叠卡片', tone: 'blue', status: 'parallel' },
          { id: 'b4', laneId: 'rpc', start: 8, end: 85, label: 'stdout 逐行输出 AgentEvent JSON', tone: 'violet', status: 'parallel' },
        ],
        [
          { id: 'e1', laneId: 'loop', pos: 44, label: 'tool_execution_start', tone: 'orange', emphasized: true },
          { id: 'e2', laneId: 'loop', pos: 82, label: 'turn_end', tone: 'green' },
        ],
      ),
    },
    {
      shortLabel: '架构复盘',
      badge: 'RECAP',
      title: 'Pi 四层架构的核心设计取舍',
      paragraphs: [
        'Pi 选择「厚协议、薄内核、可扩展上层」：把模型差异封死在 `pi-ai`，把循环控制流封死在 `pi-agent-core`，把文件与扩展封在 `coding-agent`，从而保持极高的可读性与可嵌入性。',
      ],
      recapTable: [
        { question: '为什么要把 pi-ai 和 pi-agent 拆开？', decision: '模型协议归一与循环控制彻底解耦', because: '换模型供应商或新增思考模式时，Agent 循环与 UI 零改动。' },
        { question: '为什么 agent-core 不内置文件工具？', decision: '所有能力通过 AgentTool 接口注入', because: '同一循环既可跑在本地 CLI，也可嵌入浏览器或云端沙箱。' },
        { question: 'TUI / Print / RPC 如何共享逻辑？', decision: '共同订阅 AgentSession 的事件流', because: '入口只是事件的呈现方式，核心状态机只有一份真相。' },
      ],
      kpis: [
        kpi('分层数', '4 层', 'good'),
        kpi('核心原则', '单向依赖', 'good'),
        kpi('可嵌入性', 'SDK / RPC / CLI', 'good'),
      ],
      scene: iso('Pi 四层总览', [
        { id: 'n1', x: 180, y: 200, label: 'pi-ai', tone: 'dark' },
        { id: 'n2', x: 420, y: 200, label: 'pi-agent-core', tone: 'green', active: true },
        { id: 'n3', x: 660, y: 200, label: 'coding-agent', tone: 'violet' },
      ], [
        { from: 'n3', to: 'n2', packetCount: 1 },
        { from: 'n2', to: 'n1', packetCount: 1 },
      ]),
    },
  ]),
);

// ---------------------------------------------------------------------------
// CH1 · 2/2 · 极简四原语工具（read / write / edit / bash）
// ---------------------------------------------------------------------------
const L_PI_TOOLS = lesson(
  'pi-four-tools',
  'pi-ch01',
  1,
  '极简架构与分层',
  2,
  2,
  '极简四原语工具与动态激活表',
  '为什么 Pi 默认只给模型 4 个工具（read、write、edit、bash）？因为模型已经极其擅长 Unix 命令行，少即是多。',
  10,
  '入门',
  [
    { text: '理解为什么 4 个原子工具比 40 个特化工具更省 Token 且更稳健', completedAtStep: 2 },
    { text: '掌握 AgentTool 的实时流式进度回调 onUpdate 与截断保护', completedAtStep: 4 },
    { text: '学会通过 setActiveTools 动态裁剪当前会话的可见工具集', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: '工具膨胀之痛',
      badge: 'PROBLEM',
      title: '给模型塞 40 个工具，反而越用越笨',
      paragraphs: [
        '许多 Agent 框架热衷于注册几十个工具：`git_status`、`git_diff`、`npm_test`、`search_regex`、`list_dir`……每个工具的 JSON Schema 都会在每一轮消耗大量系统提示词 Token，还容易让模型在相似工具间选错。',
        'Pi 认为现代前沿模型本来就是 Unix 专家：只要给它 `read`、`write`、`edit`、`bash` 四个正交原语，其余一切搜索、构建、测试、Git 操作都能通过 `bash` 组合现有 CLI 工具完成。',
      ],
      callout: {
        kind: 'idea',
        title: '短提示词的复利效应',
        text: 'Pi 的默认系统提示词非常精短，4 个工具 Schema 占用极小上下文预算，让更多 Token 留给真实代码和对话。',
      },
      kpis: [
        kpi('默认内置工具', '4 个原子原语', 'good'),
        kpi('Schema 开销', '极低', 'good'),
        kpi('组合方式', 'Unix Pipeline', 'neutral'),
      ],
      scene: iso(
        'Pi 极简四原语工具矩阵',
        [
          { id: 'read', x: 80, y: 110, label: 'read', sublabel: '分页读取文本与图片 · 行号定位', tone: 'blue', size: 'lg', icon: 'file-text' },
          { id: 'edit', x: 380, y: 110, label: 'edit', sublabel: '精确子串替换 · 唯一匹配防误改', tone: 'green', size: 'lg', active: true, icon: 'wrench' },
          { id: 'write', x: 680, y: 110, label: 'write', sublabel: '新建或整文件覆盖（自动建目录）', tone: 'violet', size: 'lg', icon: 'file-text' },
          { id: 'bash', x: 380, y: 330, label: 'bash', sublabel: '进程执行 + 流式输出 + 超时与截断', tone: 'orange', size: 'lg', active: true, icon: 'terminal' },
        ],
        [
          { from: 'read', to: 'edit', label: '先读后改', packetCount: 1 },
          { from: 'edit', to: 'bash', label: '改完即测', status: 'active', packetCount: 2, packetLabel: 'test / git' },
          { from: 'write', to: 'bash', dashed: true, packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: 'edit 唯一性守卫',
      badge: 'TECHNIQUE',
      title: 'edit 工具：精准替换为什么必须要求唯一匹配？',
      paragraphs: [
        '让模型重写整个 800 行文件既慢又容易「偷懒省略」；让模型给行号又常因为前一次编辑偏移 2 行而错位。',
        'Pi 的 `edit` 工具采用精确文本块匹配（`oldText` → `newText`）：如果 `oldText` 在文件中出现 0 次或超过 1 次，工具直接报错并提示模型补充上下文，绝不盲目替换第一处。',
      ],
      sourceDrawer: piSrc(
        'AgentTool 标准接口与流式更新',
        'packages/agent/src/types.ts',
        'ts',
        `export interface AgentTool<TParams extends TSchema = TSchema, TDetails = any> {
  name: string;
  label: string;
  description: string;
  parameters: TParams;
  execute: (
    toolCallId: string,
    params: Static<TParams>,
    signal?: AbortSignal,
    onUpdate?: (partial: AgentToolResult<TDetails>) => void,
  ) => Promise<AgentToolResult<TDetails>>;
}`,
        'execute 原生支持 AbortSignal 取消与 onUpdate 流式增量回报。',
      ),
      kpis: [
        kpi('匹配策略', '精确唯一匹配', 'good'),
        kpi('取消信号', 'AbortSignal', 'good'),
        kpi('输出结构', 'content + details', 'neutral'),
      ],
      scene: iso(
        'edit 工具执行防错流水线',
        [
          { id: 'req', x: 70, y: 210, label: 'oldText / newText', sublabel: '模型发起 edit 调用', tone: 'blue', icon: 'wrench' },
          { id: 'chk', x: 350, y: 210, label: '出现次数检查', sublabel: 'count === 1 ?', tone: 'violet', size: 'lg', active: true, icon: 'shield' },
          { id: 'ok', x: 700, y: 100, label: '写盘 + 返回 Diff', sublabel: '带行号上下文与 details', tone: 'green', icon: 'check-circle' },
          { id: 'err', x: 700, y: 320, label: '拒绝写入（isError）', sublabel: '0 次或多次匹配 → 让模型重试', tone: 'rose', icon: 'alert-triangle' },
        ],
        [
          { from: 'req', to: 'chk', status: 'active', packetCount: 1 },
          { from: 'chk', to: 'ok', label: 'count === 1', status: 'active', packetCount: 1, packetLabel: 'diff' },
          { from: 'chk', to: 'err', label: 'count !== 1', status: 'error', dashed: true, packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: '流式进度与截断',
      badge: 'SOLUTION',
      title: 'bash 工具：onUpdate 实时回显 + 尾部截断防爆窗',
      paragraphs: [
        '执行 `npm test` 或 `cargo build` 可能持续几十秒，并且刷出上万行日志。Pi 的 `bash` 工具在执行期间持续通过 `onUpdate` 回调发射 `tool_execution_update` 事件，让终端实时滚动输出，同时随时响应 `AbortSignal` 杀死进程组。',
        '命令结束后，如果输出超过安全阈值（行数或字节数），工具自动保留末尾关键报错、将完整日志写入临时文件并把路径告诉模型——既不撑爆上下文窗口，也不丢原始信息。',
      ],
      kpis: [
        kpi('实时回显', 'onUpdate()', 'good'),
        kpi('爆窗防护', '滚动截断 + 落盘路径', 'good'),
        kpi('进程终止', 'AbortSignal 杀进程树', 'neutral'),
      ],
      scene: swim(
        'bash 长命令的流式回调与截断处理',
        [
          { id: 'proc', label: '子进程 bash', sublabel: 'stdout/stderr 流', tone: 'orange' },
          { id: 'tool', label: 'bash Tool', sublabel: '滚动缓冲与截断', tone: 'green' },
          { id: 'ui', label: 'TUI / LLM', sublabel: '实时显示与结果入窗', tone: 'blue' },
        ],
        [
          { id: 'p1', laneId: 'proc', start: 5, end: 72, label: '持续输出 4,200 行构建日志', tone: 'orange', status: 'running' },
          { id: 'p2', laneId: 'tool', start: 10, end: 74, label: 'onUpdate() 节流推送预览', tone: 'green', status: 'parallel' },
          { id: 'p3', laneId: 'tool', start: 76, end: 95, label: '截断保留尾段 + 完整日志存 /tmp', tone: 'violet', status: 'done' },
          { id: 'p4', laneId: 'ui', start: 14, end: 95, label: 'UI 实时滚动 · LLM 只收精炼尾段', tone: 'blue', status: 'done' },
        ],
        [{ id: 'ev', laneId: 'tool', pos: 75, label: '超阈值截断保护', tone: 'orange', emphasized: true }],
      ),
    },
    {
      shortLabel: 'content 与 details',
      badge: 'INSIGHT',
      title: '双通道返回值：给模型看的 vs 给人类看的',
      paragraphs: [
        '注意 `AgentToolResult` 有两个字段：`content`（纯文本/图片数组，发给 LLM）和 `details`（结构化对象，如彩色 unified diff、截断统计、行号范围，只给 UI 渲染和扩展程序使用）。',
        '这种分离避免把富交互 UI 数据塞进模型上下文，同时让 TUI 能渲染出比纯文本丰富得多的视觉反馈。',
      ],
      kpis: [
        kpi('发给 LLM', 'result.content', 'good'),
        kpi('发给 UI/扩展', 'result.details', 'good'),
        kpi('Token 浪费', '0', 'good'),
      ],
      scene: iso(
        'AgentToolResult 双通道分流',
        [
          { id: 'res', x: 100, y: 215, label: 'AgentToolResult', sublabel: '工具执行返回对象', tone: 'violet', size: 'lg', active: true, icon: 'package' },
          { id: 'llm', x: 560, y: 105, label: 'result.content', sublabel: '精炼文本/图片 → 进入 LLM 消息历史', tone: 'green', size: 'lg', icon: 'brain' },
          { id: 'ui', x: 560, y: 325, label: 'result.details', sublabel: 'Diff 高亮 / 耗时 / 截断元信息 → 仅 UI 与扩展', tone: 'blue', size: 'lg', icon: 'terminal' },
        ],
        [
          { from: 'res', to: 'llm', label: '送入模型', status: 'active', packetCount: 1, packetLabel: 'Token 极简' },
          { from: 'res', to: 'ui', label: '本地渲染', packetCount: 1, packetLabel: 'Rich UI' },
        ],
      ),
    },
    {
      shortLabel: '动态工具裁剪',
      badge: 'TECHNIQUE',
      title: 'pi.setActiveTools()：按任务阶段动态开关工具',
      paragraphs: [
        '虽然默认只有 4 个工具，但在纯代码审查或规划阶段，你可能连 `write`/`edit`/`bash` 都不想暴露。Pi 允许扩展或模式在运行时调用 `pi.setActiveTools(["read", "grep"])` 动态收敛工具表。',
        '更重要的是，工具切换记录会被写入会话树，用户切换分支或恢复历史会话时，当时的活跃工具集也会精确还原。',
      ],
      kpis: [
        kpi('动态切换 API', 'setActiveTools()', 'good'),
        kpi('只读模式', '仅暴露 read/grep/find', 'good'),
        kpi('分支还原', '随 Session 持久化', 'neutral'),
      ],
      scene: iso(
        '按阶段动态切换活跃工具集',
        [
          { id: 'all', x: 80, y: 210, label: '注册工具池', sublabel: 'read / write / edit / bash / grep / find / 扩展工具', tone: 'dark', size: 'lg', icon: 'database' },
          { id: 'plan', x: 470, y: 105, label: '规划 / 只读阶段', sublabel: 'activeTools = [read, grep, find]', tone: 'blue', size: 'lg', active: true, icon: 'eye' },
          { id: 'exec', x: 470, y: 325, label: '编码执行阶段', sublabel: 'activeTools = [read, edit, write, bash]', tone: 'green', size: 'lg', icon: 'wrench' },
        ],
        [
          { from: 'all', to: 'plan', label: '只读投影', status: 'active', packetCount: 1 },
          { from: 'all', to: 'exec', label: '全量投影', dashed: true, packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: '工具复盘',
      badge: 'RECAP',
      title: '极简工具设计的三条铁律',
      paragraphs: [
        'Pi 用 4 个工具证明了「工具数量 ≠ 能力上限」：正交原语 + 精确防错 + 双通道返回 + 动态裁剪，构成了高信噪比的行动层。',
      ],
      recapTable: [
        { question: '为什么默认只有 read/write/edit/bash？', decision: '用正交原语替代几十个薄包装工具', because: '极大幅压缩提示词长度，减少模型选错工具的概率。' },
        { question: '长输出命令如何不撑爆上下文？', decision: 'onUpdate 实时流显 + 尾部截断并落盘完整日志', because: '兼顾人类可观测性、模型上下文预算与事后追溯。' },
        { question: 'UI 富数据怎么不污染模型上下文？', decision: '拆分为 content（模型）与 details（UI）', because: '结构化 Diff 和元信息不浪费哪怕一个 Token。' },
      ],
      kpis: [
        kpi('内置原语', '4 个', 'good'),
        kpi('双通道', 'content / details', 'good'),
        kpi('动态治理', 'setActiveTools', 'good'),
      ],
      scene: iso('Pi 工具原语总览', [
        { id: 'r', x: 140, y: 210, label: 'read', tone: 'blue' },
        { id: 'e', x: 350, y: 210, label: 'edit', tone: 'green', active: true },
        { id: 'w', x: 560, y: 210, label: 'write', tone: 'violet' },
        { id: 'b', x: 770, y: 210, label: 'bash', tone: 'orange', active: true },
      ], [
        { from: 'r', to: 'e', packetCount: 1 },
        { from: 'e', to: 'b', packetCount: 1 },
      ]),
    },
  ]),
);

// ---------------------------------------------------------------------------
// CH2 · 1/2 · 双层循环与 Steering / Follow-up 队列（★ 带互动实验台）
// ---------------------------------------------------------------------------
const L_PI_STEERING = lesson(
  'steering-followup',
  'pi-ch02',
  2,
  '双层循环与实时队列',
  1,
  2,
  '双层循环与 Steering / Follow-up 队列',
  'Pi 最具辨识度的核心机制：不用粗暴 Ctrl+C 强杀，通过 Steering 在工具边界即时转向，通过 Follow-up 等本轮收敛后自动续跑。',
  14,
  '核心',
  [
    { text: '区分外层 Follow-up 循环与内层 Tool/Steering 循环的职责', completedAtStep: 2 },
    { text: '掌握 Steering 如何在工具边界跳过剩余工具并原地转向', completedAtStep: 4 },
    { text: '理解 one-at-a-time 与 all 两种队列消费模式的取舍', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: '强杀的代价',
      badge: 'PROBLEM',
      title: '传统 Agent 的尴尬：跑偏了只能硬杀重来',
      paragraphs: [
        '在单层 `while` 循环的 Agent 里，一旦模型开始连续调用 5 个工具（例如改错目录、跑错测试套件），用户输入框通常被锁死。你想纠正它，只能按 `Ctrl+C` 强行中断——结果半截工具状态破碎，上下文还要手动补解释。',
        '反之，有时模型正在做对的事，你突然想到「做完这个顺便把 README 也更新一下」——你不想打断它，只想把新指令排在后面。',
      ],
      callout: {
        kind: 'idea',
        title: '两种人类意图，必须两条队列',
        text: '**Steering（转向）** =「停下，我看到你走偏了，立刻按这个方向走」；**Follow-up（跟进）** =「别停，等你手头这件完全做完，接着做这个」。',
      },
      kpis: [
        kpi('输入队列', 'Steering + Follow-up', 'good'),
        kpi('强杀需求', '几乎消除', 'good'),
        kpi('上下文连续性', '100% 保留', 'good'),
      ],
      scene: iso(
        '两种中途输入意图的分流',
        [
          { id: 'user', x: 80, y: 215, label: '用户实时输入', sublabel: 'Agent 运行期间随时可打字', tone: 'blue', size: 'lg', active: true, icon: 'users' },
          { id: 'steer', x: 430, y: 100, label: 'steeringQueue', sublabel: '「立刻转向」→ 注入内层工具边界', tone: 'orange', size: 'lg', active: true, icon: 'inbox' },
          { id: 'follow', x: 430, y: 330, label: 'followUpQueue', sublabel: '「做完再干」→ 注入外层收敛边界', tone: 'violet', size: 'lg', icon: 'clock' },
          { id: 'loop', x: 780, y: 215, label: 'agentLoop', sublabel: '双层循环调度器', tone: 'green', size: 'lg', icon: 'refresh-cw' },
        ],
        [
          { from: 'user', to: 'steer', label: 'Enter (Steer)', status: 'active', packetCount: 2, packetLabel: '立即转向' },
          { from: 'user', to: 'follow', label: 'Alt+Enter (Follow-up)', dashed: true, packetCount: 1, packetLabel: '排队续接' },
          { from: 'steer', to: 'loop', status: 'active', packetCount: 1 },
          { from: 'follow', to: 'loop', packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: '双层循环结构',
      badge: 'SOLUTION',
      title: '外层接 Follow-up，内层跑工具与 Steering',
      paragraphs: [
        '打开 `packages/agent/src/agent-loop.ts`，整个引擎的精髓就在那两层嵌套的 `while (true)` 里：',
        '**内层循环**负责不断调用 LLM、执行工具、并在每个工具执行完毕后立刻检查 `getSteeringMessages()`；只有当内层循环彻底收敛（模型不再请求工具、也没有新的 steering 消息）时，**外层循环**才检查 `getFollowUpMessages()`，有则开启新一轮，无则真正结束整个 Agent Run。',
      ],
      sourceDrawer: piSrc(
        'runLoop 双层控制流核心骨架',
        'packages/agent/src/agent-loop.ts',
        'ts',
        `// 外层循环：只有当内层彻底收敛后，才检查 followUp 队列
while (true) {
  let hasMoreToolCalls = true;
  let steeringAfterTools: AgentMessage[] = [];

  // 内层循环：流式生成 + 工具执行 + 实时 steering 注入
  while (hasMoreToolCalls || pendingMessages.length > 0) {
    if (pendingMessages.length > 0) {
      for (const msg of pendingMessages) {
        context.messages.push(msg);
        stream.push({ type: 'message_start', message: msg });
        stream.push({ type: 'message_end', message: msg });
      }
      pendingMessages = [];
    }
    const message = await streamAssistantResponse(context, config, signal, stream);
    const toolCalls = message.content.filter((c) => c.type === 'toolCall');
    hasMoreToolCalls = toolCalls.length > 0;
    if (hasMoreToolCalls) {
      const { steeringMessages } = await executeToolCalls(
        context.tools, message, signal, stream, config.getSteeringMessages
      );
      steeringAfterTools = steeringMessages;
    }
    pendingMessages = steeringAfterTools.length > 0
      ? steeringAfterTools
      : (await config.getSteeringMessages?.()) || [];
  }

  // 内层收敛 → 检查 follow-up 队列决定是否继续外层循环
  const followUp = (await config.getFollowUpMessages?.()) || [];
  if (followUp.length > 0) { pendingMessages = followUp; continue; }
  break;
}`,
        '真实还原 badlogic/pi-mono packages/agent/src/agent-loop.ts 的双层循环结构。',
      ),
      kpis: [
        kpi('内层循环', 'Tool + Steering', 'good'),
        kpi('外层循环', 'Follow-up 续接', 'good'),
        kpi('源码位置', 'agent-loop.ts', 'neutral'),
      ],
      scene: iso(
        'agentLoop 双层嵌套结构',
        [
          { id: 'llm', x: 140, y: 140, label: 'streamAssistantResponse', sublabel: '调用模型产出文本与 toolCalls', tone: 'green', size: 'lg', active: true, icon: 'brain' },
          { id: 'exec', x: 520, y: 140, label: 'executeToolCalls', sublabel: '逐个执行工具 · 每步后查 Steering', tone: 'orange', size: 'lg', active: true, icon: 'wrench' },
          { id: 'follow', x: 330, y: 390, label: 'getFollowUpMessages()', sublabel: '内层收敛后检查 · 有则重入内层，无则结束', tone: 'violet', size: 'lg', icon: 'clock' },
        ],
        [
          { from: 'llm', to: 'exec', label: 'hasToolCalls', status: 'active', packetCount: 2, packetLabel: 'toolCall' },
          { from: 'exec', to: 'llm', label: '工具结果 / Steering', status: 'active', packetCount: 2, packetLabel: 'next turn' },
          { from: 'llm', to: 'follow', label: '无工具调用（收敛）', dashed: true, packetCount: 1 },
          { from: 'follow', to: 'llm', label: '有 Follow-up → 续跑', dotted: true, packetCount: 1 },
        ],
        undefined,
        [{ x: 80, y: 65, w: 720, h: 195, label: '内层循环（工具 & 实时 Steering 转向）', tone: 'green', dashed: true }],
      ),
    },
    {
      shortLabel: '工具边界跳过',
      badge: 'TECHNIQUE',
      title: 'Steering 命中瞬间：跳过剩余工具，保持协议合法',
      paragraphs: [
        '假设模型一轮同时发出了 3 个工具调用：`[bash_1, edit_2, bash_3]`。在 `bash_1` 执行期间，用户提交了一条 Steering：「别改那个文件，先看 `src/auth.ts`」。',
        '`bash_1` 跑完瞬间，`executeToolCalls` 检测到 Steering 队列非空！它**不会**直接丢弃 `edit_2` 和 `bash_3`（那样会导致 LLM 协议因缺少 `tool_result` 报错），而是立即为剩余 2 个未执行的工具生成合成的错误结果：`Skipped due to queued user message.`，然后把 Steering 消息追加进去，立刻开启下一轮推理！',
      ],
      callout: {
        kind: 'tip',
        title: '协议完整性是生命线',
        text: 'Anthropic 与 OpenAI 协议都严格要求：每一个 `tool_use` 必须配对一个 `tool_result`。Pi 用「合成 Skipped 结果」在零破坏协议的前提下实现了毫秒级转向。',
      },
      kpis: [
        kpi('已跑完工具', '保留真实输出', 'good'),
        kpi('未执行工具', '合成 Skipped 结果', 'warn'),
        kpi('协议合法性', '100% 配对', 'good'),
      ],
      scene: swim(
        '3 个工具调用中途收到 Steering 的精确时序',
        [
          { id: 'tools', label: '工具执行器', sublabel: '3 个串行调用', tone: 'orange' },
          { id: 'queue', label: 'steeringQueue', sublabel: '用户中途输入', tone: 'blue' },
          { id: 'ctx', label: '会话消息流', sublabel: '严格 tool_result 配对', tone: 'green' },
        ],
        [
          { id: 't1', laneId: 'tools', start: 5, end: 36, label: 'bash_1 执行完毕', tone: 'green', status: 'done' },
          { id: 'q1', laneId: 'queue', start: 22, end: 38, label: '用户输入 Steering', tone: 'blue', status: 'running' },
          { id: 't2', laneId: 'tools', start: 40, end: 56, label: 'edit_2 → Skipped', tone: 'rose', status: 'blocked' },
          { id: 't3', laneId: 'tools', start: 58, end: 72, label: 'bash_3 → Skipped', tone: 'rose', status: 'blocked' },
          { id: 'c1', laneId: 'ctx', start: 75, end: 96, label: '注入 Steering → 新 LLM 推理', tone: 'green', status: 'running' },
        ],
        [
          { id: 'ev1', laneId: 'tools', pos: 38, label: '边界命中 Steering!', tone: 'orange', emphasized: true },
        ],
      ),
    },
    {
      shortLabel: 'Follow-up 优雅续接',
      badge: 'TECHNIQUE',
      title: 'Follow-up：等手头工作彻底收尾再接下一棒',
      paragraphs: [
        '如果用户把消息投递到 `followUpQueue`，内层循环在工具边界完全不会理会它，模型会安心把 3 个工具全部跑完、验证通过、给出完整总结。',
        '等内层循环跳出后，外层循环才取出 Follow-up 消息，作为新的一轮 `turn_start` 喂给模型，且全程共享同一个 `agent_start` / `agent_end` 生命周期和同一份上下文。',
      ],
      kpis: [
        kpi('打断当前工具', '绝不打断', 'good'),
        kpi('触发时机', '内层收敛后', 'neutral'),
        kpi('上下文继承', '无缝衔接', 'good'),
      ],
      scene: swim(
        'Follow-up 队列等待内层收敛后接力',
        [
          { id: 'inner', label: '内层循环', sublabel: '当前任务', tone: 'green' },
          { id: 'fq', label: 'followUpQueue', sublabel: '待办队列', tone: 'violet' },
          { id: 'outer', label: '外层循环', sublabel: '下一棒', tone: 'blue' },
        ],
        [
          { id: 'i1', laneId: 'inner', start: 5, end: 52, label: '完成全部工具并输出总结', tone: 'green', status: 'done' },
          { id: 'f1', laneId: 'fq', start: 20, end: 55, label: '排队等待（不打断内层）', tone: 'violet', status: 'queued' },
          { id: 'o1', laneId: 'outer', start: 58, end: 95, label: '消费 Follow-up → 开启下一轮', tone: 'blue', status: 'running' },
        ],
        [{ id: 'ev', laneId: 'outer', pos: 56, label: '内层收敛 → 出队', tone: 'violet', emphasized: true }],
      ),
    },
    {
      shortLabel: '队列消费策略',
      badge: 'INSIGHT',
      title: 'one-at-a-time vs all：一次吃一条还是全吞？',
      paragraphs: [
        '如果用户在 5 秒内连续敲了 3 条 Steering 或 Follow-up，应该一次性全部注入还是逐条消化？`Agent` 类把决定权交给 `steeringMode` 和 `followUpMode` 两个配置项。',
        '默认的 `one-at-a-time` 每次只弹出队首一条，防止多条指令混在一起互相冲突；`all` 则一次性清空整条队列，适合批量补充多条约束条件。你可以在上方切换到**「实验台」**亲手体验这两种队列的实时调度！',
      ],
      kpis: [
        kpi('默认模式', 'one-at-a-time', 'good'),
        kpi('批量模式', 'all', 'neutral'),
        kpi('互动体验', '支持实验台模拟', 'good'),
      ],
      scene: iso(
        '队列消费策略对比',
        [
          { id: 'q', x: 80, y: 215, label: '队列 [M1, M2, M3]', sublabel: '用户连续追加 3 条消息', tone: 'orange', size: 'lg', icon: 'inbox' },
          { id: 'one', x: 480, y: 105, label: 'one-at-a-time（默认）', sublabel: '只弹 M1，[M2, M3] 留待下轮', tone: 'green', size: 'lg', active: true, icon: 'layers' },
          { id: 'all', x: 480, y: 325, label: 'all（批量合并）', sublabel: '一次弹出 [M1, M2, M3] 全部注入', tone: 'violet', size: 'lg', icon: 'layers' },
        ],
        [
          { from: 'q', to: 'one', label: 'shift()', status: 'active', packetCount: 1, packetLabel: 'M1' },
          { from: 'q', to: 'all', label: 'splice(0)', dashed: true, packetCount: 2, packetLabel: 'M1..M3' },
        ],
      ),
    },
    {
      shortLabel: '循环复盘',
      badge: 'RECAP',
      title: '双层循环与双队列复盘',
      paragraphs: [
        '这一课是 Pi 体验丝滑的核心秘密：不阻塞输入、不粗暴强杀、不破坏 `tool_use`/`tool_result` 配对，用不到 100 行代码实现了业界最自然的实时人机协同循环。',
      ],
      recapTable: [
        { question: 'Steering 和 Follow-up 的本质区别？', decision: '前者在内层工具边界消费，后者在外层收敛后消费', because: '分别对应「立即纠偏」和「完成后顺手做」两种截然不同的用户意图。' },
        { question: '跳过未执行工具如何不触发 API 报错？', decision: '为每个被跳过的 toolCall 合成 Skipped toolResult', because: '严格维护 LLM 协议要求的 tool_use / tool_result 一一配对不变量。' },
        { question: '多条排队消息怎么避免模型顾此失彼？', decision: '默认 one-at-a-time 逐条出队，可按需切 all', because: '让模型每次聚焦一条增量指令，节奏更可控。' },
      ],
      kpis: [
        kpi('核心文件', 'agent-loop.ts', 'good'),
        kpi('不变量', 'tool_result 完整配对', 'good'),
        kpi('实验台', '可切顶部「实验台」体验', 'good'),
      ],
      scene: iso('Steering & Follow-up 总览', [
        { id: 's', x: 180, y: 200, label: 'Steering Queue', tone: 'orange', active: true },
        { id: 'l', x: 450, y: 200, label: 'agentLoop', tone: 'green', active: true },
        { id: 'f', x: 720, y: 200, label: 'Follow-up Queue', tone: 'violet' },
      ], [
        { from: 's', to: 'l', packetCount: 1 },
        { from: 'f', to: 'l', packetCount: 1 },
      ]),
    },
  ]),
);

// ---------------------------------------------------------------------------
// CH2 · 2/2 · EventStream 流式事件总线
// ---------------------------------------------------------------------------
const L_PI_EVENTS = lesson(
  'pi-event-stream',
  'pi-ch02',
  2,
  '双层循环与实时队列',
  2,
  2,
  'EventStream 异步事件流与生命周期',
  'Pi 用强类型的 AsyncIterable EventStream 贯通整个运行期：从 agent_start 到 turn_end，每个颗粒度变化都有迹可循。',
  9,
  '核心',
  [
    { text: '掌握 AgentEvent 完整生命周期层级（agent → turn → message → tool）', completedAtStep: 3 },
    { text: '理解 EventStream 的 push / end / result() 背压与终态承诺机制', completedAtStep: 5 },
    { text: '说出为何纯事件流让日志审计、TUI 渲染和 RPC 转发高度一致', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: '回调地狱',
      badge: 'PROBLEM',
      title: '如果给每个状态变化写回调函数，代码会变成什么？',
      paragraphs: [
        '流式 Agent 运行期间有十几类状态变化：开始回答、吐出思考字、吐出正文、开始调工具、工具吐出增量日志、工具结束、开启下一轮……如果靠 `onText`、`onToolStart`、`onError` 等一堆零散回调，订阅者很难保证顺序一致，也极难序列化成 RPC。',
      ],
      kpis: [
        kpi('事件模型', '单一有序流', 'good'),
        kpi('消费协议', 'AsyncIterable', 'good'),
        kpi('层级嵌套', '4 级生命周期', 'neutral'),
      ],
      scene: iso(
        '单一有序事件流 vs 零散回调',
        [
          { id: 'loop', x: 100, y: 215, label: 'agentLoop', sublabel: '按严格时序 stream.push(event)', tone: 'green', size: 'lg', active: true, icon: 'refresh-cw' },
          { id: 'es', x: 450, y: 215, label: 'EventStream<AgentEvent>', sublabel: 'for await (const ev of stream)', tone: 'blue', size: 'lg', active: true, icon: 'layers' },
          { id: 'c1', x: 780, y: 95, label: 'TUI 渲染器', tone: 'violet', icon: 'terminal' },
          { id: 'c2', x: 780, y: 215, label: 'SessionManager', tone: 'orange', icon: 'database' },
          { id: 'c3', x: 780, y: 335, label: 'RPC / 扩展监听', tone: 'blue', icon: 'globe' },
        ],
        [
          { from: 'loop', to: 'es', status: 'active', packetCount: 3, packetLabel: 'AgentEvent' },
          { from: 'es', to: 'c1', packetCount: 1 },
          { from: 'es', to: 'c2', packetCount: 1 },
          { from: 'es', to: 'c3', packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: '四级事件嵌套',
      badge: 'TECHNIQUE',
      title: '严格成对的四级生命周期事件',
      paragraphs: [
        'Pi 的 `AgentEvent` 像 HTML 标签一样严格成对嵌套：`agent_start` 包裹若干个 `turn_start / turn_end`，每个 `turn` 内包含 `message_start / message_update / message_end` 以及 `tool_execution_start / update / end`。',
        '因为成对且有序，任何 UI 都可以用极简的有限状态机渲染出加载动画、可折叠工具卡片和准确的耗时统计。',
      ],
      sourceDrawer: piSrc(
        'AgentEvent 联合类型定义',
        'packages/agent/src/types.ts',
        'ts',
        `export type AgentEvent =
  | { type: 'agent_start' }
  | { type: 'agent_end'; messages: AgentMessage[] }
  | { type: 'turn_start' }
  | { type: 'turn_end'; message: AgentMessage; toolResults: ToolResultMessage[] }
  | { type: 'message_start'; message: AgentMessage }
  | { type: 'message_update'; message: AgentMessage; assistantMessageEvent: AssistantMessageEvent }
  | { type: 'message_end'; message: AgentMessage }
  | { type: 'tool_execution_start'; toolCallId: string; toolName: string; args: any }
  | { type: 'tool_execution_update'; toolCallId: string; partialResult: any }
  | { type: 'tool_execution_end'; toolCallId: string; result: any; isError: boolean };`,
        '四级严格成对事件，完整刻画单次 Agent Run 的全部可观测面。',
      ),
      kpis: [
        kpi('事件总数', '10 种联合类型', 'good'),
        kpi('结构特性', '严格成对嵌套', 'good'),
        kpi('可序列化', '100% JSON 友好', 'good'),
      ],
      scene: tree(
        'AgentEvent 四级生命周期嵌套树',
        [
          { id: 'ag', x: 500, y: 55, kind: 'root', label: 'agent_start ... agent_end', sublabel: '整次 prompt() 运行', status: 'active' },
          { id: 't1', x: 260, y: 195, kind: 'event', label: 'turn_start #1', sublabel: '首轮推理 + 工具', parentId: 'ag', status: 'done' },
          { id: 't2', x: 740, y: 195, kind: 'event', label: 'turn_start #2', sublabel: '汇总并回复用户', parentId: 'ag', status: 'highlight' },
          { id: 'm1', x: 130, y: 360, kind: 'assistant', label: 'message_start/update/end', sublabel: '流式产出 toolCall', parentId: 't1' },
          { id: 'tl', x: 400, y: 360, kind: 'tool', label: 'tool_execution_*', sublabel: 'start → update → end', parentId: 't1', status: 'active' },
          { id: 'm2', x: 740, y: 360, kind: 'assistant', label: 'message_start/update/end', sublabel: '流式输出最终答案', parentId: 't2' },
        ],
        [
          { from: 'ag', to: 't1', animated: true },
          { from: 'ag', to: 't2', animated: true },
          { from: 't1', to: 'm1' },
          { from: 't1', to: 'tl', animated: true },
          { from: 't2', to: 'm2' },
        ],
      ),
    },
    {
      shortLabel: 'EventStream 内部',
      badge: 'SOLUTION',
      title: 'EventStream：同时是异步迭代器，也是终态 Promise',
      paragraphs: [
        '`packages/ai/src/utils/event-stream.ts` 里的 `EventStream<T, R>` 设计非常巧妙：它内部维护一个待消费队列 `queue` 和等待者列表 `waiting`，实现了标准 `[Symbol.asyncIterator]()`。',
        '同时它提供一个 `result(): Promise<R>` 方法——如果你不需要渲染中间流，只想拿最终结果，直接 `await stream.result()` 即可，不必自己手写 `for await` 收集。',
      ],
      kpis: [
        kpi('流式消费', 'for await (...)', 'good'),
        kpi('终态获取', 'await stream.result()', 'good'),
        kpi('依赖数量', '0 第三方库', 'good'),
      ],
      scene: iso(
        'EventStream 双向消费模型',
        [
          { id: 'prod', x: 80, y: 215, label: 'Producer', sublabel: 'stream.push(ev) / stream.end(res)', tone: 'green', size: 'lg', active: true, icon: 'refresh-cw' },
          { id: 'buf', x: 430, y: 215, label: 'EventStream<T, R>', sublabel: 'queue[] + waiting[] + finalPromise', tone: 'blue', size: 'lg', active: true, icon: 'inbox' },
          { id: 'iter', x: 770, y: 115, label: '流式消费者', sublabel: 'for await 逐帧渲染', tone: 'violet', icon: 'terminal' },
          { id: 'res', x: 770, y: 315, label: '批处理消费者', sublabel: 'await stream.result()', tone: 'orange', icon: 'check-circle' },
        ],
        [
          { from: 'prod', to: 'buf', status: 'active', packetCount: 2, packetLabel: 'push' },
          { from: 'buf', to: 'iter', status: 'active', packetCount: 2 },
          { from: 'buf', to: 'res', dashed: true, packetCount: 1, packetLabel: 'R' },
        ],
      ),
    },
    {
      shortLabel: '状态同步与订阅',
      badge: 'TECHNIQUE',
      title: 'Agent.subscribe()：UI 永远不直接改状态',
      paragraphs: [
        '在 `Agent` 包装类里，所有事件首先同步更新 `_state`（如 `isStreaming`、`streamMessage`、`pendingToolCalls`、`messages`），然后再广播给 `subscribe()` 注册的监听者。',
        '这意味着 UI 收到 `message_update` 时，既可以用事件里的增量 delta，也可以直接读取一致性完备的 `agent.state`，彻底杜绝竞态撕裂。',
      ],
      kpis: [
        kpi('更新顺序', '先改 State 再广播', 'good'),
        kpi('多订阅者', 'Set<Listener>', 'neutral'),
        kpi('取消订阅', '返回 unsubscribe()', 'good'),
      ],
      scene: swim(
        '单条 message_update 事件的处理顺序',
        [
          { id: 'es', label: 'EventStream', tone: 'blue' },
          { id: 'st', label: 'Agent._state', tone: 'green' },
          { id: 'ui', label: 'Listeners', tone: 'violet' },
        ],
        [
          { id: 's1', laneId: 'es', start: 5, end: 28, label: '产出 message_update', tone: 'blue', status: 'done' },
          { id: 's2', laneId: 'st', start: 30, end: 58, label: '原子更新 streamMessage', tone: 'green', status: 'done' },
          { id: 's3', laneId: 'ui', start: 62, end: 95, label: '广播给 TUI / Session / Ext', tone: 'violet', status: 'running' },
        ],
      ),
    },
    {
      shortLabel: '中断与错误收口',
      badge: 'INSIGHT',
      title: 'AbortSignal 中断也走同一套事件收口',
      paragraphs: [
        '用户主动中止或 API 超时错误时，`agentLoop` 不会把流挂死在半空中：它会把最后一条消息标记为 `stopReason: "aborted"` 或 `"error"`，依次补发 `message_end`、`turn_end` 和 `agent_end`，然后安全关闭 `EventStream`。',
        '下游消费者永远不需要写一堆防悬挂超时逻辑。',
      ],
      kpis: [
        kpi('异常收口', '保证发射 agent_end', 'good'),
        kpi('错误状态', 'stopReason 字段承载', 'neutral'),
        kpi('流泄漏风险', '0', 'good'),
      ],
      scene: iso(
        '异常 / 中断的完整收口路径',
        [
          { id: 'ab', x: 90, y: 210, label: 'AbortSignal / API Error', sublabel: '取消或网络异常', tone: 'rose', size: 'lg', icon: 'alert-triangle' },
          { id: 'msg', x: 430, y: 210, label: 'stopReason: aborted|error', sublabel: '写回错误消息并补齐 end 事件', tone: 'orange', size: 'lg', active: true, icon: 'shield' },
          { id: 'end', x: 770, y: 210, label: 'agent_end + stream.end()', sublabel: '下游安全释放锁与光标', tone: 'green', size: 'lg', icon: 'check-circle' },
        ],
        [
          { from: 'ab', to: 'msg', status: 'error', packetCount: 1 },
          { from: 'msg', to: 'end', status: 'active', packetCount: 2, packetLabel: 'clean close' },
        ],
      ),
    },
    {
      shortLabel: '事件流复盘',
      badge: 'RECAP',
      title: 'EventStream 复盘',
      paragraphs: [
        '统一有序的事件流是 Pi 做到「一核多端」的关键胶水：不管是终端、Web、IDE 还是单元测试，都只需面对同一种 `AgentEvent` 契约。',
      ],
      recapTable: [
        { question: '为什么不用多回调接口而用 EventStream？', decision: '单一有序 AsyncIterable 联合类型流', because: '天然保序、易序列化成 JSONL RPC，且支持 for-await 与 result() 双消费。' },
        { question: '怎么防止 UI 与内部状态不同步？', decision: '先原子更新 Agent._state，再广播事件', because: '监听者任何时刻读取 state 都是最新一致快照。' },
        { question: '出错或 Abort 时消费者会死等吗？', decision: '统一补齐 *_end 与 agent_end 后关闭流', because: '把异常转为一等事件，彻底杜绝悬挂 Promise。' },
      ],
      kpis: [
        kpi('事件种类', '10 种', 'good'),
        kpi('终态保障', '必然 agent_end', 'good'),
        kpi('零依赖实现', 'EventStream<T,R>', 'good'),
      ],
      scene: iso('EventStream 复盘', [
        { id: 'a', x: 200, y: 200, label: 'agentLoop', tone: 'green' },
        { id: 'b', x: 500, y: 200, label: 'EventStream', tone: 'blue', active: true },
        { id: 'c', x: 800, y: 200, label: 'TUI / RPC / Log', tone: 'violet' },
      ], [
        { from: 'a', to: 'b', packetCount: 1 },
        { from: 'b', to: 'c', packetCount: 1 },
      ]),
    },
  ]),
);

// ---------------------------------------------------------------------------
// CH3 · 1/2 · transformContext 与 convertToLlm 两阶段上下文工程
// ---------------------------------------------------------------------------
const L_PI_CONTEXT = lesson(
  'pi-context-pipeline',
  'pi-ch03',
  3,
  '上下文流水线与树形会话',
  1,
  2,
  '两阶段上下文工程：transformContext 与 convertToLlm',
  'Pi 把「人类看到的富会话状态（AgentMessage）」与「发给模型 API 的标准消息（Message）」彻底分开，每次请求前过两道纯函数管线。',
  11,
  '核心',
  [
    { text: '区分应用层 AgentMessage 与模型协议层 Message 的边界', completedAtStep: 2 },
    { text: '掌握 transformContext（动态裁剪/注入）与 convertToLlm（协议投影）的分工', completedAtStep: 4 },
    { text: '理解为什么「历史只增不改、发前动态投影」让扩展和调试极其安全', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: '污染的真相',
      badge: 'PROBLEM',
      title: '把 UI 提示、压缩标记和模型消息混在一张数组里',
      paragraphs: [
        '真实编程助手的会话里，远不止 `user` 和 `assistant`：还有「模型切换通知」、「分支摘要」、「用户执行的 `!git status` 终端输出」、「扩展注入的诊断卡片」。',
        '如果直接把这些塞进发给 OpenAI/Anthropic 的 `messages` 数组，API 立刻报 400 schema 错误；如果为了发 API 而直接修改原始会话数组，UI 展示和持久化历史又会被破坏。',
      ],
      kpis: [
        kpi('内部类型', 'AgentMessage（可扩展）', 'good'),
        kpi('协议类型', 'Message（严格 3 角色）', 'good'),
        kpi('原始历史', '永不破坏', 'good'),
      ],
      scene: iso(
        '应用层消息 vs LLM 协议消息',
        [
          { id: 'hist', x: 70, y: 205, label: 'AgentMessage[]', sublabel: '含 bashExecution / compaction / custom UI 消息', tone: 'violet', size: 'lg', icon: 'database' },
          { id: 't1', x: 380, y: 205, label: '1 · transformContext()', sublabel: '裁剪 / 压缩投影 / 注入动态上下文', tone: 'blue', size: 'lg', active: true, icon: 'layers' },
          { id: 't2', x: 690, y: 205, label: '2 · convertToLlm()', sublabel: '过滤纯 UI 项 → 映射为 user/assistant/toolResult', tone: 'green', size: 'lg', active: true, icon: 'brain' },
        ],
        [
          { from: 'hist', to: 't1', status: 'active', packetCount: 2, packetLabel: 'AgentMessage[]' },
          { from: 't1', to: 't2', status: 'active', packetCount: 2, packetLabel: '已整理视图' },
        ],
      ),
    },
    {
      shortLabel: '声明合并扩展类型',
      badge: 'TECHNIQUE',
      title: 'CustomAgentMessages：类型安全的自定义消息',
      paragraphs: [
        'Pi 在 `packages/agent/src/types.ts` 中使用 TypeScript 声明合并（`interface CustomAgentMessages {}`），允许上层应用和扩展自由定义自己的消息类型（如 `bashExecution`、`branchSummary`、`compactionSummary`），并作为一等公民保存在 `AgentState.messages` 里。',
      ],
      sourceDrawer: piSrc(
        '两阶段上下文管线调用点',
        'packages/agent/src/agent-loop.ts',
        'ts',
        `// 每次调用 LLM 前，原历史保持不变，实时经过两道纯函数投影
let messages = context.messages;
if (config.transformContext) {
  messages = await config.transformContext(messages, signal);
}

// 将应用层 AgentMessage[] 转换为严格符合模型 API 的 Message[]
const llmMessages = await config.convertToLlm(messages);

const llmContext: Context = {
  systemPrompt: context.systemPrompt,
  messages: llmMessages,
  tools: context.tools,
};`,
        'transformContext 面向上下文工程，convertToLlm 面向协议归一化，互不越界。',
      ),
      kpis: [
        kpi('执行时机', '每次 LLM 调用前', 'neutral'),
        kpi('阶段一', 'transformContext', 'good'),
        kpi('阶段二', 'convertToLlm', 'good'),
      ],
      scene: iso(
        '单轮推理前的只读投影管线',
        [
          { id: 'raw', x: 80, y: 120, label: '耐久会话数组', sublabel: '完整保留全部历史（不原地删改）', tone: 'dark', size: 'lg', icon: 'hard-drive' },
          { id: 'tc', x: 430, y: 120, label: 'transformContext', sublabel: '扩展钩子 context 事件可在此改写视图', tone: 'blue', size: 'lg', active: true, icon: 'plug' },
          { id: 'cv', x: 430, y: 330, label: 'convertToLlm', sublabel: '丢弃 UI-only 通知，翻译自定义消息', tone: 'green', size: 'lg', active: true, icon: 'layers' },
          { id: 'api', x: 780, y: 225, label: 'LLM API Payload', sublabel: '100% 合规 JSON', tone: 'orange', icon: 'globe' },
        ],
        [
          { from: 'raw', to: 'tc', label: '浅拷贝视图', packetCount: 1 },
          { from: 'tc', to: 'cv', status: 'active', packetCount: 2, packetLabel: 'AgentMessage[]' },
          { from: 'cv', to: 'api', status: 'active', packetCount: 2, packetLabel: 'Message[]' },
        ],
      ),
    },
    {
      shortLabel: '阶段一：transformContext',
      badge: 'SOLUTION',
      title: 'transformContext：无侵入注入记忆、RAG 与窗口裁剪',
      paragraphs: [
        '因为 `transformContext` 在**每次** LLM 请求前（包括同一轮内多次工具调用之间）都会被调用，它成为了最干净的上下文工程挂点：',
        '你可以在这里截断过长的历史工具输出、按当前编辑的文件动态注入相关规范、或者让扩展监听 `context` 事件临时附加诊断信息——而不用把这些临时数据污染进持久化会话文件。',
      ],
      kpis: [
        kpi('触发频率', '每轮 LLM 调用前', 'good'),
        kpi('扩展事件', 'context hook', 'good'),
        kpi('持久化污染', '0', 'good'),
      ],
      scene: swim(
        'transformContext 在多步工具循环中的动态投影',
        [
          { id: 'store', label: '完整历史', tone: 'violet' },
          { id: 'tc', label: 'transformContext', tone: 'blue' },
          { id: 'llm', label: 'LLM 请求', tone: 'green' },
        ],
        [
          { id: 'a1', laneId: 'store', start: 5, end: 95, label: '持续只追加写入（完整保留所有细节）', tone: 'violet', status: 'running' },
          { id: 'b1', laneId: 'tc', start: 12, end: 32, label: 'Step 1 投影', tone: 'blue', status: 'done' },
          { id: 'b2', laneId: 'tc', start: 52, end: 72, label: 'Step 2 投影（折叠旧日志）', tone: 'blue', status: 'done' },
          { id: 'c1', laneId: 'llm', start: 34, end: 48, label: '请求 #1', tone: 'green', status: 'done' },
          { id: 'c2', laneId: 'llm', start: 74, end: 90, label: '请求 #2（更省 Token）', tone: 'green', status: 'done' },
        ],
      ),
    },
    {
      shortLabel: '阶段二：convertToLlm',
      badge: 'TECHNIQUE',
      title: 'convertToLlm：把富领域消息翻译为标准三角色',
      paragraphs: [
        '在 `coding-agent` 里，`convertToLlm` 负责精确的协议翻译：',
        '1. `compactionSummary` 和 `branchSummary` 包装成结构化的 `user` 上下文块；2. 用户手敲的 `!cmd`（`bashExecution`）如果未标记排除，翻译成带命令与输出的 `user` 消息；3. 纯界面提示（如 `custom` 提示条）直接过滤丢弃。',
      ],
      kpis: [
        kpi('摘要消息', '映射为 User 上下文', 'neutral'),
        kpi('UI 通知', '过滤不发模型', 'good'),
        kpi('协议错误', '0', 'good'),
      ],
      scene: iso(
        'convertToLlm 类型映射表',
        [
          { id: 'm1', x: 80, y: 75, label: 'user / assistant / toolResult', tone: 'green', icon: 'message-square-text' },
          { id: 'm2', x: 80, y: 215, label: 'compactionSummary / bashExec', tone: 'blue', icon: 'file-text' },
          { id: 'm3', x: 80, y: 355, label: 'UI Toast / ModelChange 提示', tone: 'orange', dimmed: true, icon: 'eye' },
          { id: 'out', x: 560, y: 155, label: '标准 Message[]', sublabel: '直发 Anthropic / OpenAI / Gemini', tone: 'green', size: 'lg', active: true, icon: 'brain' },
          { id: 'drop', x: 560, y: 355, label: '过滤丢弃（仅留本地 UI）', tone: 'neutral', icon: 'pause' },
        ],
        [
          { from: 'm1', to: 'out', label: '直通', status: 'active', packetCount: 1 },
          { from: 'm2', to: 'out', label: '包装为 UserMessage', status: 'active', packetCount: 1 },
          { from: 'm3', to: 'drop', label: 'filter 掉', dashed: true, packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: 'AGENTS.md 注入',
      badge: 'INSIGHT',
      title: '系统提示词拼装：AGENTS.md 与技能按层加载',
      paragraphs: [
        '除了消息列表，`coding-agent` 还会自动从全局目录（`~/.pi/agent/AGENTS.md`）沿父目录一路向下扫描到当前工作目录，合并项目规范和 `skills` 描述，拼入 `systemPrompt`。',
        '这样模型在任何子目录启动，都能自动遵守团队约定，而不必每次手动复述。',
      ],
      kpis: [
        kpi('规范文件', 'AGENTS.md / CLAUDE.md', 'good'),
        kpi('加载方向', '全局 → 祖先 → 当前目录', 'neutral'),
        kpi('技能发现', '渐进式摘要注入', 'good'),
      ],
      scene: tree(
        'AGENTS.md 向上发现与系统提示词拼装',
        [
          { id: 'g', x: 500, y: 65, kind: 'root', label: '~/.pi/agent/AGENTS.md', sublabel: '全局个人习惯', status: 'done' },
          { id: 'r', x: 500, y: 190, kind: 'service', label: 'repo/AGENTS.md', sublabel: '仓库级架构约定', parentId: 'g', status: 'done' },
          { id: 's', x: 500, y: 315, kind: 'plugin', label: 'repo/packages/api/AGENTS.md', sublabel: '子包局部规范', parentId: 'r', status: 'active' },
          { id: 'p', x: 500, y: 445, kind: 'event', label: '最终 SystemPrompt', sublabel: '极简内置指令 + 分层规范 + 技能目录', parentId: 's', status: 'highlight' },
        ],
        [
          { from: 'g', to: 'r' },
          { from: 'r', to: 's', animated: true },
          { from: 's', to: 'p', animated: true },
        ],
      ),
    },
    {
      shortLabel: '管线复盘',
      badge: 'RECAP',
      title: '两阶段上下文工程复盘',
      paragraphs: [
        '把「状态存储」和「模型视图」解耦，是构建复杂 Agent 而不陷入泥潭的分水岭。`transformContext` + `convertToLlm` 提供了清晰、可测试的投影层。',
      ],
      recapTable: [
        { question: '为何要区分 AgentMessage 和 LLM Message？', decision: '应用层允许自定义富类型，发 API 前统一翻译', because: 'UI、压缩、扩展都需要非模型字段，直接混写会破坏 API 协议。' },
        { question: '为什么不在原地裁剪历史数组？', decision: '历史只追加，每次调用前在 transformContext 做只读投影', because: '保证日志完整可追溯，且随时能调整上下文窗口策略。' },
        { question: '项目规范如何零摩擦生效？', decision: '按目录层级自动发现 AGENTS.md 拼入 systemPrompt', because: '规范随代码库版本化管理，无需手工复制粘贴。' },
      ],
      kpis: [
        kpi('两道纯函数', 'transform → convert', 'good'),
        kpi('历史完整性', '100% 无损', 'good'),
        kpi('扩展友好度', '高', 'good'),
      ],
      scene: iso('上下文投影总览', [
        { id: 'a', x: 180, y: 200, label: 'AgentMessage[]', tone: 'violet' },
        { id: 'b', x: 480, y: 200, label: 'transform → convert', tone: 'blue', active: true },
        { id: 'c', x: 780, y: 200, label: 'LLM Message[]', tone: 'green', active: true },
      ], [
        { from: 'a', to: 'b', packetCount: 1 },
        { from: 'b', to: 'c', packetCount: 1 },
      ]),
    },
  ]),
);

// ---------------------------------------------------------------------------
// CH3 · 2/2 · JSONL 树形会话（id / parentId）与分叉导航
// ---------------------------------------------------------------------------
const L_PI_SESSION = lesson(
  'pi-session-tree',
  'pi-ch03',
  3,
  '上下文流水线与树形会话',
  2,
  2,
  'JSONL 树形会话：id / parentId 与原位分叉',
  'Pi 的会话文件不是扁平列表，而是一棵 append-only 的有向树——你可以在任意历史节点分叉探索方案，不丢弃任何一条实验路径。',
  11,
  '进阶',
  [
    { text: '理解每条 JSONL 记录为何携带 id 与 parentId', completedAtStep: 2 },
    { text: '掌握从当前 leafId 向上回溯重建线性对话路径的算法', completedAtStep: 4 },
    { text: '理解原位分支切换（/tree）与分支摘要（branch_summary）如何协作', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: '线性历史的局限',
      badge: 'PROBLEM',
      title: '方案 A 走入死胡同，想退回第 4 步试方案 B',
      paragraphs: [
        '写代码很少是一条直线。你让 Agent 用方案 A 重构了 5 轮，发现架构不合适，想回到第 4 步换方案 B——但又不想彻底删掉方案 A 的探索记录（万一方案 B 更差呢？）。',
        '如果会话存成扁平数组，回退就意味着截断丢弃历史，或者复制出一堆零散的新会话文件。',
      ],
      kpis: [
        kpi('存储格式', 'Append-Only JSONL', 'good'),
        kpi('拓扑结构', '单文件多分支树', 'good'),
        kpi('数据覆盖', '0（永不删改旧行）', 'good'),
      ],
      scene: tree(
        '同一个 JSONL 文件内的树形分叉会话',
        [
          { id: 'n1', x: 500, y: 55, kind: 'user', label: '需求：重构鉴权模块', hexId: 'a1b2c3', status: 'done' },
          { id: 'n2', x: 500, y: 175, kind: 'assistant', label: '提出方案 A / B 对比', hexId: 'd4e5f6', parentId: 'a1b2c3', status: 'done' },
          { id: 'a1', x: 240, y: 315, kind: 'tool', label: '分支 A：JWT 重构', hexId: '11a2b3', parentId: 'd4e5f6', status: 'dimmed' },
          { id: 'a2', x: 240, y: 445, kind: 'log', label: 'A 遇阻（保留存档）', hexId: '22c3d4', parentId: '11a2b3', status: 'dimmed' },
          { id: 'b1', x: 740, y: 315, kind: 'tool', label: '分支 B：Session Cookie', hexId: '77e8f9', parentId: 'd4e5f6', status: 'active' },
          { id: 'b2', x: 740, y: 445, kind: 'assistant', label: '当前 leaf（测试通过）', hexId: '88a9b0', parentId: '77e8f9', status: 'highlight', badge: 'leafId' },
        ],
        [
          { from: 'n1', to: 'n2' },
          { from: 'n2', to: 'a1', label: '分支 A' },
          { from: 'a1', to: 'a2' },
          { from: 'n2', to: 'b1', label: '分支 B', animated: true },
          { from: 'b1', to: 'b2', animated: true },
        ],
        [{ x: 500, y: 380, text: '两条分支共存于同一 .jsonl，切换只需移动 leafId 指针', tone: 'blue' }],
      ),
    },
    {
      shortLabel: 'id / parentId 链',
      badge: 'TECHNIQUE',
      title: '像 Git Commit 一样存储会话条目',
      paragraphs: [
        '在 `packages/coding-agent/src/core/session-manager.ts` 里，每个会话文件首行是 `session` 头（含版本号、cwd、时间戳），随后每一行都是一个带唯一 `id` 和 `parentId` 的 `SessionEntry`。',
        '新消息、模型切换、思考级别变更、压缩摘要、分支摘要和自定义扩展状态，全部按统一树节点追加写到文件末尾。',
      ],
      sourceDrawer: piSrc(
        'SessionManager 树节点基础结构',
        'packages/coding-agent/src/core/session-manager.ts',
        'ts',
        `export interface SessionEntryBase {
  type: string;
  id: string;
  parentId: string | null;
  timestamp: string;
}

export interface SessionMessageEntry extends SessionEntryBase {
  type: 'message';
  message: AgentMessage;
}

export interface BranchSummaryEntry extends SessionEntryBase {
  type: 'branch_summary';
  fromId: string;
  summary: string;
}`,
        '每行一个 JSON 对象，仅追加写入，天然抗崩溃且支持 Git 式分叉。',
      ),
      kpis: [
        kpi('节点指针', 'id + parentId', 'good'),
        kpi('写入模式', '只追加（O(1)）', 'good'),
        kpi('条目类型', '消息/模型/压缩/摘要', 'neutral'),
      ],
      scene: tree(
        'JSONL 文件物理行顺序 vs 逻辑父子指针',
        [
          { id: 'h', x: 250, y: 80, kind: 'root', label: 'Header v3', hexId: 'sess01', status: 'done' },
          { id: 'e1', x: 250, y: 210, kind: 'user', label: 'User #1', hexId: 'e10a2b', parentId: 'null', status: 'done' },
          { id: 'e2', x: 250, y: 340, kind: 'assistant', label: 'Assistant #1', hexId: 'e20c3d', parentId: 'e10a2b', status: 'done' },
          { id: 'e3', x: 250, y: 470, kind: 'user', label: '分支 B 新提问', hexId: 'e40f5a', parentId: 'e20c3d', status: 'active' },
        ],
        [
          { from: 'h', to: 'e1' },
          { from: 'e1', to: 'e2' },
          { from: 'e2', to: 'e3', animated: true },
        ],
        undefined,
        {
          title: '~/.pi/agent/sessions/2026-11-25.jsonl',
          lines: [
            { text: '{"type":"session","version":3,"id":"sess01","cwd":"/app"}', muted: true },
            { text: '{"type":"message","id":"e10a2b","parentId":null,"message":{...}}' },
            { text: '{"type":"message","id":"e20c3d","parentId":"e10a2b","message":{...}}' },
            { text: '{"type":"message","id":"e30d4e","parentId":"e20c3d","message":{...}}', muted: true },
            { text: '{"type":"message","id":"e40f5a","parentId":"e20c3d","message":{...}}', highlight: true },
          ],
        },
      ),
    },
    {
      shortLabel: '路径重建算法',
      badge: 'SOLUTION',
      title: 'buildSessionContext()：从 leafId 向上回溯拼出线性上下文',
      paragraphs: [
        'LLM 只能接收线性消息列表，那树形文件怎么发给模型？`SessionManager.buildSessionContext()` 从当前激活的 `leafId` 出发，沿着 `parentId` 一路回溯到根节点，再反转数组，就得到当前分支精确的线性路径！',
        '如果路径上遇到 `compaction` 节点，算法自动从该摘要节点开始截断旧消息，只保留 `firstKeptEntryId` 之后的新消息，做到 O(路径长度) 瞬时重建。',
      ],
      kpis: [
        kpi('回溯起点', 'current leafId', 'good'),
        kpi('压缩感知', '自动识别 compaction 节点', 'good'),
        kpi('状态还原', '同时恢复 model/thinking', 'neutral'),
      ],
      scene: iso(
        '从 leafId 回溯构建线性上下文',
        [
          { id: 'leaf', x: 80, y: 215, label: 'leafId (e40f5a)', sublabel: '当前分支末梢指针', tone: 'green', size: 'lg', active: true, icon: 'git-branch' },
          { id: 'walk', x: 420, y: 215, label: '沿 parentId 回溯', sublabel: '跳过旁支节点 · 遇 compaction 截断', tone: 'blue', size: 'lg', active: true, icon: 'refresh-cw' },
          { id: 'ctx', x: 760, y: 215, label: 'SessionContext', sublabel: '线性 messages + model + thinkingLevel', tone: 'violet', size: 'lg', icon: 'layers' },
        ],
        [
          { from: 'leaf', to: 'walk', status: 'active', packetCount: 2, packetLabel: 'parentId ↑' },
          { from: 'walk', to: 'ctx', status: 'active', packetCount: 2, packetLabel: 'reverse()' },
        ],
      ),
    },
    {
      shortLabel: '跨分支带走经验',
      badge: 'INSIGHT',
      title: 'branch_summary：放弃分支 A，但把踩坑结论带给分支 B',
      paragraphs: [
        '当你用 `/tree` 从死胡同分支 A 切回公共祖先准备开启分支 B 时，Pi 允许你一键对刚离开的分支 A 生成一份 `branch_summary` 节点挂在切换点上。',
        '这样分支 B 一开始就知道「方案 A 已经试过且因为某依赖不兼容失败了」，既拥有干净的上下文窗口，又不会重复踩同样的坑。',
      ],
      kpis: [
        kpi('摘要节点', 'branch_summary', 'good'),
        kpi('Token 节省', '丢弃试错噪音，留结论', 'good'),
        kpi('触发命令', '/tree 导航器', 'neutral'),
      ],
      scene: tree(
        '带摘要切换分支：把经验装进轻量节点',
        [
          { id: 'anc', x: 500, y: 70, kind: 'user', label: '公共祖先节点', hexId: 'd4e5f6', status: 'done' },
          { id: 'old', x: 200, y: 240, kind: 'tool', label: '被放弃的分支 A（30 轮试错）', hexId: '22c3d4', parentId: 'd4e5f6', status: 'dimmed' },
          { id: 'sum', x: 640, y: 240, kind: 'log', label: 'branch_summary 节点', sublabel: '提炼：方案 A 踩坑结论（200 tokens）', hexId: '99b1c2', parentId: 'd4e5f6', status: 'active', badge: '精华继承' },
          { id: 'newb', x: 640, y: 420, kind: 'assistant', label: '分支 B 新起点', hexId: 'a0c2d3', parentId: '99b1c2', status: 'highlight' },
        ],
        [
          { from: 'anc', to: 'old' },
          { from: 'old', to: 'sum', label: 'LLM 摘要提炼', animated: true },
          { from: 'anc', to: 'sum', animated: true },
          { from: 'sum', to: 'newb', animated: true },
        ],
      ),
    },
    {
      shortLabel: '轻量与持久双模式',
      badge: 'TECHNIQUE',
      title: 'inMemory() 与 open()：同一套 API 兼顾单测与落盘',
      paragraphs: [
        '`SessionManager` 既支持落盘到 `~/.pi/agent/sessions/`，也提供 `SessionManager.inMemory()` 内存工厂。并且直到真正出现第一条助手回复之前，甚至延迟创建物理文件（避免空会话垃圾文件铺满磁盘）。',
      ],
      kpis: [
        kpi('延迟落盘', '首条有效回复才建文件', 'good'),
        kpi('内存模式', 'SessionManager.inMemory()', 'good'),
        kpi('人类可读', '纯文本 JSONL', 'neutral'),
      ],
      scene: iso(
        'SessionManager 持久化策略',
        [
          { id: 'sm', x: 100, y: 215, label: 'SessionManager', sublabel: '内存树索引 byId Map<id, Entry>', tone: 'violet', size: 'lg', active: true, icon: 'database' },
          { id: 'disk', x: 560, y: 110, label: '本地 JSONL 文件', sublabel: 'appendFileSync 逐行刷盘', tone: 'green', size: 'lg', icon: 'hard-drive' },
          { id: 'mem', x: 560, y: 320, label: 'inMemory 模式', sublabel: '--no-session / SDK / 自动化测试', tone: 'blue', size: 'lg', icon: 'cpu' },
        ],
        [
          { from: 'sm', to: 'disk', label: 'persist: true', status: 'active', packetCount: 1 },
          { from: 'sm', to: 'mem', label: 'persist: false', dashed: true, packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: '会话树复盘',
      badge: 'RECAP',
      title: '树形 JSONL 会话复盘',
      paragraphs: [
        '把 Git 的 DAG/树思想引入对话日志，是 Pi 极简却极强的设计：无需数据库，一个纯文本 `.jsonl` 文件就同时支持崩坏恢复、多路径探索、摘要继承和无损审计。',
      ],
      recapTable: [
        { question: '为什么每条消息都要带 id 和 parentId？', decision: '在单份只追加 JSONL 中表达完整对话树', because: '探索分支、回退重试都不需删除或覆盖历史记录。' },
        { question: '树形存储怎么发给只能读线性数组的 LLM？', decision: 'buildSessionContext() 从 leafId 向上回溯反转', because: '按需投影当前分支，遇 compaction 节点自动截断旧轮次。' },
        { question: '切走分支时如何不丢失已发现的教训？', decision: '生成 branch_summary 节点挂接在新分支起点', because: '用极少 Token 跨分支传递关键结论。' },
      ],
      kpis: [
        kpi('文件格式', 'JSONL 树', 'good'),
        kpi('指针操作', 'O(1) 切分支', 'good'),
        kpi('数据库依赖', '0', 'good'),
      ],
      scene: tree('树形会话总览', [
        { id: 'r', x: 500, y: 100, kind: 'root', label: 'root' },
        { id: 'a', x: 300, y: 320, kind: 'log', label: 'Branch A', parentId: 'r' },
        { id: 'b', x: 700, y: 320, kind: 'assistant', label: 'Branch B (leaf)', parentId: 'r', status: 'active' },
      ], [
        { from: 'r', to: 'a' },
        { from: 'r', to: 'b', animated: true },
      ]),
    },
  ]),
);

// ---------------------------------------------------------------------------
// CH4 · 1/2 · 上下文自动压缩与活跃文件追踪
// ---------------------------------------------------------------------------
const L_PI_COMPACT = lesson(
  'pi-compaction',
  'pi-ch04',
  4,
  '压缩与扩展生态',
  1,
  2,
  '上下文自动压缩与活跃文件追踪',
  '长会话逼近上下文窗口上限时，Pi 通过 core/compaction/compaction.ts 精确切分新旧边界、追踪读写文件清单并生成可回溯的压缩节点。',
  10,
  '进阶',
  [
    { text: '掌握 Pi 压缩切割点（firstKeptEntryId）如何保证不切断工具调用对', completedAtStep: 2 },
    { text: '理解活跃文件追踪（readFiles / modifiedFiles）为何在压缩后保留', completedAtStep: 4 },
    { text: '了解如何通过 session_before_compact 钩子自定义压缩模型与提示词', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: '爆窗危机',
      badge: 'PROBLEM',
      title: '长任务跑了 60 轮，Token 撞上上下文天花板',
      paragraphs: [
        '连续重构大型仓库时，几十轮文件读取与测试输出很快就能把 200K 上下文窗口填满。如果粗暴截断最早的 50% 消息，模型瞬间失忆——忘了最初目标、忘了改过哪些文件、甚至可能把 `tool_use` 切掉一半导致 API 报错。',
      ],
      kpis: [
        kpi('触发条件', '接近 contextWindow 阈值', 'warn'),
        kpi('源码位置', 'core/compaction/compaction.ts', 'neutral'),
        kpi('数据安全', '旧消息仍在 JSONL 中', 'good'),
      ],
      scene: iso(
        '上下文窗口逼近阈值',
        [
          { id: 'old', x: 80, y: 205, label: '早期历史（待摘要）', sublabel: '第 1–42 轮探索与测试日志', tone: 'orange', size: 'lg', meter: { value: 85, label: 'Token 占比' }, icon: 'database' },
          { id: 'cut', x: 420, y: 205, label: 'findCutPoint()', sublabel: '寻找合法切分边界（不拆散 toolCall）', tone: 'violet', size: 'lg', active: true, icon: 'shield' },
          { id: 'keep', x: 750, y: 205, label: '近期窗口（原样保留）', sublabel: '保留最近 keepRecentTokens', tone: 'green', size: 'lg', icon: 'layers' },
        ],
        [
          { from: 'old', to: 'cut', status: 'active', packetCount: 2, packetLabel: '压缩区' },
          { from: 'cut', to: 'keep', status: 'active', packetCount: 1, packetLabel: 'firstKeptEntryId' },
        ],
      ),
    },
    {
      shortLabel: '安全切割点',
      badge: 'TECHNIQUE',
      title: 'findCutPoint：绝不在 toolCall 和 toolResult 中间下刀',
      paragraphs: [
        '`compaction.ts` 从最新消息往前累计 Token，达到 `keepRecentTokens` 预算后，并不是原地一刀切，而是对齐到最近的安全切点（用户消息或完整助手轮次起点）。',
        '切点之前的所有记录交给摘要模型压缩；切点（`firstKeptEntryId`）之后的近期轮次一字不动原样保留，确保模型对正在编辑的代码仍有 100% 精细记忆。',
      ],
      sourceDrawer: piSrc(
        'CompactionEntry 与文件状态追踪',
        'packages/coding-agent/src/core/compaction/compaction.ts',
        'ts',
        `export interface CompactionResult {
  summary: string;
  firstKeptEntryId: string;
  tokensBefore: number;
  details: {
    readFiles: string[];
    modifiedFiles: string[];
  };
}`,
        '压缩结果同时沉淀结构化摘要文本与累计读写过的文件清单。',
      ),
      kpis: [
        kpi('切分定位', 'firstKeptEntryId', 'good'),
        kpi('保留策略', 'keepRecentTokens', 'neutral'),
        kpi('切错工具对', '0（强制边界对齐）', 'good'),
      ],
      scene: swim(
        '历史消息切片与安全边界对齐',
        [
          { id: 'msg', label: '历史轮次', tone: 'blue' },
          { id: 'act', label: '压缩动作', tone: 'green' },
        ],
        [
          { id: 'm1', laneId: 'msg', start: 4, end: 56, label: '早期轮次 1..42（送入摘要）', tone: 'orange', status: 'done' },
          { id: 'm2', laneId: 'msg', start: 58, end: 96, label: '最近轮次 43..50（原样保留）', tone: 'green', status: 'running' },
          { id: 'a1', laneId: 'act', start: 4, end: 56, label: '提取文件操作 + 生成结构化摘要', tone: 'violet', status: 'done' },
          { id: 'a2', laneId: 'act', start: 58, end: 96, label: '从 firstKeptEntryId 直接拼接', tone: 'blue', status: 'done' },
        ],
        [{ id: 'cut', laneId: 'msg', pos: 57, label: 'firstKeptEntryId', tone: 'violet', emphasized: true }],
      ),
    },
    {
      shortLabel: '活跃文件追踪',
      badge: 'SOLUTION',
      title: 'readFiles / modifiedFiles：把工作现场钉在摘要里',
      paragraphs: [
        '纯自然语言摘要常常遗漏精确的文件路径。Pi 在遍历被压缩区间时，程序化扫描所有 `read`、`write`、`edit` 工具调用的参数，把 `readFiles` 和 `modifiedFiles` 列表自动合并进 `CompactionResult.details`，并在多次连续压缩间累积传递。',
        '这样即便压缩了三次，模型依然清楚知道哪些文件已经改过、哪些只是读过。',
      ],
      kpis: [
        kpi('确定性提取', '扫描工具调用参数', 'good'),
        kpi('跨次压缩', '自动合并累积', 'good'),
        kpi('路径幻觉', '显著降低', 'good'),
      ],
      scene: iso(
        '确定性文件追踪 + LLM 语义摘要双轨并行',
        [
          { id: 'slice', x: 80, y: 215, label: '待压缩消息切片', tone: 'orange', size: 'lg', icon: 'database' },
          { id: 'llm', x: 430, y: 105, label: 'LLM 语义摘要', sublabel: '目标 / 约束 / 进展 / 关键决策', tone: 'blue', size: 'lg', active: true, icon: 'brain' },
          { id: 'ast', x: 430, y: 325, label: '确定性文件扫描器', sublabel: '提取 readFiles & modifiedFiles', tone: 'green', size: 'lg', active: true, icon: 'file-text' },
          { id: 'node', x: 770, y: 215, label: 'compaction 树节点', sublabel: 'append 到 JSONL 末尾', tone: 'violet', size: 'lg', icon: 'package' },
        ],
        [
          { from: 'slice', to: 'llm', packetCount: 1 },
          { from: 'slice', to: 'ast', status: 'active', packetCount: 1 },
          { from: 'llm', to: 'node', packetCount: 1 },
          { from: 'ast', to: 'node', status: 'active', packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: '无损追加落盘',
      badge: 'INSIGHT',
      title: '压缩也是追加节点，历史一字节都没删',
      paragraphs: [
        '结合上一课的树形会话：压缩完成后，Pi 不会重写或删掉旧 `.jsonl` 里的任何一行，只是追加一条 `type: "compaction"` 节点。',
        '下次 `buildSessionContext()` 回溯时读到它，就自动把摘要 + `firstKeptEntryId` 之后的消息送给模型；而你随时仍可在文件里审计最原始的完整对话。',
      ],
      kpis: [
        kpi('旧记录删除', '0 行', 'good'),
        kpi('审计可追溯', '100%', 'good'),
        kpi('二次压缩', '迭代更新前次摘要', 'neutral'),
      ],
      scene: tree(
        'compaction 节点在会话树中的投影方式',
        [
          { id: 'e1', x: 200, y: 90, kind: 'user', label: '早期消息 #1..42', status: 'dimmed' },
          { id: 'e2', x: 200, y: 260, kind: 'assistant', label: 'firstKeptEntry (#43)', status: 'done', badge: '保留起点' },
          { id: 'e3', x: 200, y: 430, kind: 'tool', label: '近期消息 #44..50', status: 'done' },
          { id: 'cp', x: 640, y: 260, kind: 'log', label: 'compaction 节点', sublabel: 'summary + firstKeptEntryId=#43', status: 'active', badge: '新视图锚点' },
        ],
        [
          { from: 'e1', to: 'e2' },
          { from: 'e2', to: 'e3' },
          { from: 'e3', to: 'cp', animated: true },
          { from: 'cp', to: 'e2', label: '引用保留起点', animated: true },
        ],
      ),
    },
    {
      shortLabel: '自定义压缩钩子',
      badge: 'TECHNIQUE',
      title: 'session_before_compact：用更快的便宜模型做摘要',
      paragraphs: [
        '主对话用顶级推理模型时，拿它跑压缩摘要既贵又慢。Pi 暴露了 `session_before_compact` 扩展事件：扩展可以拦截压缩流程，切换成轻量快速模型生成摘要，甚至按团队模板注入领域专用摘要结构，或者直接返回 `{ cancel: true }` 暂缓压缩。',
      ],
      kpis: [
        kpi('扩展事件', 'session_before_compact', 'good'),
        kpi('模型替换', '支持异构轻量模型', 'good'),
        kpi('可控性', '支持 custom / cancel', 'neutral'),
      ],
      scene: iso(
        'session_before_compact 扩展拦截点',
        [
          { id: 'trig', x: 80, y: 215, label: '自动 / 手动 /compact', tone: 'blue', size: 'lg', icon: 'clock' },
          { id: 'hook', x: 420, y: 215, label: 'session_before_compact', sublabel: '扩展可换模型 / 定制摘要 / cancel', tone: 'violet', size: 'lg', active: true, icon: 'plug' },
          { id: 'def', x: 760, y: 120, label: '自定义摘要返回', tone: 'green', icon: 'check-circle' },
          { id: 'fb', x: 760, y: 310, label: '走内置默认压缩', tone: 'orange', icon: 'layers' },
        ],
        [
          { from: 'trig', to: 'hook', status: 'active', packetCount: 1 },
          { from: 'hook', to: 'def', label: '返回 compaction', status: 'active', packetCount: 1 },
          { from: 'hook', to: 'fb', label: '未拦截', dashed: true, packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: '压缩复盘',
      badge: 'RECAP',
      title: '上下文压缩机制复盘',
      paragraphs: [
        '好的压缩不是盲目丢历史，而是「边界对齐 + 确定性文件追踪 + 无损追加落盘 + 钩子可定制」四者合力。',
      ],
      recapTable: [
        { question: '怎么避免压缩把 toolCall 和 toolResult 拆散？', decision: 'findCutPoint() 对齐安全轮次边界', because: '确保截断后的消息序列依然完全符合各模型 API 规范。' },
        { question: '如何防止压缩后模型忘了改过哪些文件？', decision: '程序化扫描工具调用沉淀 readFiles/modifiedFiles', because: '用确定性代码补足 LLM 自然语言摘要的遗漏风险。' },
        { question: '压缩后还能找回原始对话吗？', decision: '只追加 compaction 节点，不删改原 JSONL 行', because: '逻辑投影瘦身，物理日志 100% 无损。' },
      ],
      kpis: [
        kpi('安全切点', 'firstKeptEntryId', 'good'),
        kpi('文件追踪', '100% 确定性', 'good'),
        kpi('可定制性', 'before_compact 钩子', 'good'),
      ],
      scene: iso('压缩管线总览', [
        { id: 'a', x: 180, y: 200, label: 'findCutPoint', tone: 'violet' },
        { id: 'b', x: 480, y: 200, label: '摘要 + 文件清单', tone: 'green', active: true },
        { id: 'c', x: 780, y: 200, label: 'Append Node', tone: 'blue' },
      ], [
        { from: 'a', to: 'b', packetCount: 1 },
        { from: 'b', to: 'c', packetCount: 1 },
      ]),
    },
  ]),
);

// ---------------------------------------------------------------------------
// CH4 · 2/2 · Extensions 生命周期钩子与动态定制
// ---------------------------------------------------------------------------
const L_PI_EXTENSIONS = lesson(
  'pi-extensions',
  'pi-ch04',
  4,
  '压缩与扩展生态',
  2,
  2,
  'Extensions 扩展系统：用 TypeScript 塑造你的专属 Agent',
  'Pi 不靠臃肿的内置开关满足所有人，而是把工具拦截、斜杠命令、自定义工具与 TUI 组件全部开放给项目级/全局级 TypeScript 扩展。',
  10,
  '进阶',
  [
    { text: '掌握 Pi 扩展的发现路径（~/.pi/agent/extensions 与 .pi/extensions）', completedAtStep: 2 },
    { text: '理解 tool_call / tool_result 拦截与自定义工具注册机制', completedAtStep: 4 },
    { text: '了解 Pi 扩展如何通过 appendEntry 把状态写进同一棵会话树', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: '拒绝开关地狱',
      badge: 'PROBLEM',
      title: '每个团队都想要自己的审批、命令和工作流',
      paragraphs: [
        '有人想要在执行 `rm` 或写 `.env` 时弹确认窗；有人想加 `/review` 斜杠命令自动拉 Git diff；有人想在 TUI 底部状态栏显示当前分支和测试状态。',
        '如果全做进内核，内核很快变成几万行配置面条。Pi 的答案是：内核只留最干净的扩展 API，让每个团队用几十行 TypeScript 扩展直接装配。',
      ],
      kpis: [
        kpi('扩展语言', '原生 TypeScript', 'good'),
        kpi('热加载', 'jiti 零编译直跑', 'good'),
        kpi('加载层级', '全局 + 项目 .pi/', 'neutral'),
      ],
      scene: iso(
        'Pi Extensions 能力版图',
        [
          { id: 'ext', x: 380, y: 205, label: 'ExtensionAPI (pi)', sublabel: '传给每个扩展入口函数的能力对象', tone: 'violet', size: 'lg', active: true, icon: 'plug' },
          { id: 'ev', x: 80, y: 80, label: 'pi.on(event, fn)', sublabel: '拦截 tool_call / context / compact', tone: 'orange', icon: 'shield' },
          { id: 'tl', x: 700, y: 80, label: 'pi.registerTool()', sublabel: '注册新工具或覆写内置工具', tone: 'green', icon: 'wrench' },
          { id: 'cmd', x: 80, y: 340, label: 'pi.registerCommand()', sublabel: '注册 /slash 斜杠命令', tone: 'blue', icon: 'terminal' },
          { id: 'st', x: 700, y: 340, label: 'pi.appendEntry()', sublabel: '向会话树写入自定义持久状态', tone: 'violet', icon: 'database' },
        ],
        [
          { from: 'ext', to: 'ev', status: 'active', packetCount: 1 },
          { from: 'ext', to: 'tl', status: 'active', packetCount: 1 },
          { from: 'ext', to: 'cmd', packetCount: 1 },
          { from: 'ext', to: 'st', packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: 'tool_call 安全门',
      badge: 'TECHNIQUE',
      title: '用 15 行扩展实现自定义权限门与危险命令拦截',
      paragraphs: [
        'Pi 内核默认保持开放敏捷，把安全边界和团队规范交给 `tool_call` 钩子：在任何工具真正执行前，扩展都能检查 `event.toolName` 与 `event.input`，调用 `ctx.ui.confirm()` 弹窗询问人类，或者直接返回 `{ block: true, reason }` 拦截调用。',
      ],
      sourceDrawer: piSrc(
        '监听 tool_call 实现安全拦截扩展',
        'packages/coding-agent/examples/extensions/permission-gate.ts',
        'ts',
        `export default function (pi: ExtensionAPI) {
  pi.on('tool_call', async (event, ctx) => {
    if (event.toolName === 'bash' && /rm\\s+-rf|sudo/.test(event.input.command)) {
      const ok = await ctx.ui.confirm('危险命令确认', \`允许执行: \${event.input.command} ?\`);
      if (!ok) return { block: true, reason: '用户拒绝了高危 Shell 命令' };
    }
  });
}`,
        'Pi 官方扩展模式：利用 tool_call 钩子零侵入叠加审批门，无需改动内核。',
      ),
      kpis: [
        kpi('拦截钩子', 'tool_call', 'good'),
        kpi('修改结果钩子', 'tool_result', 'neutral'),
        kpi('交互弹窗', 'ctx.ui.confirm/select', 'good'),
      ],
      scene: swim(
        'ExtensionRunner 串联工具拦截与结果改写',
        [
          { id: 'loop', label: 'agentLoop', tone: 'green' },
          { id: 'ext', label: 'ExtensionRunner', tone: 'violet' },
          { id: 'tool', label: 'Tool.execute()', tone: 'orange' },
        ],
        [
          { id: 's1', laneId: 'loop', start: 5, end: 22, label: '收到 toolCall', tone: 'green', status: 'done' },
          { id: 's2', laneId: 'ext', start: 24, end: 46, label: 'tool_call 校验 / confirm', tone: 'violet', status: 'running' },
          { id: 's3', laneId: 'tool', start: 48, end: 72, label: '放行后实际执行', tone: 'orange', status: 'done' },
          { id: 's4', laneId: 'ext', start: 74, end: 94, label: 'tool_result 脱敏 / 附加信息', tone: 'blue', status: 'done' },
        ],
      ),
    },
    {
      shortLabel: '工具覆写与自定义渲染',
      badge: 'SOLUTION',
      title: 'registerTool：不仅加能力，还能定制 TUI 外观',
      paragraphs: [
        '通过 `pi.registerTool()` 注册的工具既可以是全新能力（例如查询内部工单、运行数据库只读 SQL），也可以用同名覆盖内置 `read`/`bash`（例如把 `bash` 重定向到远程 Docker 容器执行）。',
        '工具定义还可以自带 `renderCall` 和 `renderResult` 函数，在终端里画出专属折叠面板与高亮样式。',
      ],
      kpis: [
        kpi('同名覆写', '可把 bash 转发到容器', 'good'),
        kpi('自定义渲染', 'renderCall / renderResult', 'good'),
        kpi('参数校验', 'TypeBox Schema', 'neutral'),
      ],
      scene: iso(
        '同名覆写内置工具实现远程沙箱',
        [
          { id: 'm', x: 80, y: 215, label: 'LLM 调用 bash', tone: 'green', size: 'lg', icon: 'brain' },
          { id: 'ov', x: 420, y: 215, label: '扩展覆写的 bash Tool', sublabel: '将命令转发至 Docker / SSH 沙箱', tone: 'violet', size: 'lg', active: true, icon: 'shield' },
          { id: 'box', x: 770, y: 215, label: '隔离容器执行', tone: 'blue', size: 'lg', icon: 'lock' },
        ],
        [
          { from: 'm', to: 'ov', status: 'active', packetCount: 1 },
          { from: 'ov', to: 'box', status: 'active', packetCount: 2, packetLabel: 'docker exec' },
        ],
      ),
    },
    {
      shortLabel: '状态随分支走',
      badge: 'INSIGHT',
      title: 'pi.appendEntry()：扩展状态也享有树形分叉能力',
      paragraphs: [
        '如果扩展把自己的状态（比如计划清单、Todo 进度、当前激活工具表）存在全局变量里，用户一旦 `/tree` 切回历史分支，扩展状态就会和对话脱节。',
        'Pi 提供 `pi.appendEntry(customType, data)`，把扩展状态作为树节点写入同一个 `.jsonl` 文件；当会话加载或切换分支时，扩展监听 `session_tree` 事件重放当前分支节点即可精准复原状态。',
      ],
      kpis: [
        kpi('持久 API', 'pi.appendEntry()', 'good'),
        kpi('分支同步', 'session_tree 重放还原', 'good'),
        kpi('外部库依赖', '0', 'good'),
      ],
      scene: tree(
        '扩展自定义状态节点与消息节点共享同一棵树',
        [
          { id: 'r', x: 500, y: 70, kind: 'user', label: '用户需求', status: 'done' },
          { id: 'c1', x: 500, y: 205, kind: 'plugin', label: 'custom: todo-state (v1)', sublabel: 'pi.appendEntry("todo", ...)', parentId: 'r', status: 'active' },
          { id: 'm1', x: 260, y: 365, kind: 'assistant', label: '分支 A · todo v2', parentId: 'c1', status: 'dimmed' },
          { id: 'm2', x: 740, y: 365, kind: 'assistant', label: '分支 B · todo v2\'', parentId: 'c1', status: 'highlight' },
        ],
        [
          { from: 'r', to: 'c1', animated: true },
          { from: 'c1', to: 'm1' },
          { from: 'c1', to: 'm2', animated: true },
        ],
      ),
    },
    {
      shortLabel: '扩展与技能对比',
      badge: 'INSIGHT',
      title: '什么时候写 Extension，什么时候写 Skill？',
      paragraphs: [
        'Pi 清晰区分两种复用资产：**Skill**（`SKILL.md`）是写给模型看的领域知识与操作手册，按需懒加载进入上下文；**Extension**（`.ts`）是写给运行时执行的确定性代码，负责拦截、新工具、UI 组件和命令编排。',
      ],
      kpis: [
        kpi('Skill', '声明式 Markdown 知识', 'neutral'),
        kpi('Extension', '确定性 TS 运行时代码', 'good'),
        kpi('协同方式', '互补不重叠', 'good'),
      ],
      scene: iso(
        'Skill vs Extension 职责划分',
        [
          { id: 'sk', x: 130, y: 205, label: 'Skills (SKILL.md)', sublabel: '教模型「怎么做好一类任务」· 懒加载省 Token', tone: 'blue', size: 'lg', icon: 'file-text' },
          { id: 'ex', x: 560, y: 205, label: 'Extensions (.ts)', sublabel: '给运行时加「硬约束 / 工具 / 命令 / UI」', tone: 'violet', size: 'lg', active: true, icon: 'plug' },
        ],
        [{ from: 'sk', to: 'ex', label: '知识 + 确定性护栏', dotted: true, packetCount: 1 }],
      ),
    },
    {
      shortLabel: 'Pi 全课复盘',
      badge: 'RECAP',
      title: 'Pi Agent 架构全景复盘',
      paragraphs: [
        '回顾 Pi 的四章八课：四层清晰边界 + 4 个原子工具 + 双层循环双队列 + 两阶段上下文投影 + 树形 JSONL 会话 + TS 扩展生态——这是极简主义工程美学的绝佳范本。',
      ],
      recapTable: [
        { question: 'Pi 如何同时做到极简内核与高度可定制？', decision: '把审批、自定义工具与命令下沉到 TS Extension', because: '核心只保留最稳定的协议与循环，差异化需求不膨胀内核。' },
        { question: '扩展状态怎么在分支切换时不错乱？', decision: '用 pi.appendEntry() 存入会话树并随分支重放', because: '对话与扩展共享同一份时间线真相。' },
        { question: '与 DSH 相比，Pi 最大的风格差异是什么？', decision: 'Pi 是四层轻量库 + TS 扩展，DSH 是 Cordis 全插件主板', because: 'Pi 追求开箱即用的个人极简编程流，DSH 追求大型多端插件装配。' },
      ],
      kpis: [
        kpi('全课覆盖', '4 章 8 课 48 步', 'good'),
        kpi('核心仓库', 'badlogic/pi-mono', 'good'),
        kpi('核心哲学', '极简原语 · 自由组合', 'good'),
      ],
      scene: iso('Pi Agent 全景', [
        { id: 'p1', x: 120, y: 210, label: '4 原子工具', tone: 'blue' },
        { id: 'p2', x: 370, y: 210, label: '双层循环 + 双队列', tone: 'green', active: true },
        { id: 'p3', x: 620, y: 210, label: '树形 JSONL + 扩展', tone: 'violet', active: true },
      ], [
        { from: 'p1', to: 'p2', packetCount: 1 },
        { from: 'p2', to: 'p3', packetCount: 1 },
      ]),
    },
  ]),
);

export const PI_CHAPTERS: Chapter[] = [
  chapter('pi-ch01', 1, '极简架构与分层', 'sage', [L_PI_ARCH, L_PI_TOOLS]),
  chapter('pi-ch02', 2, '双层循环与实时队列', 'blue', [L_PI_STEERING, L_PI_EVENTS]),
  chapter('pi-ch03', 3, '上下文流水线与树形会话', 'violet', [L_PI_CONTEXT, L_PI_SESSION]),
  chapter('pi-ch04', 4, '压缩与扩展生态', 'amber', [L_PI_COMPACT, L_PI_EXTENSIONS]),
];
