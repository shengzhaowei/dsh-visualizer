import { CheckCircle2, Circle, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import type { Chapter } from '../types/lesson';

interface SidebarProps {
  chapters: Chapter[];
  activeLessonSlug: string;
  completedLessons: Set<string>;
  onSelectLesson: (slug: string) => void;
  onResetProgress: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export function Sidebar({ chapters, activeLessonSlug, completedLessons, onSelectLesson, onResetProgress, collapsed, onToggleCollapsed }: SidebarProps) {
  const total = chapters.flatMap((c) => c.lessons).length;
  const done = completedLessons.size;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

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
          <span>{done} / {total} · {pct}%</span>
        </div>
        <div className="sidebar-progress-bar">
          <div className="sidebar-progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
      {chapters.map((chapter) => (
        <div key={chapter.id} className="sidebar-chapter">
          <div className="sidebar-chapter-head">
            <span className="sidebar-chapter-num">CH {chapter.number}</span>
            <span className={`ch-color--${chapter.color}`}>{chapter.title}</span>
            {onToggleCollapsed && chapter.number === 1 && (
              <button type="button" className="tactile-btn" style={{ marginLeft: 'auto', width: 24, height: 24, padding: 0 }} onClick={onToggleCollapsed} aria-label="折叠目录">
                <PanelLeftClose size={13} />
              </button>
            )}
          </div>
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
              >
                <span className="sidebar-lesson-check">
                  {isDone ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                </span>
                <span>
                  {lesson.lessonIndexInChapter}. {lesson.title}
                  <span className="sidebar-lesson-meta">
                    {lesson.durationMin} 分钟 · {lesson.level} · {lesson.steps.length} 步
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ))}
      <div className="sidebar-footer">
        <button type="button" className="tactile-btn sidebar-reset" onClick={onResetProgress}>
          重置学习进度
        </button>
      </div>
    </aside>
  );
}
