import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, FileText, Folder, FolderOpen, PanelLeftClose, PanelLeftOpen, RotateCcw } from 'lucide-react';
import type { Chapter } from '../types/lesson';

interface SidebarProps {
  chapters: Chapter[];
  activeLessonSlug: string;
  completedLessons: Set<string>;
  onSelectLesson: (slug: string) => void;
  onContinue?: () => void;
  onResetProgress: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export function Sidebar({ chapters, activeLessonSlug, completedLessons, onSelectLesson, onResetProgress, collapsed, onToggleCollapsed }: SidebarProps) {
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
        <button type="button" className="sidebar-icon-btn" onClick={onToggleCollapsed} aria-label="展开目录" title="展开目录">
          <PanelLeftOpen size={15} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="sidebar" aria-label="课程目录">
      <div className="sidebar-head">
        <span className="sidebar-head-title">
          <Folder size={14} />
          <span>课程</span>
        </span>
        <span className="sidebar-head-right">
          <span className="sidebar-lesson-total">{totalLessons} 课</span>
          {doneLessons > 0 && (
            <button type="button" className="sidebar-icon-btn" onClick={onResetProgress} title="清空进度" aria-label="清空进度">
              <RotateCcw size={12} />
            </button>
          )}
          {onToggleCollapsed && (
            <button type="button" className="sidebar-icon-btn" onClick={onToggleCollapsed} title="收起目录" aria-label="收起目录">
              <PanelLeftClose size={14} />
            </button>
          )}
        </span>
      </div>

      <div className="sidebar-tree">
        {chapters.map((chapter) => {
          const open = openChapters.has(chapter.id);
          const doneInChapter = chapter.lessons.filter((l) => completedLessons.has(l.slug)).length;
          const chapterNum = String(chapter.number).padStart(2, '0');
          return (
            <div key={chapter.id} className="sidebar-chapter">
              <button
                type="button"
                className="sidebar-chapter-head"
                onClick={() => toggleChapter(chapter.id)}
                aria-expanded={open}
              >
                <span className="sidebar-chapter-chevron">
                  {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </span>
                <span className={`sidebar-chapter-folder ch-color--${chapter.color}`}>
                  {open ? <FolderOpen size={14} /> : <Folder size={14} />}
                </span>
                <span className="sidebar-chapter-name">
                  {chapterNum}. {chapter.title}
                </span>
                <span className="sidebar-chapter-count mono">
                  {doneInChapter}/{chapter.lessons.length}
                </span>
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
                        <span className={`sidebar-lesson-icon ${isDone ? 'sidebar-lesson-icon--done' : ''}`}>
                          {isDone ? <CheckCircle2 size={13} /> : <FileText size={13} />}
                        </span>
                        <span className="sidebar-lesson-title">{lesson.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <span className="sidebar-progress-text">进度</span>
        <div className="sidebar-progress-bar">
          <div className="sidebar-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="sidebar-progress-count mono">{doneLessons} / {totalLessons}</span>
      </div>
    </aside>
  );
}
