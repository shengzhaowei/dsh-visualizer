import { useState } from 'react';
import { CheckCircle2, Clock, GitBranch, Lock, Pause, Play, Plug, RefreshCw, RotateCcw, Shield, Trash2, XCircle } from 'lucide-react';
import { playCardFlip, playPackBurst, playStepTick } from '../utils/sound';

export type LabKind =
  | 'plugin-everything'
  | 'dsh-scope'
  | 'approval-pipeline'
  | 'steering-followup'
  | 'codex-approval-policy'
  | 'cc-hooks-lifecycle'
  | 'lg-interrupt-command';

const LAB_SLUGS = new Set<string>([
  'plugin-everything',
  'dsh-scope',
  'approval-pipeline',
  'steering-followup',
  'codex-approval-policy',
  'cc-hooks-lifecycle',
  'lg-interrupt-command',
]);

export function hasInteractiveLab(lessonSlug: string): lessonSlug is LabKind {
  return LAB_SLUGS.has(lessonSlug);
}

/* ---------------------------------------------------------------------------
 * Lab 1: Cordis 插件热插拔实验台（plugin-everything）
 * --------------------------------------------------------------------------- */
function HotPlugLab() {
  const [model, setModel] = useState<'llm-deepseek' | 'llm-mock'>('llm-deepseek');
  const [guardMounted, setGuardMounted] = useState(false);
  const [toolMounted, setToolMounted] = useState(true);
  const [trace, setTrace] = useState<{ tone: 'good' | 'warn' | 'bad'; steps: string[]; verdict: string } | null>(null);

  const runSimulation = () => {
    playStepTick();
    const steps: string[] = [
      `AgentLoop → ctx.llm.stream() 命中 ${model}`,
      `模型请求调用工具 get_time()`,
    ];
    if (guardMounted) {
      steps.push(`tools/pre-execute → guard 拦截，返回 { kind: 'deny' }（未抛错，Fiber 保持 ACTIVE）`);
      setTrace({ tone: 'warn', steps, verdict: '已拦截：拒绝结果写回会话，模型可换方式继续' });
      return;
    }
    if (!toolMounted) {
      steps.push(`tools/execute → 工具表未找到 get_time（tool-time 已卸载，注册已自动撤销）`);
      setTrace({ tone: 'bad', steps, verdict: 'ToolNotFound：热卸载未留任何残留' });
      return;
    }
    steps.push(`tools/pre-execute → 无监听，默认 allow`);
    steps.push(`tools/execute → tool-time 返回当前时间 → ${model} 流式回传`);
    playPackBurst();
    setTrace({ tone: 'good', steps, verdict: `成功流回回答（AgentLoop 0 行改动）` });
  };

  return (
    <div className="lab-board">
      <div className="lab-slot-grid">
        <button
          type="button"
          className="lab-plugin-card lab-plugin-card--on"
          onClick={() => {
            playCardFlip();
            setModel((m) => (m === 'llm-deepseek' ? 'llm-mock' : 'llm-deepseek'));
            setTrace(null);
          }}
        >
          <span className="lab-plugin-head">
            <Plug size={15} />
            <span className="mono">{model}</span>
          </span>
          <span className="lab-plugin-state lab-plugin-state--on">点击热切换适配器</span>
        </button>

        <button
          type="button"
          className={`lab-plugin-card ${guardMounted ? 'lab-plugin-card--warn' : 'lab-plugin-card--off'}`}
          onClick={() => {
            playCardFlip();
            setGuardMounted((v) => !v);
            setTrace(null);
          }}
        >
          <span className="lab-plugin-head">
            <Shield size={15} />
            <span className="mono">guard (pre-execute)</span>
          </span>
          <span className={`lab-plugin-state ${guardMounted ? 'lab-plugin-state--warn' : ''}`}>
            {guardMounted ? '已插入 · 点击拔出' : '已拔出 · 点击插入'}
          </span>
        </button>

        <button
          type="button"
          className={`lab-plugin-card ${toolMounted ? 'lab-plugin-card--on' : 'lab-plugin-card--off'}`}
          onClick={() => {
            playCardFlip();
            setToolMounted((v) => !v);
            setTrace(null);
          }}
        >
          <span className="lab-plugin-head">
            <Plug size={15} />
            <span className="mono">tool-time (get_time)</span>
          </span>
          <span className={`lab-plugin-state ${toolMounted ? 'lab-plugin-state--on' : ''}`}>
            {toolMounted ? '已插入 · 点击拔出' : '已拔出 · 点击插入'}
          </span>
        </button>
      </div>

      <div className="lab-controls">
        <button type="button" className="tactile-btn tactile-btn--primary" onClick={runSimulation}>
          <Play size={14} /> 提问「现在几点？」
        </button>
      </div>

      {trace && (
        <div className={`lab-result lab-result--${trace.tone}`}>
          <div className="lab-result-verdict">{trace.verdict}</div>
          <ol className="lab-trace-list mono">
            {trace.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Lab 2: dsh-scope 作用域冒泡与隔离实验台（dsh-scope）
 * --------------------------------------------------------------------------- */
function ScopeBubbleLab() {
  const [aOverride, setAOverride] = useState(true);
  const [aMounted, setAMounted] = useState(true);
  const [eventFrom, setEventFrom] = useState<'A' | 'B' | null>(null);

  const fireEvent = (source: 'A' | 'B') => {
    playStepTick();
    setEventFrom(source);
  };

  return (
    <div className="lab-board">
      <div className="lab-scope-tree">
        <div className={`lab-scope-node ${eventFrom ? 'lab-scope-node--hit' : ''}`}>
          <span className="mono">root scope</span>
          <span className="lab-scope-tag">
            {eventFrom ? `收到来自 Sub-Agent ${eventFrom} 的 pre-execute ↑` : '默认 bash · 祖先审批监听'}
          </span>
        </div>

        <div className={`lab-scope-node ${eventFrom ? 'lab-scope-node--hit' : ''}`}>
          <span className="mono">preset scope</span>
          <span className="lab-scope-tag">
            {eventFrom ? '事件向上穿透中 ↑' : 'parent: root'}
          </span>
        </div>

        <div className="lab-scope-children">
          <div
            className={`lab-scope-node ${
              !aMounted
                ? 'lab-scope-node--disposed'
                : eventFrom === 'A'
                  ? 'lab-scope-node--source'
                  : eventFrom === 'B'
                    ? 'lab-scope-node--isolated'
                    : ''
            }`}
          >
            <span className="mono">Sub-Agent A</span>
            <span className="lab-scope-tag">
              {!aMounted
                ? '已卸载 · uid effects = 0'
                : eventFrom === 'B'
                  ? '兄弟隔离 · 不可见'
                  : aOverride
                    ? 'bash → 只读覆盖（就近命中）'
                    : 'bash → 继承 root 默认'}
            </span>
          </div>

          <div
            className={`lab-scope-node ${
              eventFrom === 'B'
                ? 'lab-scope-node--source'
                : eventFrom === 'A'
                  ? 'lab-scope-node--isolated'
                  : ''
            }`}
          >
            <span className="mono">Sub-Agent B</span>
            <span className="lab-scope-tag">
              {eventFrom === 'A' ? '兄弟隔离 · 不可见' : 'bash → 继承 root 默认'}
            </span>
          </div>
        </div>
      </div>

      <div className="lab-controls">
        <button
          type="button"
          className="tactile-btn tactile-btn--primary"
          disabled={!aMounted}
          onClick={() => fireEvent('A')}
        >
          <GitBranch size={13} /> A 触发工具事件
        </button>
        <button type="button" className="tactile-btn tactile-btn--primary" onClick={() => fireEvent('B')}>
          <GitBranch size={13} /> B 触发工具事件
        </button>
        <button
          type="button"
          className="tactile-btn"
          disabled={!aMounted}
          onClick={() => {
            playCardFlip();
            setAOverride((v) => !v);
          }}
        >
          {aOverride ? '撤销 A 局部覆盖' : 'A 局部覆盖 bash'}
        </button>
        <button
          type="button"
          className="tactile-btn"
          onClick={() => {
            playCardFlip();
            setAMounted((v) => {
              if (v && eventFrom === 'A') setEventFrom(null);
              return !v;
            });
          }}
        >
          {aMounted ? <><Trash2 size={13} /> 卸载 A</> : <><RotateCcw size={13} /> 重建 A</>}
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Lab 3: 安全审批双闸门沙盒（approval-pipeline）
 * --------------------------------------------------------------------------- */
type CmdId = 'ls' | 'write-etc' | 'rm-tmp';
type SandboxMode = 'read-only' | 'workspace-write' | 'danger-full-access';
type GatePhase = 'idle' | 'asking' | 'allowed' | 'denied-policy' | 'denied-human' | 'denied-timeout' | 'blocked-sandbox';

const CMDS: { id: CmdId; label: string }[] = [
  { id: 'ls', label: 'ls ./src' },
  { id: 'write-etc', label: 'write /etc/hosts' },
  { id: 'rm-tmp', label: 'rm -rf ./dist' },
];

const SANDBOXES: SandboxMode[] = ['read-only', 'workspace-write', 'danger-full-access'];

function ApprovalSandboxLab() {
  const [cmd, setCmd] = useState<CmdId>('write-etc');
  const [sandbox, setSandbox] = useState<SandboxMode>('workspace-write');
  const [phase, setPhase] = useState<GatePhase>('idle');

  const evaluateSandbox = (c: CmdId, sbx: SandboxMode): GatePhase => {
    if (sbx === 'danger-full-access') return 'allowed';
    if (c === 'ls') return 'allowed';
    if (c === 'write-etc') return 'blocked-sandbox';
    if (c === 'rm-tmp') return sbx === 'read-only' ? 'blocked-sandbox' : 'allowed';
    return 'blocked-sandbox';
  };

  const runTool = () => {
    playStepTick();
    if (cmd === 'ls') {
      playPackBurst();
      setPhase('allowed');
      return;
    }
    if (sandbox === 'read-only' && cmd === 'rm-tmp') {
      setPhase('denied-policy');
      return;
    }
    setPhase('asking');
  };

  const onHumanDecision = (choice: 'allow' | 'deny' | 'timeout') => {
    if (choice === 'deny') {
      playCardFlip();
      setPhase('denied-human');
      return;
    }
    if (choice === 'timeout') {
      playCardFlip();
      setPhase('denied-timeout');
      return;
    }
    const finalPhase = evaluateSandbox(cmd, sandbox);
    if (finalPhase === 'allowed') playPackBurst();
    else playCardFlip();
    setPhase(finalPhase);
  };

  return (
    <div className="lab-board">
      <div className="lab-pickers">
        <div className="lab-picker-group">
          {CMDS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`lab-pill mono ${cmd === c.id ? 'lab-pill--active' : ''}`}
              onClick={() => {
                playStepTick();
                setCmd(c.id);
                setPhase('idle');
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="lab-picker-group">
          {SANDBOXES.map((m) => (
            <button
              key={m}
              type="button"
              className={`lab-pill mono ${sandbox === m ? 'lab-pill--active' : ''}`}
              onClick={() => {
                playStepTick();
                setSandbox(m);
                setPhase('idle');
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="lab-gates">
        <div className={`lab-gate ${phase === 'denied-policy' ? 'lab-gate--bad' : phase !== 'idle' ? 'lab-gate--ok' : ''}`}>
          <Shield size={16} />
          <span className="mono">1 · pre-execute</span>
          <span className="lab-gate-status">
            {phase === 'idle' ? '待触发' : phase === 'denied-policy' ? 'deny 拦截' : cmd === 'ls' ? 'allow 放行' : 'ask 挂起'}
          </span>
        </div>

        <div
          className={`lab-gate ${
            phase === 'asking'
              ? 'lab-gate--wait'
              : phase === 'denied-human' || phase === 'denied-timeout'
                ? 'lab-gate--bad'
                : phase === 'allowed' || phase === 'blocked-sandbox'
                  ? 'lab-gate--ok'
                  : ''
          }`}
        >
          <Shield size={16} />
          <span className="mono">2 · user-approval</span>
          <span className="lab-gate-status">
            {phase === 'asking'
              ? '等待人工确认…'
              : phase === 'denied-human'
                ? '用户拒绝'
                : phase === 'denied-timeout'
                  ? '无应答 → fail-closed'
                  : phase === 'allowed' || phase === 'blocked-sandbox'
                    ? cmd === 'ls' ? '跳过' : '允许尝试'
                    : '待触发'}
          </span>
        </div>

        <div
          className={`lab-gate ${
            phase === 'blocked-sandbox'
              ? 'lab-gate--bad'
              : phase === 'allowed'
                ? 'lab-gate--ok'
                : ''
          }`}
        >
          <Lock size={16} />
          <span className="mono">3 · dsh-sandbox</span>
          <span className="lab-gate-status">
            {phase === 'blocked-sandbox'
              ? 'EACCES 硬拦截'
              : phase === 'allowed'
                ? '边界内执行成功'
                : '待执行'}
          </span>
        </div>
      </div>

      {phase === 'asking' ? (
        <div className="lab-approval-prompt">
          <span className="mono">dsh-user-approval: {CMDS.find((c) => c.id === cmd)?.label}</span>
          <div className="lab-controls">
            <button type="button" className="tactile-btn tactile-btn--primary" onClick={() => onHumanDecision('allow')}>
              <CheckCircle2 size={13} /> 允许尝试
            </button>
            <button type="button" className="tactile-btn" onClick={() => onHumanDecision('deny')}>
              <XCircle size={13} /> 拒绝
            </button>
            <button type="button" className="tactile-btn" onClick={() => onHumanDecision('timeout')}>
              无应答（超时）
            </button>
          </div>
        </div>
      ) : (
        <div className="lab-controls">
          <button type="button" className="tactile-btn tactile-btn--primary" onClick={runTool}>
            <Play size={14} /> 模拟执行
          </button>
        </div>
      )}

      {phase === 'blocked-sandbox' && (
        <div className="lab-result lab-result--bad">
          <div className="lab-result-verdict">批准 ≠ 绕过沙箱：OS 沙箱（{sandbox}）物理拦截了越界写入，返回 EACCES</div>
        </div>
      )}
      {phase === 'denied-timeout' && (
        <div className="lab-result lab-result--warn">
          <div className="lab-result-verdict">fail-closed：审批无应答者或超时，自动返回拒绝</div>
        </div>
      )}
      {phase === 'allowed' && (
        <div className="lab-result lab-result--good">
          <div className="lab-result-verdict">双闸门通过：命令在 {sandbox} 边界内安全执行完毕</div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Lab 4: Pi Agent Steering / Follow-up 双队列实验台（steering-followup）
 * --------------------------------------------------------------------------- */
function PiSteeringLab() {
  const [queueType, setQueueType] = useState<'none' | 'steering' | 'followup'>('steering');
  const [drainMode, setDrainMode] = useState<'one-at-a-time' | 'all'>('one-at-a-time');
  const [trace, setTrace] = useState<{ tone: 'good' | 'warn'; verdict: string; steps: string[] } | null>(null);

  const runSim = () => {
    playStepTick();
    if (queueType === 'none') {
      playPackBurst();
      setTrace({
        tone: 'good',
        verdict: '无排队输入：3 个工具依次执行完毕 → 内外层循环正常收敛',
        steps: [
          '内层 Turn #1 → 模型请求 [bash_1, edit_2, bash_3]',
          'tool 1/3: bash_1 执行完毕 → getSteeringMessages() = []',
          'tool 2/3: edit_2 执行完毕 → getSteeringMessages() = []',
          'tool 3/3: bash_3 执行完毕 → LLM 汇总输出 → 外层 followUp = [] → agent_end',
        ],
      });
      return;
    }
    if (queueType === 'steering') {
      const drained = drainMode === 'all' ? '一次性弹出 [S1, S2] 全部 Steering 消息' : '按 one-at-a-time 弹出队首 S1（S2 留待下个边界）';
      playPackBurst();
      setTrace({
        tone: 'warn',
        verdict: 'Steering 边界命中：跳过剩余 2 个工具并合成 Skipped 结果，零破坏协议原地转向！',
        steps: [
          'tool 1/3: bash_1 执行完毕（保留真实 stdout）',
          `边界检测 getSteeringMessages() 命中！${drained}`,
          'tool 2/3: edit_2 → 跳过执行，合成 toolResult("Skipped due to queued user message.")',
          'tool 3/3: bash_3 → 跳过执行，合成 toolResult("Skipped due to queued user message.")',
          '追加 Steering 消息 → 立即进入下一轮 LLM 推理（tool_use/tool_result 100% 配对）',
        ],
      });
      return;
    }
    const drained = drainMode === 'all' ? '一次性消费 [F1, F2] 开启续接轮' : '弹出队首 F1 开启续接轮（F2 留待下一外层循环）';
    playPackBurst();
    setTrace({
      tone: 'good',
      verdict: 'Follow-up 优雅接力：绝不打断当前 3 个工具，等内层彻底收敛后再自动续跑！',
      steps: [
        'tool 1/3: bash_1 执行完毕（followUp 不干扰内层边界）',
        'tool 2/3: edit_2 执行完毕',
        'tool 3/3: bash_3 执行完毕 → 模型给出完整阶段总结 → 内层循环跳出',
        `外层循环检查 getFollowUpMessages() 命中！${drained}`,
        '共享同一份会话上下文，无缝拉起新一轮 turn_start',
      ],
    });
  };

  return (
    <div className="lab-board">
      <div className="lab-pickers">
        <div className="lab-picker-group">
          {([
            { id: 'steering', label: '注入 Steering（立刻转向）' },
            { id: 'followup', label: '注入 Follow-up（收敛后续跑）' },
            { id: 'none', label: '不注入队列' },
          ] as const).map((item) => (
            <button
              key={item.id}
              type="button"
              className={`lab-pill mono ${queueType === item.id ? 'lab-pill--active' : ''}`}
              onClick={() => {
                playStepTick();
                setQueueType(item.id);
                setTrace(null);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="lab-picker-group">
          {(['one-at-a-time', 'all'] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={`lab-pill mono ${drainMode === m ? 'lab-pill--active' : ''}`}
              onClick={() => {
                playStepTick();
                setDrainMode(m);
                setTrace(null);
              }}
            >
              mode: {m}
            </button>
          ))}
        </div>
      </div>

      <div className="lab-gates">
        <div className={`lab-gate ${trace ? 'lab-gate--ok' : ''}`}>
          <RefreshCw size={16} />
          <span className="mono">bash_1</span>
          <span className="lab-gate-status">{trace ? '已执行完毕' : '待执行'}</span>
        </div>
        <div className={`lab-gate ${trace && queueType === 'steering' ? 'lab-gate--bad' : trace ? 'lab-gate--ok' : ''}`}>
          <Pause size={16} />
          <span className="mono">edit_2 & bash_3</span>
          <span className="lab-gate-status">
            {!trace ? '待执行' : queueType === 'steering' ? '合成 Skipped 跳过' : '全部正常跑完'}
          </span>
        </div>
        <div className={`lab-gate ${trace && queueType === 'followup' ? 'lab-gate--wait' : trace ? 'lab-gate--ok' : ''}`}>
          <Clock size={16} />
          <span className="mono">外层 Follow-up</span>
          <span className="lab-gate-status">
            {!trace ? '等待内层收敛' : queueType === 'followup' ? '收敛后拉起新一轮' : queueType === 'steering' ? '内层已原地转向' : '队列空 → 结束'}
          </span>
        </div>
      </div>

      <div className="lab-controls">
        <button type="button" className="tactile-btn tactile-btn--primary" onClick={runSim}>
          <Play size={14} /> 模拟 3 工具调用序列
        </button>
      </div>

      {trace && (
        <div className={`lab-result lab-result--${trace.tone}`}>
          <div className="lab-result-verdict">{trace.verdict}</div>
          <ol className="lab-trace-list mono">
            {trace.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Lab 5: Codex 正交安全策略实验台（codex-approval-policy）
 * --------------------------------------------------------------------------- */
type CodexApproval = 'untrusted' | 'on-request' | 'never';
type CodexSandbox = 'read-only' | 'workspace-write' | 'danger-full-access';
type CodexCmd = 'rg-src' | 'cargo-test' | 'git-hook' | 'curl-net';

function CodexPolicyLab() {
  const [approval, setApproval] = useState<CodexApproval>('on-request');
  const [sandbox, setSandbox] = useState<CodexSandbox>('workspace-write');
  const [cmd, setCmd] = useState<CodexCmd>('curl-net');
  const [trace, setTrace] = useState<{ tone: 'good' | 'warn' | 'bad'; verdict: string; steps: string[] } | null>(null);

  const runSim = () => {
    playStepTick();
    const steps: string[] = [`Op::UserTurn 下发策略: approval=${approval}, sandbox=${sandbox}`];

    if (cmd === 'rg-src') {
      steps.push('ExecPolicy AST 审查: rg src 命中已知安全只读命令 → 无需审批');
      steps.push(`OS 沙箱 (${sandbox}): 只读访问工作区 → 成功返回结果`);
      playPackBurst();
      setTrace({ tone: 'good', verdict: '安全放行：只读命令在所有沙箱档位零弹窗直通', steps });
      return;
    }

    if (cmd === 'cargo-test') {
      if (approval === 'untrusted') {
        steps.push('AskForApproval=untrusted: cargo test 非纯只读白名单 → 发 ExecApprovalRequest 挂起审批');
      } else {
        steps.push(`AskForApproval=${approval}: 允许先在沙箱内乐观试跑`);
      }
      if (sandbox === 'read-only') {
        steps.push('Seatbelt / Landlock (read-only): target/ 编译产物写入被内核 EACCES 拦截');
        setTrace({
          tone: approval === 'never' ? 'bad' : 'warn',
          verdict: approval === 'never'
            ? '内核拦截（never 模式不提权）：read-only 沙箱拒绝写编译产物'
            : '沙箱拦截后可按需弹窗请求单次提权，或改用 workspace-write',
          steps,
        });
        return;
      }
      steps.push(`OS 沙箱 (${sandbox}): 允许写入 ./target，默认断网 → 单测执行完毕！`);
      playPackBurst();
      setTrace({ tone: 'good', verdict: '丝滑放行：工作区内编译与单测零干扰安全完成', steps });
      return;
    }

    if (cmd === 'git-hook') {
      steps.push('目标动作: 写入 .git/hooks/pre-commit');
      if (sandbox === 'danger-full-access') {
        steps.push('警告：danger-full-access 已解除 OS 沙箱围栏，允许直接写 .git/hooks！');
        setTrace({ tone: 'warn', verdict: '高危放行：解除沙箱后失去 .git 只读挖洞保护', steps });
        return;
      }
      steps.push(`Seatbelt / Landlock (${sandbox}): .git 位于只读保护挖洞区 → 内核物理返回 EACCES！`);
      setTrace({ tone: 'bad', verdict: '内核物理阻断：即使在 workspace-write 下，.git 仍只读锁死，防 Hook 提权逃逸', steps });
      return;
    }

    // curl-net
    steps.push('目标动作: curl https://registry.npmjs.org (发起外网 connect)');
    if (sandbox === 'danger-full-access') {
      steps.push('danger-full-access: 网络未隔离 → 直接访问外网');
      setTrace({ tone: 'warn', verdict: '无沙箱放行：外网已放开（建议仅在外层容器中使用）', steps });
      return;
    }
    steps.push(`OS 沙箱 (${sandbox}, network_access=false): seccomp / Seatbelt 内核阻断 connect() → EPERM`);
    if (approval === 'never') {
      steps.push('AskForApproval=never: 禁止升级审批 → 直接将断网错误返回模型');
      setTrace({ tone: 'bad', verdict: '零信任兜底：CI 无人值守下内核物理掐断外联，防止 Prompt 注入外泄！', steps });
      return;
    }
    steps.push('is_likely_sandbox_denied() = true → 向 EQ 发送 ExecApprovalRequest 请求人类单次提权');
    setTrace({ tone: 'warn', verdict: '乐观试跑拦截 → 精准识别沙箱断网并弹窗征求单次联网授权', steps });
  };

  return (
    <div className="lab-board">
      <div className="lab-pickers">
        <div className="lab-picker-group">
          {([
            { id: 'rg-src', label: 'rg TODO src' },
            { id: 'cargo-test', label: 'cargo test' },
            { id: 'git-hook', label: 'write .git/hooks' },
            { id: 'curl-net', label: 'curl 外网请求' },
          ] as const).map((c) => (
            <button key={c.id} type="button" className={`lab-pill mono ${cmd === c.id ? 'lab-pill--active' : ''}`} onClick={() => { playStepTick(); setCmd(c.id); setTrace(null); }}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="lab-picker-group">
          {(['untrusted', 'on-request', 'never'] as const).map((a) => (
            <button key={a} type="button" className={`lab-pill mono ${approval === a ? 'lab-pill--active' : ''}`} onClick={() => { playStepTick(); setApproval(a); setTrace(null); }}>
              approval: {a}
            </button>
          ))}
        </div>
        <div className="lab-picker-group">
          {(['read-only', 'workspace-write', 'danger-full-access'] as const).map((s) => (
            <button key={s} type="button" className={`lab-pill mono ${sandbox === s ? 'lab-pill--active' : ''}`} onClick={() => { playStepTick(); setSandbox(s); setTrace(null); }}>
              sandbox: {s}
            </button>
          ))}
        </div>
      </div>

      <div className="lab-controls">
        <button type="button" className="tactile-btn tactile-btn--primary" onClick={runSim}>
          <Play size={14} /> 评估二维策略结果
        </button>
      </div>

      {trace && (
        <div className={`lab-result lab-result--${trace.tone}`}>
          <div className="lab-result-verdict">{trace.verdict}</div>
          <ol className="lab-trace-list mono">
            {trace.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Lab 6: Claude Code PreToolUse Hook & 权限级联实验台（cc-hooks-lifecycle）
 * --------------------------------------------------------------------------- */
function ClaudeHooksLab() {
  const [toolCall, setToolCall] = useState<'read-env' | 'pytest' | 'git-push'>('pytest');
  const [hookOn, setHookOn] = useState(true);
  const [bypassMode, setBypassMode] = useState(false);
  const [trace, setTrace] = useState<{ tone: 'good' | 'warn' | 'bad'; verdict: string; steps: string[] } | null>(null);

  const runSim = () => {
    playStepTick();
    const steps: string[] = [];
    if (toolCall === 'read-env') {
      if (hookOn) {
        steps.push('1 · PreToolUse Hook (guard.sh): 命中 *.env → stderr 输出理由并返回 Exit Code 2');
        steps.push(bypassMode ? '注意：即使已开启 bypassPermissions，Hooks 依然 100% 强制拦截！' : '拦截理由作为 tool_result 反馈给 Claude，引导其改读 .env.example');
        setTrace({ tone: 'bad', verdict: 'PreToolUse Exit 2 硬拦截：敏感 .env 密钥零泄露（bypassPermissions 亦无法绕过）', steps });
        return;
      }
      steps.push('1 · PreToolUse Hook: 未启用');
      steps.push('2 · permissions.deny 规则命中 Read(./.env) → 级联一票否决（deny > allow）');
      setTrace({ tone: 'bad', verdict: 'permissions.deny 兜底拦截：deny 规则压倒一切 allow', steps });
      return;
    }

    if (toolCall === 'pytest') {
      if (hookOn) {
        steps.push('1 · PreToolUse Hook: Exit 0 + 返回 updatedInput: {"command": "pytest --tb=short -q"}');
        steps.push('2 · 权限级联: 命中 allow Bash(pytest*) → 自动放行');
        steps.push('3 · 工具执行改写后的精简命令 → 节省大量测试输出 Token');
        playPackBurst();
        setTrace({ tone: 'good', verdict: 'updatedInput 透明改参成功：零重试一次跑出精简测试结果！', steps });
        return;
      }
      steps.push('1 · PreToolUse Hook: 未启用');
      steps.push('2 · 权限级联: 命中 allow Bash(pytest*) → 以原始冗长参数直接执行');
      playPackBurst();
      setTrace({ tone: 'good', verdict: '权限 allow 直接放行（未触发参数优化）', steps });
      return;
    }

    // git-push
    steps.push(hookOn ? '1 · PreToolUse Hook: 未命中禁令 → Exit 0 交由后续权限级联' : '1 · PreToolUse Hook: 未启用');
    if (bypassMode) {
      steps.push('2 · Permission Mode = bypassPermissions: 跳过 ask 弹窗确认 → 直接执行 git push');
      setTrace({ tone: 'warn', verdict: 'bypassPermissions 跳过了 ask 弹窗（因此绝对红线必须放进 PreToolUse Hook！）', steps });
      return;
    }
    steps.push('2 · 权限级联: 跳过 deny → 命中 ask Bash(git push *) → 弹出人工确认窗');
    setTrace({ tone: 'warn', verdict: '权限级联命中 ask：挂起等待人类明确确认后方可执行', steps });
  };

  return (
    <div className="lab-board">
      <div className="lab-pickers">
        <div className="lab-picker-group">
          {([
            { id: 'read-env', label: 'Read("./.env")' },
            { id: 'pytest', label: 'Bash("pytest tests/")' },
            { id: 'git-push', label: 'Bash("git push origin feat")' },
          ] as const).map((t) => (
            <button key={t.id} type="button" className={`lab-pill mono ${toolCall === t.id ? 'lab-pill--active' : ''}`} onClick={() => { playStepTick(); setToolCall(t.id); setTrace(null); }}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="lab-picker-group">
          <button type="button" className={`lab-pill mono ${hookOn ? 'lab-pill--active' : ''}`} onClick={() => { playCardFlip(); setHookOn((v) => !v); setTrace(null); }}>
            PreToolUse Hook: {hookOn ? 'ON' : 'OFF'}
          </button>
          <button type="button" className={`lab-pill mono ${bypassMode ? 'lab-pill--active' : ''}`} onClick={() => { playCardFlip(); setBypassMode((v) => !v); setTrace(null); }}>
            mode: {bypassMode ? 'bypassPermissions' : 'default'}
          </button>
        </div>
      </div>

      <div className="lab-controls">
        <button type="button" className="tactile-btn tactile-btn--primary" onClick={runSim}>
          <Play size={14} /> 穿越 Hooks 与权限级联
        </button>
      </div>

      {trace && (
        <div className={`lab-result lab-result--${trace.tone}`}>
          <div className="lab-result-verdict">{trace.verdict}</div>
          <ol className="lab-trace-list mono">
            {trace.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Lab 7: LangGraph interrupt() 冻结、Command(resume) 与时间旅行分叉实验台
 * --------------------------------------------------------------------------- */
type LgStage = 'idle' | 'interrupted' | 'completed' | 'forked';

function LangGraphInterruptLab() {
  const [stage, setStage] = useState<LgStage>('idle');
  const [amount, setAmount] = useState<number>(8500);
  const [log, setLog] = useState<string[]>([
    'Thread t-101 已初始化，Checkpointer = AsyncPostgresSaver',
  ]);

  const startRun = () => {
    playStepTick();
    setStage('interrupted');
    setLog([
      'Superstep 0 [Plan→Execute→Update]: agent 节点拟调用 transfer(amount=8500) → 写入 CP #1',
      'Superstep 1: 进入 review_node → amount > 5000 命中 interrupt(payload)！',
      'Checkpointer 冻结保存 CP #2，HTTP 连接已释放（内存占用 0），等待 Command(resume)...',
    ]);
  };

  const resume = (decision: 'approve' | 'edit' | 'reject') => {
    playPackBurst();
    if (decision === 'approve') {
      setStage('completed');
      setLog((prev) => [
        ...prev,
        `收到 Command(resume={"type":"approve"}) → 加载 CP #2 并从 review_node 头部确定性重放`,
        `interrupt() 原位返回 approve → 执行 transfer(amount=${amount}) → 写入 CP #3 (END)`,
      ]);
      return;
    }
    if (decision === 'edit') {
      setAmount(3000);
      setStage('completed');
      setLog((prev) => [
        ...prev,
        '收到 Command(resume={"type":"edit", "amount":3000}) → 重放 review_node 修改参数',
        '执行改写后的 transfer(amount=3000) → 写入 CP #3 (END)',
      ]);
      return;
    }
    setStage('completed');
    setLog((prev) => [
      ...prev,
      '收到 Command(resume={"type":"reject"}) → Command(goto="agent") 打回模型重拟方案 → 写入 CP #3',
    ]);
  };

  const forkFromCp1 = () => {
    playCardFlip();
    setAmount(1200);
    setStage('forked');
    setLog((prev) => [
      ...prev,
      '时间旅行：update_state(CP #1, {"amount": 1200}, as_node="agent") → 铸造新分支 CP #2\'（旧历史保留）',
      'invoke(None, fork_config): amount=1200 <= 5000 免中断直通 → 分叉时间线完成 (CP #3\')！',
    ]);
  };

  const reset = () => {
    playStepTick();
    setAmount(8500);
    setStage('idle');
    setLog(['Thread t-101 已重置，等待下一次 invoke()']);
  };

  return (
    <div className="lab-board">
      <div className="lab-gates">
        <div className={`lab-gate ${stage !== 'idle' ? 'lab-gate--ok' : ''}`}>
          <Shield size={16} />
          <span className="mono">CP #1 · agent</span>
          <span className="lab-gate-status">{stage === 'idle' ? '待执行' : `拟转账 ¥${amount}`}</span>
        </div>
        <div className={`lab-gate ${stage === 'interrupted' ? 'lab-gate--wait' : stage === 'completed' || stage === 'forked' ? 'lab-gate--ok' : ''}`}>
          <Pause size={16} />
          <span className="mono">CP #2 · interrupt()</span>
          <span className="lab-gate-status">
            {stage === 'idle' ? '待触发' : stage === 'interrupted' ? '已落盘冻结，等 resume' : stage === 'forked' ? 'Fork 绕过阈值直通' : '已重放恢复'}
          </span>
        </div>
        <div className={`lab-gate ${stage === 'completed' || stage === 'forked' ? 'lab-gate--ok' : ''}`}>
          <GitBranch size={16} />
          <span className="mono">{stage === 'forked' ? 'CP #3\' · Fork END' : 'CP #3 · END'}</span>
          <span className="lab-gate-status">
            {stage === 'completed' ? '主时间线完成' : stage === 'forked' ? '分叉时间线完成' : '未到达'}
          </span>
        </div>
      </div>

      {stage === 'interrupted' ? (
        <div className="lab-approval-prompt">
          <span className="mono">__interrupt__: 允许执行 transfer(amount=¥{amount}) 吗？</span>
          <div className="lab-controls">
            <button type="button" className="tactile-btn tactile-btn--primary" onClick={() => resume('approve')}>
              <CheckCircle2 size={13} /> Command(resume=&quot;approve&quot;)
            </button>
            <button type="button" className="tactile-btn" onClick={() => resume('edit')}>
              改额为 ¥3000 并放行
            </button>
            <button type="button" className="tactile-btn" onClick={() => resume('reject')}>
              <XCircle size={13} /> 拒绝打回 agent
            </button>
          </div>
        </div>
      ) : (
        <div className="lab-controls">
          {stage === 'idle' && (
            <button type="button" className="tactile-btn tactile-btn--primary" onClick={startRun}>
              <Play size={14} /> invoke(转账 ¥8500)
            </button>
          )}
          {stage === 'completed' && (
            <button type="button" className="tactile-btn tactile-btn--primary" onClick={forkFromCp1}>
              <GitBranch size={14} /> 时间旅行：从 CP #1 Fork 为 ¥1200 重跑
            </button>
          )}
          {stage !== 'idle' && (
            <button type="button" className="tactile-btn" onClick={reset}>
              <RotateCcw size={13} /> 重置线程
            </button>
          )}
        </div>
      )}

      <div className={`lab-result ${stage === 'interrupted' ? 'lab-result--warn' : 'lab-result--good'}`}>
        <ol className="lab-trace-list mono">
          {log.map((item, idx) => <li key={idx}>{item}</li>)}
        </ol>
      </div>
    </div>
  );
}

export function InteractiveLab({ kind }: { kind: LabKind }) {
  if (kind === 'plugin-everything') return <HotPlugLab />;
  if (kind === 'dsh-scope') return <ScopeBubbleLab />;
  if (kind === 'steering-followup') return <PiSteeringLab />;
  if (kind === 'codex-approval-policy') return <CodexPolicyLab />;
  if (kind === 'cc-hooks-lifecycle') return <ClaudeHooksLab />;
  if (kind === 'lg-interrupt-command') return <LangGraphInterruptLab />;
  return <ApprovalSandboxLab />;
}
