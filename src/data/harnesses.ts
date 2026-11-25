// Learn Agent 首页 5 大 Agent Harness 核心数据（极简结构，聚焦核心机制）。

import type { HoloCardFoil } from './cards';

export interface HarnessEntry {
  id: 'dsh' | 'pi' | 'codex' | 'claude-code' | 'langchain';
  name: string;
  foil: HoloCardFoil;
  icon: 'layers' | 'refresh-cw' | 'terminal' | 'shield' | 'git-branch';
  coreMechanism: string;
  primitives: string[];
  status: 'interactive' | 'external' | 'soon';
  /** status === 'interactive' 时进入站内课程；status === 'external' 时打开外部可视化教程 */
  href?: string;
  repoUrl: string;
  decisions: { q: string; a: string }[];
}

export const HARNESS_ENTRIES: HarnessEntry[] = [
  {
    id: 'dsh',
    name: 'DeepSeek Harness',
    foil: 'cyan',
    icon: 'layers',
    coreMechanism: 'Cordis 无特权主板 · 一切皆插件',
    primitives: ['dsh-scope', 'waterfall', 'fail-closed'],
    status: 'interactive',
    repoUrl: 'https://github.com/deepseek-ai/deepseek-harness',
    decisions: [
      { q: '核心结构', a: 'AgentLoop、LLM、Tools、Sessions 全是主板上的对等插件。' },
      { q: '作用域隔离', a: 'dsh-scope 实现注册向下继承、事件向上穿透。' },
      { q: '安全模型', a: 'pre-execute 策略门 + 人工审批 + OS 沙箱三层叠加。' },
    ],
  },
  {
    id: 'pi',
    name: 'Pi Agent',
    foil: 'emerald',
    icon: 'refresh-cw',
    coreMechanism: '双层循环 · Steering / Follow-up 队列',
    primitives: ['agentLoop', 'steering', 'followUp'],
    status: 'external',
    href: 'https://pi-visualizer-lemon.vercel.app/#/learn/steering-followup/1',
    repoUrl: 'https://github.com/badlogic/pi-mono',
    decisions: [
      { q: '打断机制', a: 'Steering 在当前工具边界立即转向，不丢上下文。' },
      { q: '续接机制', a: 'Follow-up 等待本轮收敛后自动触发下一轮。' },
      { q: '极简工具', a: '聚焦 read / write / edit / bash 四个原子原语。' },
    ],
  },
  {
    id: 'codex',
    name: 'Codex',
    foil: 'violet',
    icon: 'terminal',
    coreMechanism: 'Turn 循环 · 分级审批 · OS 沙箱',
    primitives: ['TurnLoop', 'ApprovalPolicy', 'Seatbelt/Landlock'],
    status: 'soon',
    repoUrl: 'https://github.com/openai/codex',
    decisions: [
      { q: '执行隔离', a: '按 read-only / workspace-write / full-access 锁定 OS 边界。' },
      { q: '审批门', a: '高危命令挂起等待人类确认，网络默认关闭。' },
      { q: '上下文压缩', a: '长会话自动 compact，保留任务状态与关键变更。' },
    ],
  },
  {
    id: 'claude-code',
    name: 'Claude Code',
    foil: 'amber',
    icon: 'shield',
    coreMechanism: '单主循环 · Hooks 拦截 · Subagent 分治',
    primitives: ['PreToolUse', 'Task Subagent', 'CLAUDE.md'],
    status: 'soon',
    repoUrl: 'https://github.com/anthropics/claude-code',
    decisions: [
      { q: '扩展点', a: '通过 PreToolUse / PostToolUse Hooks 注入确定性校验。' },
      { q: '上下文分治', a: '子 Agent 独立上下文执行探索，只回传精炼结论。' },
      { q: '记忆分层', a: 'CLAUDE.md 按项目 / 目录层级自动注入指令。' },
    ],
  },
  {
    id: 'langchain',
    name: 'LangChain',
    foil: 'teal',
    icon: 'git-branch',
    coreMechanism: 'StateGraph 状态图 · Checkpoint 持久化',
    primitives: ['StateGraph', 'ToolNode', 'Checkpointer'],
    status: 'soon',
    repoUrl: 'https://github.com/langchain-ai/langgraph',
    decisions: [
      { q: '编排模型', a: '将 Agent 建模为有向状态图，节点读写共享 State。' },
      { q: '人机协同', a: '通过 interrupt() + Checkpointer 冻结图状态等待恢复。' },
      { q: '可观测性', a: '每步状态快照落盘，支持时间旅行回放与分支重跑。' },
    ],
  },
];
