import { useEffect, useState } from 'react';
import { ArrowRight, ExternalLink, X } from 'lucide-react';
import { playStepTick } from '../../utils/sound';

interface HarnessCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnterDsh: () => void;
}

type ScenarioId = 'interrupt' | 'danger' | 'subagent' | 'compact';

interface ScenarioRow {
  id: 'dsh' | 'pi' | 'codex' | 'claude-code' | 'langchain';
  name: string;
  primitive: string;
  flow: string;
  accent: string;
  href?: string;
}

const SCENARIOS: { id: ScenarioId; label: string; rows: ScenarioRow[] }[] = [
  {
    id: 'interrupt',
    label: '中途打断',
    rows: [
      { id: 'dsh', name: 'DeepSeek Harness', primitive: 'Fiber / Abort', flow: '取消当前 turn Fiber → 账本撤销监听 → 写回日志', accent: 'blue' },
      { id: 'pi', name: 'Pi Agent', primitive: 'Steering Queue', flow: '在当前工具边界立即插入 Steering → 原地转向', accent: 'green', href: 'https://pi-visualizer-lemon.vercel.app/#/learn/steering-followup/1' },
      { id: 'codex', name: 'Codex', primitive: 'Turn Cancel', flow: '中断当前 Turn → 终止沙箱子进程 → 接新输入', accent: 'violet' },
      { id: 'claude-code', name: 'Claude Code', primitive: 'Esc / Interrupt', flow: '中止流式生成与工具调用 → 保留上下文待命', accent: 'orange' },
      { id: 'langchain', name: 'LangChain', primitive: 'interrupt()', flow: 'Checkpointer 冻结当前图节点 → 等待外部恢复', accent: 'teal' },
    ],
  },
  {
    id: 'danger',
    label: '高危命令',
    rows: [
      { id: 'dsh', name: 'DeepSeek Harness', primitive: 'pre-execute ∩ sandbox', flow: '策略门 ask → 人工审批 → OS 沙箱叠加不绕过', accent: 'blue' },
      { id: 'pi', name: 'Pi Agent', primitive: 'Tool Boundary', flow: '极简 4 工具（read/write/edit/bash）+ 扩展钩子拦截', accent: 'green', href: 'https://pi-visualizer-lemon.vercel.app/#/learn/steering-followup/1' },
      { id: 'codex', name: 'Codex', primitive: 'Approval + Seatbelt', flow: '审批弹窗确认 + Landlock/Seatbelt 物理锁死网络与写盘', accent: 'violet' },
      { id: 'claude-code', name: 'Claude Code', primitive: 'PreToolUse Hook', flow: 'Hook 确定性校验 + 权限分级弹窗（单次/会话）', accent: 'orange' },
      { id: 'langchain', name: 'LangChain', primitive: 'HITL Interrupt', flow: 'ToolNode 前触发 interrupt() → 人类审批后 resume', accent: 'teal' },
    ],
  },
  {
    id: 'subagent',
    label: '派生子 Agent',
    rows: [
      { id: 'dsh', name: 'DeepSeek Harness', primitive: 'dsh-scope', flow: 'createScope 向下继承工具，事件向上穿透到父审批', accent: 'blue' },
      { id: 'pi', name: 'Pi Agent', primitive: 'Sub-loop Session', flow: '独立子会话循环执行 → 汇总结果返回主循环', accent: 'green', href: 'https://pi-visualizer-lemon.vercel.app/#/learn/steering-followup/1' },
      { id: 'codex', name: 'Codex', primitive: 'Isolated Worker', flow: '独立工作树/沙箱子任务执行 → 回传 diff 摘要', accent: 'violet' },
      { id: 'claude-code', name: 'Claude Code', primitive: 'Task Subagent', flow: '独立上下文探索代码库 → 只把精炼结论返还主循环', accent: 'orange' },
      { id: 'langchain', name: 'LangChain', primitive: 'Subgraph Node', flow: '把子 Agent 编译为 Subgraph 节点嵌入父 StateGraph', accent: 'teal' },
    ],
  },
  {
    id: 'compact',
    label: '长对话爆窗',
    rows: [
      { id: 'dsh', name: 'DeepSeek Harness', primitive: 'Append-Only Log', flow: '完整事件日志落盘 + 上下文窗口按需裁剪与重放', accent: 'blue' },
      { id: 'pi', name: 'Pi Agent', primitive: 'Context Builder', flow: '状态与消息解耦，每轮由 Context Builder 重新装配', accent: 'green', href: 'https://pi-visualizer-lemon.vercel.app/#/learn/steering-followup/1' },
      { id: 'codex', name: 'Codex', primitive: 'Auto Compact', flow: '达阈值触发摘要压缩，保留当前计划与文件变更', accent: 'violet' },
      { id: 'claude-code', name: 'Claude Code', primitive: '/compact + CLAUDE.md', flow: '压缩历史轮次，核心规范常驻 CLAUDE.md 不丢失', accent: 'orange' },
      { id: 'langchain', name: 'LangChain', primitive: 'State Reducer', flow: '通过 Reducer / TrimMessages 裁剪 State 中的消息列表', accent: 'teal' },
    ],
  },
];

/** Learn Agent 首页 5 大 Harness 场景对比器：选一个真实场景，横向直看 5 家核心机制路径。 */
export function HarnessCompareModal({ isOpen, onClose, onEnterDsh }: HarnessCompareModalProps) {
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
              {row.id === 'dsh' && (
                <button
                  type="button"
                  className="compare-card-link"
                  onClick={() => {
                    onClose();
                    onEnterDsh();
                  }}
                >
                  进入课程 <ArrowRight size={12} />
                </button>
              )}
              {row.href && (
                <a className="compare-card-link" href={row.href} target="_blank" rel="noopener noreferrer">
                  打开教程 <ExternalLink size={11} />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
