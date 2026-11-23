import { useEffect, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Minus, Pause, Play, Plus, RotateCcw } from 'lucide-react';
import type { ChapterColor, Lesson, LessonStep, StageScene } from '../types/lesson';
import { StageCanvas, type ViewState } from './stage/StageCanvas';
import { KIND_LABEL, KIND_STROKE, TONE_LABEL, TONE_STROKE } from './stage/tones';

interface StagePanelProps {
  lesson: Lesson;
  step: LessonStep;
  stepIndex: number;
  totalSteps: number;
  chapterColor: ChapterColor;
  isPlaying: boolean;
  replayKey: number;
  canPrev: boolean;
  canNext: boolean;
  onTogglePlay: () => void;
  onReplay: () => void;
  onSelectStep: (stepIndex: number) => void;
  onPrevStep: () => void;
  onNextStep: () => void;
}

const SCENE_KIND_LABEL: Record<string, string> = {
  'iso-flow': '等距架构图',
  swimlane: '泳道时序图',
  tree: '树形图',
};

interface LegendItem {
  color: string;
  label: string;
  dashed?: 'dash' | 'dot';
}

/** 从 scene 数据派生图例（节点语义色 / 泳道 / 树节点角色 + 边的线型）。 */
function legendForScene(scene: StageScene): LegendItem[] {
  const out: LegendItem[] = [];
  const push = (color: string, label: string, dashed?: 'dash' | 'dot') => {
    if (!out.some((o) => o.label === label)) out.push({ color, label, dashed });
  };
  if (scene.kind === 'iso-flow') {
    for (const n of scene.nodes) push(n.tone === 'dark' ? 'var(--ink)' : TONE_STROKE[n.tone], TONE_LABEL[n.tone]);
    if (scene.edges.some((e) => e.dashed)) push('var(--orange-stroke)', '可选 / 依赖', 'dash');
    if (scene.edges.some((e) => e.dotted)) push('var(--green-stroke)', '可替换', 'dot');
  } else if (scene.kind === 'swimlane') {
    for (const lane of scene.lanes) push(TONE_STROKE[lane.tone ?? 'neutral'], lane.label);
  } else {
    for (const kind of [...new Set(scene.nodes.map((n) => n.kind))]) push(KIND_STROKE[kind], KIND_LABEL[kind]);
  }
  return out;
}

/** 从上一步场景提取关键节点标签（RECAP 总览用）。 */
function keyNodeLabels(scene: StageScene): string[] {
  if (scene.kind === 'iso-flow') {
    const active = scene.nodes.filter((n) => n.active).map((n) => n.label);
    const labels = active.length > 0 ? active : scene.nodes.map((n) => n.label);
    return labels.slice(0, 6);
  }
  if (scene.kind === 'swimlane') return scene.lanes.map((l) => l.label).slice(0, 6);
  return scene.nodes.map((n) => n.label).slice(0, 6);
}

