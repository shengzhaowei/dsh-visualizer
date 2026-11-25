import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Lock,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Terminal,
  XCircle,
} from 'lucide-react';
import { highlightLine } from '../../utils/highlight';
import { playCardFlip, playPackBurst, playStepTick } from '../../utils/sound';

type ApprovalMode = 'untrusted' | 'on-request' | 'never';
type SandboxMode = 'read-only' | 'workspace-write' | 'danger-full-access';
type KernelTarget = 'macos-seatbelt' | 'linux-landlock';

interface WireFrame {
  id: number;
  dir: 'SQ' | 'EQ' | 'KERNEL';
  tag: string;
  payload: string;
  tone: 'violet' | 'emerald' | 'amber' | 'rose' | 'blue';
}

interface PendingApproval {
  subId: string;
  cmdId: string;
  command: string;
  reason: string;
  isEscalation: boolean;
}

interface PresetOp {
  id: string;
  label: string;
  command: string;
  kind: 'readonly' | 'workspace-write' | 'git-hook' | 'network';
  desc: string;
}

const PRESET_OPS: PresetOp[] = [
  { id: 'rg', label: 'rg "SandboxPolicy" codex-rs/', command: 'rg "SandboxPolicy" codex-rs/', kind: 'readonly', desc: 'AST 白名单只读搜索' },
  { id: 'test', label: 'cargo test -p codex-core', command: 'cargo test -p codex-core', kind: 'workspace-write', desc: '写 ./target 并执行单测' },
  { id: 'githook', label: 'write .git/hooks/pre-commit', command: 'echo "curl bad.io" > .git/hooks/pre-commit', kind: 'git-hook', desc: '尝试改写 .git 保护挖洞区' },
  { id: 'curl', label: 'curl https://crates.io/api', command: 'curl -s https://crates.io/api/v1/crates/tokio', kind: 'network', desc: '尝试发起外网 TCP connect()' },
];

function buildKernelProfile(sandbox: SandboxMode, os: KernelTarget, networkAccess: boolean): string {
  if (os === 'macos-seatbelt') {
    if (sandbox === 'danger-full-access') {
      return `;; DangerFullAccess: 不挂接 sandbox-exec 围栏\n(version 1)\n(allow default) ;; WARNING: 宿主机全权限裸奔`;
    }
    if (sandbox === 'read-only') {
      return `(version 1)\n(deny default)\n(allow process-exec process-fork)\n(allow file-read*)\n;; 禁止一切 file-write* 与 network-outbound`;
    }
    return `(version 1)\n(deny default)\n(allow process-exec process-fork)\n(allow file-read*)\n(allow file-write*\n  (require-all\n    (subpath "/workspace/codex")\n    (require-not (subpath "/workspace/codex/.git"))\n    (require-not (subpath "/workspace/codex/.codex"))))\n${networkAccess ? '(allow network-outbound)' : ';; network-outbound 默认被 (deny default) 物理阻断'}`;
  }

  // Linux Landlock + seccomp-bpf
  if (sandbox === 'danger-full-access') {
    return `// DangerFullAccess: 跳过 codex-linux-sandbox 包装器\n// PR_SET_NO_NEW_PRIVS: 未启用\n// Landlock LSM: 未启用\n// seccomp-bpf: 未启用`;
  }
  if (sandbox === 'read-only') {
    return `// codex-linux-sandbox (ReadOnly)\nprctl(PR_SET_NO_NEW_PRIVS, 1);\nlandlock_add_rule(ruleset, "/", ACCESS_FS_READ_ONLY);\nlandlock_restrict_self(ruleset);\nseccomp_deny_syscalls([SYS_socket, SYS_connect]); // 物理断网`;
  }
  return `// codex-linux-sandbox (WorkspaceWrite)\nprctl(PR_SET_NO_NEW_PRIVS, 1);\nlandlock_add_rule(ruleset, "/", ACCESS_FS_READ_ONLY);\nlandlock_add_rule(ruleset, "/workspace/codex", ACCESS_FS_RW);\n// 二次挖洞: .git / .codex 保持只读防 Hook 提权\nlandlock_restrict_self(ruleset);\n${networkAccess ? '// network_access = true (放行外网 socket)' : 'seccomp_deny_syscalls([SYS_connect, SYS_sendto]); // 默认断网'}`;
}

