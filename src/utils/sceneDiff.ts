import type { StageScene } from '../types/lesson';

export interface DiffLine {
  kind: 'add' | 'change' | 'remove' | 'info';
  text: string;
}

const NODE_STATUS_LABEL: Record<string, string> = {
  active: '激活',
  done: '完成',
  highlight: '高亮',
  new: '新增',
  dimmed: '变暗',
  normal: '常态',
  error: '出错',
  running: '进行中',
  blocked: '阻塞',
  parallel: '并行',
  queued: '排队',
};

function labelOf(status?: string): string {
  return NODE_STATUS_LABEL[status ?? 'normal'] ?? (status ?? '常态');
}

function diffIso(prev: Extract<StageScene, { kind: 'iso-flow' }>, curr: Extract<StageScene, { kind: 'iso-flow' }>): DiffLine[] {
  const out: DiffLine[] = [];
  const prevNodes = new Map(prev.nodes.map((n) => [n.id, n]));
  const prevEdges = new Map(prev.edges.map((e) => [`${e.from}->${e.to}`, e]));
  for (const n of curr.nodes) {
    const p = prevNodes.get(n.id);
    if (!p) { out.push({ kind: 'add', text: `新增节点 ${n.label}` }); continue; }
    if (Boolean(n.active) !== Boolean(p.active) && n.active) out.push({ kind: 'change', text: `${n.label} → 激活` });
    if (Boolean(n.dimmed) !== Boolean(p.dimmed)) {
      out.push({ kind: 'change', text: n.dimmed ? `${n.label} → 变暗` : `${n.label} → 点亮` });
    }
  }
  for (const n of prev.nodes) {
    if (!curr.nodes.some((c) => c.id === n.id)) out.push({ kind: 'remove', text: `移出节点 ${n.label}` });
  }
  for (const e of curr.edges) {
    const key = `${e.from}->${e.to}`;
    const p = prevEdges.get(key);
    const from = curr.nodes.find((n) => n.id === e.from)?.label ?? e.from;
    const to = curr.nodes.find((n) => n.id === e.to)?.label ?? e.to;
    if (!p) { out.push({ kind: 'add', text: `新增连线 ${from} → ${to}` }); continue; }
    if ((e.status ?? 'normal') !== (p.status ?? 'normal')) {
      out.push({ kind: 'change', text: `连线 ${from} → ${to}：${labelOf(p.status)} → ${labelOf(e.status)}` });
    }
  }
  return out;
}

function diffSwim(prev: Extract<StageScene, { kind: 'swimlane' }>, curr: Extract<StageScene, { kind: 'swimlane' }>): DiffLine[] {
  const out: DiffLine[] = [];
  const prevBars = new Map(prev.bars.map((b) => [b.id, b]));
  const prevEvents = new Map((prev.events ?? []).map((e) => [e.id, e]));
  for (const b of curr.bars) {
    const p = prevBars.get(b.id);
    if (!p) { out.push({ kind: 'add', text: `新增 ${b.label}` }); continue; }
    if ((b.status ?? 'done') !== (p.status ?? 'done')) {
      out.push({ kind: 'change', text: `${b.label}：${labelOf(p.status)} → ${labelOf(b.status)}` });
    }
  }
  for (const b of prev.bars) {
    if (!curr.bars.some((c) => c.id === b.id)) out.push({ kind: 'remove', text: `结束 ${b.label}` });
  }
  for (const e of curr.events ?? []) {
    if (!prevEvents.has(e.id)) out.push({ kind: 'add', text: `新增事件 ${e.label}` });
  }
  return out;
}

function diffTree(prev: Extract<StageScene, { kind: 'tree' }>, curr: Extract<StageScene, { kind: 'tree' }>): DiffLine[] {
  const out: DiffLine[] = [];
  const prevNodes = new Map(prev.nodes.map((n) => [n.id, n]));
  for (const n of curr.nodes) {
    const p = prevNodes.get(n.id);
    if (!p) { out.push({ kind: 'add', text: `新增节点 ${n.label}` }); continue; }
    if ((n.status ?? 'done') !== (p.status ?? 'done')) {
      out.push({ kind: 'change', text: `${n.label}：${labelOf(p.status)} → ${labelOf(n.status)}` });
    }
  }
  for (const n of prev.nodes) {
    if (!curr.nodes.some((c) => c.id === n.id)) out.push({ kind: 'remove', text: `移出节点 ${n.label}` });
  }
  return out;
}

/**
 * 对比上一步的场景，自动算出本步变化。只读场景数据，不编造文案。
 * 第 1 步没有上一步：返回初始状态说明 + 初始节点清单。
 */
export function diffScenes(prev: StageScene | undefined, curr: StageScene): DiffLine[] {
  if (!prev) {
    const out: DiffLine[] = [{ kind: 'info', text: '本课起点：场景初始状态' }];
    const labels =
      curr.kind === 'swimlane'
        ? curr.lanes.map((l) => l.label)
        : curr.nodes.map((n) => n.label);
    for (const label of labels.slice(0, 5)) out.push({ kind: 'add', text: `初始 ${label}` });
    if (labels.length > 5) out.push({ kind: 'info', text: `还有 ${labels.length - 5} 个初始节点` });
    return out;
  }
  if (prev.kind !== curr.kind) {
    return [{ kind: 'info', text: `视图切换：${prev.kind} → ${curr.kind}` }];
  }
  const lines =
    curr.kind === 'iso-flow'
      ? diffIso(prev as Extract<StageScene, { kind: 'iso-flow' }>, curr)
      : curr.kind === 'swimlane'
        ? diffSwim(prev as Extract<StageScene, { kind: 'swimlane' }>, curr)
        : diffTree(prev as Extract<StageScene, { kind: 'tree' }>, curr);
  if (lines.length === 0) return [{ kind: 'info', text: '本步场景与上一步相同' }];
  return lines;
}
