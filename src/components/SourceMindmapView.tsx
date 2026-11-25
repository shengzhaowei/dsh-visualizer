import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  Copy,
  Expand,
  ExternalLink,
  FileCode2,
  FlaskConical,
  Maximize2,
  Minus,
  Plus,
  Search,
  WrapText,
  X,
} from 'lucide-react';
import type { MindBranchTone, MindNode } from '../types/mindmap';
import { findMindNode } from '../types/mindmap';
import type { SourceLanguage } from '../types/lesson';
import { highlightLine } from '../utils/highlight';
import { playCardFlip, playStepTick } from '../utils/sound';

export interface SourceMindmapViewProps {
  root: MindNode;
  repoUrl: string;
  initialNodeId?: string;
  searchPlaceholder?: string;
  onJumpToLesson: (slug: string, stepNumber?: number) => void;
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

interface LayoutNode {
  data: MindNode;
  x: number;
  y: number;
  w: number;
  h: number;
  depth: number;
  titleSize: number;
  parentId?: string;
}

interface LayoutEdge {
  from: LayoutNode;
  to: LayoutNode;
}

const TONE_COLOR: Record<MindBranchTone, string> = {
  violet: 'var(--cdx-violet)',
  blue: 'var(--cdx-blue)',
  amber: 'var(--cdx-amber)',
  emerald: 'var(--cdx-emerald)',
  rose: 'var(--cdx-rose)',
  cyan: 'var(--cdx-cyan)',
};

function measureTextWidth(text: string, size: number, bold: boolean): number {
  let w = 0;
  for (const ch of text) w += ch.charCodeAt(0) > 255 ? size : size * (bold ? 0.62 : 0.56);
  return w;
}

function getNodeDims(node: MindNode, depth: number) {
  const titleSize = depth === 0 ? 15 : depth === 1 ? 13.5 : 12.5;
  const subSize = 11;
  const tw = measureTextWidth(node.label, titleSize, true);
  const sw = node.sub ? measureTextWidth(node.sub, subSize, false) : 0;
  const w = Math.max(depth === 0 ? 228 : 192, Math.min(316, Math.ceil(Math.max(tw, sw)) + 34));
  const h = node.sub ? (depth === 0 ? 60 : 52) : 40;
  return { w, h, titleSize };
}

function pathIdsTo(root: MindNode, targetId: string, acc: string[] = []): string[] | null {
  if (root.id === targetId) return [...acc, root.id];
  for (const c of root.children ?? []) {
    const hit = pathIdsTo(c, targetId, [...acc, root.id]);
    if (hit) return hit;
  }
  return null;
}

function collectSubtreeIds(node: MindNode, acc = new Set<string>()): Set<string> {
  acc.add(node.id);
  for (const c of node.children ?? []) collectSubtreeIds(c, acc);
  return acc;
}

function matchesQuery(node: MindNode, q: string): boolean {
  if (!q) return true;
  const hay = `${node.label} ${node.sub ?? ''} ${node.file ?? ''} ${node.summary} ${(node.points ?? []).join(' ')} ${node.code ?? ''}`.toLowerCase();
  return hay.includes(q);
}

function toMarkdownOutline(node: MindNode, depth = 0): string {
  const prefix = depth === 0 ? '# ' : depth === 1 ? '## ' : `${'  '.repeat(depth - 2)}- `;
  let out = `${prefix}**${node.label}**${node.file ? ` (\`${node.file}\`)` : ''}${node.sub ? ` — ${node.sub}` : ''}\n`;
  if (depth >= 2 && node.points) {
    for (const p of node.points) out += `${'  '.repeat(depth - 1)}- ${p}\n`;
  }
  for (const c of node.children ?? []) out += toMarkdownOutline(c, depth + 1);
  return out;
}

function detectCodeLang(node: MindNode): SourceLanguage {
  if (node.codeLang) return node.codeLang;
  if (!node.code) return 'text';
  const f = node.file ?? '';
  if (f.endsWith('.rs') || /\b(pub enum|pub struct|impl |while let|fn )/.test(node.code)) return 'rs';
  if (f.endsWith('.py') || /\b(def |class |async def |from langgraph)/.test(node.code)) return 'py';
  if (f.endsWith('.ts') || f.endsWith('.tsx') || /\b(interface |export |async function|const )/.test(node.code)) return 'ts';
  if (f.endsWith('.sh') || node.code.startsWith('#!/')) return 'sh';
  if (f.endsWith('.toml')) return 'toml';
  if (f.endsWith('.json')) return 'json';
  return 'text';
}

function buildRepoFileUrl(repoUrl: string, file?: string): string | null {
  if (!file || !repoUrl) return null;
  const cleanRepo = repoUrl.replace(/\/$/, '');
  if (file.startsWith('http://') || file.startsWith('https://')) return file;
  if (file.includes('~') || file.startsWith('<')) return cleanRepo;
  const cleanFile = file.replace(/^\.?\//, '');
  return `${cleanRepo}/tree/main/${cleanFile}`;
}

export function SourceMindmapView({
  root,
  repoUrl,
  initialNodeId,
  searchPlaceholder = '搜索节点、文件、源码…',
  onJumpToLesson,
  secondaryAction,
}: SourceMindmapViewProps) {
  const firstBranchId = root.children?.[0]?.id ?? root.id;
  const [selectedId, setSelectedId] = useState<string>(initialNodeId || firstBranchId);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [search, setSearch] = useState('');
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [wrapCode, setWrapCode] = useState(true);
  const [codeExpanded, setCodeExpanded] = useState(false);
  const [inspectorWidth, setInspectorWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return 520;
    return Math.max(440, Math.min(620, Math.round(window.innerWidth * 0.38)));
  });
  const [isAnimating, setIsAnimating] = useState(false);
  const [view, setView] = useState({ tx: 36, ty: 24, scale: 1 });
  const [focusReq, setFocusReq] = useState<{ id: string; animate: boolean; nonce: number } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ down: false, dragging: false, startX: 0, startY: 0, downX: 0, downY: 0 });
  const resizeRef = useRef({ resizing: false, startX: 0, startW: 520 });
  const didInitRef = useRef(false);

  const handleSplitterDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    resizeRef.current = { resizing: true, startX: e.clientX, startW: inspectorWidth };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  }, [inspectorWidth]);

  const handleSplitterMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeRef.current.resizing) return;
    const dx = resizeRef.current.startX - e.clientX;
    const maxW = Math.min(820, Math.round(window.innerWidth * 0.62));
    setInspectorWidth(Math.max(360, Math.min(maxW, resizeRef.current.startW + dx)));
  }, []);

  const handleSplitterUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeRef.current.resizing) return;
    resizeRef.current.resizing = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!codeExpanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCodeExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [codeExpanded]);

  const { nodes, edges, bounds } = useMemo(() => {
    const hGap = 56;
    const vGap = 14;
    const dimsMap = new Map<string, { w: number; h: number; titleSize: number; subH: number }>();

    const measure = (n: MindNode, depth: number): number => {
      const d = getNodeDims(n, depth);
      const kids = !collapsed.has(n.id) && n.children ? n.children : [];
      if (kids.length === 0) {
        dimsMap.set(n.id, { ...d, subH: d.h });
        return d.h;
      }
      let sum = 0;
      kids.forEach((c, i) => {
        sum += measure(c, depth + 1);
        if (i > 0) sum += vGap;
      });
      const subH = Math.max(d.h, sum);
      dimsMap.set(n.id, { ...d, subH });
      return subH;
    };

    const outNodes: LayoutNode[] = [];
    const outEdges: LayoutEdge[] = [];

    const place = (n: MindNode, x: number, topY: number, depth: number, parentId?: string): LayoutNode => {
      const m = dimsMap.get(n.id)!;
      const cy = topY + m.subH / 2;
      const ln: LayoutNode = { data: n, x, y: cy - m.h / 2, w: m.w, h: m.h, depth, titleSize: m.titleSize, parentId };
      outNodes.push(ln);

      const kids = !collapsed.has(n.id) && n.children ? n.children : [];
      if (kids.length > 0) {
        let totalKidsH = 0;
        kids.forEach((c, i) => {
          totalKidsH += dimsMap.get(c.id)!.subH;
          if (i > 0) totalKidsH += vGap;
        });
        let curY = cy - totalKidsH / 2;
        for (const c of kids) {
          const ch = dimsMap.get(c.id)!.subH;
          const childLn = place(c, x + m.w + hGap, curY, depth + 1, n.id);
          outEdges.push({ from: ln, to: childLn });
          curY += ch + vGap;
        }
      }
      return ln;
    };

    measure(root, 0);
    place(root, 40, 40, 0);

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of outNodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.w + 22);
      maxY = Math.max(maxY, n.y + n.h);
    }
    return {
      nodes: outNodes,
      edges: outEdges,
      bounds: { minX, minY, w: maxX - minX, h: maxY - minY },
    };
  }, [root, collapsed]);

  const nodesRef = useRef<LayoutNode[]>(nodes);
  nodesRef.current = nodes;
  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;

  const fitView = useCallback((animate = true) => {
    const el = canvasRef.current;
    const b = boundsRef.current;
    if (!el || b.w <= 0 || b.h <= 0) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const pad = 42;
    const scale = Math.max(0.32, Math.min(1.06, Math.min((rect.width - pad * 2) / b.w, (rect.height - pad * 2) / b.h)));
    const tx = (rect.width - b.w * scale) / 2 - b.minX * scale;
    const ty = (rect.height - b.h * scale) / 2 - b.minY * scale;
    setIsAnimating(animate);
    setView({ tx, ty, scale });
  }, []);

  const focusLocalNode = useCallback(
    (id: string, animate = true) => {
      if (id === root.id) {
        fitView(animate);
        return;
      }
      const el = canvasRef.current;
      const allNodes = nodesRef.current;
      const targetLn = allNodes.find((n) => n.data.id === id);
      if (!el || !targetLn) return;

      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const focusGroup: LayoutNode[] = [targetLn];
      if (targetLn.depth === 1) {
        const subIds = collectSubtreeIds(targetLn.data);
        for (const n of allNodes) {
          if (subIds.has(n.data.id) && n.data.id !== targetLn.data.id) focusGroup.push(n);
        }
      } else if (targetLn.parentId) {
        const parentLn = allNodes.find((n) => n.data.id === targetLn.parentId);
        if (parentLn) focusGroup.push(parentLn);
      }

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const n of focusGroup) {
        minX = Math.min(minX, n.x);
        maxX = Math.max(maxX, n.x + n.w + 18);
        minY = Math.min(minY, n.y);
        maxY = Math.max(maxY, n.y + n.h);
      }

      const padX = 72;
      const padY = 64;
      const bw = Math.max(260, maxX - minX);
      const bh = Math.max(120, maxY - minY);
      const rawScale = Math.min((rect.width - padX * 2) / bw, (rect.height - padY * 2) / bh);
      const nextScale =
        targetLn.depth >= 2
          ? Math.max(1.02, Math.min(1.28, rawScale))
          : Math.max(0.92, Math.min(1.18, rawScale));

      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      setIsAnimating(animate);
      setView({
        scale: nextScale,
        tx: rect.width / 2 - cx * nextScale,
        ty: rect.height / 2 - cy * nextScale,
      });
    },
    [fitView, root.id],
  );

  // 仅在切换 root 或外部传入 initialNodeId 时定位，绝不在点击节点时误触发全景重置
  useEffect(() => {
    setCollapsed(new Set());
    setSearch('');
    const target =
      initialNodeId && initialNodeId !== root.id && findMindNode(root, initialNodeId)
        ? initialNodeId
        : firstBranchId;
    setSelectedId(target);
    setFocusReq({ id: target, animate: didInitRef.current, nonce: Date.now() });
    didInitRef.current = true;
  }, [root, initialNodeId, firstBranchId]);

  useEffect(() => {
    if (!focusReq) return;
    const raf = window.requestAnimationFrame(() => {
      focusLocalNode(focusReq.id, focusReq.animate);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [focusReq, focusLocalNode]);

  const selectAndFocus = useCallback(
    (id: string) => {
      playStepTick();
      setSelectedId(id);
      const p = pathIdsTo(root, id) ?? [];
      setCollapsed((prev) => {
        const next = new Set(prev);
        p.forEach((anc) => next.delete(anc));
        return next;
      });
      setFocusReq((prev) => ({ id, animate: true, nonce: (prev?.nonce ?? 0) + 1 }));
    },
    [root],
  );

  const toggleCollapse = useCallback((id: string) => {
    playCardFlip();
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const zoomCenter = useCallback((factor: number) => {
    const el = canvasRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = rect.width / 2;
    const my = rect.height / 2;
    setIsAnimating(true);
    setView((v) => {
      const nextScale = Math.max(0.28, Math.min(2.1, v.scale * factor));
      const ratio = nextScale / v.scale;
      return {
        scale: nextScale,
        tx: mx - (mx - v.tx) * ratio,
        ty: my - (my - v.ty) * ratio,
      };
    });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const el = canvasRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    setIsAnimating(false);
    setView((v) => {
      const nextScale = Math.max(0.28, Math.min(2.1, v.scale * factor));
      const ratio = nextScale / v.scale;
      return {
        scale: nextScale,
        tx: mx - (mx - v.tx) * ratio,
        ty: my - (my - v.ty) * ratio,
      };
    });
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement | null)?.closest('.cdx-mm-node')) return;
      dragRef.current = {
        down: true,
        dragging: false,
        startX: e.clientX - view.tx,
        startY: e.clientY - view.ty,
        downX: e.clientX,
        downY: e.clientY,
      };
    },
    [view.tx, view.ty],
  );

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d.down) return;
    if (!d.dragging && Math.hypot(e.clientX - d.downX, e.clientY - d.downY) > 4) {
      d.dragging = true;
      setIsAnimating(false);
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    }
    if (!d.dragging) return;
    setView((v) => ({ ...v, tx: e.clientX - d.startX, ty: e.clientY - d.startY }));
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (d.dragging) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    }
    d.down = false;
    d.dragging = false;
  }, []);

  const selectedNode = useMemo(() => findMindNode(root, selectedId) ?? root, [root, selectedId]);
  const activePathSet = useMemo(() => new Set(pathIdsTo(root, selectedNode.id) ?? []), [root, selectedNode.id]);
  const focusedRegionSet = useMemo(() => {
    const s = new Set(activePathSet);
    if (selectedNode.id !== root.id) {
      collectSubtreeIds(selectedNode, s);
    }
    return s;
  }, [activePathSet, selectedNode, root.id]);

  const q = search.trim().toLowerCase();
  const branches = root.children ?? [];
  const codeLang = detectCodeLang(selectedNode);
  const codeLines = selectedNode.code ? selectedNode.code.replace(/\n$/, '').split('\n') : [];
  const fileHref = buildRepoFileUrl(repoUrl, selectedNode.file);

  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(toMarkdownOutline(root));
      setCopiedMd(true);
      window.setTimeout(() => setCopiedMd(false), 1600);
    } catch { /* ignore */ }
  };

  const copySnippet = async () => {
    if (!selectedNode.code) return;
    try {
      await navigator.clipboard.writeText(selectedNode.code);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 1400);
    } catch { /* ignore */ }
  };

  return (
    <div className="cdx-mindmap-shell">
      <div className="cdx-mm-toolbar">
        <div className="cdx-mm-branches" role="tablist" aria-label="源码分支">
          <button
            type="button"
            className={`cdx-branch-pill ${selectedNode.id === root.id ? 'cdx-branch-pill--active' : ''}`}
            onClick={() => selectAndFocus(root.id)}
          >
            全景总图
          </button>
          {branches.map((br, idx) => {
            const isActive = activePathSet.has(br.id);
            return (
              <button
                key={br.id}
                type="button"
                className={`cdx-branch-pill cdx-branch-pill--${br.tone} ${isActive ? 'cdx-branch-pill--active' : ''}`}
                onClick={() => selectAndFocus(br.id)}
              >
                <span className="mono">0{idx + 1}</span>
                <span>{br.label.replace(/^\d+\s*·\s*/, '')}</span>
              </button>
            );
          })}
        </div>

        <div className="cdx-mm-actions">
          <label className="cdx-mm-search">
            <Search size={13} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} aria-label="清空搜索">
                <X size={12} />
              </button>
            )}
          </label>

          <button type="button" className="cdx-tool-btn" onClick={() => zoomCenter(1 / 1.18)} title="缩小">
            <Minus size={13} />
          </button>
          <span className="cdx-zoom-readout mono">{Math.round(view.scale * 100)}%</span>
          <button type="button" className="cdx-tool-btn" onClick={() => zoomCenter(1.18)} title="放大">
            <Plus size={13} />
          </button>
          <button type="button" className="cdx-tool-btn" onClick={() => fitView(true)} title="适配全景">
            <Maximize2 size={13} /> 全景
          </button>
          <button type="button" className="cdx-tool-btn" onClick={() => void copyMarkdown()} title="复制 Markdown 大纲">
            {copiedMd ? <Check size={13} /> : <Copy size={13} />}
            {copiedMd ? '已复制' : '大纲'}
          </button>
        </div>
      </div>

      <div
        className="cdx-mm-workspace"
        style={{ ['--cdx-insp-w' as string]: `${inspectorWidth}px` }}
      >
        <div
          ref={canvasRef}
          className="cdx-mm-canvas"
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <svg className="cdx-mm-svg">
            <g
              className={isAnimating ? 'cdx-mm-camera--smooth' : undefined}
              transform={`translate(${view.tx}, ${view.ty}) scale(${view.scale})`}
            >
              {edges.map((e) => {
                const x1 = e.from.x + e.from.w;
                const y1 = e.from.y + e.from.h / 2;
                const x2 = e.to.x;
                const y2 = e.to.y + e.to.h / 2;
                const mx = (x1 + x2) / 2;
                const onPath = activePathSet.has(e.from.data.id) && activePathSet.has(e.to.data.id);
                const inFocus = focusedRegionSet.has(e.from.data.id) && focusedRegionSet.has(e.to.data.id);
                const color = TONE_COLOR[e.to.data.tone];
                return (
                  <path
                    key={`${e.from.data.id}-${e.to.data.id}`}
                    d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                    fill="none"
                    stroke={color}
                    strokeWidth={onPath ? 2.6 : inFocus ? 2 : 1.4}
                    strokeOpacity={onPath ? 0.96 : inFocus ? 0.72 : selectedNode.id === root.id ? 0.52 : 0.16}
                  />
                );
              })}

              {nodes.map((n) => {
                const isSel = n.data.id === selectedNode.id;
                const isOnPath = activePathSet.has(n.data.id);
                const isInFocus = focusedRegionSet.has(n.data.id);
                const isMatch = q ? matchesQuery(n.data, q) : true;
                const hasKids = Boolean(n.data.children && n.data.children.length > 0);
                const isCol = collapsed.has(n.data.id);
                const color = TONE_COLOR[n.data.tone];
                const nodeOpacity = q
                  ? (isMatch ? 1 : 0.18)
                  : selectedNode.id === root.id
                    ? 1
                    : (isInFocus ? 1 : 0.34);

                return (
                  <g
                    key={n.data.id}
                    className={`cdx-mm-node ${isSel ? 'cdx-mm-node--selected' : ''}`}
                    transform={`translate(${n.x}, ${n.y})`}
                    opacity={nodeOpacity}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      selectAndFocus(n.data.id);
                    }}
                  >
                    <rect
                      className={`cdx-mm-box ${isSel ? 'cdx-mm-box--selected' : ''}`}
                      width={n.w}
                      height={n.h}
                      rx={n.depth === 0 ? 13 : 10}
                      style={{
                        stroke: isSel || isOnPath || n.depth === 0 ? color : undefined,
                        strokeWidth: isSel ? 2.6 : isOnPath ? 1.8 : 1.15,
                      }}
                    />
                    <rect x={0} y={0} width={4} height={n.h} rx={2} fill={color} />
                    <text
                      x={15}
                      y={n.data.sub ? (n.depth === 0 ? 25 : 22) : n.h / 2 + 4.5}
                      fontSize={n.titleSize}
                      fontWeight={n.depth === 0 ? 800 : 700}
                      className="cdx-mm-title"
                    >
                      {n.data.label}
                    </text>
                    {n.data.sub && (
                      <text x={15} y={n.depth === 0 ? 45 : 40} fontSize={10.5} className="cdx-mm-sub mono">
                        {n.data.sub}
                      </text>
                    )}

                    {hasKids && (
                      <g
                        className="cdx-mm-toggle"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          toggleCollapse(n.data.id);
                        }}
                      >
                        <circle
                          cx={n.w + 1}
                          cy={n.h / 2}
                          r={9.5}
                          fill={isCol ? color : 'var(--card)'}
                          stroke={color}
                          strokeWidth={1.6}
                        />
                        <text
                          x={n.w + 1}
                          y={n.h / 2 + 3.5}
                          textAnchor="middle"
                          fontSize={10.5}
                          fontWeight={700}
                          fill={isCol ? '#0b0d14' : color}
                        >
                          {isCol ? n.data.children!.length : '−'}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        <div
          className="cdx-mm-splitter"
          role="separator"
          aria-orientation="vertical"
          aria-label="拖动调整右侧源码面板宽度"
          title="拖动调整面板宽度"
          onPointerDown={handleSplitterDown}
          onPointerMove={handleSplitterMove}
          onPointerUp={handleSplitterUp}
          onPointerCancel={handleSplitterUp}
        />

        <aside className="cdx-mm-inspector" aria-label="源码节点解读">
          <div className="cdx-mm-insp-head">
            <span className="cdx-mm-insp-badge mono" style={{ color: TONE_COLOR[selectedNode.tone], borderColor: TONE_COLOR[selectedNode.tone] }}>
              {selectedNode.badge}
            </span>
            {fileHref && (
              <a
                className="cdx-mm-gh-link mono"
                href={fileHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub <ExternalLink size={11} />
              </a>
            )}
          </div>

          <div className="cdx-mm-insp-body">
            <h2 className="cdx-mm-insp-title">{selectedNode.label}</h2>
            <p className="cdx-mm-insp-summary">{selectedNode.summary}</p>

            {selectedNode.points && selectedNode.points.length > 0 && (
              <div className="cdx-mm-section">
                <ul className="cdx-mm-points">
                  {selectedNode.points.map((pt, i) => (
                    <li key={i}>
                      <span className="cdx-mm-bullet" style={{ color: TONE_COLOR[selectedNode.tone] }}>▸</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selectedNode.code && (
              <div className="cdx-mm-section">
                <div className="cdx-mm-code-head">
                  <span className="cdx-mm-code-file mono">
                    <FileCode2 size={12} />
                    <span>{selectedNode.file ?? 'source'}</span>
                  </span>
                  <div className="cdx-mm-code-actions">
                    <button
                      type="button"
                      className={`cdx-mm-copy-btn ${wrapCode ? 'cdx-mm-copy-btn--active' : ''}`}
                      onClick={() => setWrapCode((v) => !v)}
                      title={wrapCode ? '切换为不换行' : '切换为自动换行'}
                    >
                      <WrapText size={12} /> {wrapCode ? '换行' : '展开'}
                    </button>
                    <button
                      type="button"
                      className="cdx-mm-copy-btn"
                      onClick={() => setCodeExpanded(true)}
                      title="放大阅读完整源码"
                    >
                      <Expand size={12} /> 放大
                    </button>
                    <button type="button" className="cdx-mm-copy-btn" onClick={() => void copySnippet()}>
                      {copiedCode ? <Check size={12} /> : <Copy size={12} />}
                      {copiedCode ? '已复制' : '复制'}
                    </button>
                  </div>
                </div>
                <pre className={`code-block cdx-mm-code ${wrapCode ? 'cdx-mm-code--wrap' : ''}`}>
                  {codeLines.map((line, i) => (
                    <div key={i} className="code-line">
                      <span className="code-ln">{i + 1}</span>
                      <span className="code-text">{highlightLine(line, codeLang)}</span>
                    </div>
                  ))}
                </pre>
              </div>
            )}

            {selectedNode.children && selectedNode.children.length > 0 && (
              <div className="cdx-mm-section">
                <div className="cdx-mm-child-grid">
                  {selectedNode.children.map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      className="cdx-mm-child-btn"
                      onClick={() => selectAndFocus(child.id)}
                    >
                      <span>{child.label}</span>
                      <ArrowRight size={12} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="cdx-mm-insp-foot">
            <button
              type="button"
              className="cdx-primary-cta"
              onClick={() => onJumpToLesson(selectedNode.lessonSlug, selectedNode.stepNumber ?? 1)}
            >
              <BookOpen size={14} /> 精读本节源码课 <ArrowRight size={14} />
            </button>
            {secondaryAction && (
              <button type="button" className="cdx-secondary-cta" onClick={secondaryAction.onClick}>
                <FlaskConical size={14} /> {secondaryAction.label}
              </button>
            )}
          </div>
        </aside>
      </div>

      {codeExpanded && selectedNode.code && (
        <div
          className="cdx-code-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedNode.label} 完整源码`}
          onClick={(e) => { if (e.target === e.currentTarget) setCodeExpanded(false); }}
        >
          <div className="cdx-code-modal">
            <div className="cdx-code-modal-head">
              <div className="cdx-code-modal-title-wrap">
                <span className="cdx-mm-insp-badge mono" style={{ color: TONE_COLOR[selectedNode.tone], borderColor: TONE_COLOR[selectedNode.tone] }}>
                  {selectedNode.badge}
                </span>
                <strong>{selectedNode.label}</strong>
                {selectedNode.file && <span className="cdx-code-modal-path mono">{selectedNode.file}</span>}
              </div>
              <div className="cdx-mm-code-actions">
                <button type="button" className="cdx-mm-copy-btn" onClick={() => void copySnippet()}>
                  {copiedCode ? <Check size={12} /> : <Copy size={12} />}
                  {copiedCode ? '已复制' : '复制源码'}
                </button>
                <button type="button" className="cdx-mm-copy-btn" onClick={() => setCodeExpanded(false)} aria-label="关闭源码弹窗">
                  <X size={14} />
                </button>
              </div>
            </div>
            <pre className="code-block cdx-code-modal-pre">
              {codeLines.map((line, i) => (
                <div key={i} className="code-line">
                  <span className="code-ln">{i + 1}</span>
                  <span className="code-text">{highlightLine(line, codeLang)}</span>
                </div>
              ))}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
