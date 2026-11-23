import { useEffect, useMemo, useRef, useState } from 'react';
import type { StageScene } from '../../types/lesson';
import { IsoFlowSvg, isoSceneBBox } from './IsoFlowSvg';
import { SwimlaneSvg, swimlaneHeight } from './SwimlaneSvg';
import { TreeSvg, treeSceneBBox } from './TreeSvg';

export interface ViewState {
  /** 相对缩放：1 = 适配画布（fit-to-view），100% 即恰好放下整个场景 */
  zoom: number;
  pan: { x: number; y: number };
}

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 2.2;

interface StageCanvasProps {
  scene: StageScene;
  view: ViewState;
  onViewChange: (next: ViewState) => void;
  onResetView: () => void;
}

interface Fit {
  scale: number;
  tx: number;
  ty: number;
}

function sceneBounds(scene: StageScene): { x: number; y: number; w: number; h: number } {
  if (scene.kind === 'iso-flow') return isoSceneBBox(scene);
  if (scene.kind === 'swimlane') return { x: 0, y: 0, w: 1000, h: swimlaneHeight(scene) };
  return treeSceneBBox(scene);
}

function sceneHeight(scene: StageScene): number {
  return scene.kind === 'swimlane' ? swimlaneHeight(scene) : 560;
}

/** 舞台画布：每次换课/换步都按场景包围盒适配（fit-to-view），缩放状态不跨步残留；
 *  滚轮缩放（限定在画布区域内，以指针为锚点）、拖拽平移、双击复位；数据包 SMIL 动画常驻流动，不跟随播放状态。 */
export function StageCanvas({ scene, view, onViewChange, onResetView }: StageCanvasProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [vp, setVp] = useState({ w: 0, h: 0 });
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;
  const onViewChangeRef = useRef(onViewChange);
  onViewChangeRef.current = onViewChange;
  const vpRef = useRef(vp);
  vpRef.current = vp;

  // 视口尺寸：ResizeObserver 跟踪。
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setVp((prev) => (prev.w === r.width && prev.h === r.height ? prev : { w: r.width, h: r.height }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // fit-to-view：按场景包围盒算缩放并居中。
  const fit: Fit = useMemo(() => {
    if (vp.w <= 0 || vp.h <= 0) return { scale: 1, tx: 0, ty: 0 };
    const b = sceneBounds(scene);
    const scale = Math.max(0.2, Math.min(2, Math.min(vp.w / b.w, vp.h / b.h) * 0.96));
    const tx = (vp.w - b.w * scale) / 2 - b.x * scale;
    const ty = (vp.h - b.h * scale) / 2 - b.y * scale;
    return { scale, tx, ty };
  }, [scene, vp]);
  const fitRef = useRef(fit);
  fitRef.current = fit;

  // 滚轮缩放：非被动监听，避免页面滚动；以指针为锚点（用 ref 避免反复重订阅）。
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const clampPan = (pan: { x: number; y: number }) => {
      const { w, h } = vpRef.current;
      return { x: Math.max(-w, Math.min(w, pan.x)), y: Math.max(-h, Math.min(h, pan.y)) };
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const f = fitRef.current;
      const v = viewRef.current;
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const factor = Math.exp(-e.deltaY * 0.0012);
      const nextZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, v.zoom * factor));
      const s0 = f.scale * v.zoom;
      const s1 = f.scale * nextZoom;
      // 光标下的内容点保持不动：pan' = cursor - fit - content * s1
      const pan = {
        x: px - f.tx - ((px - f.tx - v.pan.x) / s0) * s1,
        y: py - f.ty - ((py - f.ty - v.pan.y) / s0) * s1,
      };
      onViewChangeRef.current({ zoom: nextZoom, pan: clampPan(pan) });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    dragRef.current = { x: e.clientX, y: e.clientY, panX: viewRef.current.pan.x, panY: viewRef.current.pan.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const { w, h } = vpRef.current;
    const pan = {
      x: Math.max(-w, Math.min(w, drag.panX + (e.clientX - drag.x))),
      y: Math.max(-h, Math.min(h, drag.panY + (e.clientY - drag.y))),
    };
    onViewChangeRef.current({ zoom: viewRef.current.zoom, pan });
  };
  const endDrag = () => {
    dragRef.current = null;
  };

  return (
    <div
      ref={viewportRef}
      className="stage-viewport"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={onResetView}
      role="region"
      aria-label="架构图画布：滚轮缩放，拖拽平移，双击重置视图"
    >
      <div
        className="stage-zoom-layer"
        style={{
          width: 1000,
          height: sceneHeight(scene),
          transform: `translate(${fit.tx + view.pan.x}px, ${fit.ty + view.pan.y}px) scale(${fit.scale * view.zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {scene.kind === 'iso-flow' ? (
          <IsoFlowSvg scene={scene} />
        ) : scene.kind === 'swimlane' ? (
          <SwimlaneSvg scene={scene} />
        ) : (
          <TreeSvg scene={scene} />
        )}
      </div>
    </div>
  );
}
