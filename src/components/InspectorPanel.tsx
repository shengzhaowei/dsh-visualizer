import { useState } from 'react';
import { ArrowRight, Check, CheckCircle2, ChevronDown, Circle, Copy, ExternalLink, FileCode2, Lightbulb, ListChecks, TriangleAlert } from 'lucide-react';
import type { Lesson, LessonStep } from '../types/lesson';
import { renderInline } from '../utils/inlineCode';

interface InspectorPanelProps {
  lesson: Lesson;
  step: LessonStep;
  stepIndex: number;
  totalSteps: number;
  nextLesson?: Lesson;
  canPrev: boolean;
  canNext: boolean;
  onPrevStep: () => void;
  onNextStep: () => void;
  onSelectLesson: (slug: string) => void;
  onOpenCheatsheet: () => void;
}

const CALLOUT_STROKE: Record<string, string> = {
  idea: 'var(--violet-stroke)',
  tip: 'var(--green-stroke)',
  warn: 'var(--rose-stroke)',
};

export function InspectorPanel({ lesson, step, stepIndex, totalSteps, nextLesson, canPrev, canNext, onPrevStep, onNextStep, onSelectLesson, onOpenCheatsheet }: InspectorPanelProps) {
  const doneObjectives = lesson.objectives.filter((o) => stepIndex + 1 >= o.completedAtStep);
  const [objectivesOpen, setObjectivesOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    if (!step.sourceDrawer) return;
    try {
      await navigator.clipboard.writeText(step.sourceDrawer.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // 剪贴板不可用时静默失败
    }
  };

  const codeLines = step.sourceDrawer ? step.sourceDrawer.code.replace(/\n$/, '').split('\n') : [];

  return (
    <aside className="inspector" aria-label="步骤解读">
      <div key={`${lesson.slug}-${stepIndex}`} className="inspector-anim">
        <div className="inspector-progress" aria-label={`步骤进度 ${stepIndex + 1} / ${totalSteps}`}>
          {lesson.steps.map((_, i) => (
            <span
              key={i}
              className={`inspector-progress-seg ${i < stepIndex ? 'inspector-progress-seg--done' : i === stepIndex ? 'inspector-progress-seg--current' : ''}`}
            />
          ))}
        </div>
        <div className="inspector-step-head">
          <span className={`step-badge step-badge--${step.badge}`}>{step.badge}</span>
          <span className="inspector-step-count mono">
            STEP {step.stepNumber} / {totalSteps}
          </span>
        </div>
        <h2 className="inspector-step-title">{step.title}</h2>

        <div className="inspector-body">
          {step.paragraphs.map((p, i) => (
            <p key={i}>{renderInline(p, `p-${i}`)}</p>
          ))}
        </div>

        {step.callout && (
          <div className={`callout callout--${step.callout.kind}`} style={{ borderLeftColor: CALLOUT_STROKE[step.callout.kind] }}>
            <div className="callout-title">
              {step.callout.kind === 'warn' ? <TriangleAlert size={14} /> : <Lightbulb size={14} />}
              {step.callout.title ?? (step.callout.kind === 'warn' ? '注意' : '要点')}
            </div>
            <div>{renderInline(step.callout.text, 'callout')}</div>
          </div>
        )}

        <div className="kpi-grid">
          {step.kpis.map((k) => (
            <div key={k.label} className="kpi-card">
              <div className="kpi-label">{k.label}</div>
              <div className={`kpi-value ${k.status ? `kpi-value--${k.status}` : ''}`}>{k.value}</div>
            </div>
          ))}
        </div>

        <div className="objectives">
          <button type="button" className="objectives-head" onClick={() => setObjectivesOpen((o) => !o)} aria-expanded={objectivesOpen}>
            <span className="objectives-head-title">
              <ListChecks size={13} />
              本课收获（{doneObjectives.length} / {lesson.objectives.length} 已达成）
            </span>
            <ChevronDown size={14} className={`objectives-chevron ${objectivesOpen ? 'objectives-chevron--open' : ''}`} />
          </button>
          {objectivesOpen && (
            <ul className="objectives-list">
              {lesson.objectives.map((o) => {
                const done = stepIndex + 1 >= o.completedAtStep;
                return (
                  <li key={o.id} className={done ? 'done' : ''}>
                    <span className={`obj-check ${done ? '' : 'obj-check--pending'}`}>
                      {done ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                    </span>
                    <span className="obj-text">{o.text}</span>
                    <span className="obj-step">第 {o.completedAtStep} 步</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {step.sourceDrawer && (
          <div className="source-drawer">
            <div className="source-drawer-head">
              <span className="source-drawer-title">
                <FileCode2 size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
                {step.sourceDrawer.title}
              </span>
              <span className="source-drawer-actions">
                <span className="source-line-count mono">{codeLines.length} 行</span>
                <button type="button" className="source-copy-btn" onClick={copyCode} aria-label="复制代码">
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? '已复制' : '复制'}
                </button>
                <a className="source-link" href={step.sourceDrawer.githubUrl} target="_blank" rel="noopener noreferrer">
                  GitHub <ExternalLink size={11} />
                </a>
              </span>
            </div>
            <div className="source-drawer-path mono">{step.sourceDrawer.filePath}</div>
            <pre className="code-block">
              {codeLines.map((line, i) => (
                <div key={i} className="code-line">
                  <span className="code-ln">{i + 1}</span>
                  <span className="code-text">{line || ' '}</span>
                </div>
              ))}
            </pre>
            {step.sourceDrawer.caption && <div className="source-drawer-caption">{step.sourceDrawer.caption}</div>}
          </div>
        )}

        {step.recapTable && (
          <div className="recap">
            <div className="recap-head">复盘：问题 / 决策 / 原因</div>
            {step.recapTable.map((r, i) => (
              <div key={i} className="recap-row">
                <div className="recap-q">
                  <span className="recap-q-label">Q:</span>
                  {r.question}
                </div>
                <div className="recap-a">
                  <ArrowRight size={14} className="recap-arrow" />
                  <span className="recap-decision">{renderInline(r.decision, `recap-d-${i}`)}</span>
                </div>
                <div className="recap-why">{renderInline(r.because, `recap-b-${i}`)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="inspector-nav">
        <button type="button" className="tactile-btn" onClick={onPrevStep} disabled={!canPrev}>
          ← 上一步
        </button>
        <button type="button" className="tactile-btn tactile-btn--primary" onClick={onNextStep} disabled={!canNext}>
          下一步 →
        </button>
      </div>

      {nextLesson && stepIndex === totalSteps - 1 && (
        <div className="next-lesson-card">
          <div className="next-lesson-eyebrow">下一课预告</div>
          <div className="next-lesson-title">{nextLesson.title}</div>
          <div className="next-lesson-sub">{nextLesson.subtitle}</div>
          <button type="button" className="tactile-btn tactile-btn--primary next-lesson-btn" onClick={() => onSelectLesson(nextLesson.slug)}>
            继续：{nextLesson.title} <ArrowRight size={13} style={{ verticalAlign: -2 }} />
          </button>
        </div>
      )}

      <div className="inspector-links">
        <button type="button" className="tactile-btn" onClick={onOpenCheatsheet}>
          打开架构速查表
        </button>
      </div>
    </aside>
  );
}
