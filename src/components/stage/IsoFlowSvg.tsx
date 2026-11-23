import type { IsoFlowScene, IsoNode } from '../../types/lesson';
import { TONE_FILL, TONE_STROKE } from './tones';

function sizeOf(node: IsoNode): { w: number; h: number } {
  if (node.size === 'lg') return { w: 210, h: 76 };
  if (node.size === 'platform') return { w: 640, h: 64 };
  if (node.size === 'sm') return { w: 130, h: 52 };
  return { w: 168, h: 64 };
}

/** 2.5D isometric-style plugin / layer diagram in a 0..1000 x 0..560 space. */
export function IsoFlowSvg({ scene, active }: { scene: IsoFlowScene; active: boolean }) {
  const byId = new Map(scene.nodes.map((n) => [n.id, n]));
  return (
    <svg viewBox="0 0 1000 560" className="stage-svg" role="img" aria-label={scene.title ?? '架构图'}>
      <defs>
        <marker id="iso-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--muted)" />
        </marker>
        <marker id="iso-arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--rust)" />
        </marker>
      </defs>
      {scene.edges.map((e) => {
        const from = byId.get(e.from);
        const to = byId.get(e.to);
        if (!from || !to) return null;
        const fs = sizeOf(from);
        const ts = sizeOf(to);
        const x1 = from.x + fs.w / 2;
        const y1 = from.y + fs.h / 2;
        const x2 = to.x + ts.w / 2;
        const y2 = to.y + ts.h / 2;
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2 - 26;
        const isActive = e.status === 'active';
        const dimmed = e.status === 'dimmed';
        return (
          <g key={`${e.from}-${e.to}`} opacity={dimmed ? 0.35 : 1}>
            <path
              d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
              fill="none"
              stroke={isActive ? 'var(--rust)' : 'var(--muted)'}
              strokeWidth={isActive ? 2.4 : 1.6}
              strokeDasharray={e.dashed ? '6 5' : undefined}
              markerEnd={`url(#${isActive ? 'iso-arrow-active' : 'iso-arrow'})`}
            />
            {e.label && (
              <text x={mx} y={my - 6} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--muted)" fontFamily="inherit">
                {e.label}
              </text>
            )}
          </g>
        );
      })}
      {scene.nodes.map((n) => {
        const { w, h } = sizeOf(n);
        const isPlatform = n.size === 'platform';
        const fill = n.tone === 'dark' ? 'var(--ink)' : TONE_FILL[n.tone];
        const textColor = n.tone === 'dark' ? 'var(--paper)' : 'var(--ink)';
        const subColor = n.tone === 'dark' ? 'var(--paper-2)' : 'var(--muted)';
        return (
          <g key={n.id} opacity={n.dimmed ? 0.45 : 1}>
            <rect
              x={n.x}
              y={n.y + 5}
              width={w}
              height={h}
              rx={9}
              fill="var(--edge)"
              opacity={0.55}
            />
            <rect
              x={n.x}
              y={n.y}
              width={w}
              height={h}
              rx={9}
              fill={fill}
              stroke={n.active ? 'var(--rust)' : TONE_STROKE[n.tone]}
              strokeWidth={n.active ? 2.6 : 1.6}
            />
            <text
              x={n.x + w / 2}
              y={n.y + (n.sublabel ? h / 2 - 4 : h / 2 + 5)}
              textAnchor="middle"
              fontSize={isPlatform ? 16 : 14.5}
              fontWeight="700"
              fill={textColor}
              fontFamily="inherit"
            >
              {n.label}
            </text>
            {n.sublabel && (
              <text x={n.x + w / 2} y={n.y + h / 2 + 16} textAnchor="middle" fontSize="11.5" fill={subColor} fontFamily="inherit">
                {n.sublabel}
              </text>
            )}
            {n.badge && (
              <g>
                <rect x={n.x + w - 8} y={n.y - 11} width={n.badge.length * 8 + 14} height={20} rx={10} fill="var(--rust)" stroke="var(--edge)" strokeWidth={1} transform={`translate(${-n.badge.length * 4}, 0)`} />
                <text x={n.x + w - 1} y={n.y + 3} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#fff" fontFamily="inherit">
                  {n.badge}
                </text>
              </g>
            )}
          </g>
        );
      })}
      {scene.callouts?.map((c, i) => (
        <g key={`callout-${i}`}>
          <rect x={c.x - 6} y={c.y - 18} width={c.text.length * 7.4 + 12} height={26} rx={6} fill={TONE_FILL[c.tone ?? 'neutral']} stroke="var(--edge)" strokeWidth={1.2} />
          <text x={c.x} y={c.y} fontSize="12" fontWeight="600" fill="var(--ink)" fontFamily="inherit">
            {c.text}
          </text>
        </g>
      ))}
      {active && <circle cx={12} cy={12} r={5} fill="var(--rust)" />}
    </svg>
  );
}
