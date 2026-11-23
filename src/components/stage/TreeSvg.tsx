import type { TreeScene } from '../../types/lesson';
import { KIND_FILL, KIND_LABEL, KIND_STROKE, TONE_STROKE } from './tones';

/** 按字符宽度估算文本像素宽：全角字符按字号计，半角按约 0.55 字号计。 */
function textWidth(text: string, fontSize: number): number {
  let w = 0;
  for (const ch of text) w += ch.charCodeAt(0) > 255 ? fontSize : fontSize * 0.55;
  return w;
}

/** Tree diagram: nodes positioned by lesson data, edges drawn parent → child. */
export function TreeSvg({ scene }: { scene: TreeScene }) {
  const byId = new Map(scene.nodes.map((n) => [n.id, n]));
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
        return (
          <g key={`${e.from}-${e.to}`} className="stage-edge-enter" style={{ animationDelay: `${i * 50}ms` }}>
            <path
              d={`M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`}
              fill="none"
              stroke={e.animated ? 'var(--rust)' : 'var(--muted)'}
              strokeWidth={e.animated ? 2.2 : 1.5}
              strokeDasharray={e.animated ? '7 4' : undefined}
              markerEnd="url(#tree-arrow)"
            />
            {e.label && (
              <text x={(x1 + x2) / 2 + 8} y={my} fontSize="11" fill="var(--muted)" fontFamily="inherit" style={{ paintOrder: 'stroke', stroke: 'var(--sheet)', strokeWidth: 3 }}>
                {e.label}
              </text>
            )}
          </g>
        );
      })}
      {scene.nodes.map((n, i) => {
        const hasParent = Boolean(n.parentId);
        const w = Math.max(150, textWidth(n.label, 13) + 66, n.sublabel ? textWidth(n.sublabel, 10.5) + 66 : 0);
        const h = n.sublabel ? (hasParent ? 64 : 54) : 42;
        const fill = KIND_FILL[n.kind] ?? 'var(--card)';
        const stroke = KIND_STROKE[n.kind] ?? 'var(--edge)';
        const isRoot = n.kind === 'root';
        const roleLabel = KIND_LABEL[n.kind] ?? n.kind;
        return (
          <g key={n.id} className="stage-node-enter" style={{ animationDelay: `${i * 55}ms` }} opacity={n.status === 'dimmed' ? 0.45 : 1}>
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
        );
      })}
      {scene.annotations?.map((a, i) => (
        <g key={`ann-${i}`} className="stage-label-enter" style={{ animationDelay: `${300 + i * 80}ms` }}>
          <rect x={a.x - 10} y={a.y - 19} width={a.text.length * 7.2 + 20} height={26} rx={8} fill="var(--sheet)" stroke={a.tone ? TONE_STROKE[a.tone] : 'var(--edge)'} strokeWidth={1.4} />
          <circle cx={a.x - 2} cy={a.y - 6} r={3} fill={a.tone ? TONE_STROKE[a.tone] : 'var(--muted)'} />
          <text x={a.x + 6} y={a.y} fontSize="11.5" fontWeight="600" fill="var(--ink)" fontFamily="inherit">
            {a.text}
          </text>
        </g>
      ))}
    </svg>
  );
}
