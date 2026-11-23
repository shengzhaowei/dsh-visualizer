import { ArrowRight, CheckCircle2, Circle, ExternalLink, FileCode2, Lightbulb, ListChecks, TriangleAlert } from 'lucide-react';
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

export function InspectorPanel({ lesson, step, stepIndex, totalSteps, nextLesson, canPrev, canNext, onPrevStep, onNextStep, onSelectLesson, onOpenCheatsheet }: InspectorPanelProps) {
  const doneObjectives = lesson.objectives.filter((o) => stepIndex + 1 >= o.completedAtStep);
  return (
    <aside className="inspector" aria-label="步骤解读">
      <div>
        <div className="inspector-step-head">
          <span className={`step-badge step-badge--${step.badge}`}>{step.badge}</span>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>
            STEP {step.stepNumber} / {totalSteps}
          </span>
        </div>
        <h2 className="inspector-step-title" style={{ marginTop: 8 }}>{step.title}</h2>
      </div>

      <div className="inspector-body">
        {step.paragraphs.map((p, i) => (
          <p key={i}>{renderInline(p, `p-${i}`)}</p>
        ))}
      </div>

      {step.callout && (
        <div className={`callout callout--${step.callout.kind}`}>
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

      <div>
        <h3 className="inspector-section-title">
          <ListChecks size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
          本课目标（{doneObjectives.length} / {lesson.objectives.length} 已达成）
        </h3>
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
      </div>

      {step.sourceDrawer && (
        <div className="source-drawer">
          <div className="source-drawer-head">
            <span className="source-drawer-title">
              <FileCode2 size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
              {step.sourceDrawer.title}
            </span>
            <a className="source-link" href={step.sourceDrawer.githubUrl} target="_blank" rel="noopener noreferrer">
              GitHub <ExternalLink size={11} />
            </a>
          </div>
          <div className="source-drawer-path">{step.sourceDrawer.filePath}</div>
          <pre>{step.sourceDrawer.code}</pre>
          {step.sourceDrawer.caption && <div className="source-drawer-caption">{step.sourceDrawer.caption}</div>}
        </div>
      )}

      {step.recapTable && (
        <div>
          <h3 className="inspector-section-title">复盘：问题 / 决策 / 原因</h3>
          <table className="recap-table">
            <thead>
              <tr><th>问题</th><th>决策</th><th>原因</th></tr>
            </thead>
            <tbody>
              {step.recapTable.map((r, i) => (
                <tr key={i}>
                  <td>{r.question}</td>
                  <td>{r.decision}</td>
                  <td>{r.because}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="inspector-nav">
        <button type="button" className="tactile-btn" onClick={onPrevStep} disabled={!canPrev}>
          ← 上一步
        </button>
        <button type="button" className="tactile-btn tactile-btn--primary" onClick={onNextStep} disabled={!canNext}>
          下一步 →
        </button>
      </div>

      {nextLesson && stepIndex === totalSteps - 1 && (
        <button type="button" className="tactile-btn inspector-next-lesson" onClick={() => onSelectLesson(nextLesson.slug)}>
          下一课：{nextLesson.title} <ArrowRight size={13} style={{ verticalAlign: -2 }} />
        </button>
      )}

      <div className="inspector-links">
        <button type="button" className="tactile-btn" onClick={onOpenCheatsheet}>
          打开架构速查表
        </button>
      </div>
    </aside>
  );
}
