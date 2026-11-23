import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react';
import type { ChapterColor, Lesson, LessonStep } from '../types/lesson';
import { StageCanvas } from './stage/StageCanvas';

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

export function StagePanel({ lesson, step, stepIndex, totalSteps, chapterColor, isPlaying, replayKey, canPrev, canNext, onTogglePlay, onReplay, onSelectStep, onPrevStep, onNextStep }: StagePanelProps) {
  // Auto-advance while playing: one step every 6s, stop at the last step.
  useEffect(() => {
    if (!isPlaying) return;
    if (stepIndex >= totalSteps - 1) return;
    const timer = window.setTimeout(() => onNextStep(), 6000);
    return () => window.clearTimeout(timer);
  }, [isPlaying, stepIndex, totalSteps, onNextStep, replayKey]);

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

      <div className="stage-canvas-wrap" key={`${lesson.slug}-${stepIndex}-${replayKey}`}>
        <div className="stage-canvas-title">
          <span>{step.scene.title ?? step.title}</span>
          <span>{SCENE_KIND_LABEL[step.scene.kind] ?? ''}</span>
        </div>
        <StageCanvas scene={step.scene} isPlaying={isPlaying} />
      </div>

      <div className="stage-rail" role="tablist" aria-label="步骤导航">
        {lesson.steps.map((s, i) => (
          <button
            key={s.stepNumber}
            type="button"
            role="tab"
            aria-selected={i === stepIndex}
            className={`stage-rail-btn ${i === stepIndex ? 'stage-rail-btn--active' : ''}`}
            onClick={() => onSelectStep(i)}
          >
            <span className="stage-rail-num">STEP {s.stepNumber} · {s.badge}</span>
            <span className="stage-rail-label">{s.shortLabel}</span>
          </button>
        ))}
      </div>

      <div className="stage-transport">
        <button type="button" className="tactile-btn" onClick={onTogglePlay} aria-label={isPlaying ? '暂停自动播放' : '开始自动播放'}>
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          {isPlaying ? '暂停' : '播放'}
        </button>
        <button type="button" className="tactile-btn" onClick={onReplay} aria-label="重播本课">
          <RotateCcw size={14} /> 重播
        </button>
        <button type="button" className="tactile-btn" onClick={onPrevStep} disabled={!canPrev}>
          <ChevronLeft size={14} /> 上一步
        </button>
        <button type="button" className="tactile-btn tactile-btn--primary" onClick={onNextStep} disabled={!canNext}>
          下一步 <ChevronRight size={14} />
        </button>
        <span className="stage-progress-text">
          {stepIndex + 1} / {totalSteps} · ← → 切换步骤 · 空格播放/暂停 · R 重播
        </span>
      </div>
      <div className="stage-hint">提示：每一步的图都由本课数据驱动；右侧面板有原文段落、指标与源码抽屉。</div>
    </section>
  );
}
