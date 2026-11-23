import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, FileText, ListChecks, Search, SearchX, X } from 'lucide-react';
import type { Lesson } from '../types/lesson';

export interface SearchTarget {
  mode: 'learn' | 'cheatsheet';
  lessonSlug?: string;
  stepNumber?: number;
}

interface SearchModalProps {
  isOpen: boolean;
  lessons: Lesson[];
  onClose: () => void;
  onSelectTarget: (target: SearchTarget) => void;
}

type HitGroup = '速查表' | '课程' | '步骤';

interface SearchHit {
  key: string;
  title: string;
  meta: string;
  group: HitGroup;
  target: SearchTarget;
}

const GROUP_ICON: Record<HitGroup, typeof BookOpen> = {
  速查表: ListChecks,
  课程: BookOpen,
  步骤: FileText,
};

export function SearchModal({ isOpen, lessons, onClose, onSelectTarget }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelected(0);
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  const hits = useMemo<SearchHit[]>(() => {
    const q = query.trim().toLowerCase();
    const all: SearchHit[] = [
      { key: 'cheatsheet', title: '架构速查表（一页总览）', meta: '6 个速查区 · 插件树 / 事件 / 循环 / 分层 / 会话 / 决策', group: '速查表', target: { mode: 'cheatsheet' } },
      ...lessons.flatMap((lesson) => [
        {
          key: `lesson-${lesson.slug}`,
          title: `${lesson.title}`,
          meta: `第 ${lesson.chapterNumber} 章 · ${lesson.chapterTitle} · ${lesson.durationMin} 分钟 · ${lesson.level}`,
          group: '课程' as const,
          target: { mode: 'learn' as const, lessonSlug: lesson.slug, stepNumber: 1 },
        },
        ...lesson.steps.map((step): SearchHit => ({
          key: `step-${lesson.slug}-${step.stepNumber}`,
          title: `${lesson.title} — ${step.title}`,
          meta: `第 ${step.stepNumber} 步 · ${step.badge} · ${step.shortLabel}`,
          group: '步骤' as const,
          target: { mode: 'learn' as const, lessonSlug: lesson.slug, stepNumber: step.stepNumber },
        })),
      ]),
    ];
    if (!q) return all.slice(0, 12);
    return all.filter((h) => `${h.title} ${h.meta}`.toLowerCase().includes(q)).slice(0, 20);
  }, [query, lessons]);

  useEffect(() => {
    setSelected(0);
  }, [hits.length]);

  if (!isOpen) return null;

  const choose = (hit: SearchHit) => {
    onSelectTarget(hit.target);
    onClose();
  };

  const groups: HitGroup[] = ['速查表', '课程', '步骤'];
  const flatIndex = new Map(hits.map((h, i) => [h.key, i]));

  return (
    <div className="search-backdrop" role="dialog" aria-modal="true" aria-label="搜索" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="search-modal">
        <div className="search-input-row">
          <Search size={16} />
          <input
            ref={inputRef}
            className="search-input"
            value={query}
            placeholder="搜索课程、步骤、速查表…"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(hits.length - 1, s + 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(0, s - 1)); }
              else if (e.key === 'Enter' && hits[selected]) { choose(hits[selected]); }
              else if (e.key === 'Escape') { onClose(); }
            }}
          />
          <button type="button" className="tactile-btn" style={{ width: 26, height: 26, padding: 0 }} onClick={onClose} aria-label="关闭搜索">
            <X size={13} />
          </button>
        </div>
        <div className="search-results">
          {hits.length === 0 ? (
            <div className="search-empty">
              <SearchX size={22} />
              <div className="search-empty-title">没有找到「{query}」相关的内容</div>
              <div className="search-empty-sub">换个关键词试试，比如：Cordis、瀑布、会话、审批</div>
            </div>
          ) : (
            groups.map((group) => {
              const groupHits = hits.filter((h) => h.group === group);
              if (groupHits.length === 0) return null;
              const Icon = GROUP_ICON[group];
              return (
                <div key={group} className="search-group">
                  <div className="search-group-head">
                    <Icon size={12} />
                    {group}
                    <span className="search-group-count">{groupHits.length}</span>
                  </div>
                  {groupHits.map((hit) => {
                    const i = flatIndex.get(hit.key) ?? 0;
                    return (
                      <button
                        key={hit.key}
                        type="button"
                        className={`search-result ${i === selected ? 'search-result--selected' : ''}`}
                        onMouseEnter={() => setSelected(i)}
                        onClick={() => choose(hit)}
                      >
                        <span className="search-result-title">{hit.title}</span>
                        <span className="search-result-meta">{hit.meta}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
        <div className="search-foot">
          <span className="search-foot-count">共 {hits.length} 条结果</span>
          <span><span className="kbd">↑</span> <span className="kbd">↓</span> 选择</span>
          <span><span className="kbd">Enter</span> 跳转</span>
          <span><span className="kbd">Esc</span> 关闭</span>
        </div>
      </div>
    </div>
  );
}
