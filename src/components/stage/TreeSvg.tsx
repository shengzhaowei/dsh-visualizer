import { useState } from 'react';
import type { TreeNode, TreeScene } from '../../types/lesson';
import type { HoverHudInfo } from './StageCanvas';
import { KIND_FILL, KIND_LABEL, KIND_STROKE, TONE_STROKE } from './tones';

/** 按字符宽度估算文本像素宽：全角字符按字号计，半角按约 0.6 字号计。 */
function textWidth(text: string, fontSize: number): number {
  let w = 0;
  for (const ch of text) w += ch.charCodeAt(0) > 255 ? fontSize : fontSize * 0.6;
  return w;
}

/** 是否减弱动效：减弱时不渲染流动的数据包。 */
function prefersReducedMotion(): boolean {
  try {
    return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function treeNodeSize(n: TreeNode): { w: number; h: number } {
  const hasParent = Boolean(n.parentId);
  const parentW = n.parentId ? textWidth(`↑ ${n.parentId}`, 9.5) + 32 : 0;
  const w = Math.ceil(
    Math.max(
      154,
      textWidth(n.label, 13) + 68,
      n.sublabel ? textWidth(n.sublabel, 10.5) + 34 : 0,
      parentW,
    ),
  );
  const h = n.sublabel ? (hasParent ? 64 : 54) : 42;
  return { w, h };
}

/** 场景包围盒（节点 + 标注），供 fit-to-view 使用。 */
export function treeSceneBBox(scene: TreeScene): { x: number; y: number; w: number; h: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const eat = (x: number, y: number, w: number, h: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  };
  for (const n of scene.nodes) {
    const { w, h } = treeNodeSize(n);
    eat(n.x - w / 2 - 4, n.y - h / 2 - 12, w + 8, h + 18);
  }
  for (const a of scene.annotations ?? []) eat(a.x - 10, a.y - 19, textWidth(a.text, 11.5) + 28, 26);
  if (!Number.isFinite(minX)) return { x: 0, y: 0, w: 1000, h: 560 };
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** Tree diagram: nodes positioned by lesson data, edges drawn parent → child. */
export function TreeSvg({ scene, onHoverInfo }: { scene: TreeScene; onHoverInfo?: (info: HoverHudInfo | null) => void }) {
  const byId = new Map(scene.nodes.map((n) => [n.id, n]));
  const reducedMotion = prefersReducedMotion();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const isNodeRelated = (id: string) => {
    if (!hoveredId) return true;
    if (id === hoveredId) return true;
    return scene.edges.some((e) => (e.from === hoveredId && e.to === id) || (e.to === hoveredId && e.from === id));
  };
  const isEdgeRelated = (fromId: string, toId: string) => {
    if (!hoveredId) return true;
    return fromId === hoveredId || toId === hoveredId;
  };
  return (
    <svg viewBox="0 0 1000 560" className="stage-svg" role="img" aria-label={scene.title ?? '树形图'}>
      <defs>
        <marker id="tree-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--muted)" />
        </marker>
      </defs>
      {scene.edges.map((e, i) => {
        const from = byId.get(e.from);
        const to = byId.get(e.to);
        if (!from || !to) return null;
        const x1 = from.x;
        const y1 = from.y + 26;
        const x2 = to.x;
        const y2 = to.y - 26;
        const my = (y1 + y2) / 2;
        const labelW = e.label ? textWidth(e.label, 11) + 16 : 0;
        const lx = (x1 + x2) / 2 + 8;
        const d = `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
        const related = isEdgeRelated(e.from, e.to);
        const canDraw = !e.animated && !reducedMotion;
        return (
          <g key={`${e.from}-${e.to}`} opacity={hoveredId ? (related ? 1 : 0.22) : 1} className="stage-edge-dim">
            <g className="stage-edge-enter" style={{ animationDelay: `${i * 50}ms` }}>
              <path
                d={d}
                pathLength={canDraw ? 1 : undefined}
                fill="none"
                stroke={e.animated || (hoveredId && related) ? 'var(--rust)' : 'var(--muted)'}
                strokeWidth={e.animated || (hoveredId && related) ? 2.4 : 1.5}
                strokeDasharray={e.animated ? '7 4' : undefined}
                markerEnd="url(#tree-arrow)"
                className={canDraw ? 'stage-edge-draw' : undefined}
                style={canDraw ? { animationDelay: `${i * 55}ms` } : undefined}
              />
            {/* 常驻流动的无字流光粒子（不点播放也自动流动） */}
            {!reducedMotion && (
              <g
                className="stage-packet-orb"
                style={{
                  offsetPath: `path("${d}")`,
                  animationDuration: e.animated ? '2.2s' : '3.2s',
                  animationDelay: `-${((i * 0.45) % 2.2).toFixed(2)}s`,
                }}
              >
                <circle cx={-5} cy={0} r={2} fill={e.animated ? 'var(--rust)' : 'var(--green-stroke)'} fillOpacity={0.35} />
                <circle className="stage-packet-halo" cx={0} cy={0} r={6.5} fill={e.animated ? 'var(--rust)' : 'var(--green-stroke)'} fillOpacity={0.24} />
                <circle cx={0} cy={0} r={3.4} fill={e.animated ? 'var(--rust)' : 'var(--green-stroke)'} stroke="var(--sheet)" strokeWidth={1.1} />
              </g>
            )}
            {e.label && (
              <g>
                <rect x={lx - labelW / 2} y={my - 18} width={labelW} height={18} rx={9} fill="var(--sheet)" stroke="var(--line-strong)" strokeWidth={1} />
                <text x={lx} y={my - 5} textAnchor="middle" fontSize="11" fill="var(--ink-2)" fontFamily="inherit">
                  {e.label}
                </text>
                </g>
              )}
            </g>
          </g>
        );
      })}
      {scene.nodes.map((n, i) => {
        const hasParent = Boolean(n.parentId);
        const { w, h } = treeNodeSize(n);
        const fill = KIND_FILL[n.kind] ?? 'var(--card)';
        const stroke = KIND_STROKE[n.kind] ?? 'var(--edge)';
        const isRoot = n.kind === 'root';
        const roleLabel = KIND_LABEL[n.kind] ?? n.kind;
        const related = isNodeRelated(n.id);
        const isHovered = hoveredId === n.id;
        const finalOpacity = hoveredId ? (related ? 1 : 0.32) : n.status === 'dimmed' ? 0.76 : 1;
        return (
          <g
            key={n.id}
            opacity={finalOpacity}
            className={`stage-node-dim stage-interactive-node ${isHovered ? 'stage-interactive-node--focused' : ''}`}
            onMouseEnter={() => {
              setHoveredId(n.id);
              onHoverInfo?.({
                title: n.label,
                subtitle: [n.sublabel, n.hexId ? `#${n.hexId}` : undefined, n.parentId ? `parent: ${n.parentId}` : undefined].filter(Boolean).join(' · '),
                badge: n.badge ?? roleLabel,
              });
            }}
            onMouseLeave={() => {
              setHoveredId(null);
              onHoverInfo?.(null);
            }}
          >
            <g className="stage-node-enter" style={{ animationDelay: `${i * 55}ms` }}>
            <g className="stage-node-body">
            {/* 激活节点：绿光晕 */}
            {n.status === 'active' && (
              <rect className="stage-node-glow" x={n.x - w / 2 - 4} y={n.y - h / 2 - 4} width={w + 8} height={h + 8} rx={13} fill="none" stroke="var(--green-stroke)" strokeWidth={5} />
            )}
            {/* 底部错位叠层边 */}
            <rect x={n.x - w / 2 + 3} y={n.y - h / 2 + 5} width={w} height={h} rx={10} fill="var(--edge)" opacity={0.45} />
            <rect
              x={n.x - w / 2}
              y={n.y - h / 2}
              width={w}
              height={h}
              rx={10}
              fill={fill}
              stroke={n.status === 'highlight' ? 'var(--rust)' : stroke}
              strokeWidth={n.status === 'highlight' ? 2.6 : 1.6}
              strokeDasharray={n.status === 'dimmed' ? '4 3' : undefined}
            />
            {/* 左侧加粗色条 */}
            <rect x={n.x - w / 2} y={n.y - h / 2} width={5} height={h} rx={2.5} fill={stroke} />
            <text
              x={n.x - w / 2 + 15}
              y={n.y + (n.sublabel ? -8 : 5)}
              fontSize="13"
              fontWeight="700"
              fill={isRoot ? 'var(--paper)' : 'var(--ink)'}
              fontFamily="inherit"
            >
              {n.label}
            </text>
            {n.sublabel && (
              <text x={n.x - w / 2 + 15} y={n.y + 10} fontSize="10.5" fill={isRoot ? 'var(--paper-2)' : 'var(--muted)'} fontFamily="inherit">
                {n.sublabel}
              </text>
            )}
            {hasParent && (
              <text x={n.x - w / 2 + 15} y={n.y + 24} fontSize="9" fill={isRoot ? 'var(--paper-2)' : 'var(--muted)'} fontFamily="var(--font-mono)">
                ↑ {n.parentId}
              </text>
            )}
            {/* 角色徽章 */}
            <g>
              <rect x={n.x + w / 2 - 42} y={n.y - h / 2 - 9} width={34} height={16} rx={8} fill="var(--sheet)" stroke="var(--edge)" strokeWidth={1} />
              <text x={n.x + w / 2 - 25} y={n.y - h / 2 + 3} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="var(--ink)" fontFamily="inherit">
                {roleLabel}
              </text>
            </g>
            {/* 六位 ID 药丸 */}
            {n.hexId && (
              <g>
                <rect x={n.x + w / 2 - 4} y={n.y - h / 2 - 9} width={52} height={16} rx={8} fill="var(--ink)" stroke="var(--edge)" strokeWidth={1} />
                <text x={n.x + w / 2 + 22} y={n.y - h / 2 + 3} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="var(--paper)" fontFamily="var(--font-mono)">
                  #{n.hexId}
                </text>
              </g>
            )}
            {n.badge && (
              <text x={n.x + w / 2 + 6} y={n.y - h / 2 + 2} fontSize="10.5" fontWeight="700" fill="var(--rust)" fontFamily="inherit">
                {n.badge}
              </text>
            )}
            </g>
            </g>
          </g>
        );
      })}
      {scene.annotations?.map((a, i) => {
        const aw = textWidth(a.text, 11.5) + 28;
        return (
          <g key={`ann-${i}`} className="stage-label-enter" style={{ animationDelay: `${300 + i * 80}ms` }}>
            <rect x={a.x - 10} y={a.y - 19} width={aw} height={26} rx={8} fill="var(--sheet)" stroke={a.tone ? TONE_STROKE[a.tone] : 'var(--edge)'} strokeWidth={1.4} />
            <circle cx={a.x - 2} cy={a.y - 6} r={3} fill={a.tone ? TONE_STROKE[a.tone] : 'var(--muted)'} />
            <text x={a.x + 6} y={a.y} fontSize="11.5" fontWeight="600" fill="var(--ink)" fontFamily="inherit">
              {a.text}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
