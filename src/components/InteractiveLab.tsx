import { useState } from 'react';
import { CheckCircle2, GitBranch, Lock, Play, Plug, RotateCcw, Shield, Trash2, XCircle } from 'lucide-react';
import { playCardFlip, playPackBurst, playStepTick } from '../utils/sound';

export type LabKind = 'plugin-everything' | 'dsh-scope' | 'approval-pipeline';

export function hasInteractiveLab(lessonSlug: string): lessonSlug is LabKind {
  return lessonSlug === 'plugin-everything' || lessonSlug === 'dsh-scope' || lessonSlug === 'approval-pipeline';
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

export function InteractiveLab({ kind }: { kind: LabKind }) {
  if (kind === 'plugin-everything') return <HotPlugLab />;
  if (kind === 'dsh-scope') return <ScopeBubbleLab />;
  return <ApprovalSandboxLab />;
}