/** OpenAI Codex 专属 SQ ⇄ EQ 双队列协议与 OS 内核沙箱实时实验台。 */
export function CodexWorkbenchView({ onJumpToLesson }: { onJumpToLesson: (slug: string, stepNumber?: number) => void }) {
  const [approval, setApproval] = useState<ApprovalMode>('on-request');
  const [sandbox, setSandbox] = useState<SandboxMode>('workspace-write');
  const [osTarget, setOsTarget] = useState<KernelTarget>('macos-seatbelt');
  const [networkAccess, setNetworkAccess] = useState(false);
  const [sessionAllowList, setSessionAllowList] = useState<Set<string>>(() => new Set());
  const [pending, setPending] = useState<PendingApproval | null>(null);
  const [seq, setSeq] = useState(1);
  const [pipeState, setPipeState] = useState<{
    sq: 'idle' | 'ok';
    ast: 'idle' | 'ok' | 'warn' | 'bad';
    gate: 'idle' | 'ok' | 'wait' | 'bad';
    kernel: 'idle' | 'ok' | 'bad';
  }>({ sq: 'idle', ast: 'idle', gate: 'idle', kernel: 'idle' });

  const [frames, setFrames] = useState<WireFrame[]>([
    {
      id: 0,
      dir: 'EQ',
      tag: 'EventMsg::SessionConfigured',
      payload: '{"model":"o3","sandbox":"workspace-write","approval":"on-request","network":false}',
      tone: 'blue',
    },
  ]);

  const kernelCode = useMemo(
    () => buildKernelProfile(sandbox, osTarget, networkAccess),
    [sandbox, osTarget, networkAccess],
  );
  const kernelLines = useMemo(() => kernelCode.split('\n'), [kernelCode]);

  const pushFrames = (items: Omit<WireFrame, 'id'>[]) => {
    setFrames((prev) => {
      let nextId = prev.length > 0 ? prev[prev.length - 1].id + 1 : 1;
      const stamped = items.map((it) => ({ ...it, id: nextId++ }));
      return [...prev, ...stamped].slice(-26);
    });
  };

  const evaluateInKernel = (op: PresetOp, subId: string, bypassSandboxOnce = false) => {
    const osName = osTarget === 'macos-seatbelt' ? 'Seatbelt (SBPL)' : 'Landlock + seccomp';
    if (bypassSandboxOnce || sandbox === 'danger-full-access') {
      playPackBurst();
      setPipeState({ sq: 'ok', ast: 'ok', gate: 'ok', kernel: 'ok' });
      pushFrames([
        {
          dir: 'KERNEL',
          tag: bypassSandboxOnce ? 'Host Exec (单次提权放行)' : 'Host Exec (DangerFullAccess)',
          payload: `cmd="${op.command}" → exit_code=0`,
          tone: 'amber',
        },
        {
          dir: 'EQ',
          tag: 'EventMsg::ExecCommandEnd',
          payload: `{"sub_id":"${subId}","exit_code":0,"escalated":${bypassSandboxOnce}}`,
          tone: 'emerald',
        },
      ]);
      return;
    }

    if (op.kind === 'readonly') {
      playPackBurst();
      setPipeState({ sq: 'ok', ast: 'ok', gate: 'ok', kernel: 'ok' });
      pushFrames([
        { dir: 'KERNEL', tag: `${osName} [OK]`, payload: `allow file-read* → 命中 14 处引用`, tone: 'emerald' },
        { dir: 'EQ', tag: 'EventMsg::ExecCommandEnd', payload: `{"sub_id":"${subId}","exit_code":0}`, tone: 'emerald' },
      ]);
      return;
    }

    if (op.kind === 'git-hook') {
      setPipeState({ sq: 'ok', ast: 'bad', gate: 'ok', kernel: 'bad' });
      pushFrames([
        {
          dir: 'KERNEL',
          tag: `${osName} [EACCES 硬拦截]`,
          payload: `.git/hooks 命中只读保护挖洞区 → 内核物理拒绝写入 (EACCES)`,
          tone: 'rose',
        },
        {
          dir: 'EQ',
          tag: 'EventMsg::ExecCommandEnd',
          payload: `{"sub_id":"${subId}","exit_code":1,"sandbox_denied":true,"err":"Read-only protected subpath .git"}`,
          tone: 'rose',
        },
      ]);
      return;
    }

    if (op.kind === 'workspace-write') {
      if (sandbox === 'read-only') {
        setPipeState({ sq: 'ok', ast: 'warn', gate: approval === 'never' ? 'bad' : 'wait', kernel: 'bad' });
        if (approval === 'never') {
          pushFrames([
            { dir: 'KERNEL', tag: `${osName} [EACCES]`, payload: `ReadOnly 沙箱拒绝写 ./target`, tone: 'rose' },
            { dir: 'EQ', tag: 'EventMsg::ExecCommandEnd', payload: `{"sub_id":"${subId}","exit_code":1,"note":"approval=never 不允许提权"}`, tone: 'rose' },
          ]);
        } else {
          setPending({
            subId,
            cmdId: op.id,
            command: op.command,
            reason: 'is_likely_sandbox_denied() = true：ReadOnly 沙箱拦截 ./target 写入，申请单次提权',
            isEscalation: true,
          });
          pushFrames([
            { dir: 'KERNEL', tag: `${osName} [EACCES]`, payload: `乐观试跑失败 → 识别为沙箱拒绝`, tone: 'amber' },
            { dir: 'EQ', tag: 'EventMsg::ExecApprovalRequest', payload: `{"sub_id":"${subId}","call_id":"call_${subId}","reason":"sandbox_escalation"}`, tone: 'amber' },
          ]);
        }
        return;
      }
      playPackBurst();
      setPipeState({ sq: 'ok', ast: 'ok', gate: 'ok', kernel: 'ok' });
      pushFrames([
        { dir: 'KERNEL', tag: `${osName} [WorkspaceWrite OK]`, payload: `允许写 ./target，外网保持断网 → 42 passed`, tone: 'emerald' },
        { dir: 'EQ', tag: 'EventMsg::ExecCommandEnd', payload: `{"sub_id":"${subId}","exit_code":0,"passed":42}`, tone: 'emerald' },
      ]);
      return;
    }

    // network
    if (networkAccess && sandbox === 'workspace-write') {
      playPackBurst();
      setPipeState({ sq: 'ok', ast: 'ok', gate: 'ok', kernel: 'ok' });
      pushFrames([
        { dir: 'KERNEL', tag: `${osName} [Network Allowed]`, payload: `network_access=true → HTTP 200 OK`, tone: 'emerald' },
        { dir: 'EQ', tag: 'EventMsg::ExecCommandEnd', payload: `{"sub_id":"${subId}","exit_code":0}`, tone: 'emerald' },
      ]);
      return;
    }

    setPipeState({ sq: 'ok', ast: 'warn', gate: approval === 'never' ? 'bad' : 'wait', kernel: 'bad' });
    if (approval === 'never') {
      pushFrames([
        { dir: 'KERNEL', tag: `${osName} [EPERM 物理断网]`, payload: `connect(AF_INET) 被 seccomp/Seatbelt 掐断 → 防 Prompt 注入外泄`, tone: 'rose' },
        { dir: 'EQ', tag: 'EventMsg::ExecCommandEnd', payload: `{"sub_id":"${subId}","exit_code":7,"err":"Operation not permitted (network disabled)"}`, tone: 'rose' },
      ]);
    } else {
      setPending({
        subId,
        cmdId: op.id,
        command: op.command,
        reason: '沙箱默认断网拦截了外联请求（EPERM），挂起 oneshot 询问是否单次放行联网',
        isEscalation: true,
      });
      pushFrames([
        { dir: 'KERNEL', tag: `${osName} [EPERM 断网拦截]`, payload: `connect() → EPERM，触发 is_likely_sandbox_denied()`, tone: 'amber' },
        { dir: 'EQ', tag: 'EventMsg::ExecApprovalRequest', payload: `{"sub_id":"${subId}","escalation":true,"cmd":"${op.command}"}`, tone: 'amber' },
      ]);
    }
  };

  const dispatchPreset = (op: PresetOp) => {
    playStepTick();
    setPending(null);
    const subId = `sub_${String(seq).padStart(2, '0')}`;
    setSeq((s) => s + 1);

    pushFrames([
      {
        dir: 'SQ',
        tag: 'Op::UserTurn',
        payload: `{"id":"${subId}","cmd":"${op.command}","approval":"${approval}","sandbox":"${sandbox}"}`,
        tone: 'violet',
      },
    ]);

    if (op.kind === 'readonly') {
      evaluateInKernel(op, subId);
      return;
    }

    if (approval === 'untrusted' && !sessionAllowList.has(op.id)) {
      setPipeState({ sq: 'ok', ast: 'warn', gate: 'wait', kernel: 'idle' });
      setPending({
        subId,
        cmdId: op.id,
        command: op.command,
        reason: 'AskForApproval=untrusted 且命令不在只读白名单 → 登记 pending_approvals oneshot 挂起',
        isEscalation: false,
      });
      pushFrames([
        {
          dir: 'EQ',
          tag: 'EventMsg::ExecApprovalRequest',
          payload: `{"sub_id":"${subId}","cmd":"${op.command}","oneshot":"pending"}`,
          tone: 'amber',
        },
      ]);
      return;
    }

    evaluateInKernel(op, subId);
  };

  const respondApproval = (decision: 'Approved' | 'ApprovedForSession' | 'Denied' | 'Abort') => {
    if (!pending) return;
    playCardFlip();
    const cur = pending;
    setPending(null);

    pushFrames([
      {
        dir: 'SQ',
        tag: decision === 'Abort' ? 'Op::Interrupt' : 'Op::ExecApproval',
        payload: decision === 'Abort'
          ? `{"id":"${cur.subId}","op":"Interrupt"}`
          : `{"id":"${cur.subId}","decision":"${decision}"}`,
        tone: 'violet',
      },
    ]);

    if (decision === 'Abort') {
      setPipeState({ sq: 'ok', ast: 'idle', gate: 'bad', kernel: 'idle' });
      pushFrames([
        { dir: 'EQ', tag: 'EventMsg::TurnAborted', payload: `{"sub_id":"${cur.subId}","reason":"user_interrupt","cancelled_oneshot":true}`, tone: 'rose' },
      ]);
      return;
    }

    if (decision === 'Denied') {
      setPipeState({ sq: 'ok', ast: 'warn', gate: 'bad', kernel: 'idle' });
      pushFrames([
        { dir: 'EQ', tag: 'EventMsg::ExecCommandEnd', payload: `{"sub_id":"${cur.subId}","denied":true,"msg":"拒绝结果已回填模型上下文"}`, tone: 'amber' },
      ]);
      return;
    }

    if (decision === 'ApprovedForSession') {
      setSessionAllowList((prev) => new Set(prev).add(cur.cmdId));
    }

    const op = PRESET_OPS.find((p) => p.id === cur.cmdId);
    if (op) evaluateInKernel(op, cur.subId, cur.isEscalation);
  };

  const dispatchInterrupt = () => {
    playCardFlip();
    const subId = `sub_${String(seq).padStart(2, '0')}`;
    setSeq((s) => s + 1);
    const hadPending = Boolean(pending);
    setPending(null);
    setPipeState({ sq: 'ok', ast: 'idle', gate: 'bad', kernel: 'idle' });
    pushFrames([
      { dir: 'SQ', tag: 'Op::Interrupt', payload: `{"id":"${subId}","source":"Esc"}`, tone: 'rose' },
      {
        dir: 'EQ',
        tag: 'EventMsg::TurnAborted',
        payload: `{"sub_id":"${subId}","sse_closed":true,"cleared_approvals":${hadPending},"sigkill_pgroup":true}`,
        tone: 'rose',
      },
    ]);
  };

  const dispatchCompact = () => {
    playPackBurst();
    const subId = `sub_${String(seq).padStart(2, '0')}`;
    setSeq((s) => s + 1);
    pushFrames([
      { dir: 'SQ', tag: 'Op::Compact', payload: `{"id":"${subId}"}`, tone: 'violet' },
      {
        dir: 'EQ',
        tag: 'EventMsg::ContextCompacted',
        payload: `{"preserved":["AGENTS.md","recent_user_messages"],"tokens_before":164200,"tokens_after":21800}`,
        tone: 'emerald',
      },
    ]);
  };

  return (
    <div className="cdx-wb-shell">
      <div className="cdx-wb-grid">
        {/* Col 1: 2D Orthogonal Policy Switchboard + Live Kernel Profile */}
        <section className="cdx-wb-card">
          <div className="cdx-wb-card-head">
            <span className="cdx-wb-card-title"><Lock size={14} /> 正交策略 × 实时内核围栏</span>
            <button type="button" className="cdx-inline-link" onClick={() => onJumpToLesson('codex-approval-policy', 1)}>
              对应课程 <ArrowRight size={12} />
            </button>
          </div>

          <div className="cdx-wb-group">
            <div className="cdx-wb-label mono">AskForApproval</div>
            <div className="cdx-wb-pills">
              {(['untrusted', 'on-request', 'never'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`cdx-pill mono ${approval === m ? 'cdx-pill--active' : ''}`}
                  onClick={() => { playStepTick(); setApproval(m); setPending(null); }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="cdx-wb-group">
            <div className="cdx-wb-label mono">SandboxPolicy</div>
            <div className="cdx-wb-pills">
              {(['read-only', 'workspace-write', 'danger-full-access'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`cdx-pill mono ${sandbox === m ? 'cdx-pill--active' : ''}`}
                  onClick={() => { playStepTick(); setSandbox(m); setPending(null); }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="cdx-wb-group">
            <div className="cdx-wb-label mono">OS Sandbox</div>
            <div className="cdx-wb-pills">
              <button
                type="button"
                className={`cdx-pill mono ${osTarget === 'macos-seatbelt' ? 'cdx-pill--active' : ''}`}
                onClick={() => { playStepTick(); setOsTarget('macos-seatbelt'); }}
              >
                macOS Seatbelt
              </button>
              <button
                type="button"
                className={`cdx-pill mono ${osTarget === 'linux-landlock' ? 'cdx-pill--active' : ''}`}
                onClick={() => { playStepTick(); setOsTarget('linux-landlock'); }}
              >
                Linux Landlock+BPF
              </button>
              {sandbox === 'workspace-write' && (
                <button
                  type="button"
                  className={`cdx-pill mono ${networkAccess ? 'cdx-pill--warn' : ''}`}
                  onClick={() => { playCardFlip(); setNetworkAccess((v) => !v); }}
                >
                  network: {networkAccess ? 'ON' : 'OFF'}
                </button>
              )}
            </div>
          </div>

          <div className="cdx-wb-code-wrap">
            <div className="cdx-wb-code-head mono">
              <span>{osTarget === 'macos-seatbelt' ? '动态生成 SBPL 策略 (seatbelt.rs)' : '内核加锁序列 (linux-sandbox)'}</span>
              <span className="cdx-live-dot">LIVE</span>
            </div>
            <pre className="code-block cdx-wb-pre">
              {kernelLines.map((line, i) => (
                <div key={i} className="code-line">
                  <span className="code-ln">{i + 1}</span>
                  <span className="code-text">{highlightLine(line, osTarget === 'linux-landlock' ? 'rs' : 'text')}</span>
                </div>
              ))}
            </pre>
          </div>
        </section>

        {/* Col 2: Interactive SQ Op Dispatcher & Live Pipeline */}
        <section className="cdx-wb-card">
          <div className="cdx-wb-card-head">
            <span className="cdx-wb-card-title"><Cpu size={14} /> 提交队列 SQ 指令发射台</span>
            <button type="button" className="cdx-inline-link" onClick={() => onJumpToLesson('codex-sq-eq', 1)}>
              SQ/EQ 原理 <ArrowRight size={12} />
            </button>
          </div>

          {/* 4-Stage Telemetry Strip */}
          <div className="cdx-pipe-strip">
            <div className={`cdx-pipe-node cdx-pipe-node--${pipeState.sq}`}>
              <Terminal size={14} />
              <span className="mono">SQ (Op)</span>
            </div>
            <div className={`cdx-pipe-node cdx-pipe-node--${pipeState.ast}`}>
              <Shield size={14} />
              <span className="mono">ExecPolicy</span>
            </div>
            <div className={`cdx-pipe-node cdx-pipe-node--${pipeState.gate}`}>
              <Pause size={14} />
              <span className="mono">oneshot 审批</span>
            </div>
            <div className={`cdx-pipe-node cdx-pipe-node--${pipeState.kernel}`}>
              <Lock size={14} />
              <span className="mono">OS Kernel</span>
            </div>
          </div>

          {/* Preset UserTurn Commands */}
          <div className="cdx-op-list">
            {PRESET_OPS.map((op) => (
              <button
                key={op.id}
                type="button"
                className="cdx-op-btn"
                onClick={() => dispatchPreset(op)}
                title={op.desc}
              >
                <div className="cdx-op-btn-top">
                  <span className="cdx-op-cmd mono"><Play size={12} /> {op.label}</span>
                  {sessionAllowList.has(op.id) && <span className="cdx-session-tag mono">会话免审</span>}
                </div>
              </button>
            ))}
          </div>

          {/* Control Ops */}
          <div className="cdx-ctrl-ops">
            <button type="button" className="cdx-ctrl-btn cdx-ctrl-btn--danger" onClick={dispatchInterrupt}>
              <AlertTriangle size={13} /> 发送 Op::Interrupt (Esc 三路中断)
            </button>
            <button type="button" className="cdx-ctrl-btn" onClick={dispatchCompact}>
              发送 Op::Compact (三段压缩)
            </button>
          </div>

          {/* Live oneshot Approval Prompt */}
          {pending && (
            <div className="cdx-approval-box">
              <div className="cdx-approval-head mono">
                <Shield size={14} /> EventMsg::ExecApprovalRequest (oneshot 挂起中)
              </div>
              <div className="cdx-approval-cmd mono">$ {pending.command}</div>
              <div className="cdx-approval-reason">{pending.reason}</div>
              <div className="cdx-approval-actions">
                <button type="button" className="cdx-primary-cta cdx-primary-cta--sm" onClick={() => respondApproval('Approved')}>
                  <CheckCircle2 size={13} /> Approved
                </button>
                <button type="button" className="cdx-secondary-cta cdx-secondary-cta--sm" onClick={() => respondApproval('ApprovedForSession')}>
                  ApprovedForSession
                </button>
                <button type="button" className="cdx-secondary-cta cdx-secondary-cta--sm" onClick={() => respondApproval('Denied')}>
                  <XCircle size={13} /> Denied
                </button>
                <button type="button" className="cdx-ctrl-btn cdx-ctrl-btn--danger" onClick={() => respondApproval('Abort')}>
                  Esc Abort
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Col 3: Real-time Wire Protocol Log */}
        <section className="cdx-wb-card cdx-wb-wire">
          <div className="cdx-wb-card-head">
            <span className="cdx-wb-card-title"><Terminal size={14} /> SQ ⇄ EQ 实时协议帧流</span>
            <button
              type="button"
              className="cdx-tool-btn"
              onClick={() => {
                playStepTick();
                setPending(null);
                setSessionAllowList(new Set());
                setPipeState({ sq: 'idle', ast: 'idle', gate: 'idle', kernel: 'idle' });
                setFrames([
                  {
                    id: 0,
                    dir: 'EQ',
                    tag: 'EventMsg::SessionConfigured',
                    payload: `{"approval":"${approval}","sandbox":"${sandbox}","os":"${osTarget}"}`,
                    tone: 'blue',
                  },
                ]);
              }}
            >
              <RotateCcw size={12} /> 清空会话
            </button>
          </div>

          <div className="cdx-wire-log mono">
            {frames.map((f) => (
              <div key={f.id} className={`cdx-wire-row cdx-wire-row--${f.tone}`}>
                <div className="cdx-wire-meta">
                  <span className={`cdx-wire-dir cdx-wire-dir--${f.dir.toLowerCase()}`}>{f.dir}</span>
                  <span className="cdx-wire-tag">{f.tag}</span>
                </div>
                <div className="cdx-wire-payload">{f.payload}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
