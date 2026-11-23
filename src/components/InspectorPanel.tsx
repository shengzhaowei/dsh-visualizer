import { useMemo, useState } from 'react';
import { ArrowRight, Check, CheckCircle2, ChevronDown, Circle, Copy, ExternalLink, FileCode2, Lightbulb, ListChecks, TriangleAlert } from 'lucide-react';
import type { Lesson, LessonStep } from '../types/lesson';
import { renderInline } from '../utils/inlineCode';
import { highlightLine } from '../utils/highlight';
import { diffScenes } from '../utils/sceneDiff';

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

const CALLOUT_STYLE: Record<string, { stroke: string; title: string; icon: 'idea' | 'tip' | 'warn' }> = {
  idea: { stroke: 'var(--violet-stroke)', title: '关键判断', icon: 'idea' },
  tip: { stroke: 'var(--green-stroke)', title: '小提示', icon: 'tip' },
  warn: { stroke: 'var(--orange-stroke)', title: '注意', icon: 'warn' },
};

export function InspectorPanel({ lesson, step, stepIndex, totalSteps, nextLesson, canPrev, canNext, onPrevStep, onNextStep, onSelectLesson, onOpenCheatsheet }: InspectorPanelProps) {
  const doneObjectives = lesson.objectives.filter((o) => stepIndex + 1 >= o.completedAtStep);
  const [objectivesOpen, setObjectivesOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);

  const prevScene = stepIndex > 0 ? lesson.steps[stepIndex - 1]?.scene : undefined;
  const stateDiff = useMemo(() => diffScenes(prevScene, step.scene), [prevScene, step.scene]);
  const shownDiff = stateDiff.slice(0, 6);
  const hiddenDiffCount = stateDiff.length - shownDiff.length;

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

        {step.callout && calloutStyle && (
          <div className={`callout callout--${step.callout.kind}`} style={{ borderLeftColor: calloutStyle.stroke }}>
            <div className="callout-title" style={{ color: calloutStyle.stroke }}>
              {step.callout.kind === 'warn' ? <TriangleAlert size={14} /> : step.callout.kind === 'tip' ? <CheckCircle2 size={14} /> : <Lightbulb size={14} />}
              {step.callout.title ?? calloutStyle.title}
            </div>
            <div>{renderInline(step.callout.text, 'callout')}</div>
          </div>
        )}

        {/* 本步变化：对比上一步场景自动算出，不编造文案 */}
        <div className="state-diff" aria-label="本步变化">
          <div className="state-diff-head">
            <span className="state-diff-title">本步变化</span>
            <span className="state-diff-title-en mono">STATE DIFF</span>
          </div>
          <ul className="state-diff-list">
            {shownDiff.map((d, i) => (
              <li key={i} className={`state-diff-line state-diff-line--${d.kind}`}>
                <span className="state-diff-sign" aria-hidden="true">
                  {d.kind === 'add' ? '+' : d.kind === 'remove' ? '−' : d.kind === 'change' ? '~' : '·'}
                </span>
                <span className="mono">{d.text}</span>
              </li>
            ))}
          </ul>
          {hiddenDiffCount > 0 && <div className="state-diff-more">还有 {hiddenDiffCount} 项变化</div>}
        </div>

        <div className="objectives">
          <button type="button" className="objectives-head" onClick={() => setObjectivesOpen((o) => !o)} aria-expanded={objectivesOpen}>
            <span className="objectives-head-title">
              <ListChecks size={13} />
              本课收获
              <span className="objectives-head-en">YOU&rsquo;LL LEARN {doneObjectives.length}/{lesson.objectives.length}</span>
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
                <span className="source-lang-badge mono">{step.sourceDrawer.language}</span>
                <span className="source-line-count mono">{codeLines.length} 行</span>
                <button type="button" className="source-copy-btn" onClick={() => void copyCode()} aria-label="复制代码">
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
                {step.sourceDrawer.caption && <div className="source-drawer-caption">{step.sourceDrawer.caption}</div>}
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
