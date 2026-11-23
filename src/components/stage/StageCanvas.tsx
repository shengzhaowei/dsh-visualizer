import { useEffect, useRef } from 'react';
import type { StageScene } from '../../types/lesson';
import { IsoFlowSvg } from './IsoFlowSvg';
import { SwimlaneSvg } from './SwimlaneSvg';
import { TreeSvg } from './TreeSvg';

export interface ViewState {
  zoom: number;
  pan: { x: number; y: number };
}

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 2.2;

interface StageCanvasProps {
  scene: StageScene;
  isPlaying: boolean;
  view: ViewState;
  onViewChange: (next: ViewState) => void;
  onResetView: () => void;
}

/** 舞台画布：滚轮缩放（限定在画布区域内）、拖拽平移、双击复位；播放时驱动 SMIL 动画。 */
export function StageCanvas({ scene, isPlaying, view, onViewChange, onResetView }: StageCanvasProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  // SMIL 动画：播放/暂停跟随 isPlaying。
  useEffect(() => {
    const root = viewportRef.current;
    if (!root) return;
    const svgs = Array.from(root.querySelectorAll('svg')) as unknown as SVGSVGElement[];
    for (const svg of svgs) {
      try {
        if (isPlaying) svg.unpauseAnimations();
        else svg.pauseAnimations();
      } catch {
        // 旧浏览器不支持 SMIL 控制时忽略
      }
    }
  }, [isPlaying, scene]);

  // 滚轮缩放：非被动监听，避免页面滚动；以指针为锚点。
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;
      const factor = Math.exp(-e.deltaY * 0.0012);
      const nextZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, view.zoom * factor));
      const scale = nextZoom / view.zoom;
      onViewChange({
        zoom: nextZoom,
        pan: { x: cx - (cx - view.pan.x) * scale, y: cy - (cy - view.pan.y) * scale },
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [view, onViewChange]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    dragRef.current = { x: e.clientX, y: e.clientY, panX: view.pan.x, panY: view.pan.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    onViewChange({
      zoom: view.zoom,
      pan: { x: drag.panX + (e.clientX - drag.x), y: drag.panY + (e.clientY - drag.y) },
    });
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
        style={{ transform: `translate(${view.pan.x}px, ${view.pan.y}px) scale(${view.zoom})` }}
      >
        {scene.kind === 'iso-flow' ? (
          <IsoFlowSvg scene={scene} active={isPlaying} />
        ) : scene.kind === 'swimlane' ? (
          <SwimlaneSvg scene={scene} />
        ) : (
          <div className="stage-tree-wrap">
            <TreeSvg scene={scene} />
            {scene.filePreview && (
              <div className="stage-terminal" aria-label="会话日志文件预览">
                <div className="stage-terminal-head">
                  <span className="stage-terminal-dots" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="stage-terminal-title">{scene.filePreview.title}</span>
                  <span className="stage-terminal-badge">APPEND-ONLY</span>
                </div>
                <div className="stage-terminal-body">
                  {scene.filePreview.lines.map((line, i) => (
                    <div key={i} className={`stage-terminal-line ${line.highlight ? 'stage-terminal-line--highlight' : ''} ${line.muted ? 'stage-terminal-line--muted' : ''}`}>
                      <span className="stage-terminal-ln">{i + 1}</span>
                      <span className="stage-terminal-text">{line.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
