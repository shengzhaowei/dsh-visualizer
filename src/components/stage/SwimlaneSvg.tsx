import type { SwimlaneScene } from '../../types/lesson';
import { TONE_FILL, TONE_STROKE } from './tones';

const W = 1000;
const LANE_LABEL_W = 150;
const LANE_H = 64;
const BAND_H = 20;
const BAND_TOP = 6;
const TOP = BAND_TOP + BAND_H + 16;

/** Swimlane timeline: lanes on the left, bars and event markers on a 0..100 axis. */
export function SwimlaneSvg({ scene }: { scene: SwimlaneScene }) {
  const laneX0 = LANE_LABEL_W;
  const laneW = W - LANE_LABEL_W - 24;
  const height = TOP + scene.lanes.length * LANE_H + 18;
  const xFor = (pos: number) => laneX0 + (pos / 100) * laneW;
  const laneIndex = new Map(scene.lanes.map((l, i) => [l.id, i]));
  const yFor = (laneId: string) => TOP + (laneIndex.get(laneId) ?? 0) * LANE_H;
  const countFor = (laneId: string) =>
    scene.bars.filter((b) => b.laneId === laneId).length + (scene.events ?? []).filter((e) => e.laneId === laneId).length;

  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="stage-svg" role="img" aria-label={scene.title ?? '时序泳道图'}>
      <defs>
        <pattern id="swim-hatch" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="7" stroke="var(--edge)" strokeWidth="1" opacity="0.14" />
        </pattern>
        <marker id="swim-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--green-stroke)" />
        </marker>
      </defs>

      {/* 顶部阶段条 */}
      {(scene.phaseBands ?? []).map((band, i) => (
        <g key={`band-${i}`} className="stage-zone-enter" style={{ animationDelay: `${i * 60}ms` }}>
          <rect x={xFor(band.start)} y={BAND_TOP} width={Math.max(8, xFor(band.end) - xFor(band.start))} height={BAND_H} rx={6} fill={TONE_FILL[band.tone ?? 'neutral']} stroke={TONE_STROKE[band.tone ?? 'neutral']} strokeWidth={1.2} />
          <text x={xFor(band.start) + 8} y={BAND_TOP + 14} fontSize="10.5" fontWeight="700" fill="var(--ink)" fontFamily="inherit">
            {band.label}
          </text>
        </g>
      ))}

      {/* t0–t4 虚线刻度 */}
      {(scene.ticks ?? []).map((t) => (
        <g key={`tick-${t.pos}`}>
          <line x1={xFor(t.pos)} y1={TOP - 10} x2={xFor(t.pos)} y2={height - 14} stroke="var(--line)" strokeWidth={1} strokeDasharray="3 4" />
          <text x={xFor(t.pos)} y={TOP - 14} textAnchor="middle" fontSize="11" fill="var(--muted)" fontFamily="inherit">
            {t.label}
          </text>
        </g>
      ))}

      {/* 泳道 */}
      {scene.lanes.map((lane, i) => {
        const y = TOP + i * LANE_H;
        const count = countFor(lane.id);
        return (
          <g key={lane.id}>
            <rect x={0} y={y} width={W} height={LANE_H - 8} fill={i % 2 === 0 ? 'var(--paper-2)' : 'transparent'} />
            {/* 泳道头彩色标识 */}
            <rect x={0} y={y} width={4} height={LANE_H - 8} fill={TONE_STROKE[lane.tone ?? 'neutral']} />
            <text x={12} y={y + 22} fontSize="13.5" fontWeight="700" fill="var(--ink)" fontFamily="inherit">
              {lane.label}
            </text>
            {lane.sublabel && (
              <text x={12} y={y + 40} fontSize="11" fill="var(--muted)" fontFamily="inherit">
                {lane.sublabel}
              </text>
            )}
            {count > 0 && (
              <g>
                <rect x={LANE_LABEL_W - 34} y={y + 8} width={24} height={18} rx={9} fill="var(--sheet)" stroke="var(--edge)" strokeWidth={1} />
                <text x={LANE_LABEL_W - 22} y={y + 21} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="var(--ink)" fontFamily="var(--font-mono)">
                  {count}
                </text>
              </g>
            )}
            <line x1={laneX0} y1={y} x2={W - 24} y2={y} stroke="var(--line-soft)" strokeWidth={1} />
          </g>
        );
      })}

      {/* 跨泳道连接线 */}
      {(scene.connectors ?? []).map((c, i) => {
        const x1 = xFor(c.fromPos);
        const x2 = xFor(c.toPos);
        const y1 = yFor(c.fromLaneId) + 24;
        const y2 = yFor(c.toLaneId) + 24;
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        return (
          <g key={`conn-${i}`} className="stage-edge-enter" style={{ animationDelay: `${200 + i * 70}ms` }}>
            <path
              d={`M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`}
              fill="none"
              stroke="var(--green-stroke)"
              strokeWidth={1.6}
              strokeDasharray={c.dashed ? '5 4' : undefined}
              markerEnd="url(#swim-arrow)"
            />
            {c.label && (
              <text x={mx} y={my - 5} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--green-stroke)" fontFamily="var(--font-mono)" style={{ paintOrder: 'stroke', stroke: 'var(--sheet)', strokeWidth: 3 }}>
                {c.label}
              </text>
            )}
          </g>
        );
      })}

      {/* 泳道内影线长条 */}
      {scene.bars.map((bar, i) => {
        const y = yFor(bar.laneId) + 10;
        const x = xFor(bar.start);
        const w = Math.max(14, xFor(bar.end) - x);
        const labelW = bar.label.length * 6.8;
        const fits = labelW <= w - 16;
        const shownLabel = fits ? bar.label : bar.label.length > 14 ? `${bar.label.slice(0, 13)}…` : bar.label;
        return (
          <g key={bar.id} className="stage-node-enter" style={{ animationDelay: `${i * 55}ms` }} opacity={bar.status === 'blocked' ? 0.55 : 1}>
            <rect x={x} y={y} width={w} height={28} rx={7} fill={TONE_FILL[bar.tone]} stroke={TONE_STROKE[bar.tone]} strokeWidth={1.6} />
            <rect x={x} y={y} width={w} height={28} rx={7} fill="url(#swim-hatch)" />
            <text x={x + 9} y={y + 18} fontSize="12" fontWeight="700" fill="var(--ink)" fontFamily="inherit">
              {shownLabel}
            </text>
            {bar.sublabel && w > 150 && (
              <text x={x + w - 9} y={y + 18} textAnchor="end" fontSize="11" fill="var(--muted)" fontFamily="inherit">
                {bar.sublabel}
              </text>
            )}
            {bar.status === 'running' && (
              <circle cx={x + w - 10} cy={y + 14} r={3.5} fill="var(--green-stroke)" className="stage-pulse" />
            )}
            {(bar.status === 'error' || bar.status === 'blocked') && (
              <text x={x + w + 6} y={y + 19} fontSize="13" fontWeight="700" fill="var(--rose-stroke)" fontFamily="inherit">
                ✕
              </text>
            )}
          </g>
        );
      })}

      {/* 事件小药丸 */}
      {(scene.events ?? []).map((ev, i) => {
        const y = yFor(ev.laneId) + 44;
        const cx = xFor(ev.pos);
        const pw = ev.label.length * 6.4 + 22;
        return (
          <g key={ev.id} className="stage-label-enter" style={{ animationDelay: `${260 + i * 70}ms` }}>
            <rect x={cx - pw / 2} y={y} width={pw} height={18} rx={9} fill="var(--sheet)" stroke={TONE_STROKE[ev.tone ?? 'orange']} strokeWidth={1.3} />
            {ev.emphasized ? (
              <rect x={cx - pw / 2 + 7} y={y + 7} width={5} height={5} fill={TONE_STROKE[ev.tone ?? 'orange']} transform={`rotate(45 ${cx - pw / 2 + 9.5} ${y + 9.5})`} />
            ) : (
              <circle cx={cx - pw / 2 + 10} cy={y + 9} r={3} fill={TONE_STROKE[ev.tone ?? 'orange']} />
            )}
            <text x={cx + 4} y={y + 13} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="var(--ink)" fontFamily="var(--font-mono)">
              {ev.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
