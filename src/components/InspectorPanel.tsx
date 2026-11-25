import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, CheckCircle2, ChevronDown, Circle, Copy, ExternalLink, FileCode2, Lightbulb, ListChecks, TriangleAlert } from 'lucide-react';
import type { Lesson, LessonStep } from '../types/lesson';
import { renderInline } from '../utils/inlineCode';
import { highlightLine } from '../utils/highlight';

interface InspectorPanelProps {
  lesson: Lesson;
  step: LessonStep;
  stepIndex: number;
  totalSteps: number;
  nextLesson?: Lesson;
  canPrev: boolean;
  canNext: boolean;
  onSelectStep: (stepIndex: number) => void;
  onPrevStep: () => void;
  onNextStep: () => void;
  onSelectLesson: (slug: string) => void;
  onOpenCheatsheet: () => void;
}

const CALLOUT_STYLE: Record<string, { stroke: string; title: string; icon: 'idea' | 'tip' | 'warn' }> = {
  idea: { stroke: 'var(--violet-stroke)', title: '关键判断', icon: 'idea' },
  tip: { stroke: 'var(--green-stroke)', title: '小提示', icon: 'tip' },
  warn: { stroke: 'var(--orange-stroke)', title: '注意', icon: 'warn' },
};

export function InspectorPanel({ lesson, step, stepIndex, totalSteps, nextLesson, canPrev, canNext, onSelectStep, onPrevStep, onNextStep, onSelectLesson, onOpenCheatsheet }: InspectorPanelProps) {
  const doneObjectives = lesson.objectives.filter((o) => stepIndex + 1 >= o.completedAtStep);
  const [objectivesOpen, setObjectivesOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevNavRef = useRef<{ slug: string; idx: number }>({ slug: lesson.slug, idx: stepIndex });

  const slideDir =
    prevNavRef.current.slug !== lesson.slug
      ? 'next'
      : stepIndex < prevNavRef.current.idx
        ? 'prev'
        : 'next';

  useEffect(() => {
    prevNavRef.current = { slug: lesson.slug, idx: stepIndex };
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [lesson.slug, stepIndex]);

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
  const filePreview = step.scene.kind === 'tree' ? step.scene.filePreview : undefined;
  const calloutStyle = step.callout ? CALLOUT_STYLE[step.callout.kind] : undefined;

  return (
    <aside className="inspector" aria-label="步骤解读">
      <div className="inspector-header">
        <div className="inspector-progress" role="tablist" aria-label={`步骤进度 ${stepIndex + 1} / ${totalSteps}`}>
          {lesson.steps.map((s, i) => (
            <button
              key={s.stepNumber}
              type="button"
              role="tab"
              aria-selected={i === stepIndex}
              aria-label={`跳到第 ${s.stepNumber} 步：${s.title}`}
              title={`第 ${s.stepNumber} 步 · ${s.shortLabel}：${s.title}`}
              className={`inspector-progress-seg ${i < stepIndex ? 'inspector-progress-seg--done' : i === stepIndex ? 'inspector-progress-seg--current' : ''}`}
              onClick={() => onSelectStep(i)}
            />
          ))}
        </div>
      </div>

      <div ref={scrollRef} className="inspector-scroll">
        <div key={`${lesson.slug}-${stepIndex}`} className={`inspector-anim inspector-anim--${slideDir}`}>
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

        {step.callout && calloutStyle && (
          <div className={`callout callout--${step.callout.kind}`} style={{ borderLeftColor: calloutStyle.stroke }}>
            <div className="callout-title" style={{ color: calloutStyle.stroke }}>
              {step.callout.kind === 'warn' ? <TriangleAlert size={14} /> : step.callout.kind === 'tip' ? <CheckCircle2 size={14} /> : <Lightbulb size={14} />}
              {step.callout.title ?? calloutStyle.title}
            </div>
            <div>{renderInline(step.callout.text, 'callout')}</div>
          </div>
        )}

        <div className="objectives">
          <button type="button" className="objectives-head" onClick={() => setObjectivesOpen((o) => !o)} aria-expanded={objectivesOpen}>
            <span className="objectives-head-title">
              <ListChecks size={13} />
              本课要点 · {doneObjectives.length}/{lesson.objectives.length}
            </span>
            <ChevronDown size={14} className={`objectives-chevron ${objectivesOpen ? 'objectives-chevron--open' : ''}`} />
          </button>
          <div className={`objectives-body ${objectivesOpen ? 'objectives-body--open' : ''}`}>
            <div className="objectives-body-inner">
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
          </div>
        </div>

        {step.sourceDrawer && (
          <div className="source-drawer">
            <div className="source-drawer-head">
              <button
                type="button"
                className="source-drawer-toggle"
                onClick={() => setDrawerOpen((o) => !o)}
                aria-expanded={drawerOpen}
                aria-label={drawerOpen ? '折叠源码' : '展开源码'}
              >
                <span className="source-drawer-title">
                  <FileCode2 size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
                  {step.sourceDrawer.title}
                </span>
                <ChevronDown size={13} className={`source-drawer-chevron ${drawerOpen ? 'source-drawer-chevron--open' : ''}`} />
              </button>
              <span className="source-drawer-actions">
                <button
                  type="button"
                  className={`source-copy-btn ${copied ? 'source-copy-btn--copied' : ''}`}
                  onClick={() => void copyCode()}
                  aria-label="复制代码"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? '已复制' : '复制'}
                </button>
                <a className="source-link" href={step.sourceDrawer.githubUrl} target="_blank" rel="noopener noreferrer">
                  GitHub <ExternalLink size={11} />
                </a>
              </span>
            </div>
            <div className={`source-drawer-body ${drawerOpen ? 'source-drawer-body--open' : ''}`}>
              <div>
                <div className="source-drawer-path mono">{step.sourceDrawer.filePath}</div>
                <pre className="code-block">
                  {codeLines.map((line, i) => (
                    <div key={i} className="code-line">
                      <span className="code-ln">{i + 1}</span>
                      <span className="code-text">{highlightLine(line, step.sourceDrawer!.language)}</span>
                    </div>
                  ))}
                </pre>
              </div>
            </div>
          </div>
        )}

        {filePreview && (
          <div className="inspector-terminal" aria-label="会话日志文件预览">
            <div className="inspector-terminal-head">
              <span className="inspector-terminal-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="inspector-terminal-title">{filePreview.title}</span>
              <span className="inspector-terminal-badge">APPEND-ONLY</span>
            </div>
            <div className="inspector-terminal-body">
              {filePreview.lines.map((line, i) => (
                <div key={i} className={`inspector-terminal-line ${line.highlight ? 'inspector-terminal-line--highlight' : ''} ${line.muted ? 'inspector-terminal-line--muted' : ''}`}>
                  <span className="inspector-terminal-ln">{i + 1}</span>
                  <span className="inspector-terminal-text">{line.text}</span>
                </div>
              ))}
            </div>
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

        {nextLesson && stepIndex === totalSteps - 1 && (
          <div className="next-lesson-card">
            <div className="next-lesson-title">{nextLesson.title}</div>
            <button type="button" className="tactile-btn tactile-btn--primary next-lesson-btn" onClick={() => onSelectLesson(nextLesson.slug)}>
              下一课：{nextLesson.title} <ArrowRight size={13} style={{ verticalAlign: -2 }} />
            </button>
          </div>
        )}
      </div>

      <div className="inspector-footer">
        <div className="inspector-nav">
          <button type="button" className="tactile-btn" onClick={onPrevStep} disabled={!canPrev}>
            ← 上一步
          </button>
          {canNext ? (
            <button type="button" className="tactile-btn tactile-btn--primary" onClick={onNextStep}>
              下一步 →
            </button>
          ) : nextLesson ? (
            <button
              type="button"
              className="tactile-btn tactile-btn--primary"
              onClick={() => onSelectLesson(nextLesson.slug)}
              title={`进入下一课：${nextLesson.title}`}
            >
              下一课 →
            </button>
          ) : (
            <button type="button" className="tactile-btn tactile-btn--primary" onClick={onOpenCheatsheet}>
              架构速查表 →
            </button>
          )}
        </div>
        <div className="inspector-footer-meta">
          <span className="inspector-footer-step mono">
            {stepIndex + 1} / {totalSteps}
          </span>
          <button type="button" className="inspector-cheatsheet-link" onClick={onOpenCheatsheet}>
            打开架构速查表
          </button>
        </div>
      </div>
    </aside>
  );
}
