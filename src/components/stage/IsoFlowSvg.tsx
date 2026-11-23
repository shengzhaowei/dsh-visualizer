import {
  Brain,
  Clock,
  Cpu,
  Database,
  FileText,
  Globe,
  HardDrive,
  Inbox,
  Layers,
  MessageSquareText,
  Package,
  Pause,
  Plug,
  RefreshCw,
  Terminal,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { IsoFlowScene, IsoNode } from '../../types/lesson';
import { TONE_FILL, TONE_LIP, TONE_STROKE } from './tones';

const ICONS: Record<string, LucideIcon> = {
  layers: Layers,
  'refresh-cw': RefreshCw,
  brain: Brain,
  wrench: Wrench,
  database: Database,
  'message-square-text': MessageSquareText,
  package: Package,
  globe: Globe,
  terminal: Terminal,
  plug: Plug,
  cpu: Cpu,
  'file-text': FileText,
  clock: Clock,
  inbox: Inbox,
  pause: Pause,
  users: Users,
  'hard-drive': HardDrive,
};

/** 未显式指定 icon 时，按 id / 标题语义推断一个图标。 */
function iconFor(node: IsoNode): LucideIcon {
  if (node.icon && ICONS[node.icon]) return ICONS[node.icon];
  const hay = `${node.id} ${node.label} ${node.sublabel ?? ''}`.toLowerCase();
  if (/llm|模型/.test(hay)) return Brain;
  if (/tool|工具/.test(hay)) return Wrench;
  if (/session|会话|log|日志/.test(hay)) return Database;
  if (/prompt|提示词/.test(hay)) return MessageSquareText;
  if (/cordis|主板|fiber/.test(hay)) return Layers;
  if (/loop|循环/.test(hay)) return RefreshCw;
  if (/web|浏览器|browser/.test(hay)) return Globe;
  if (/file|文件/.test(hay)) return FileText;
  if (/time|时间/.test(hay)) return Clock;
  if (/inbox|收件箱/.test(hay)) return Inbox;
  if (/agent/.test(hay)) return Users;
  return Package;
}

export function isoNodeSize(node: IsoNode): { w: number; h: number } {
  if (node.size === 'lg') return { w: 210, h: 76 };
  if (node.size === 'platform') return { w: 640, h: 64 };
  if (node.size === 'sm') return { w: 130, h: 52 };
  return { w: 168, h: 64 };
}

/** 按字符宽度估算文本像素宽：全角字符按字号计，半角按约 0.55 字号计。 */
export function textWidth(text: string, fontSize: number): number {
  let w = 0;
  for (const ch of text) w += ch.charCodeAt(0) > 255 ? fontSize : fontSize * 0.55;
  return w;
}

/** 标签过长时折成两行（中点附近找空格/标点断开），绝不在中途截断。 */
function wrapLabel(label: string, fontSize: number, maxWidth: number): string[] {
  if (textWidth(label, fontSize) <= maxWidth) return [label];
  const chars = [...label];
  const total = textWidth(label, fontSize);
  let acc = 0;
  let mid = chars.length;
  for (let i = 0; i < chars.length; i++) {
    acc += chars[i].charCodeAt(0) > 255 ? fontSize : fontSize * 0.55;
    if (acc >= total / 2) { mid = i + 1; break; }
  }
  let split = mid;
  for (let d = 0; d <= 4 && split === mid; d++) {
    for (const c of [mid + d, mid - d]) {
      if (c > 0 && c < chars.length && /[\s\-_/·,，。；：]/.test(chars[c])) { split = c + 1; break; }
    }
  }
  const l1 = label.slice(0, split).trim();
  const l2 = label.slice(split).trim();
  if (!l1 || !l2) return [label];
  return [l1, l2];
}

/** 场景包围盒（节点 + 分组框 + 标注），供 fit-to-view 使用。 */
export function isoSceneBBox(scene: IsoFlowScene): { x: number; y: number; w: number; h: number } {
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
  for (const z of scene.zones ?? []) eat(z.x, z.y, z.w, z.h);
  for (const n of scene.nodes) {
    const { w, h } = isoNodeSize(n);
    eat(n.x - 4, n.y - 14, w + 8, h + 20);
  }
  for (const c of scene.callouts ?? []) eat(c.x - 6, c.y - 18, c.text.length * 7.4 + 12, 26);
  if (!Number.isFinite(minX)) return { x: 0, y: 0, w: 1000, h: 560 };
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
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
        <marker id="iso-arrow-orange" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--orange-stroke)" />
        </marker>
        <marker id="iso-arrow-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--green-stroke)" />
        </marker>
      </defs>

      {/* 分组虚线框（画在最底层） */}
      {(scene.zones ?? []).map((z, i) => (
        <g key={`zone-${i}`} className="stage-zone-enter" style={{ animationDelay: `${i * 70}ms` }}>
          <rect x={z.x} y={z.y} width={z.w} height={z.h} rx={12} fill={TONE_FILL[z.tone ?? 'neutral']} fillOpacity={0.32} stroke={TONE_STROKE[z.tone ?? 'neutral']} strokeWidth={1.4} strokeDasharray={z.dashed === false ? undefined : '5 4'} />
          <rect x={z.x + 12} y={z.y + 10} width={8} height={8} rx={2} fill={TONE_STROKE[z.tone ?? 'neutral']} />
          <text x={z.x + 26} y={z.y + 18} fontSize="11" fontWeight="700" fill={TONE_STROKE[z.tone ?? 'neutral']} fontFamily="inherit">
            {z.label}
          </text>
        </g>
      ))}

      {scene.edges.map((e, i) => {
        const from = byId.get(e.from);
        const to = byId.get(e.to);
        if (!from || !to) return null;
        const fs = isoNodeSize(from);
        const ts = isoNodeSize(to);
        const x1 = from.x + fs.w / 2;
        const y1 = from.y + fs.h / 2;
        const x2 = to.x + ts.w / 2;
        const y2 = to.y + ts.h / 2;
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2 - 26;
        const d = `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
        const isActive = e.status === 'active';
        const isError = e.status === 'error';
        const dimmed = e.status === 'dimmed';
        const kind = e.dotted ? 'dotted' : e.dashed ? 'dashed' : 'solid';
        const stroke =
          isActive ? 'var(--rust)'
          : isError ? 'var(--rose-stroke)'
          : kind === 'dashed' ? 'var(--orange-stroke)'
          : kind === 'dotted' ? 'var(--green-stroke)'
          : 'var(--muted)';
        const marker =
          isActive ? 'iso-arrow-active'
          : kind === 'dashed' ? 'iso-arrow-orange'
          : kind === 'dotted' ? 'iso-arrow-green'
          : 'iso-arrow';
        const packetCount = e.packetCount ?? 0;
        const dur = 6 / (e.packetSpeed ?? 1);
        const labelW = e.label ? textWidth(e.label, 11.5) + 18 : 0;
        return (
          <g key={`${e.from}-${e.to}`} opacity={dimmed ? 0.78 : 1} className="stage-edge-dim">
            <g className="stage-edge-enter" style={{ animationDelay: `${i * 45}ms` }}>
              <path
                d={d}
                fill="none"
                stroke={stroke}
                strokeWidth={isActive ? 2.6 : kind === 'dotted' ? 2.2 : 1.8}
                strokeDasharray={kind === 'dashed' ? '6 5' : kind === 'dotted' ? '1.5 5' : undefined}
                strokeLinecap={kind === 'dotted' ? 'round' : undefined}
                markerEnd={`url(#${marker})`}
              />
              {e.label && (
                <g>
                  <rect x={mx - labelW / 2} y={my - 19} width={labelW} height={20} rx={10} fill="var(--sheet)" stroke="var(--line-strong)" strokeWidth={1} />
                  <text
                    x={mx}
                    y={my - 5}
                    textAnchor="middle"
                    fontSize="11.5"
                    fontWeight="600"
                    fill={isActive ? 'var(--rust)' : 'var(--ink-2)'}
                    fontFamily="inherit"
                  >
                    {e.label}
                  </text>
                </g>
              )}
              {active && packetCount > 0 &&
                Array.from({ length: packetCount }, (_, pi) => {
                  const label = e.packetLabel;
                  const pw = label ? label.length * 7 + 18 : 12;
                  return (
                    <g key={`pkt-${pi}`} className="stage-packet">
                      <animateMotion dur={`${dur}s`} begin={`${-(pi * dur) / packetCount}s`} repeatCount="indefinite" path={d} />
                      {label ? (
                        <>
                          <rect x={-pw / 2} y={-9} width={pw} height={18} rx={9} fill="var(--sheet)" stroke={stroke} strokeWidth={1.4} />
                          <text y={3.5} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="var(--ink)" fontFamily="var(--font-mono)">
                            {label}
                          </text>
                        </>
                      ) : (
                        <circle r={5} fill="var(--rust)" stroke="var(--sheet)" strokeWidth={1.4} />
                      )}
                    </g>
                  );
                })}
            </g>
          </g>
        );
      })}

      {scene.nodes.map((n, i) => {
        const { w, h } = isoNodeSize(n);
        const isPlatform = n.size === 'platform';
        const isSmall = n.size === 'sm';
        const fill = n.tone === 'dark' ? 'var(--ink)' : TONE_FILL[n.tone];
        const lip = TONE_LIP[n.tone];
        const textColor = n.tone === 'dark' ? 'var(--paper)' : 'var(--ink)';
        const subColor = n.tone === 'dark' ? 'var(--paper-2)' : 'var(--muted)';
        const Icon = iconFor(n);
        const iconColor = n.tone === 'dark' ? 'var(--paper)' : TONE_STROKE[n.tone];
        const hasIcon = !isSmall;
        const textX = hasIcon && !isPlatform ? n.x + 46 : n.x + w / 2;
        const anchor = hasIcon && !isPlatform ? 'start' : 'middle';
        const availW = hasIcon && !isPlatform ? w - 46 - 12 : w - 20;
        const labelLines = wrapLabel(n.label, isPlatform ? 15.5 : 13.5, availW);
        const twoLines = labelLines.length > 1;
        const titleY = n.sublabel ? n.y + (n.meter ? h / 2 - 10 : h / 2 - 4) : n.y + (n.meter ? h / 2 - 8 : h / 2 + 5);
        const subY = n.y + (n.meter ? h / 2 + 6 : h / 2 + 16);
        return (
          <g key={n.id} opacity={n.dimmed ? 0.78 : 1} className="stage-node-dim">
            <g className="stage-node-enter" style={{ animationDelay: `${i * 60}ms` }}>
              {/* 激活节点：绿光晕 + 双线框 */}
              {n.active && (
                <rect className="stage-node-glow" x={n.x - 4} y={n.y - 4} width={w + 8} height={h + 8} rx={19} fill="none" stroke="var(--green-stroke)" strokeWidth={5} />
              )}
              {/* 底部同色深色错位“叠层”边：轻微 3D 纸片感 */}
              <rect x={n.x + 3} y={n.y + 6} width={w} height={h} rx={16} fill={lip} />
              <rect
                x={n.x}
                y={n.y}
                width={w}
                height={h}
                rx={16}
                fill={fill}
                stroke={n.active ? 'var(--rust)' : TONE_STROKE[n.tone]}
                strokeWidth={n.active ? 2.6 : 1.6}
                strokeDasharray={n.dimmed ? '4 3' : undefined}
              />
              {hasIcon && (
                <g>
                  <rect x={n.x + 10} y={n.y + h / 2 - 13} width={26} height={26} rx={8} fill="var(--sheet)" stroke="var(--edge)" strokeWidth={1.2} opacity={0.96} />
                  <Icon x={n.x + 15} y={n.y + h / 2 - 8} width={16} height={16} color={iconColor} strokeWidth={2.2} />
                </g>
              )}
              {labelLines.map((line, li) => (
                <text
                  key={li}
                  x={textX}
                  y={twoLines ? titleY - 7 + li * 15 : titleY}
                  textAnchor={anchor}
                  fontSize={isPlatform ? 15.5 : 13.5}
                  fontWeight="700"
                  fill={textColor}
                  fontFamily="var(--font-mono)"
                >
                  {line}
                </text>
              ))}
              {n.sublabel && (
                <text x={textX} y={subY} textAnchor={anchor} fontSize="11" fill={subColor} fontFamily="inherit">
                  {n.sublabel}
                </text>
              )}
              {n.meter && (
                <g>
                  <text x={n.x + w - 10} y={n.y + h - 17} textAnchor="end" fontSize="9" fontWeight="700" fill={subColor} fontFamily="var(--font-mono)">
                    {n.meter.label} {n.meter.value}%
                  </text>
                  <rect x={n.x + 10} y={n.y + h - 13} width={w - 20} height={5} rx={2.5} fill="var(--line)" />
                  <rect x={n.x + 10} y={n.y + h - 13} width={((w - 20) * Math.max(0, Math.min(100, n.meter.value))) / 100} height={5} rx={2.5} fill={TONE_STROKE[n.tone]} />
                </g>
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
          </g>
        );
      })}

      {scene.callouts?.map((c, i) => (
        <g key={`callout-${i}`} className="stage-label-enter" style={{ animationDelay: `${300 + i * 80}ms` }}>
          <rect x={c.x - 6} y={c.y - 18} width={c.text.length * 7.4 + 12} height={26} rx={6} fill={TONE_FILL[c.tone ?? 'neutral']} stroke="var(--edge)" strokeWidth={1.2} />
          <text x={c.x} y={c.y} fontSize="12" fontWeight="600" fill="var(--ink)" fontFamily="inherit">
            {c.text}
          </text>
        </g>
      ))}
    </svg>
  );
}
