import { useState } from 'react';
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Eye,
  FileText,
  GitBranch,
  Globe,
  HardDrive,
  Inbox,
  Layers,
  Lock,
  MessageSquareText,
  Package,
  Pause,
  Plug,
  RefreshCw,
  Shield,
  Terminal,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { IsoFlowScene, IsoNode } from '../../types/lesson';
import type { HoverHudInfo } from './StageCanvas';
import { TONE_FILL, TONE_LABEL, TONE_LIP, TONE_STROKE } from './tones';

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
  shield: Shield,
  lock: Lock,
  'git-branch': GitBranch,
  eye: Eye,
  'check-circle': CheckCircle2,
  'alert-triangle': AlertTriangle,
};

/** 未显式指定 icon 时，按 id / 标题语义推断一个图标。 */
function iconFor(node: IsoNode): LucideIcon {
  if (node.icon && ICONS[node.icon]) return ICONS[node.icon];
  const hay = `${node.id} ${node.label} ${node.sublabel ?? ''}`.toLowerCase();
  if (/sandbox|沙箱|lock|fail-closed|隔离/.test(hay)) return Lock;
  if (/guard|approval|审批|策略|policy|权限|门|deny|ask/.test(hay)) return Shield;
  if (/scope|作用域|chain|子树|冒泡/.test(hay)) return GitBranch;
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

/** 按字符宽度估算文本像素宽：全角字符按字号计，半角按比例计（等宽字体略宽）。 */
export function textWidth(text: string, fontSize: number, mono = false): number {
  const half = mono ? 0.63 : 0.58;
  let w = 0;
  for (const ch of text) w += ch.charCodeAt(0) > 255 ? fontSize : fontSize * half;
  return w;
}

export function isoNodeSize(node: IsoNode): { w: number; h: number } {
  if (node.size === 'platform') return { w: 640, h: 64 };
  const isSmall = node.size === 'sm';
  const baseW = node.size === 'lg' ? 210 : isSmall ? 130 : 168;
  const maxW = node.size === 'lg' ? 286 : isSmall ? 176 : 238;
  const baseH = node.size === 'lg' ? 76 : isSmall ? 52 : 64;
  const padLeft = isSmall ? 12 : 46;
  const padRight = 14;
  const labelW = textWidth(node.label, 13.5, true);
  const subW = node.sublabel ? textWidth(node.sublabel, 11, false) : 0;
  const desiredW = Math.ceil(Math.max(baseW, Math.max(labelW, subW) + padLeft + padRight));
  const w = Math.min(maxW, desiredW);
  return { w, h: baseH };
}

/** 标签过长时折成两行（中点附近找空格/标点断开），绝不在中途截断。 */
function wrapLabel(label: string, fontSize: number, maxWidth: number, mono = true): string[] {
  if (textWidth(label, fontSize, mono) <= maxWidth) return [label];
  const chars = [...label];
  const total = textWidth(label, fontSize, mono);
  const half = mono ? 0.63 : 0.58;
  let acc = 0;
  let mid = chars.length;
  for (let i = 0; i < chars.length; i++) {
    acc += chars[i].charCodeAt(0) > 255 ? fontSize : fontSize * half;
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

/** 二次贝塞尔曲线长度（采样估算），供数据包时长按边长计算。 */
function quadLength(x1: number, y1: number, cx: number, cy: number, x2: number, y2: number): number {
  let len = 0;
  let px = x1;
  let py = y1;
  const N = 24;
  for (let i = 1; i <= N; i++) {
    const t = i / N;
    const mt = 1 - t;
    const x = mt * mt * x1 + 2 * mt * t * cx + t * t * x2;
    const y = mt * mt * y1 + 2 * mt * t * cy + t * t * y2;
    len += Math.hypot(x - px, y - py);
    px = x;
    py = y;
  }
  return len;
}

/** 是否减弱动效：减弱时不渲染流动的数据包。 */
export function prefersReducedMotion(): boolean {
  try {
    return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
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
  const byId = new Map(scene.nodes.map((n) => [n.id, n]));
  for (const z of scene.zones ?? []) eat(z.x - 4, z.y - 4, z.w + 8, z.h + 8);
  for (const n of scene.nodes) {
    const { w, h } = isoNodeSize(n);
    eat(n.x - 10, n.y - 16, w + 20, h + 28);
  }
  for (const e of scene.edges) {
    const from = byId.get(e.from);
    const to = byId.get(e.to);
    if (!from || !to) continue;
    const fs = isoNodeSize(from);
    const ts = isoNodeSize(to);
    const mx = (from.x + fs.w / 2 + to.x + ts.w / 2) / 2;
    const my = (from.y + fs.h / 2 + to.y + ts.h / 2) / 2 - 20;
    const lw = e.label ? textWidth(e.label, 11) + 20 : 12;
    eat(mx - lw / 2, my - 14, lw, 24);
  }
  for (const c of scene.callouts ?? []) eat(c.x - 10, c.y - 20, textWidth(c.text, 12) + 22, 28);
  if (!Number.isFinite(minX)) return { x: 0, y: 0, w: 1000, h: 560 };
  return { x: minX, y: minY, w: Math.max(120, maxX - minX), h: Math.max(80, maxY - minY) };
}

/** 2.5D isometric-style plugin / layer diagram in a 0..1000 x 0..560 space.
 *  数据包常驻流动：从页面打开就沿边流动，不依赖播放按钮；播放只控制步骤自动翻页。 */
export function IsoFlowSvg({ scene, onHoverInfo }: { scene: IsoFlowScene; onHoverInfo?: (info: HoverHudInfo | null) => void }) {
  const byId = new Map(scene.nodes.map((n) => [n.id, n]));
  const reducedMotion = prefersReducedMotion();
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeKey, setHoveredEdgeKey] = useState<string | null>(null);

  const hasHover = hoveredNodeId !== null || hoveredEdgeKey !== null;
  const isNodeRelated = (id: string) => {
    if (!hasHover) return true;
    if (hoveredNodeId) {
      if (id === hoveredNodeId) return true;
      return scene.edges.some((e) => (e.from === hoveredNodeId && e.to === id) || (e.to === hoveredNodeId && e.from === id));
    }
    if (hoveredEdgeKey) {
      return scene.edges.some((e) => `${e.from}-${e.to}` === hoveredEdgeKey && (e.from === id || e.to === id));
    }
    return true;
  };
  const isEdgeRelated = (fromId: string, toId: string) => {
    if (!hasHover) return true;
    if (hoveredNodeId) return fromId === hoveredNodeId || toId === hoveredNodeId;
    if (hoveredEdgeKey) return `${fromId}-${toId}` === hoveredEdgeKey;
    return true;
  };
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
        const packetCount = e.packetCount ?? (dimmed ? 0 : 1);
        // 时长按边长算：边长 / (115 × 速度)，夹在 1.15–5.5 秒之间
        const edgeLen = quadLength(x1, y1, mx, my, x2, y2);
        const dur = Math.max(1.15, Math.min(5.5, edgeLen / (115 * Math.max(0.3, e.packetSpeed ?? 1))));
        // 数据包颜色跟边状态走：error 红、active 绿、虚线橙、点线绿、默认锈色
        const packetColor =
          isError ? 'var(--rose-stroke)'
          : isActive ? 'var(--green-stroke)'
          : kind === 'dashed' ? 'var(--orange-stroke)'
          : kind === 'dotted' ? 'var(--green-stroke)'
          : 'var(--rust)';
        const labelW = e.label ? textWidth(e.label, 11.5) + 18 : 0;
        const edgeKey = `${e.from}-${e.to}`;
        const related = isEdgeRelated(e.from, e.to);
        const isHoveredEdge = hoveredEdgeKey === edgeKey;
        const baseOpacity = dimmed ? 0.72 : 1;
        const finalOpacity = hasHover ? (related ? 1 : 0.22) : baseOpacity;
        const canDraw = kind === 'solid' && !reducedMotion;
        return (
          <g
            key={edgeKey}
            opacity={finalOpacity}
            className="stage-edge-dim stage-interactive-edge"
            onMouseEnter={() => {
              setHoveredEdgeKey(edgeKey);
              onHoverInfo?.({
                title: `${from.label} → ${to.label}`,
                subtitle: e.label ?? e.packetLabel ?? '数据流连接',
                badge: isActive ? '激活通路' : isError ? '异常' : kind === 'dashed' ? '可选依赖' : kind === 'dotted' ? '可替换' : undefined,
              });
            }}
            onMouseLeave={() => {
              setHoveredEdgeKey(null);
              onHoverInfo?.(null);
            }}
          >
            <g className="stage-edge-enter" style={{ animationDelay: `${i * 45}ms` }}>
              {/* 宽透明命中区，便于悬停边 */}
              <path d={d} fill="none" stroke="transparent" strokeWidth={14} />
              <path
                d={d}
                pathLength={canDraw ? 1 : undefined}
                fill="none"
                stroke={stroke}
                strokeWidth={isHoveredEdge ? 3.2 : isActive ? 2.6 : kind === 'dotted' ? 2.2 : 1.8}
                strokeDasharray={kind === 'dashed' ? '6 5' : kind === 'dotted' ? '1.5 5' : undefined}
                strokeLinecap={kind === 'dotted' ? 'round' : undefined}
                markerEnd={`url(#${marker})`}
                className={kind === 'dashed' && isActive ? 'stage-dash-flow' : canDraw ? 'stage-edge-draw' : undefined}
                style={canDraw ? { animationDelay: `${i * 55}ms` } : undefined}
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
              {/* 数据包常驻流动（CSS offset-path 无字流光粒子，不点播放即自动流动） */}
              {!reducedMotion && packetCount > 0 &&
                Array.from({ length: packetCount }, (_, pi) => {
                  const durStr = `${dur.toFixed(2)}s`;
                  const offsetSec = (pi * dur) / packetCount;
                  const delayStr = offsetSec === 0 ? '0s' : `-${offsetSec.toFixed(2)}s`;
                  return (
                    <g
                      key={`pkt-${pi}`}
                      className="stage-packet-orb"
                      style={{
                        offsetPath: `path("${d}")`,
                        animationDuration: durStr,
                        animationDelay: delayStr,
                      }}
                    >
                      {/* 尾迹拖影 */}
                      <circle cx={-8} cy={0} r={2.2} fill={packetColor} fillOpacity={0.28} />
                      <circle cx={-4.5} cy={0} r={2.8} fill={packetColor} fillOpacity={0.48} />
                      {/* 呼吸外光晕 */}
                      <circle className="stage-packet-halo" cx={0} cy={0} r={7.8} fill={packetColor} fillOpacity={0.28} />
                      {/* 内核高亮点 */}
                      <circle cx={0} cy={0} r={4.1} fill={packetColor} stroke="var(--sheet)" strokeWidth={1.3} />
                      <circle cx={-0.8} cy={-0.8} r={1.2} fill="#fff" fillOpacity={0.8} />
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
        const availW = hasIcon && !isPlatform ? w - 46 - 14 : w - 22;
        const baseLabelFont = isPlatform ? 15.5 : 13.5;
        const labelLines = wrapLabel(n.label, baseLabelFont, availW, true);
        const longestLabelLine = Math.max(...labelLines.map((l) => textWidth(l, baseLabelFont, true)));
        const labelFontSize = longestLabelLine > availW ? Math.max(10.5, (baseLabelFont * availW) / longestLabelLine) : baseLabelFont;
        const twoLines = labelLines.length > 1;
        const subRawW = n.sublabel ? textWidth(n.sublabel, 11, false) : 0;
        const subFontSize = subRawW > availW ? Math.max(9.2, (11 * availW) / subRawW) : 11;
        const titleY = n.sublabel ? n.y + (n.meter ? h / 2 - 10 : h / 2 - 4) : n.y + (n.meter ? h / 2 - 8 : h / 2 + 5);
        const subY = n.y + (n.meter ? h / 2 + 6 : h / 2 + 16);
        const badgeW = n.badge ? textWidth(n.badge, 10.5) + 16 : 0;
        const related = isNodeRelated(n.id);
        const isHoveredNode = hoveredNodeId === n.id;
        const finalOpacity = hasHover ? (related ? 1 : 0.32) : n.dimmed ? 0.76 : 1;
        return (
          <g
            key={n.id}
            opacity={finalOpacity}
            className={`stage-node-dim stage-interactive-node ${isHoveredNode ? 'stage-interactive-node--focused' : ''}`}
            onMouseEnter={() => {
              setHoveredNodeId(n.id);
              const meterText = n.meter ? `${n.meter.label}: ${n.meter.value}%` : undefined;
              onHoverInfo?.({
                title: n.label,
                subtitle: [n.sublabel, meterText].filter(Boolean).join(' · ') || TONE_LABEL[n.tone],
                badge: n.badge ?? (n.active ? '当前焦点' : TONE_LABEL[n.tone]),
              });
            }}
            onMouseLeave={() => {
              setHoveredNodeId(null);
              onHoverInfo?.(null);
            }}
          >
            <g className="stage-node-enter" style={{ animationDelay: `${i * 55}ms` }}>
              <g className="stage-node-body">
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
                  fontSize={labelFontSize}
                  fontWeight="700"
                  fill={textColor}
                  fontFamily="var(--font-mono)"
                >
                  {line}
                </text>
              ))}
              {n.sublabel && (
                <text x={textX} y={subY} textAnchor={anchor} fontSize={subFontSize} fill={subColor} fontFamily="inherit">
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
                  <rect x={n.x + w - badgeW / 2 - 6} y={n.y - 11} width={badgeW} height={20} rx={10} fill="var(--rust)" stroke="var(--edge)" strokeWidth={1} />
                  <text x={n.x + w - 6} y={n.y + 3} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#fff" fontFamily="inherit">
                    {n.badge}
                  </text>
                </g>
              )}
              </g>
            </g>
          </g>
        );
      })}

      {scene.callouts?.map((c, i) => {
        const cw = textWidth(c.text, 12) + 18;
        return (
          <g key={`callout-${i}`} className="stage-label-enter" style={{ animationDelay: `${300 + i * 80}ms` }}>
            <rect x={c.x - 8} y={c.y - 18} width={cw} height={26} rx={6} fill={TONE_FILL[c.tone ?? 'neutral']} stroke="var(--edge)" strokeWidth={1.2} />
            <text x={c.x} y={c.y} fontSize="12" fontWeight="600" fill="var(--ink)" fontFamily="inherit">
              {c.text}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
