// OpenAI Codex (openai/codex · codex-rs) 交互式源码思维导图数据结构
// 每个节点均与站内 6 章 10 课深度双向绑定（lessonSlug + stepNumber），且全部 20 个末节点均附带对应源码片段。
import type { SourceLanguage } from '../../../types/lesson';

export type CodexBranchTone = 'violet' | 'blue' | 'amber' | 'emerald' | 'rose' | 'cyan';

export interface CodexMindNode {
  id: string;
  label: string;
  sub?: string;
  tone: CodexBranchTone;
  badge: string;
  file?: string;
  lessonSlug: string;
  stepNumber?: number;
  summary: string;
  points?: string[];
  code?: string;
  codeLang?: SourceLanguage;
  children?: CodexMindNode[];
}

export const CODEX_MINDMAP_DATA: CodexMindNode = {
  id: 'root',
  label: 'OpenAI Codex (codex-rs)',
  sub: 'Rust 系统级 Agent Harness',
  tone: 'violet',
  badge: 'WORKSPACE',
  file: 'codex-rs/Cargo.toml',
  lessonSlug: 'codex-sq-eq',
  stepNumber: 1,
  summary:
    'OpenAI 将 Codex CLI 用 Rust 重写为高内聚低耦合的 Workspace：通过强类型异步双队列（SQ ⇄ EQ）彻底解耦 UI 与核心状态机，将安全防线正交拆分并下沉到操作系统原生内核沙箱（Seatbelt / Landlock + seccomp），配合去行号 apply_patch 与抗漂移三段压缩支撑高自治本地/云端编程。',
  points: [
    '单一 codex-core 内核同时驱动 TUI、CI 无头 exec 与 IDE App-Server',
    '控制面（submission_loop）与执行面（ActiveTurn）分离，审批等待永不阻塞 Interrupt',
    'AskForApproval（治理面）× SandboxPolicy（物理面）二维正交，默认断网防注入外泄',
  ],
  codeLang: 'text',
  code: `codex-rs/
├── protocol/        # Op / EventMsg / Policy 跨端强类型契约
├── core/            # submission_loop / Turn / ToolRouter / compact / seatbelt
├── execpolicy/      # Shell AST 拆解与前缀安全规则引擎
├── linux-sandbox/   # Landlock LSM + seccomp-bpf 非特权内核沙箱
├── apply-patch/     # 去行号上下文锚定补丁引擎
├── tui/ & exec/     # 交互终端与 CI 非交互执行器
└── app-server/      # JSON-RPC 服务端（桌面端 / IDE 集成）`,
  children: [
    {
      id: 'b-workspace',
      label: '1 · Workspace 分层与双队列协议',
      sub: 'codex-protocol · SQ ⇄ EQ',
      tone: 'violet',
      badge: 'CH 1 · PROTOCOL',
      file: 'codex-rs/protocol/src/protocol.rs',
      lessonSlug: 'codex-sq-eq',
      stepNumber: 1,
      summary:
        '外部客户端绝不直接调用内核内部函数，而是统一通过一对异步通道通信：提交队列 SQ（Submission { id, op }）与事件队列 EQ（Event { id, msg }）。全量 serde JSON 序列化，进程内走 async_channel，跨进程桥接 JSON-RPC。',
      points: [
        '每个 Event 回带触发它的 Submission id，天然支持多路关联与日志回放',
        '每个 UserTurn 自携带 cwd、model、approval_policy 与 sandbox_policy',
      ],
      codeLang: 'rs',
      code: `pub struct Submission {
    pub id: String,
    pub op: Op,
}

pub struct Event {
    /// 与触发该事件的 Submission.id 严格对应
    pub id: String,
    pub msg: EventMsg,
}`,
      children: [
        {
          id: 'sq-op',
          label: 'SQ: Op 枚举指令集',
          sub: 'UserTurn / Interrupt / Approval',
          tone: 'violet',
          badge: 'INPUT',
          file: 'codex-rs/protocol/src/protocol.rs',
          lessonSlug: 'codex-sq-eq',
          stepNumber: 2,
          summary: '穷举定义客户端发往内核的所有外部控制指令，确保状态机输入边界完全受控。',
          points: [
            'Op::UserTurn：开启新一轮对话并随轮下发安全策略',
            'Op::Interrupt：随时触发 CancellationToken 中止流与子进程',
            'Op::ExecApproval / PatchApproval：回传人工 ReviewDecision',
            'Op::Compact / Shutdown：手动触发上下文压缩或优雅关机',
          ],
          codeLang: 'rs',
          code: `#[derive(Debug, Clone, Serialize, Deserialize)]
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
        },
        {
          id: 'eq-event',
          label: 'EQ: EventMsg 事件流',
          sub: 'Delta / ApprovalReq / TurnDiff',
          tone: 'violet',
          badge: 'OUTPUT',
          file: 'codex-rs/protocol/src/protocol.rs',
          lessonSlug: 'codex-sq-eq',
          stepNumber: 3,
          summary: '内核向前端单向推送的结构化事件流，前端仅需按 EventMsg 驱动视图渲染，无需猜测内核内部状态。',
          points: [
            '推理流：AgentMessageDelta / AgentReasoningDelta',
            '命令流：ExecCommandBegin / ExecCommandOutputDelta / ExecCommandEnd',
            '交互与变更：ExecApprovalRequest / TurnDiff / TokenCount / TurnAborted',
          ],
          codeLang: 'rs',
          code: `#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum EventMsg {
    TaskStarted,
    AgentMessageDelta { delta: String },
    ExecCommandBegin { call_id: String, command: Vec<String>, cwd: PathBuf },
    ExecCommandOutputDelta { call_id: String, chunk: Vec<u8> },
    ExecApprovalRequest { call_id: String, command: Vec<String>, reason: Option<String> },
    TurnDiff { unified_diff: String },
    ContextCompacted,
    TurnAborted { reason: TurnAbortReason },
    TaskComplete { last_agent_message: Option<String> },
}`,
        },
        {
          id: 'oneshot-wait',
          label: 'oneshot 非阻塞审批挂起',
          sub: 'pending_approvals HashMap',
          tone: 'violet',
          badge: 'CONCURRENCY',
          file: 'codex-rs/core/src/codex.rs',
          lessonSlug: 'codex-sq-eq',
          stepNumber: 4,
          summary:
            '当子任务需要人类审批时，发送 ExecApprovalRequest 并在 pending_approvals 注册 tokio::sync::oneshot::Sender 后 await 接收端，绝不阻塞主循环消费后续 Op::Interrupt。',
          points: [
            '彻底避免同步读 stdin 卡死事件循环的经典死锁问题',
            '用户直接按 Esc 取消时，pending_approvals 统一释放清理',
          ],
          codeLang: 'rs',
          code: `pub async fn request_command_approval(&self, call_id: String, cmd: Vec<String>) -> ReviewDecision {
    let (tx_decision, rx_decision) = oneshot::channel();
    self.state.lock().await.pending_approvals.insert(call_id.clone(), tx_decision);

    // 推给 EQ 触发前端弹窗，但 submission_loop 保持自由，随时可接 Op::Interrupt
    self.send_event(EventMsg::ExecApprovalRequest { call_id, command: cmd, reason: None }).await;

    rx_decision.await.unwrap_or(ReviewDecision::Abort)
}

pub async fn notify_approval(&self, id: &str, decision: ReviewDecision) {
    if let Some(tx) = self.state.lock().await.pending_approvals.remove(id) {
        let _ = tx.send(decision);
    }
}`,
        },
      ],
    },
    {
      id: 'b-loop',
      label: '2 · Core 控制面与 Turn 循环',
      sub: 'codex.rs · Tokio 并发任务模型',
      tone: 'blue',
      badge: 'CH 2 · ENGINE',
      file: 'codex-rs/core/src/codex.rs',
      lessonSlug: 'codex-turn-loop',
      stepNumber: 1,
      summary:
        'codex-core 将控制面（submission_loop）和执行面（ActiveTurn）彻底分离：控制面微秒级路由 Op，耗时模型 SSE 与工具执行全部在独立 Tokio 任务中运行。',
      points: [
        '基于 Responses API 原生 ResponseItem 维护结构化历史',
        '读写锁分离调度多工具调用，兼顾并发探索速度与写盘一致性',
      ],
      codeLang: 'rs',
      code: `pub struct Session {
    tx_event: Sender<Event>,
    state: Mutex<SessionState>,
    active_turn: Mutex<Option<ActiveTurn>>,
    rollout: Mutex<Option<RolloutRecorder>>,
}`,
      children: [
        {
          id: 'sub-loop',
          label: 'submission_loop 分发器',
          sub: '控制面永不长时间阻塞',
          tone: 'blue',
          badge: 'CONTROL',
          file: 'codex-rs/core/src/codex.rs',
          lessonSlug: 'codex-turn-loop',
          stepNumber: 2,
          summary:
            '持续消费 rx_sub.recv().await：遇到 UserTurn 先中止旧任务再 spawn 新 TurnContext；遇到 Interrupt 立即取消令牌；遇到 Approval 唤醒对应 oneshot。',
          points: ['所有耗时网络流与子进程 I/O 全部交给 spawn 出的子任务，主循环微秒级响应'],
          codeLang: 'rs',
          code: `async fn submission_loop(sess: Arc<Session>, rx_sub: Receiver<Submission>) {
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
        },
        {
          id: 'tool-router',
          label: 'ToolRouter 读写分离调度',
          sub: '读锁并行 · 写锁独占串行',
          tone: 'blue',
          badge: 'SCHEDULER',
          file: 'codex-rs/core/src/tools/parallel.rs',
          lessonSlug: 'codex-turn-loop',
          stepNumber: 4,
          summary:
            '按工具 supports_parallel 分级加 RwLock：多个只读文件/搜索调用拿读锁并发执行，apply_patch 与 Shell 命令拿写锁严格串行，防止文件竞态撕裂。',
          points: [
            '内置工具（shell / apply_patch / view_image）与 MCP 工具统一路由',
            '超长工具输出自动截断并保留首尾关键报错，防爆窗',
          ],
          codeLang: 'rs',
          code: `pub struct ToolCallRuntime {
    router: Arc<ToolRouter>,
    parallel_execution: Arc<RwLock<()>>,
}

impl ToolCallRuntime {
    pub async fn handle_tool_call(&self, call: ToolCall) -> Result<ResponseInputItem> {
        let supports_parallel = self.router.tool_supports_parallel(&call.name);
        if supports_parallel {
            // 只读工具拿共享读锁，多个调用同时并发执行
            let _read_guard = self.parallel_execution.read().await;
            self.router.dispatch_tool_call(call).await
        } else {
            // 写盘 / Shell 拿独占写锁，严格串行护航文件系统一致性
            let _write_guard = self.parallel_execution.write().await;
            self.router.dispatch_tool_call(call).await
        }
    }
}`,
        },
        {
          id: 'cancel-cascade',
          label: 'CancellationToken 三路中断',
          sub: 'SSE + 审批表 + SIGKILL 进程组',
          tone: 'blue',
          badge: 'ABORT',
          file: 'codex-rs/core/src/codex.rs',
          lessonSlug: 'codex-turn-loop',
          stepNumber: 5,
          summary:
            '按下 Esc 触发 Op::Interrupt 时，CancellationToken 同时切断上游 HTTP SSE 流、清空挂起审批表，并向沙箱子进程组发送 SIGKILL，杜绝僵尸进程残留。',
          points: ['中断后发射 EventMsg::TurnAborted，保留已完成的 ResponseItem'],
          codeLang: 'rs',
          code: `pub async fn interrupt_task(&self) {
    // 1. 广播 CancellationToken：立即切断 SSE 流并触发沙箱子进程组 SIGKILL
    if let Some(active) = self.active_turn.lock().await.take() {
        active.cancellation_token.cancel();
        active.handle.abort();
    }
    // 2. 清空全部挂起中的审批 oneshot，防止任务悬挂
    let mut state = self.state.lock().await;
    for (_, tx) in state.pending_approvals.drain() {
        let _ = tx.send(ReviewDecision::Abort);
    }
    // 3. 向 EQ 发射标准中止收口事件
    self.send_event(EventMsg::TurnAborted { reason: TurnAbortReason::Interrupted }).await;
}`,
        },
        {
          id: 'rollout',
          label: 'RolloutRecorder 会话落盘',
          sub: 'JSONL 持久化 · codex resume',
          tone: 'blue',
          badge: 'PERSIST',
          file: 'codex-rs/core/src/rollout/recorder.rs',
          lessonSlug: 'codex-turn-loop',
          stepNumber: 3,
          summary:
            '每当 OutputItemDone 或压缩事件发生，同步追加写入 Rollout JSONL 文件，支持随时断线重连和 codex resume 完整恢复上下文。',
          points: ['后台异步刷盘不阻塞主推理流，纯文本 JSONL 易于审计与回放'],
          codeLang: 'rs',
          code: `#[derive(Serialize, Deserialize)]
pub struct RolloutLine {
    pub timestamp: String,
    #[serde(flatten)]
    pub item: RolloutItem, // SessionMeta | ResponseItem | Compacted | TurnContext
}

impl RolloutRecorder {
    pub async fn record_items(&self, items: &[RolloutItem]) -> io::Result<()> {
        for item in items {
            let line = serde_json::to_string(&RolloutLine::now(item.clone()))?;
            self.writer.write_all(format!("{line}\\n").as_bytes()).await?;
        }
        self.writer.flush().await
    }
}`,
        },
      ],
    },
    {
      id: 'b-policy',
      label: '3 · 二维正交策略与 ExecPolicy',
      sub: 'AskForApproval × SandboxPolicy',
      tone: 'amber',
      badge: 'CH 3 · POLICY',
      file: 'codex-rs/execpolicy/',
      lessonSlug: 'codex-approval-policy',
      stepNumber: 1,
      summary:
        'Codex 安全设计最核心的抽象：把「何时暂停问人（治理面）」和「OS 内核给进程划多大物理围栏（物理面）」彻底解耦，并配合 Shell AST 语法分析杜绝正则绕过。',
      points: [
        '日常推荐默认：on-request + workspace-write',
        'CI 无人值守：never + workspace-write（永不卡弹窗，内核硬防越界与联网）',
      ],
      codeLang: 'rs',
      code: `// 二维正交安全模型：治理面 × 物理面完全独立组合
pub struct TurnSecurityContext {
    pub approval_policy: AskForApproval, // 何时暂停询问人类
    pub sandbox_policy: SandboxPolicy,   // OS 内核物理围栏边界
}`,
      children: [
        {
          id: 'ask-enum',
          label: 'AskForApproval（治理面）',
          sub: 'untrusted / on-request / never',
          tone: 'amber',
          badge: 'GOVERNANCE',
          file: 'codex-rs/protocol/src/protocol.rs',
          lessonSlug: 'codex-approval-policy',
          stepNumber: 2,
          summary: '控制人工审批频率，配合 ReviewDecision::ApprovedForSession 会话级白名单避免审批疲劳。',
          points: [
            'UnlessTrusted：仅已知安全只读命令免问，其余一律弹窗',
            'OnRequest：沙箱内自由跑，仅需突破沙箱或高危规则命中时询问',
            'Never：永不弹窗，完全依赖 SandboxPolicy 内核物理兜底',
          ],
          codeLang: 'rs',
          code: `#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum AskForApproval {
    /// 仅已知安全只读命令自动放行，其余一律询问
    UnlessTrusted,
    /// 沙箱内自由运行；越界或提权请求时弹窗询问
    OnRequest,
    /// 永不询问（CI/无人值守场景，全靠 OS 沙箱兜底）
    Never,
}

pub enum ReviewDecision { Approved, ApprovedForSession, Denied, Abort }`,
        },
        {
          id: 'sandbox-enum',
          label: 'SandboxPolicy（物理面）',
          sub: 'ReadOnly / WorkspaceWrite / Full',
          tone: 'amber',
          badge: 'BOUNDARY',
          file: 'codex-rs/protocol/src/protocol.rs',
          lessonSlug: 'codex-approval-policy',
          stepNumber: 4,
          summary: '直接编译为底层 OS 内核围栏规则，决定进程物理上能读、写、连什么。',
          points: [
            'ReadOnly：全盘只读、禁写、断网',
            'WorkspaceWrite：仅工作区可写，但内部二次挖洞将 .git 与 .codex 设为只读防 Hook 投毒！默认 network_access = false',
            'DangerFullAccess：解除沙箱（仅限显式授权或外层容器内）',
          ],
          codeLang: 'rs',
          code: `#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "mode", rename_all = "kebab-case")]
pub enum SandboxPolicy {
    ReadOnly,
    WorkspaceWrite {
        #[serde(default)]
        writable_roots: Vec<PathBuf>,
        #[serde(default)]
        network_access: bool, // 默认 false：物理断网
    },
    DangerFullAccess,
}

// WorkspaceWrite 自动在可写根内把 .git 与 .codex 设为只读保护区`,
        },
        {
          id: 'exec-ast',
          label: 'Shell AST 与 ExecPolicy 引擎',
          sub: '拆解管道/子命令 · 最严归约',
          tone: 'amber',
          badge: 'AST GUARD',
          file: 'codex-rs/core/src/is_safe_command.rs',
          lessonSlug: 'codex-exec-policy',
          stepNumber: 2,
          summary:
            '绝不用脆弱正则做前缀匹配，而是用真实 Shell 解析器拆出所有管道段、&&/;/| 子命令和重定向，逐段参数级审查（如拦截 find -exec、git -c）。',
          points: [
            '声明式 prefix_rule 支持 allow / prompt / forbidden 三态',
            '复合命令按 forbidden > prompt > allow 取最严，彻底免疫「安全前缀洗白」',
          ],
          codeLang: 'rs',
          code: `pub fn is_known_safe_command(command: &[String]) -> bool {
    let Some(cmd0) = command.first().map(String::as_str) else { return false };
    match cmd0 {
        "cat" | "ls" | "pwd" | "rg" | "head" | "tail" | "wc" => true,
        "git" => matches!(
            command.get(1).map(String::as_str),
            Some("status" | "log" | "diff" | "show" | "branch")
        ) && !has_dangerous_git_flag(command),
        "find" => !command.iter().any(|a| matches!(a.as_str(), "-delete" | "-exec" | "-execdir")),
        _ => false, // Fail-Closed：未识别命令绝不静默放行
    }
}`,
        },
      ],
    },
    {
      id: 'b-sandbox',
      label: '4 · OS 原生内核沙箱与零信任',
      sub: 'Seatbelt · Landlock + seccomp',
      tone: 'emerald',
      badge: 'CH 4 · KERNEL',
      file: 'codex-rs/core/src/seatbelt.rs',
      lessonSlug: 'codex-seatbelt-landlock',
      stepNumber: 1,
      summary:
        '不依赖 Docker 容器，直接调用宿主操作系统原生强制访问控制，实现毫秒级启动、直接复用本机编译器且所有孙进程不可逆继承隔离围栏。',
      points: [
        'macOS：sandbox-exec + 动态生成 (deny default) SBPL 策略',
        'Linux：codex-linux-sandbox 加锁 Landlock LSM + seccomp-bpf',
        '默认断网打破 Prompt 注入「私密数据 + 不可信输入 + 外传」致命三要素',
      ],
      codeLang: 'rs',
      code: `match SandboxType::for_host(&sandbox_policy) {
    SandboxType::MacosSeatbelt => spawn_command_under_seatbelt(params, &policy).await,
    SandboxType::LinuxSeccomp => spawn_command_under_linux_sandbox(params, &policy).await,
    SandboxType::None => spawn_command_direct(params).await,
}`,
      children: [
        {
          id: 'mac-seatbelt',
          label: 'macOS Seatbelt (SBPL)',
          sub: '(deny default) + subpath 挖洞',
          tone: 'emerald',
          badge: 'MACOS',
          file: 'codex-rs/core/src/seatbelt.rs',
          lessonSlug: 'codex-seatbelt-landlock',
          stepNumber: 2,
          summary:
            '将 SandboxPolicy 编译为 Scheme 风格 SBPL 规则交给 /usr/bin/sandbox-exec：放开系统只读库和工作区写入，同时用 require-not 排除 .git 目录，越界写入/外联直接由内核返回 EPERM。',
          points: ['所有 fork/exec 出的孙进程不可逆继承同一份内核 MAC 策略'],
          codeLang: 'text',
          code: `(version 1)
(deny default)
(allow process-exec process-fork)
(allow file-read*)
(allow file-write*
  (require-all
    (subpath "/workspace/repo")
    (require-not (subpath "/workspace/repo/.git"))
    (require-not (subpath "/workspace/repo/.codex"))))
;; network-outbound 默认未放行 -> connect() 直接返回 EPERM`,
        },
        {
          id: 'linux-ll',
          label: 'Linux Landlock + seccomp',
          sub: 'PR_SET_NO_NEW_PRIVS 不可逆双锁',
          tone: 'emerald',
          badge: 'LINUX',
          file: 'codex-rs/linux-sandbox/src/landlock.rs',
          lessonSlug: 'codex-seatbelt-landlock',
          stepNumber: 3,
          summary:
            '在 execve 目标命令前设置 no_new_privs，通过非特权 Landlock LSM 锁定文件系统可写根，再用 seccomp-bpf 过滤外网 socket/connect 系统调用，子进程及任何后代永远无法自我解锁。',
          points: ['零 root 权限需求，零容器镜像同步负担，有效防御依赖 postinstall 供应链投毒'],
          codeLang: 'rs',
          code: `pub fn apply_sandbox_policy_to_current_thread(
    policy: &SandboxPolicy,
    cwd: &Path,
) -> Result<()> {
    // 1. 强制不可逆：禁止后代进程通过 setuid 提权或解除沙箱
    unsafe { libc::prctl(libc::PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0) };

    // 2. 非特权 Landlock LSM：全盘只读，仅放开可写工作区（排除 .git）
    if !policy.has_full_disk_write_access() {
        install_filesystem_landlock_rules(policy.writable_roots(cwd))?;
    }

    // 3. seccomp-bpf：默认拦截外网 socket/connect 系统调用
    if !policy.has_full_network_access() {
        install_network_seccomp_filter_on_current_thread()?;
    }
    Ok(())
}`,
        },
        {
          id: 'escalation',
          label: '乐观试跑与单次提权',
          sub: 'is_likely_sandbox_denied()',
          tone: 'emerald',
          badge: 'ESCALATION',
          file: 'codex-rs/core/src/exec.rs',
          lessonSlug: 'codex-sandbox-escalation',
          stepNumber: 2,
          summary:
            '90% 命令在沙箱内静默跑完；仅当失败命中 EPERM / Read-only 沙箱拒绝特征且策略允许升级时，弹窗向人类申请单次宿主机重跑，下一条命令自动恢复沙箱。',
          points: ['精准区分「单测业务报错」与「内核沙箱拒绝」，避免无谓打扰人类'],
          codeLang: 'rs',
          code: `let output = run_in_sandbox(&params, &sandbox_policy).await?;

if is_likely_sandbox_denied(&output) && approval_policy.allows_escalation() {
    let decision = sess.request_command_approval(
        call_id,
        params.command.clone(),
    ).await;
    if matches!(decision, ReviewDecision::Approved | ReviewDecision::ApprovedForSession) {
        // 仅对当前这一条命令临时解除沙箱重跑，下条命令自动回沙箱
        return run_unsandboxed(&params).await;
    }
}
Ok(output)`,
        },
        {
          id: 'env-clean',
          label: 'ShellEnvironmentPolicy 清洗',
          sub: '默认剥离 *KEY* / *SECRET* / *TOKEN*',
          tone: 'emerald',
          badge: 'ZERO TRUST',
          file: 'codex-rs/core/src/exec_env.rs',
          lessonSlug: 'codex-sandbox-escalation',
          stepNumber: 5,
          summary:
            '在拉起子进程前过滤父进程环境变量中的敏感 API Key 与云凭据，仅保留 PATH / HOME 等必要运行变量，进一步缩小凭据暴露面。',
          points: ['即便被注入读取 env，也拿不到宿主 OPENAI_API_KEY 或 AWS_SECRET'],
          codeLang: 'rs',
          code: `pub fn create_env(policy: &ShellEnvironmentPolicy) -> HashMap<String, String> {
    let mut env: HashMap<String, String> = std::env::vars().collect();
    if policy.ignore_default_excludes == false {
        // 默认剔除名称包含 KEY / SECRET / TOKEN 的敏感宿主凭据
        env.retain(|k, _| {
            let upper = k.to_ascii_uppercase();
            !upper.contains("KEY") && !upper.contains("SECRET") && !upper.contains("TOKEN")
        });
    }
    env.extend(policy.set.clone());
    env
}`,
        },
      ],
    },
    {
      id: 'b-patch',
      label: '5 · 代码补丁与长程上下文压缩',
      sub: 'apply_patch · TurnDiff · compact.rs',
      tone: 'rose',
      badge: 'CH 5 · EDIT & MEM',
      file: 'codex-rs/apply-patch/src/lib.rs',
      lessonSlug: 'codex-apply-patch',
      stepNumber: 1,
      summary:
        '针对 LLM 容易数错行号、长任务容易忘初衷两大痛点，专门设计了去行号补丁协议、自持基线 Diff 追踪器以及保留用户原话的三段式压缩器。',
      points: ['内存先验后写 + 路径穿越防线 + 本轮净 Diff 实时推送'],
      codeLang: 'rs',
      code: `pub enum Hunk {
    AddFile { path: PathBuf, contents: String },
    DeleteFile { path: PathBuf },
    UpdateFile { path: PathBuf, move_path: Option<PathBuf>, chunks: Vec<UpdateFileChunk> },
}`,
      children: [
        {
          id: 'apply-patch',
          label: 'codex-apply-patch 补丁引擎',
          sub: '去行号 DSL · 三阶段渐进定位',
          tone: 'rose',
          badge: 'PATCH DSL',
          file: 'codex-rs/apply-patch/src/lib.rs',
          lessonSlug: 'codex-apply-patch',
          stepNumber: 2,
          summary:
            '用 *** Begin Patch + 上下文锚点替代脆弱的 @@ -42,7 行号头；单次支持跨多文件 Add/Update/Delete/Move；先全量内存校验并防路径穿越后再统一落盘。',
          points: ['seek_sequence 依次尝试精确匹配 → 忽略行尾空白 → Unicode 标点归一'],
          codeLang: 'text',
          code: `*** Begin Patch
*** Update File: src/auth.rs
@@ fn verify_token(token: &str) -> Result<Claims>
-    if token.is_empty() { return Ok(Claims::guest()); }
+    if token.is_empty() { return Err(AuthError::MissingToken); }
     decode_jwt(token)
*** End Patch`,
        },
        {
          id: 'turn-diff',
          label: 'TurnDiffTracker 净变更追踪',
          sub: '自持基线快照 · 不依赖 git',
          tone: 'rose',
          badge: 'DIFF',
          file: 'codex-rs/core/src/turn_diff_tracker.rs',
          lessonSlug: 'codex-apply-patch',
          stepNumber: 4,
          summary:
            '每个文件首次被触碰前拍下基线字节快照，实时算出本轮 Agent 的净 Unified Diff 并推送 EventMsg::TurnDiff，精准剥离开发者原有的未提交改动。',
          points: ['非 Git 目录同样工作；多轮试错编辑自动折叠为干净净变更'],
          codeLang: 'rs',
          code: `pub struct TurnDiffTracker {
    /// 记录本轮首次被修改前的文件原始快照，不依赖 git status
    baseline_snapshots: HashMap<PathBuf, Option<Vec<u8>>>,
}

impl TurnDiffTracker {
    pub fn on_patch_begin(&mut self, paths: &[PathBuf]) {
        for p in paths {
            self.baseline_snapshots
                .entry(p.clone())
                .or_insert_with(|| std::fs::read(p).ok());
        }
    }

    pub fn get_unified_diff(&self) -> Result<Option<String>> {
        // 对比 baseline_snapshots 与当前磁盘内容，输出本轮 Agent 净 Diff
        compute_net_unified_diff(&self.baseline_snapshots)
    }
}`,
        },
        {
          id: 'compact-rs',
          label: 'compact.rs 抗漂移三段压缩',
          sub: 'Remote Compact 优先 + 本地兜底',
          tone: 'rose',
          badge: 'COMPACT',
          file: 'codex-rs/core/src/compact.rs',
          lessonSlug: 'codex-auto-compact',
          stepNumber: 2,
          summary:
            '接近 auto_compact_token_limit 或收到 Op::Compact 时，用「初始环境（AGENTS.md）+ 预算内近期用户原话 + 结构化交接摘要」三段式重建紧凑历史。',
          points: ['OpenAI 模型优先走 /responses/compact，兼容模型自动退回本地摘要'],
          codeLang: 'rs',
          code: `pub fn build_compacted_history(
    initial_context: Vec<ResponseItem>,
    user_messages: &[String],
    summary_text: &str,
) -> Vec<ResponseItem> {
    // 1. 完整保留初始环境（AGENTS.md、工作区与策略锚点）
    let mut history = initial_context;
    // 2. 在 Token 预算内保留最近的用户原话，防止需求漂移
    for msg in select_recent_within_budget(user_messages, COMPACT_USER_MESSAGE_MAX_TOKENS) {
        history.push(ResponseItem::user_text(msg));
    }
    // 3. 追加结构化交接摘要（已完成改动、测试结果与待办）
    history.push(ResponseItem::compaction_summary(summary_text));
    history
}`,
        },
      ],
    },
    {
      id: 'b-ext',
      label: '6 · 配置层、MCP 与多端协作生态',
      sub: 'config.toml · AGENTS.md · app-server',
      tone: 'cyan',
      badge: 'CH 6 · ECOSYSTEM',
      file: 'codex-rs/app-server/',
      lessonSlug: 'codex-config-mcp',
      stepNumber: 1,
      summary:
        '以四级配置覆盖体系、抗压缩指令锚点 AGENTS.md、原生 MCP 工具接入与 JSON-RPC App Server，把本地 CLI 内核自然延伸到 IDE、桌面端与多 Worktree 并行线程。',
      points: ['MDM 设定不可越权上限，双向 MCP 互操作，多 Worktree 并行托管'],
      codeLang: 'toml',
      code: `# 四级配置叠加：MDM -> ~/.codex/config.toml -> .codex/ -> CLI flags
model = "o3"
approval_policy = "on-request"
sandbox_mode = "workspace-write"`,
      children: [
        {
          id: 'cfg-hierarchy',
          label: '四级配置覆盖与 AGENTS.md',
          sub: 'MDM → ~/.codex → .codex → CLI',
          tone: 'cyan',
          badge: 'CONFIG',
          file: 'codex-rs/core/src/config/types.rs',
          lessonSlug: 'codex-config-mcp',
          stepNumber: 2,
          summary:
            '支持企业托管策略（MDM）、用户级 ~/.codex/config.toml、仓库级 .codex/ 与命令行参数层层覆盖；AGENTS.md 常驻初始环境层，经历多次压缩永不丢失。',
          points: ['支持 [profiles.*] 一键切换日常开发、只读审计与 CI 无人值守预设'],
          codeLang: 'toml',
          code: `model = "o3"
approval_policy = "on-request"
sandbox_mode = "workspace-write"

[sandbox_workspace_write]
network_access = false
writable_roots = []

[profiles.ci]
approval_policy = "never"
sandbox_mode = "workspace-write"

[profiles.audit]
approval_policy = "untrusted"
sandbox_mode = "read-only"`,
        },
        {
          id: 'mcp-client',
          label: '原生 MCP 客户端集成',
          sub: 'stdio / HTTP MCP Server',
          tone: 'cyan',
          badge: 'MCP',
          file: 'codex-rs/core/src/mcp_connection_manager.rs',
          lessonSlug: 'codex-config-mcp',
          stepNumber: 4,
          summary:
            '在 config.toml 声明外部 MCP 服务器，启动时自动发现工具并挂载到 ToolRouter，与内置工具共享统一审批、超时与上下文截断管线；同时支持 codex mcp-server 双向暴露。',
          points: ['外部 MCP Server 报错与超时隔离在连接管理器内，绝不拖垮主内核'],
          codeLang: 'rs',
          code: `impl McpConnectionManager {
    pub async fn new(servers: HashMap<String, McpServerConfig>) -> Self {
        // 并发启动 stdio / Streamable HTTP MCP 客户端并拉取 tools/list
        let tools = join_all(servers.into_iter().map(|(name, cfg)| async move {
            let client = connect_mcp_server(&cfg).await?;
            let list = client.list_tools().await?;
            // 统一以 mcp__<server>__<tool> 注册进 ToolRouter
            Ok((name, client, list))
        })).await;
        Self::from_connected(tools)
    }
}`,
        },
        {
          id: 'app-server',
          label: 'codex-app-server 多线程托管',
          sub: 'Thread → Turn → Item · Worktree',
          tone: 'cyan',
          badge: 'APP-SERVER',
          file: 'codex-rs/app-server-protocol/src/lib.rs',
          lessonSlug: 'codex-app-server',
          stepNumber: 2,
          summary:
            '将 SQ/EQ 桥接为 JSON-RPC 协议服务 VS Code / 桌面客户端，可在多个独立 Git Worktree 沙箱中并行托管多条隔离 Thread，各自拥有独立 TurnDiffTracker。',
          points: ['自动导出 TypeScript / JSON Schema，支持 thread/resume 与 thread/fork'],
          codeLang: 'json',
          code: `// Client -> App-Server: 在指定 Thread 上启动 Turn
{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "turn/start",
  "params": {
    "threadId": "thr_01j9x",
    "input": [{"type": "text", "text": "修复 auth 单测"}],
    "approvalPolicy": "on-request",
    "sandboxPolicy": {"type": "workspaceWrite", "networkAccess": false}
  }
}
// App-Server -> Client: 结构化 Item 流式增量与审批请求
{"jsonrpc":"2.0","method":"item/agentMessage/delta","params":{"threadId":"thr_01j9x","delta":"正在定位..."}}`,
        },
      ],
    },
  ],
};

/** 按 lessonSlug 找到思维导图中最匹配的节点，实现「课程 → 脑图定位」双向联动。 */
export function findMindNodeByLesson(lessonSlug: string, node: CodexMindNode = CODEX_MINDMAP_DATA): CodexMindNode | null {
  if (node.id !== 'root' && node.lessonSlug === lessonSlug) return node;
  for (const child of node.children ?? []) {
    const hit = findMindNodeByLesson(lessonSlug, child);
    if (hit) return hit;
  }
  return null;
}

/** 根据节点所属一级分支，返回它在 6 大分支中的索引 (0..5) 或 -1（根节点）。 */
export function getBranchIndexForLesson(lessonSlug: string): number {
  const branches = CODEX_MINDMAP_DATA.children ?? [];
  const hasSlug = (n: CodexMindNode): boolean =>
    n.lessonSlug === lessonSlug || (n.children ?? []).some(hasSlug);
  return branches.findIndex(hasSlug);
}