export function StagePanel({ lesson, step, stepIndex, totalSteps, chapterColor, isPlaying, replayKey, canPrev, canNext, onTogglePlay, onReplay, onSelectStep, onPrevStep, onNextStep }: StagePanelProps) {
  const [view, setView] = useState<ViewState>({ zoom: 1, pan: { x: 0, y: 0 } });

  // 换课 / 换步都复位视图：fit-to-view 重新适配，缩放不跨步残留。
  useEffect(() => {
    setView({ zoom: 1, pan: { x: 0, y: 0 } });
  }, [lesson.slug, stepIndex]);

  // Auto-advance while playing: one step every 6s, stop at the last step.
  useEffect(() => {
    if (!isPlaying) return;
    if (stepIndex >= totalSteps - 1) return;
    const timer = window.setTimeout(() => onNextStep(), 6000);
    return () => window.clearTimeout(timer);
  }, [isPlaying, stepIndex, totalSteps, onNextStep, replayKey]);

  const resetView = () => setView({ zoom: 1, pan: { x: 0, y: 0 } });
  const zoomBy = (factor: number) =>
    setView((v) => ({ ...v, zoom: Math.max(0.5, Math.min(2.2, v.zoom * factor)) }));
  const legend = legendForScene(step.scene);
  const fig = `FIG.${lesson.chapterNumber}.${lesson.lessonIndexInChapter}-${step.stepNumber}`;
  const isRecap = step.badge === 'RECAP';
  const prevScene = stepIndex > 0 ? lesson.steps[stepIndex - 1]?.scene : undefined;
  const recapKeys = prevScene ? keyNodeLabels(prevScene) : keyNodeLabels(step.scene);

  return (
    <section className="stage-panel" aria-label="可视化舞台">
      <div className="stage-head">
        <div>
          <div className="stage-eyebrow">
            <span className={`ch-color--${chapterColor}`}>第 {lesson.chapterNumber} 章 · {lesson.chapterTitle}</span>
            {' · '}第 {lesson.lessonIndexInChapter} / {lesson.totalInChapter} 课
          </div>
          <h1 className="stage-title">{lesson.title}</h1>
          <div className="stage-subtitle">{lesson.subtitle}</div>
        </div>
        <div className="stage-head-right">
          <span className="stage-chip">{lesson.level}</span>
          <span className="stage-chip">{lesson.durationMin} 分钟</span>
          <span className="stage-chip">步骤 {stepIndex + 1} / {totalSteps}</span>
        </div>
      </div>

      {step.kpis.length > 0 && (
        <div className="stage-kpi-strip" aria-label="本步关键指标">
          {step.kpis.slice(0, 4).map((k) => (
            <div key={k.label} className="stage-kpi" title={`${k.label}：${k.value}`}>
              <span className="stage-kpi-label">{k.label}</span>
              <span key={`${lesson.slug}-${stepIndex}-${k.label}`} className="stage-kpi-value stage-kpi-flash">{k.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* 画布工具条：舞台上方独立行，永不遮挡图 */}
      {!isRecap && (
        <div className="stage-toolbar-row" role="toolbar" aria-label="画布工具">
          <div className="stage-toolbar">
            <button type="button" className="stage-ctrl-btn" onClick={onReplay} aria-label="重播本课" title="重播（R）">
              <RotateCcw size={14} />
              <span className="kbd">R</span>
            </button>
            <button type="button" className="stage-ctrl-btn" onClick={onTogglePlay} aria-label={isPlaying ? '暂停自动翻步' : '开始自动翻步'} title={isPlaying ? '暂停自动翻步（空格）' : '自动翻步（空格）'}>
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              <span className="kbd">Space</span>
            </button>
            <span className="stage-toolbar-sep" />
            <button type="button" className="stage-ctrl-btn" onClick={() => zoomBy(1 / 1.25)} aria-label="缩小" title="缩小">
              <Minus size={14} />
            </button>
            <button type="button" className="stage-ctrl-btn stage-ctrl-zoom" onClick={resetView} aria-label="复位缩放" title="点击复位到适配视图">
              {Math.round(view.zoom * 100)}%
            </button>
            <button type="button" className="stage-ctrl-btn" onClick={() => zoomBy(1.25)} aria-label="放大" title="放大">
              <Plus size={14} />
            </button>
          </div>
          <span className="stage-toolbar-hint">滚轮缩放，拖拽平移，双击重置视图 · 100% 为适配画布</span>
        </div>
      )}

      {isRecap ? (
        <div className="stage-recap-overview" aria-label="本课总览">
          <div className="stage-recap-card">
            <div className="stage-recap-eyebrow">本课总览 · LESSON RECAP</div>
            <div className="stage-recap-title">{lesson.title}</div>
            <div className="stage-recap-sub">{lesson.subtitle}</div>
            <ol className="stage-recap-steps">
              {lesson.steps.map((s, i) => (
                <li key={s.stepNumber} className={i === stepIndex ? 'stage-recap-step--current' : ''}>
                  <span className="stage-recap-num">{i < stepIndex ? <Check size={12} /> : s.stepNumber}</span>
                  <span className="stage-recap-label">{s.shortLabel}</span>
                  <span className="stage-recap-step-title">{s.title}</span>
                </li>
              ))}
            </ol>
            {recapKeys.length > 0 && (
              <div className="stage-recap-keys">
                <span className="stage-recap-keys-label">关键节点</span>
                {recapKeys.map((k) => (
                  <span key={k} className="stage-recap-key mono">{k}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="stage-canvas-wrap" key={`${lesson.slug}-${stepIndex}-${replayKey}`}>
          <div className="stage-canvas-title">
            <span>{step.scene.title ?? step.title}</span>
            <span>{SCENE_KIND_LABEL[step.scene.kind] ?? ''}</span>
          </div>
          <StageCanvas scene={step.scene} view={view} onViewChange={setView} onResetView={resetView} />
          <div className="stage-legend-row">
            <div className="stage-legend" aria-label="图例">
              {legend.map((item) => (
                <span key={item.label} className="stage-legend-item">
                  {item.dashed ? (
                    <span className={`stage-legend-dash ${item.dashed === 'dot' ? 'stage-legend-dash--dot' : ''}`} style={{ color: item.color }} />
                  ) : (
                    <span className="stage-legend-dot" style={{ backgroundColor: item.color }} />
                  )}
                  {item.label}
                </span>
              ))}
            </div>
            <span className="stage-blueprint-stamp">
              <span className="stage-blueprint-fig">{fig}</span>
              <span className="stage-blueprint-title">{step.scene.title ?? step.title}</span>
            </span>
          </div>
        </div>
      )}

      <div className="stage-timeline-card">
        <div className="timeline-header">
          <span className="timeline-heading">
            本课步骤
            <span className="timeline-heading-en">STEPS</span>
          </span>
          <span className="timeline-header-right">
            <span className="timeline-step-counter">步骤 {stepIndex + 1} / {totalSteps}</span>
            <button type="button" className="timeline-nudge-btn" onClick={onPrevStep} disabled={!canPrev} aria-label="上一步">
              <ChevronLeft size={14} />
              <span className="kbd">←</span>
            </button>
            <button type="button" className="timeline-nudge-btn" onClick={onNextStep} disabled={!canNext} aria-label="下一步">
              <ChevronRight size={14} />
              <span className="kbd">→</span>
            </button>
          </span>
        </div>
        <div className="timeline-track-scroll">
          <div className="timeline-track" role="tablist" aria-label="步骤时间线">
            {lesson.steps.map((s, i) => {
              const state = i < stepIndex ? 'done' : i === stepIndex ? 'active' : 'todo';
              return (
                <button
                  key={s.stepNumber}
                  type="button"
                  role="tab"
                  aria-selected={i === stepIndex}
                  className={`timeline-node timeline-node--${state}`}
                  onClick={() => onSelectStep(i)}
                  title={s.title}
                >
                  <span className="timeline-circle">{i < stepIndex ? '✓' : s.stepNumber}</span>
                  <span className="timeline-label">{s.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
