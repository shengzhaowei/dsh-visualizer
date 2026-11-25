import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, ChevronDown, Circle, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import type { Chapter } from '../types/lesson';

interface SidebarProps {
  chapters: Chapter[];
  activeLessonSlug: string;
  completedLessons: Set<string>;
  onSelectLesson: (slug: string) => void;
  onContinue: () => void;
  onResetProgress: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export function Sidebar({ chapters, activeLessonSlug, completedLessons, onSelectLesson, onContinue, onResetProgress, collapsed, onToggleCollapsed }: SidebarProps) {
  const allLessons = useMemo(() => chapters.flatMap((c) => c.lessons), [chapters]);
  const totalLessons = allLessons.length;
  const doneLessons = useMemo(() => allLessons.filter((l) => completedLessons.has(l.slug)).length, [allLessons, completedLessons]);
  const pct = totalLessons === 0 ? 0 : Math.round((doneLessons / totalLessons) * 100);

  // 默认只展开当前课所在章，其余折叠。
  const [openChapters, setOpenChapters] = useState<Set<string>>(() => {
    const ch = chapters.find((c) => c.lessons.some((l) => l.slug === activeLessonSlug));
    return new Set(ch ? [ch.id] : []);
  });
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
      <div className="sidebar-head">
        <span className="sidebar-head-title">课程目录</span>
        <button type="button" className="sidebar-reset-ghost" onClick={onResetProgress} title="清空已完成标记">
          重置
        </button>
      </div>
      {chapters.map((chapter) => {
        const open = openChapters.has(chapter.id);
        const doneInChapter = chapter.lessons.filter((l) => completedLessons.has(l.slug)).length;
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
              <span className="sidebar-chapter-count mono">
                {doneInChapter}/{chapter.lessons.length}
              </span>
              <ChevronDown size={13} className={`sidebar-chapter-chevron ${open ? 'sidebar-chapter-chevron--open' : ''}`} />
            </button>
            <div className={`sidebar-chapter-body ${open ? 'sidebar-chapter-body--open' : ''}`}>
              <div className="sidebar-chapter-body-inner">
                {chapter.lessons.map((lesson) => {
                  const isActive = lesson.slug === activeLessonSlug;
                  const isDone = completedLessons.has(lesson.slug);
                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      className={`sidebar-lesson ${isActive ? 'sidebar-lesson--active' : ''}`}
                      onClick={() => onSelectLesson(lesson.slug)}
                      aria-current={isActive ? 'true' : undefined}
                      tabIndex={open ? 0 : -1}
                    >
                      <span className="sidebar-lesson-check">
                        {isDone ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                      </span>
                      <span>
                        <span className="sidebar-lesson-num">{lesson.lessonIndexInChapter}.</span>
                        <span className="sidebar-lesson-title">{lesson.title}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
      <div className="sidebar-footer">
        <div className="sidebar-progress">
          <div className="sidebar-progress-label">
            <span>学习进度</span>
            <span className="mono">{doneLessons} / {totalLessons} · {pct}%</span>
          </div>
          <div className="sidebar-progress-bar">
            <div className="sidebar-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <button type="button" className="tactile-btn tactile-btn--primary sidebar-continue" onClick={onContinue}>
          继续学习 <ArrowRight size={13} />
        </button>
        {onToggleCollapsed && (
          <button type="button" className="tactile-btn sidebar-collapse" onClick={onToggleCollapsed}>
            <PanelLeftClose size={13} /> 收起目录
          </button>
        )}
      </div>
    </aside>
  );
}
