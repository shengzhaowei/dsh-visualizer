import { useEffect, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, FlaskConical, Minus, Pause, Play, Plus, RotateCcw } from 'lucide-react';
import type { ChapterColor, Lesson, LessonStep, StageScene } from '../types/lesson';
import { InteractiveLab, hasInteractiveLab, type LabKind } from './InteractiveLab';
import { StageCanvas, type ViewState } from './stage/StageCanvas';

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

export function StagePanel({ lesson, step, stepIndex, totalSteps, isPlaying, replayKey, canPrev, canNext, onTogglePlay, onReplay, onSelectStep, onPrevStep, onNextStep }: StagePanelProps) {
  const [view, setView] = useState<ViewState>({ zoom: 1, pan: { x: 0, y: 0 } });
  const [labMode, setLabMode] = useState(false);
  const labSupported = hasInteractiveLab(lesson.slug);

  // 换课 / 换步都复位视图；换课时退出实验台。
  useEffect(() => {
    setView({ zoom: 1, pan: { x: 0, y: 0 } });
  }, [lesson.slug, stepIndex]);

  useEffect(() => {
    setLabMode(false);
  }, [lesson.slug]);

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
  const isRecap = step.badge === 'RECAP';
  const prevScene = stepIndex > 0 ? lesson.steps[stepIndex - 1]?.scene : undefined;
  const recapKeys = prevScene ? keyNodeLabels(prevScene) : keyNodeLabels(step.scene);
  const chapterNum = String(lesson.chapterNumber).padStart(2, '0');

  return (
    <section className="stage-panel" aria-label="可视化舞台">
      <div className="stage-head">
        <h1 className="stage-title">{lesson.title}</h1>
        <div className="stage-head-right">
          {labSupported && (
            <div className="stage-lab-switch" role="tablist" aria-label="舞台模式">
              <button
                type="button"
                role="tab"
                aria-selected={!labMode}
                className={`stage-lab-btn ${!labMode ? 'stage-lab-btn--active' : ''}`}
                onClick={() => setLabMode(false)}
              >
                图解
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={labMode}
                className={`stage-lab-btn ${labMode ? 'stage-lab-btn--active' : ''}`}
                onClick={() => setLabMode(true)}
              >
                <FlaskConical size={12} /> 实验台
              </button>
            </div>
          )}
          <div className="stage-chapter-crumb">
            <span className="stage-chapter-badge mono">{chapterNum}</span>
            <span className="stage-chapter-meta">
              <span className="stage-chapter-title">{lesson.chapterTitle}</span>
              <span className="stage-lesson-idx mono">LESSON {lesson.lessonIndexInChapter}</span>
            </span>
          </div>
        </div>
      </div>

      {labSupported && labMode ? (
        <div className="stage-canvas-wrap stage-canvas-wrap--lab">
          <div className="stage-lab-wrap">
            <InteractiveLab kind={lesson.slug as LabKind} />
          </div>
        </div>
      ) : isRecap ? (
        <div className="stage-recap-overview" aria-label="本课总览">
          <div className="stage-recap-card">
            <ol className="stage-recap-steps">
              {lesson.steps.map((s, i) => (
                <li
                  key={s.stepNumber}
                  className={i === stepIndex ? 'stage-recap-step--current' : ''}
                  onClick={() => onSelectStep(i)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectStep(i)}
                >
                  <span className="stage-recap-num">{i < stepIndex ? <Check size={12} /> : s.stepNumber}</span>
                  <span className="stage-recap-label">{s.shortLabel}</span>
                  <span className="stage-recap-step-title">{s.title}</span>
                </li>
              ))}
            </ol>
            {recapKeys.length > 0 && (
              <div className="stage-recap-keys">
                {recapKeys.map((k) => (
                  <span key={k} className="stage-recap-key mono">{k}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="stage-canvas-wrap" key={`${lesson.slug}-${stepIndex}-${replayKey}`}>
          {isPlaying && stepIndex < totalSteps - 1 && (
            <div className="stage-autoplay-track" aria-hidden="true">
              <div className="stage-autoplay-bar" />
            </div>
          )}
          <div className="stage-floating-tools" role="toolbar" aria-label="画布控制">
            <button type="button" className="stage-ctrl-btn" onClick={onReplay} aria-label="重播" title="重播 (R)">
              <RotateCcw size={13} />
            </button>
            <button
              type="button"
              className={`stage-ctrl-btn ${isPlaying ? 'stage-ctrl-btn--playing' : ''}`}
              onClick={onTogglePlay}
              aria-label={isPlaying ? '暂停' : '自动翻步'}
              title={isPlaying ? '暂停 (Space)' : '自动翻步 (Space)'}
            >
              {isPlaying ? <Pause size={13} /> : <Play size={13} />}
            </button>
            <span className="stage-toolbar-sep" />
            <button type="button" className="stage-ctrl-btn" onClick={() => zoomBy(1 / 1.25)} aria-label="缩小" title="缩小">
              <Minus size={13} />
            </button>
            <button type="button" className="stage-ctrl-btn stage-ctrl-zoom" onClick={resetView} aria-label="复位缩放" title="复位缩放">
              {Math.round(view.zoom * 100)}%
            </button>
            <button type="button" className="stage-ctrl-btn" onClick={() => zoomBy(1.25)} aria-label="放大" title="放大">
              <Plus size={13} />
            </button>
          </div>
          <StageCanvas scene={step.scene} view={view} onViewChange={setView} onResetView={resetView} />
        </div>
      )}

      <div className="stage-timeline-card">
        <div className="timeline-header">
          <span className="timeline-heading">本课步骤</span>
          <span className="timeline-header-right">
            <span className="timeline-kbd-hint">
              <span className="kbd">←</span>
              <span className="kbd">→</span>
            </span>
            <span className="timeline-step-counter mono">{stepIndex + 1} / {totalSteps}</span>
          </span>
        </div>
        <div className="timeline-row">
          <button type="button" className="timeline-nudge-btn" onClick={onPrevStep} disabled={!canPrev} aria-label="上一步">
            <ChevronLeft size={14} />
          </button>
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
          <button type="button" className="timeline-nudge-btn" onClick={onNextStep} disabled={!canNext} aria-label="下一步">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </section>
  );
}
