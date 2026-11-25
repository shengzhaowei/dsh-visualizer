import { ArrowLeft, ArrowRight, Lock, Sparkles } from 'lucide-react';
import type { Chapter } from '../types/lesson';
import type { PluginHoloCard } from '../data/cards';
import { HoloCard } from './HoloCard';

interface DeckViewProps {
  deckTitle: string;
  brandIcon?: string;
  cards: PluginHoloCard[];
  chapters: Chapter[];
  completedLessons: Set<string>;
  onOpenPack: (card: PluginHoloCard, isDemo?: boolean) => void;
  onJumpToLesson: (slug: string) => void;
  onBackToLearn: () => void;
}

/** 通用全息卡册：展示各章节核心机制卡 + 1 张全课通关 EX 架构师卡，支持体验拆包、3D 把玩与重温拆包。 */
export function DeckView({
  deckTitle,
  brandIcon,
  cards,
  chapters,
  completedLessons,
  onOpenPack,
  onJumpToLesson,
  onBackToLearn,
}: DeckViewProps) {
  const chapterMap = new Map(chapters.map((c) => [c.id, c]));
  const firstFallbackSlug = chapters[0]?.lessons[0]?.slug ?? '';

  const isCardUnlocked = (card: PluginHoloCard): boolean => {
    if (card.chapterId === 'all') {
      return chapters.length > 0 && chapters.every((ch) => ch.lessons.every((l) => completedLessons.has(l.slug)));
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
      return { done, total: allLessons.length, firstLessonSlug: firstUnfinished?.slug ?? firstFallbackSlug };
    }
    const ch = chapterMap.get(card.chapterId);
    if (!ch) return { done: 0, total: 0, firstLessonSlug: card.lessonSlug };
    const done = ch.lessons.filter((l) => completedLessons.has(l.slug)).length;
    const firstUnfinished = ch.lessons.find((l) => !completedLessons.has(l.slug)) ?? ch.lessons[0];
    return { done, total: ch.lessons.length, firstLessonSlug: firstUnfinished?.slug ?? card.lessonSlug };
  };

  const unlockedCount = cards.filter(isCardUnlocked).length;
  const demoCardPrimary = cards[1] ?? cards[0];

  return (
    <div className="deck-page">
      <div className="deck-hero">
        <div className="deck-hero-top">
          <h1 className="deck-title">{deckTitle}</h1>
          <div className="deck-hero-actions">
            <span className="deck-counter mono">
              {unlockedCount} / {cards.length}
            </span>
            {demoCardPrimary && (
              <button
                type="button"
                className="tactile-btn tactile-btn--primary"
                onClick={() => onOpenPack(demoCardPrimary, true)}
              >
                <Sparkles size={14} /> 试拆体验
              </button>
            )}
            <button type="button" className="tactile-btn" onClick={onBackToLearn}>
              <ArrowLeft size={14} /> 返回课程
            </button>
          </div>
        </div>
      </div>

      <div className="deck-grid">
        {cards.map((card) => {
          const unlocked = isCardUnlocked(card);
          const prog = chapterProgress(card);
          return (
            <div key={card.id} className="deck-slot">
              {unlocked ? (
                <>
                  <HoloCard card={card} size="md" exIcon={brandIcon} onJumpToLesson={onJumpToLesson} />
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
                      <Lock size={22} />
                    </div>
                    <h3 className="holo-locked-title">{card.title}</h3>
                    <div className="holo-locked-prog mono">
                      {prog.done} / {prog.total}
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
                      进入本章 <ArrowRight size={13} />
                    </button>
                    <button
                      type="button"
                      className="deck-replay-btn"
                      onClick={() => onOpenPack(card, true)}
                    >
                      预览
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
