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
  tip: { stroke: 'var(--green-stroke)', title: '提示', icon: 'tip' },
  warn: { stroke: 'var(--orange-stroke)', title: '注意', icon: 'warn' },
};

export function InspectorPanel({ lesson, step, stepIndex, totalSteps, nextLesson, canPrev, canNext, onPrevStep, onNextStep, onSelectLesson, onOpenCheatsheet }: InspectorPanelProps) {
  const doneObjectives = lesson.objectives.filter((o) => stepIndex + 1 >= o.completedAtStep);
  const [objectivesOpen, setObjectivesOpen] = useState(true);
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
  const nextStep = canNext ? lesson.steps[stepIndex + 1] : undefined;

  return (
    <aside className="inspector" aria-label="步骤解读">
      <div ref={scrollRef} className="inspector-scroll">
        <div key={`${lesson.slug}-${stepIndex}`} className={`inspector-anim inspector-anim--${slideDir}`}>
          {/* Card 1: Step Explanation + Navigation */}
          <article className="inspector-card inspector-step-card">
            <div className="inspector-step-head">
              <span className="inspector-step-count mono">
                STEP {step.stepNumber} / {totalSteps}
              </span>
              <span className={`step-badge step-badge--${step.badge}`}>{step.badge}</span>
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
                  {step.callout.kind === 'warn' ? <TriangleAlert size={13} /> : step.callout.kind === 'tip' ? <CheckCircle2 size={13} /> : <Lightbulb size={13} />}
                  {step.callout.title ?? calloutStyle.title}
                </div>
                <div>{renderInline(step.callout.text, 'callout')}</div>
              </div>
            )}

            <div className="inspector-nav">
              <button type="button" className="inspector-nav-back" onClick={onPrevStep} disabled={!canPrev}>
                ← 上一步
              </button>
              {canNext ? (
                <button type="button" className="inspector-nav-next" onClick={onNextStep}>
                  <span className="inspector-nav-next-text">
                    下一步：{nextStep?.shortLabel ?? ''}
                  </span>
                  <ArrowRight size={14} />
                </button>
              ) : nextLesson ? (
                <button
                  type="button"
                  className="inspector-nav-next"
                  onClick={() => onSelectLesson(nextLesson.slug)}
                  title={nextLesson.title}
                >
                  <span className="inspector-nav-next-text">下一课：{nextLesson.title}</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button type="button" className="inspector-nav-next" onClick={onOpenCheatsheet}>
                  <span className="inspector-nav-next-text">架构速查表</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </article>

          {/* Card 2: Source Code */}
          {step.sourceDrawer && (
            <section className="inspector-card source-drawer">
              <div className="source-drawer-head">
                <button
                  type="button"
                  className="source-drawer-toggle"
                  onClick={() => setDrawerOpen((o) => !o)}
                  aria-expanded={drawerOpen}
                  aria-label={drawerOpen ? '折叠源码' : '展开源码'}
                >
                  <FileCode2 size={14} />
                  <span className="source-drawer-title">{step.sourceDrawer.title}</span>
                  <ChevronDown size={13} className={`source-drawer-chevron ${drawerOpen ? 'source-drawer-chevron--open' : ''}`} />
                </button>
                <span className="source-drawer-actions">
                  <button
                    type="button"
                    className={`source-copy-btn ${copied ? 'source-copy-btn--copied' : ''}`}
                    onClick={() => void copyCode()}
                    aria-label="复制代码"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                  <a className="source-link" href={step.sourceDrawer.githubUrl} target="_blank" rel="noopener noreferrer" title={step.sourceDrawer.filePath}>
                    <ExternalLink size={12} />
                  </a>
                </span>
              </div>
              <div className={`source-drawer-body ${drawerOpen ? 'source-drawer-body--open' : ''}`}>
                <div>
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
            </section>
          )}

          {/* Card 3: Live Metrics (Moved from StagePanel — Algo Lab Facts Card pattern) */}
          {step.kpis.length > 0 && (
            <section className="inspector-card inspector-facts-card" aria-label="关键状态">
              <div className="inspector-facts-list">
                {step.kpis.slice(0, 4).map((k) => (
                  <div key={k.label} className="inspector-fact-row" title={`${k.label}：${k.value}`}>
                    <span className="inspector-fact-label">{k.label}</span>
                    <span key={`${lesson.slug}-${stepIndex}-${k.label}`} className="inspector-fact-value mono">
                      {k.value}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Card 4: Objectives (Default Expanded) */}
          {lesson.objectives.length > 0 && (
            <section className="inspector-card objectives">
              <button type="button" className="objectives-head" onClick={() => setObjectivesOpen((o) => !o)} aria-expanded={objectivesOpen}>
                <span className="objectives-head-title">
                  <ListChecks size={14} />
                  <span>本课要点</span>
                </span>
                <span className="objectives-head-right">
                  <span className="mono">{doneObjectives.length}/{lesson.objectives.length}</span>
                  <ChevronDown size={13} className={`objectives-chevron ${objectivesOpen ? 'objectives-chevron--open' : ''}`} />
                </span>
              </button>
              <div className={`objectives-body ${objectivesOpen ? 'objectives-body--open' : ''}`}>
                <div className="objectives-body-inner">
                  <ul className="objectives-list">
                    {lesson.objectives.map((o) => {
                      const done = stepIndex + 1 >= o.completedAtStep;
                      return (
                        <li key={o.id} className={done ? 'done' : ''}>
                          <span className={`obj-check ${done ? '' : 'obj-check--pending'}`}>
                            {done ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                          </span>
                          <span className="obj-text">{o.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </section>
          )}

          {filePreview && (
            <section className="inspector-card inspector-terminal" aria-label="会话日志预览">
              <div className="inspector-terminal-head">
                <span className="inspector-terminal-title mono">{filePreview.title}</span>
              </div>
              <div className="inspector-terminal-body">
                {filePreview.lines.map((line, i) => (
                  <div key={i} className={`inspector-terminal-line ${line.highlight ? 'inspector-terminal-line--highlight' : ''} ${line.muted ? 'inspector-terminal-line--muted' : ''}`}>
                    <span className="inspector-terminal-ln">{i + 1}</span>
                    <span className="inspector-terminal-text">{line.text}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {step.recapTable && (
            <section className="inspector-card recap">
              {step.recapTable.map((r, i) => (
                <div key={i} className="recap-row">
                  <div className="recap-q">{r.question}</div>
                  <div className="recap-a">
                    <ArrowRight size={13} className="recap-arrow" />
                    <span className="recap-decision">{renderInline(r.decision, `recap-d-${i}`)}</span>
                  </div>
                  <div className="recap-why">{renderInline(r.because, `recap-b-${i}`)}</div>
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </aside>
  );
}
