import { useEffect, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import type { HarnessId } from '../../types/lesson';
import { playStepTick } from '../../utils/sound';

interface HarnessCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnterHarness: (id: HarnessId) => void;
}

type ScenarioId = 'interrupt' | 'danger' | 'subagent' | 'compact';

interface ScenarioRow {
  id: HarnessId;
  name: string;
  primitive: string;
  flow: string;
  accent: string;
}

const SCENARIOS: { id: ScenarioId; label: string; rows: ScenarioRow[] }[] = [
  {
    id: 'interrupt',
    label: '中途打断',
    rows: [
      { id: 'dsh', name: 'DeepSeek Harness', primitive: 'Fiber / Abort', flow: '取消当前 turn Fiber → 账本撤销监听 → 写回日志', accent: 'blue' },
      { id: 'pi', name: 'Pi Agent', primitive: 'Steering Queue', flow: '在当前工具边界立即插入 Steering → 跳过剩余工具原地转向', accent: 'green' },
      { id: 'codex', name: 'Codex', primitive: 'Op::Interrupt', flow: 'CancellationToken 三路级联取消 SSE、审批与沙箱子进程组', accent: 'violet' },
      { id: 'claude-code', name: 'Claude Code', primitive: 'Esc / Rewind', flow: '单按 Esc 中止当前流/工具，双按 Esc 回滚检查点代码与对话', accent: 'orange' },
      { id: 'langchain', name: 'LangChain', primitive: 'interrupt()', flow: 'Checkpointer 冻结落盘释放内存 → Command(resume) 确定性重放', accent: 'teal' },
    ],
  },
  {
    id: 'danger',
    label: '高危命令',
    rows: [
      { id: 'dsh', name: 'DeepSeek Harness', primitive: 'pre-execute ∩ sandbox', flow: '策略门 ask → 人工审批 → OS 沙箱叠加不绕过', accent: 'blue' },
      { id: 'pi', name: 'Pi Agent', primitive: 'tool_call Extension', flow: '极简 4 原语工具 + TS Extension 钩子弹窗或覆写容器沙箱', accent: 'green' },
      { id: 'codex', name: 'Codex', primitive: 'Approval × Seatbelt', flow: 'ExecPolicy AST 审查 + Seatbelt/Landlock 物理锁目录与断网', accent: 'violet' },
      { id: 'claude-code', name: 'Claude Code', primitive: 'PreToolUse + deny>ask', flow: 'Hooks Exit 2 硬拦截/改参 + deny>ask>allow 级联 + bwrap/Seatbelt', accent: 'orange' },
      { id: 'langchain', name: 'LangChain', primitive: 'HITL + InjectedState', flow: 'InjectedState 隐藏鉴权参数 + interrupt() 冻结等人类审批或改参', accent: 'teal' },
    ],
  },
  {
    id: 'subagent',
    label: '派生子 Agent',
    rows: [
      { id: 'dsh', name: 'DeepSeek Harness', primitive: 'dsh-scope', flow: 'createScope 向下继承工具，事件向上穿透到父级审批', accent: 'blue' },
      { id: 'pi', name: 'Pi Agent', primitive: 'Session Branch / RPC', flow: 'JSONL 树形分支探索 + branch_summary 跨分支带走结论', accent: 'green' },
      { id: 'codex', name: 'Codex', primitive: 'App-Server Threads', flow: '独立 Git Worktree + OS 沙箱并行托管多条隔离 Thread', accent: 'violet' },
      { id: 'claude-code', name: 'Claude Code', primitive: 'Subagent + Worktree', flow: '严格两层独立窗口隔噪 + isolation: worktree 并行改码', accent: 'orange' },
      { id: 'langchain', name: 'LangChain', primitive: 'Subgraph + Send', flow: '子 Agent 编译为 Subgraph 嵌入父图，或用 Send 动态 Map-Reduce', accent: 'teal' },
    ],
  },
  {
    id: 'compact',
    label: '长对话爆窗',
    rows: [
      { id: 'dsh', name: 'DeepSeek Harness', primitive: 'Append-Only Log', flow: '完整事件日志落盘 + 上下文窗口按需裁剪与重放', accent: 'blue' },
      { id: 'pi', name: 'Pi Agent', primitive: 'compaction.ts', flow: '安全切点对齐 + 确定性文件追踪 + 树节点无损追加', accent: 'green' },
      { id: 'codex', name: 'Codex', primitive: 'compact.rs', flow: '初始环境 + 预算内用户原话 + 结构化交接摘要三段重建', accent: 'violet' },
      { id: 'claude-code', name: 'Claude Code', primitive: '/compact + Hook', flow: '微压缩 + 聚焦摘要 + 自动重挂 CLAUDE.md 与 SessionStart 重注入', accent: 'orange' },
      { id: 'langchain', name: 'LangChain', primitive: 'RemoveMessage + CP', flow: 'Summarize 节点配 RemoveMessage 裁剪窗口，历史 Checkpoint 永久可回溯', accent: 'teal' },
    ],
  },
];

/** Learn Agent 首页 5 大 Harness 场景对比器：选一个真实场景，横向直看 5 家核心机制路径，一键直达对应站内课程。 */
export function HarnessCompareModal({ isOpen, onClose, onEnterHarness }: HarnessCompareModalProps) {
  const [scenarioId, setScenarioId] = useState<ScenarioId>('danger');

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const active = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0];

  return (
    <div
      className="harness-sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="5 Harness 机制对比"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="compare-modal">
        <div className="compare-head">
          <h2 className="compare-title">5 Harness 机制对比</h2>
          <button type="button" className="guide-close" style={{ position: 'static' }} onClick={onClose} aria-label="关闭">
            <X size={15} />
          </button>
        </div>

        <div className="compare-tabs" role="tablist">
          {SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              type="button"
              role="tab"
              aria-selected={sc.id === scenarioId}
              className={`compare-tab ${sc.id === scenarioId ? 'compare-tab--active' : ''}`}
              onClick={() => {
                playStepTick();
                setScenarioId(sc.id);
              }}
            >
              {sc.label}
            </button>
          ))}
        </div>

        <div className="compare-grid" key={scenarioId}>
          {active.rows.map((row) => (
            <div key={row.id} className={`compare-card compare-card--${row.accent}`}>
              <div className="compare-card-top">
                <span className="compare-card-name">{row.name}</span>
                <span className="compare-card-prim mono">{row.primitive}</span>
              </div>
              <div className="compare-card-flow">{row.flow}</div>
              <button
                type="button"
                className="compare-card-link"
                onClick={() => {
                  onClose();
                  onEnterHarness(row.id);
                }}
              >
                进入课程 <ArrowRight size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
