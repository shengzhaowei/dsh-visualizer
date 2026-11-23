import type { TreeScene } from '../../types/lesson';
import { TONE_STROKE } from './tones';

const KIND_FILL: Record<string, string> = {
  root: 'var(--ink)',
  plugin: 'var(--blue)',
  service: 'var(--green)',
  event: 'var(--orange)',
  user: 'var(--violet)',
  assistant: 'var(--mint)',
  tool: 'var(--rose)',
  log: 'var(--card)',
};

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
      {scene.edges.map((e) => {
        const from = byId.get(e.from);
        const to = byId.get(e.to);
        if (!from || !to) return null;
        const x1 = from.x;
        const y1 = from.y + 26;
        const x2 = to.x;
        const y2 = to.y - 26;
        const my = (y1 + y2) / 2;
        return (
          <g key={`${e.from}-${e.to}`}>
            <path
              d={`M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`}
              fill="none"
              stroke={e.animated ? 'var(--rust)' : 'var(--muted)'}
              strokeWidth={e.animated ? 2.2 : 1.5}
              strokeDasharray={e.animated ? '7 4' : undefined}
              markerEnd="url(#tree-arrow)"
            />
            {e.label && (
              <text x={(x1 + x2) / 2 + 8} y={my} fontSize="11" fill="var(--muted)" fontFamily="inherit">
                {e.label}
              </text>
            )}
          </g>
        );
      })}
      {scene.nodes.map((n) => {
        const w = Math.max(120, n.label.length * 8.5 + 28);
        const h = n.sublabel ? 52 : 40;
        const fill = KIND_FILL[n.kind] ?? 'var(--card)';
        const isRoot = n.kind === 'root';
        return (
          <g key={n.id} opacity={n.status === 'dimmed' ? 0.45 : 1}>
            <rect x={n.x - w / 2} y={n.y - h / 2 + 4} width={w} height={h} rx={8} fill="var(--edge)" opacity={0.5} />
            <rect
              x={n.x - w / 2}
              y={n.y - h / 2}
              width={w}
              height={h}
              rx={8}
              fill={fill}
              stroke={n.status === 'highlight' ? 'var(--rust)' : TONE_STROKE[n.kind === 'service' ? 'green' : n.kind === 'plugin' ? 'blue' : n.kind === 'tool' ? 'rose' : 'neutral']}
              strokeWidth={n.status === 'highlight' ? 2.6 : 1.5}
            />
            <text
              x={n.x}
              y={n.y + (n.sublabel ? -3 : 5)}
              textAnchor="middle"
              fontSize="13"
              fontWeight="700"
              fill={isRoot ? 'var(--paper)' : 'var(--ink)'}
              fontFamily="inherit"
            >
              {n.label}
            </text>
            {n.sublabel && (
              <text x={n.x} y={n.y + 15} textAnchor="middle" fontSize="10.5" fill={isRoot ? 'var(--paper-2)' : 'var(--muted)'} fontFamily="inherit">
                {n.sublabel}
              </text>
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
        <text key={`ann-${i}`} x={a.x} y={a.y} fontSize="12" fontWeight="600" fill={a.tone ? TONE_STROKE[a.tone] : 'var(--muted)'} fontFamily="inherit">
          {a.text}
        </text>
      ))}
    </svg>
  );
}
