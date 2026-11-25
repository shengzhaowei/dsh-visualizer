import { ArrowLeft, ArrowRight, Lock, Sparkles } from 'lucide-react';
import type { Chapter } from '../types/lesson';
import { PLUGIN_HOLO_CARDS, type PluginHoloCard } from '../data/cards';
import { HoloCard } from './HoloCard';

interface DeckViewProps {
  chapters: Chapter[];
  completedLessons: Set<string>;
  onOpenPack: (card: PluginHoloCard, isDemo?: boolean) => void;
  onJumpToLesson: (slug: string) => void;
  onBackToLearn: () => void;
}

/** 插件全息卡册：展示 5 张章节插件卡 + 1 张全课通关 EX 架构师卡，支持体验拆包、3D 把玩与重温拆包。 */
export function DeckView({ chapters, completedLessons, onOpenPack, onJumpToLesson, onBackToLearn }: DeckViewProps) {
  const chapterMap = new Map(chapters.map((c) => [c.id, c]));

  const isCardUnlocked = (card: PluginHoloCard): boolean => {
    if (card.chapterId === 'all') {
      return chapters.every((ch) => ch.lessons.every((l) => completedLessons.has(l.slug)));
    }
    const ch = chapterMap.get(card.chapterId);
    if (!ch || ch.lessons.length === 0) return false;
    return ch.lessons.every((l) => completedLessons.has(l.slug));
  };

  const chapterProgress = (card: PluginHoloCard): { done: number; total: number; firstLessonSlug: string } => {
    if (card.chapterId === 'all') {
      const allLessons = chapters.flatMap((c) => c.lessons);
      const done = allLessons.filter((l) => completedLessons.has(l.slug)).length;
      const firstUnfinished = allLessons.find((l) => !completedLessons.has(l.slug)) ?? allLessons[0];
      return { done, total: allLessons.length, firstLessonSlug: firstUnfinished?.slug ?? 'plugin-everything' };
    }
    const ch = chapterMap.get(card.chapterId);
    if (!ch) return { done: 0, total: 0, firstLessonSlug: card.lessonSlug };
    const done = ch.lessons.filter((l) => completedLessons.has(l.slug)).length;
    const firstUnfinished = ch.lessons.find((l) => !completedLessons.has(l.slug)) ?? ch.lessons[0];
    return { done, total: ch.lessons.length, firstLessonSlug: firstUnfinished?.slug ?? card.lessonSlug };
  };

  const unlockedCount = PLUGIN_HOLO_CARDS.filter(isCardUnlocked).length;

  return (
    <div className="deck-page">
      <div className="deck-hero">
        <div className="deck-hero-top">
          <button type="button" className="tactile-btn" onClick={onBackToLearn}>
            <ArrowLeft size={14} /> 返回学习
          </button>
          <span className="deck-counter mono">
            已收集 {unlockedCount} / {PLUGIN_HOLO_CARDS.length} 张全息卡
          </span>
        </div>

        <h1 className="deck-title">DSH 插件全息卡册</h1>

        <div className="deck-hero-actions">
          <button
            type="button"
            className="tactile-btn tactile-btn--primary"
            onClick={() => onOpenPack(PLUGIN_HOLO_CARDS[1], true)}
          >
            <Sparkles size={14} /> 试拆体验卡包（dsh-scope）
          </button>
          <button
            type="button"
            className="tactile-btn"
            onClick={() => onOpenPack(PLUGIN_HOLO_CARDS[3], true)}
          >
            <Sparkles size={14} /> 试拆 UR 安全审批卡包
          </button>
        </div>
      </div>

      <div className="deck-grid">
        {PLUGIN_HOLO_CARDS.map((card) => {
          const unlocked = isCardUnlocked(card);
          const prog = chapterProgress(card);
          return (
            <div key={card.id} className="deck-slot">
              {unlocked ? (
                <>
                  <HoloCard card={card} size="md" onJumpToLesson={onJumpToLesson} />
                  <div className="deck-slot-bar">
                    <span className="deck-slot-status deck-slot-status--unlocked">已解锁</span>
                    <button
                      type="button"
                      className="deck-replay-btn"
                      onClick={() => onOpenPack(card, false)}
                    >
                      <Sparkles size={12} /> 重温拆包
                    </button>
                  </div>
                </>
              ) : (
                <div className={`holo-locked holo-locked--${card.foil}`}>
                  <div className="holo-locked-top">
                    <span className="holo-code mono">{card.code}</span>
                    <span className={`holo-rarity holo-rarity--${card.rarity} mono`}>{card.rarity}</span>
                  </div>
                  <div className="holo-locked-center">
                    <div className="holo-locked-icon">
                      <Lock size={24} />
                    </div>
                    <h3 className="holo-locked-title">{card.title}</h3>
                    <div className="holo-locked-sub">{card.subtitle}</div>
                    <div className="holo-locked-prog mono">
                      进度 {prog.done} / {prog.total} 课
                    </div>
                    <div className="holo-locked-bar">
                      <div
                        className="holo-locked-fill"
                        style={{ width: `${prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="holo-locked-actions">
                    <button
                      type="button"
                      className="tactile-btn tactile-btn--primary"
                      onClick={() => onJumpToLesson(prog.firstLessonSlug)}
                    >
                      去完成本章 <ArrowRight size={13} />
                    </button>
                    <button
                      type="button"
                      className="deck-replay-btn"
                      onClick={() => onOpenPack(card, true)}
                    >
                      试拆预览
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
