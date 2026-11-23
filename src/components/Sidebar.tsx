import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, ChevronDown, Circle, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import type { Chapter } from '../types/lesson';

interface SidebarProps {
  chapters: Chapter[];
  activeLessonSlug: string;
  currentStepIndex: number;
  completedLessons: Set<string>;
  onSelectLesson: (slug: string) => void;
  onContinue: () => void;
  onResetProgress: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export function Sidebar({ chapters, activeLessonSlug, currentStepIndex, completedLessons, onSelectLesson, onContinue, onResetProgress, collapsed, onToggleCollapsed }: SidebarProps) {
  const allLessons = useMemo(() => chapters.flatMap((c) => c.lessons), [chapters]);
  const totalSteps = useMemo(() => allLessons.reduce((n, l) => n + l.steps.length, 0), [allLessons]);
  const doneSteps = useMemo(() => {
    let n = 0;
    for (const lesson of allLessons) {
      if (completedLessons.has(lesson.slug)) n += lesson.steps.length;
      else if (lesson.slug === activeLessonSlug) n += Math.min(lesson.steps.length, currentStepIndex + 1);
    }
    return n;
  }, [allLessons, completedLessons, activeLessonSlug, currentStepIndex]);
  const pct = totalSteps === 0 ? 0 : Math.round((doneSteps / totalSteps) * 100);

  const [openChapters, setOpenChapters] = useState<Set<string>>(() => new Set(chapters.map((c) => c.id)));
  const toggleChapter = (id: string) =>
    setOpenChapters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // 当前课所在章节始终展开。
  useEffect(() => {
    const chapter = chapters.find((c) => c.lessons.some((l) => l.slug === activeLessonSlug));
    if (chapter) setOpenChapters((prev) => (prev.has(chapter.id) ? prev : new Set(prev).add(chapter.id)));
  }, [activeLessonSlug, chapters]);

  if (collapsed) {
    return (
      <aside className="sidebar sidebar--collapsed" aria-label="课程目录（已折叠）">
        <button type="button" className="tactile-btn topbar-icon-btn" onClick={onToggleCollapsed} aria-label="展开目录">
          <PanelLeftOpen size={15} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="sidebar" aria-label="课程目录">
      <div className="sidebar-progress">
        <div className="sidebar-progress-label">
          <span>学习进度</span>
          <span className="mono">{doneSteps} / {totalSteps} · {pct}%</span>
        </div>
        <div className="sidebar-progress-bar">
          <div className="sidebar-progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
      {chapters.map((chapter) => {
        const open = openChapters.has(chapter.id);
        const activeInChapter = chapter.lessons.some((l) => l.slug === activeLessonSlug);
        return (
          <div key={chapter.id} className="sidebar-chapter">
            <button
              type="button"
              className="sidebar-chapter-head"
              onClick={() => toggleChapter(chapter.id)}
              aria-expanded={open}
            >
              <span className="sidebar-chapter-num">CH {chapter.number}</span>
              <span className={`ch-color--${chapter.color}`}>{chapter.title}</span>
              {activeInChapter && <span className="sidebar-meta-pill" style={{ marginLeft: 2 }}>在学</span>}
              <ChevronDown size={13} className={`sidebar-chapter-chevron ${open ? 'sidebar-chapter-chevron--open' : ''}`} />
              {onToggleCollapsed && chapter.number === 1 && (
                <span
                  role="button"
                  tabIndex={0}
                  className="tactile-btn"
                  style={{ width: 24, height: 24, padding: 0, marginLeft: 4 }}
                  onClick={(e) => { e.stopPropagation(); onToggleCollapsed(); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onToggleCollapsed(); } }}
                  aria-label="折叠目录"
                >
                  <PanelLeftClose size={13} />
                </span>
              )}
            </button>
            {open && chapter.lessons.map((lesson) => {
              const isActive = lesson.slug === activeLessonSlug;
              const isDone = completedLessons.has(lesson.slug);
              return (
                <button
                  key={lesson.id}
                  type="button"
                  className={`sidebar-lesson ${isActive ? 'sidebar-lesson--active' : ''}`}
                  onClick={() => onSelectLesson(lesson.slug)}
                  aria-current={isActive ? 'true' : undefined}
                >
                  <span className="sidebar-lesson-check">
                    {isDone ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                  </span>
                  <span>
                    <span className="sidebar-lesson-num">{lesson.lessonIndexInChapter}.</span>
                    <span className="sidebar-lesson-title">{lesson.title}</span>
                    <span className="sidebar-lesson-meta">
                      <span className="sidebar-meta-pill">{lesson.steps.length} 步</span>
                      <span className="sidebar-meta-pill">{lesson.durationMin} 分钟</span>
                      <span className="sidebar-meta-pill">{lesson.level}</span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        );
      })}
      <div className="sidebar-footer">
        <button type="button" className="tactile-btn tactile-btn--primary sidebar-continue" onClick={onContinue}>
          继续学习 <ArrowRight size={13} />
        </button>
        <button type="button" className="tactile-btn sidebar-reset" onClick={onResetProgress}>
          重置学习进度
        </button>
      </div>
    </aside>
  );
}
