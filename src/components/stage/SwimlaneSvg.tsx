import type { SwimlaneScene } from '../../types/lesson';
import { TONE_FILL, TONE_STROKE } from './tones';

const W = 1000;
const LANE_LABEL_W = 150;
const LANE_H = 64;
const TOP = 34;

/** Swimlane timeline: lanes on the left, bars and event markers on a 0..100 axis. */
export function SwimlaneSvg({ scene }: { scene: SwimlaneScene }) {
  const laneX0 = LANE_LABEL_W;
  const laneW = W - LANE_LABEL_W - 24;
  const height = TOP + scene.lanes.length * LANE_H + 30;
  const xFor = (pos: number) => laneX0 + (pos / 100) * laneW;
  const laneIndex = new Map(scene.lanes.map((l, i) => [l.id, i]));
  const yFor = (laneId: string) => TOP + (laneIndex.get(laneId) ?? 0) * LANE_H;

  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="stage-svg" role="img" aria-label={scene.title ?? '时序泳道图'}>
      {(scene.ticks ?? []).map((t) => (
        <g key={`tick-${t.pos}`}>
          <line x1={xFor(t.pos)} y1={TOP - 8} x2={xFor(t.pos)} y2={height - 26} stroke="var(--line)" strokeWidth={1} strokeDasharray="3 4" />
          <text x={xFor(t.pos)} y={TOP - 14} textAnchor="middle" fontSize="11" fill="var(--muted)" fontFamily="inherit">
            {t.label}
          </text>
        </g>
      ))}
      {scene.lanes.map((lane, i) => {
        const y = TOP + i * LANE_H;
        return (
          <g key={lane.id}>
            <rect x={0} y={y} width={W} height={LANE_H - 8} fill={i % 2 === 0 ? 'var(--paper-2)' : 'transparent'} />
            <text x={10} y={y + 22} fontSize="13.5" fontWeight="700" fill="var(--ink)" fontFamily="inherit">
              {lane.label}
            </text>
            {lane.sublabel && (
              <text x={10} y={y + 40} fontSize="11" fill="var(--muted)" fontFamily="inherit">
                {lane.sublabel}
              </text>
            )}
            <line x1={laneX0} y1={y} x2={W - 24} y2={y} stroke="var(--line-soft)" strokeWidth={1} />
          </g>
        );
      })}
      {scene.bars.map((bar) => {
        const y = yFor(bar.laneId) + 10;
        const x = xFor(bar.start);
        const w = Math.max(14, xFor(bar.end) - x);
        return (
          <g key={bar.id} opacity={bar.status === 'blocked' ? 0.55 : 1}>
            <rect x={x} y={y} width={w} height={30} rx={7} fill={TONE_FILL[bar.tone]} stroke={TONE_STROKE[bar.tone]} strokeWidth={1.6} />
            <text x={x + 8} y={y + 19} fontSize="12" fontWeight="700" fill="var(--ink)" fontFamily="inherit">
              {bar.label}
            </text>
            {bar.sublabel && w > 120 && (
              <text x={x + w - 8} y={y + 19} textAnchor="end" fontSize="11" fill="var(--muted)" fontFamily="inherit">
                {bar.sublabel}
              </text>
            )}
            {bar.status === 'error' && (
              <text x={x + w + 6} y={y + 20} fontSize="13" fontWeight="700" fill="var(--rose-stroke)" fontFamily="inherit">
                ✕
              </text>
            )}
          </g>
        );
      })}
      {(scene.events ?? []).map((ev) => {
        const y = yFor(ev.laneId) + 25;
        return (
          <g key={ev.id}>
            <circle cx={xFor(ev.pos)} cy={y} r={ev.emphasized ? 8 : 5.5} fill={TONE_FILL[ev.tone ?? 'orange']} stroke="var(--edge)" strokeWidth={1.4} />
            <text x={xFor(ev.pos)} y={y - 13} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--ink)" fontFamily="inherit">
              {ev.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
