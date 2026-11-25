import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import { Code2, ExternalLink, X } from 'lucide-react';
import type { PluginHoloCard } from '../../data/cards';
import type { HarnessBundle } from '../../types/harnessBundle';
import { CheatsheetView } from '../../components/CheatsheetView';
import { DeckView } from '../../components/DeckView';
import { InspectorPanel } from '../../components/InspectorPanel';
import { PluginPackModal } from '../../components/PluginPackModal';
import { SearchModal } from '../../components/SearchModal';
import { Sidebar } from '../../components/Sidebar';
import { StagePanel } from '../../components/StagePanel';
import { TopBar, type HarnessMode } from '../../components/TopBar';
import { isSoundMuted, playSoundEnabledPing, playStepTick, setSoundMuted } from '../../utils/sound';

type Theme = 'light' | 'dark' | 'deepsea';

export interface HarnessRouteState {
  mode: HarnessMode;
  lessonSlug: string;
  stepIndex: number; // 0-based
}

interface HarnessAppProps {
  bundle: HarnessBundle;
  route: HarnessRouteState;
  onNavigate: (next: HarnessRouteState) => void;
  onBackToPortal: () => void;
}

const STORAGE_THEME_KEY = 'dsh-visualizer-theme';

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_THEME_KEY);
    if (saved === 'dark' || saved === 'light' || saved === 'deepsea') return saved;
  } catch {
    // ignore
  }
  const attr = document.documentElement.getAttribute('data-theme');
  return attr === 'dark' || attr === 'deepsea' ? attr : 'light';
}

function loadSetFromStorage(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed.filter((v): v is string => typeof v === 'string'));
  } catch {
    // ignore
  }
  return new Set();
}

/** 通用 Agent Harness 交互式架构可视化子应用：一套内核同时驱动全部 5 个 Harness 课程。 */
export function HarnessApp({ bundle, route, onNavigate, onBackToPortal }: HarnessAppProps) {
  const progressKey = `${bundle.storagePrefix}-completed`;
  const claimedPacksKey = `${bundle.storagePrefix}-claimed-packs`;

  const allLessons = useMemo(() => bundle.chapters.flatMap((ch) => ch.lessons), [bundle.chapters]);
  const lessonBySlug = useMemo(() => new Map(allLessons.map((l) => [l.slug, l])), [allLessons]);
  const chapterById = useMemo(() => new Map(bundle.chapters.map((ch) => [ch.id, ch])), [bundle.chapters]);

  const resolveLesson = useCallback(
    (slug: string) => {
      const canonical = bundle.legacySlugRedirect?.[slug] ?? slug;
      return lessonBySlug.get(canonical);
    },
    [bundle.legacySlugRedirect, lessonBySlug],
  );

  const [lastLearnRoute, setLastLearnRoute] = useState({
    lessonSlug: route.lessonSlug,
    stepIndex: route.mode === 'learn' ? route.stepIndex : 0,
  });
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(() => loadSetFromStorage(progressKey));
  const [claimedPacks, setClaimedPacks] = useState<Set<string>>(() => loadSetFromStorage(claimedPacksKey));
  const [packModal, setPackModal] = useState<{ card: PluginHoloCard; isDemo?: boolean } | null>(null);
  const [soundMutedState, setSoundMutedState] = useState<boolean>(isSoundMuted);
  const [isPlaying, setIsPlaying] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // 切换不同 Harness 时重新加载该 Harness 的进度与卡包记录
  useEffect(() => {
    setCompletedLessons(loadSetFromStorage(progressKey));
    setClaimedPacks(loadSetFromStorage(claimedPacksKey));
    setPackModal(null);
    setIsPlaying(false);
    setSearchOpen(false);
    setMobileDrawerOpen(false);
  }, [progressKey, claimedPacksKey]);

  useEffect(() => {
    if (route.mode === 'learn' && route.lessonSlug) {
      setLastLearnRoute({ lessonSlug: route.lessonSlug, stepIndex: route.stepIndex });
    }
  }, [route]);

  const currentLesson = useMemo(
    () => resolveLesson(route.lessonSlug) ?? allLessons[0],
    [resolveLesson, route.lessonSlug, allLessons],
  );
  const safeStepIndex = useMemo(() => {
    if (!currentLesson) return 0;
    return Math.max(0, Math.min(currentLesson.steps.length - 1, route.stepIndex));
  }, [currentLesson, route.stepIndex]);
  const currentStep = currentLesson?.steps[safeStepIndex];
  const currentChapter = currentLesson ? chapterById.get(currentLesson.chapterId) : undefined;
  const nextLesson = useMemo(() => {
    if (!currentLesson) return undefined;
    const idx = allLessons.findIndex((l) => l.slug === currentLesson.slug);
    return idx >= 0 && idx < allLessons.length - 1 ? allLessons[idx + 1] : undefined;
  }, [currentLesson, allLessons]);

  useEffect(() => {
    if (route.mode !== 'learn' || !currentLesson) return;
    if (safeStepIndex !== currentLesson.steps.length - 1) return;
    if (completedLessons.has(currentLesson.slug)) return;

    const nextCompleted = new Set(completedLessons);
    nextCompleted.add(currentLesson.slug);
    setCompletedLessons(nextCompleted);
    try { localStorage.setItem(progressKey, JSON.stringify([...nextCompleted])); } catch { /* ignore */ }

    const chapter = chapterById.get(currentLesson.chapterId);
    const newlyCompletedChapter = chapter && chapter.lessons.every((l) => nextCompleted.has(l.slug));
    const allCompleted = allLessons.every((l) => nextCompleted.has(l.slug));

    let unlockedCard: PluginHoloCard | undefined;
    let claimKey: string | undefined;
    if (newlyCompletedChapter && chapter && !claimedPacks.has(chapter.id)) {
      unlockedCard = bundle.cards.find((c) => c.chapterId === chapter.id);
      claimKey = chapter.id;
    } else if (allCompleted && !claimedPacks.has('all')) {
      unlockedCard = bundle.cards.find((c) => c.chapterId === 'all');
      claimKey = 'all';
    }

    if (unlockedCard && claimKey) {
      const nextClaimed = new Set(claimedPacks);
      nextClaimed.add(claimKey);
      setClaimedPacks(nextClaimed);
      try { localStorage.setItem(claimedPacksKey, JSON.stringify([...nextClaimed])); } catch { /* ignore */ }
      setIsPlaying(false);
      setPackModal({ card: unlockedCard, isDemo: false });
    }
  }, [route.mode, currentLesson, safeStepIndex, completedLessons, claimedPacks, progressKey, claimedPacksKey, chapterById, allLessons, bundle.cards]);

  const unlockedCardsCount = useMemo(() => {
    return bundle.cards.filter((card) => {
      if (card.chapterId === 'all') return allLessons.length > 0 && allLessons.every((l) => completedLessons.has(l.slug));
      const ch = chapterById.get(card.chapterId);
      return Boolean(ch && ch.lessons.length > 0 && ch.lessons.every((l) => completedLessons.has(l.slug)));
    }).length;
  }, [bundle.cards, allLessons, chapterById, completedLessons]);

  const handleToggleSound = useCallback(() => {
    setSoundMutedState((prev) => {
      const next = !prev;
      setSoundMuted(next);
      if (!next) playSoundEnabledPing();
      return next;
    });
  }, []);

  const applyThemeDom = useCallback((nextTheme: Theme) => {
    if (nextTheme === 'light') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', nextTheme);
    try { localStorage.setItem(STORAGE_THEME_KEY, nextTheme); } catch { /* ignore */ }
  }, []);

  const handleToggleTheme = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const nextTheme: Theme = theme === 'light' ? 'deepsea' : theme === 'deepsea' ? 'dark' : 'light';
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const startViewTransition = (document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } }).startViewTransition?.bind(document);
    if (!startViewTransition || prefersReducedMotion) {
      setTheme(nextTheme);
      applyThemeDom(nextTheme);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const transition = startViewTransition(() => {
      setTheme(nextTheme);
      applyThemeDom(nextTheme);
    });
    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`] },
        { duration: 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' },
      );
    }).catch(() => { /* fallback already applied */ });
  }, [theme, applyThemeDom]);

  const handleSelectLesson = useCallback((slug: string, stepNumber = 1) => {
    const lesson = resolveLesson(slug);
    const maxIdx = lesson ? lesson.steps.length - 1 : 0;
    onNavigate({ mode: 'learn', lessonSlug: lesson?.slug ?? slug, stepIndex: Math.max(0, Math.min(maxIdx, stepNumber - 1)) });
    setIsPlaying(false);
    setReplayKey((k) => k + 1);
    setMobileDrawerOpen(false);
  }, [resolveLesson, onNavigate]);

  const handleSelectStep = useCallback((stepIdx: number) => {
    if (!currentLesson) return;
    const clamped = Math.max(0, Math.min(currentLesson.steps.length - 1, stepIdx));
    if (clamped !== safeStepIndex) playStepTick();
    onNavigate({ mode: 'learn', lessonSlug: currentLesson.slug, stepIndex: clamped });
  }, [currentLesson, safeStepIndex, onNavigate]);

  const handlePrevStep = useCallback(() => { if (safeStepIndex > 0) handleSelectStep(safeStepIndex - 1); }, [safeStepIndex, handleSelectStep]);
  const handleNextStep = useCallback(() => { if (currentLesson && safeStepIndex < currentLesson.steps.length - 1) handleSelectStep(safeStepIndex + 1); }, [currentLesson, safeStepIndex, handleSelectStep]);
  const handleTogglePlay = useCallback(() => setIsPlaying((p) => !p), []);
  const handleReplay = useCallback(() => { setIsPlaying(true); setReplayKey((k) => k + 1); }, []);

  const handleChangeMode = useCallback((nextMode: HarnessMode) => {
    if (nextMode === 'cheatsheet' || nextMode === 'deck') {
      onNavigate({ mode: nextMode, lessonSlug: lastLearnRoute.lessonSlug, stepIndex: lastLearnRoute.stepIndex });
    } else {
      onNavigate({ mode: 'learn', lessonSlug: lastLearnRoute.lessonSlug || allLessons[0]?.slug || '', stepIndex: lastLearnRoute.stepIndex });
    }
    setMobileDrawerOpen(false);
  }, [onNavigate, lastLearnRoute, allLessons]);

  const handleContinue = useCallback(() => {
    const next = allLessons.find((l) => !completedLessons.has(l.slug)) ?? allLessons[0];
    if (next) handleSelectLesson(next.slug, 1);
  }, [allLessons, completedLessons, handleSelectLesson]);

  const handleResetProgress = useCallback(() => {
    setCompletedLessons(new Set());
    setClaimedPacks(new Set());
    try {
      localStorage.removeItem(progressKey);
      localStorage.removeItem(claimedPacksKey);
    } catch { /* ignore */ }
  }, [progressKey, claimedPacksKey]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || event.keyCode === 229) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((prev) => !prev);
        return;
      }
      if (event.key === 'Escape' && mobileDrawerOpen && !searchOpen) { setMobileDrawerOpen(false); return; }
      if (searchOpen || mobileDrawerOpen || packModal || route.mode !== 'learn') return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'ArrowLeft') { event.preventDefault(); handlePrevStep(); }
      else if (event.key === 'ArrowRight') { event.preventDefault(); handleNextStep(); }
      else if (event.key === ' ') {
        if (target && (target.tagName === 'BUTTON' || target.tagName === 'A')) return;
        event.preventDefault();
        handleTogglePlay();
      } else if (event.key === 'r' || event.key === 'R') { event.preventDefault(); handleReplay(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [searchOpen, mobileDrawerOpen, packModal, route.mode, handlePrevStep, handleNextStep, handleTogglePlay, handleReplay]);

  const canPrev = safeStepIndex > 0;
  const canNext = currentLesson ? safeStepIndex < currentLesson.steps.length - 1 : false;

  return (
    <div className="app-shell">
      <TopBar
        brandName={bundle.name}
        brandIcon={bundle.brandIcon}
        repoUrl={bundle.repoUrl}
        repoLabel={bundle.repoLabel}
        mode={route.mode}
        theme={theme}
        soundMuted={soundMutedState}
        unlockedCardsCount={unlockedCardsCount}
        totalCardsCount={bundle.cards.length}
        onChangeMode={handleChangeMode}
        onOpenSearch={() => setSearchOpen(true)}
        onToggleSound={handleToggleSound}
        onToggleTheme={handleToggleTheme}
        onOpenMobileDrawer={() => setMobileDrawerOpen(true)}
        onBackToPortal={onBackToPortal}
        onGoFirstLesson={() => {
          const first = allLessons[0];
          if (first) handleSelectLesson(first.slug, 1);
        }}
      />

      {route.mode === 'cheatsheet' ? (
        <div className="cheatsheet-scroll-container">
          <CheatsheetView
            data={bundle.cheatsheet}
            onJumpToLesson={(slug, stepNumber) => handleSelectLesson(slug, stepNumber)}
            onBackToLearn={() => handleChangeMode('learn')}
          />
        </div>
      ) : route.mode === 'deck' ? (
        <div className="cheatsheet-scroll-container">
          <DeckView
            deckTitle={bundle.deckTitle}
            brandIcon={bundle.brandIcon}
            cards={bundle.cards}
            chapters={bundle.chapters}
            completedLessons={completedLessons}
            onOpenPack={(card, isDemo) => setPackModal({ card, isDemo })}
            onJumpToLesson={(slug) => handleSelectLesson(slug, 1)}
            onBackToLearn={() => handleChangeMode('learn')}
          />
        </div>
      ) : currentLesson && currentStep ? (
        <div className={sidebarCollapsed ? 'workspace-grid workspace-grid--sidebar-collapsed' : 'workspace-grid'}>
          <Sidebar
            chapters={bundle.chapters}
            activeLessonSlug={currentLesson.slug}
            completedLessons={completedLessons}
            onSelectLesson={(slug) => handleSelectLesson(slug, 1)}
            onContinue={handleContinue}
            onResetProgress={handleResetProgress}
            collapsed={sidebarCollapsed}
            onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
          />
          <div className="stage-slot">
            <StagePanel
              lesson={currentLesson}
              step={currentStep}
              stepIndex={safeStepIndex}
              totalSteps={currentLesson.steps.length}
              chapterColor={currentChapter?.color ?? 'sage'}
              isPlaying={isPlaying}
              replayKey={replayKey}
              canPrev={canPrev}
              canNext={canNext}
              onTogglePlay={handleTogglePlay}
              onReplay={handleReplay}
              onSelectStep={handleSelectStep}
              onPrevStep={handlePrevStep}
              onNextStep={handleNextStep}
            />
          </div>
          <InspectorPanel
            lesson={currentLesson}
            step={currentStep}
            stepIndex={safeStepIndex}
            totalSteps={currentLesson.steps.length}
            nextLesson={nextLesson}
            canPrev={canPrev}
            canNext={canNext}
            onSelectStep={handleSelectStep}
            onPrevStep={handlePrevStep}
            onNextStep={handleNextStep}
            onSelectLesson={(slug) => handleSelectLesson(slug, 1)}
            onOpenCheatsheet={() => handleChangeMode('cheatsheet')}
          />
        </div>
      ) : null}

      {route.mode === 'learn' && (
        <footer className="keyboard-hint-bar" aria-label="键盘快捷键">
          <span><span className="kbd">←</span> <span className="kbd">→</span> 切换步骤</span>
          <span><span className="kbd">Space</span> 自动翻步 / 暂停</span>
          <span><span className="kbd">R</span> 重播</span>
          <span><span className="kbd">Ctrl K</span> 搜索</span>
        </footer>
      )}

      {mobileDrawerOpen && (
        <div className="mobile-drawer-backdrop" role="dialog" aria-modal="true" aria-label="课程目录抽屉" onClick={(e) => { if (e.target === e.currentTarget) setMobileDrawerOpen(false); }}>
          <div className="mobile-drawer">
            <div className="mobile-drawer-top">
              <span className="brand-title">{bundle.name}</span>
              <button type="button" className="tactile-btn" style={{ width: 30, height: 30, padding: 0 }} onClick={() => setMobileDrawerOpen(false)} aria-label="关闭目录">
                <X size={15} />
              </button>
            </div>
            <div className="mobile-drawer-content">
              <Sidebar
                chapters={bundle.chapters}
                activeLessonSlug={currentLesson?.slug ?? ''}
                completedLessons={completedLessons}
                onSelectLesson={(slug) => handleSelectLesson(slug, 1)}
                onContinue={handleContinue}
                onResetProgress={handleResetProgress}
              />
            </div>
            <div className="mobile-drawer-links">
              <a className="topbar-pill" href={bundle.repoUrl} target="_blank" rel="noopener noreferrer">
                <Code2 size={13} /> {bundle.repoLabel} <ExternalLink size={11} />
              </a>
            </div>
          </div>
        </div>
      )}

      <PluginPackModal
        card={packModal?.card ?? null}
        isDemo={packModal?.isDemo}
        packLabel={bundle.packLabel}
        brandIcon={bundle.brandIcon}
        onClose={() => setPackModal(null)}
        onJumpToLesson={(slug) => handleSelectLesson(slug, 1)}
        onOpenDeck={() => handleChangeMode('deck')}
      />

      <SearchModal
        isOpen={searchOpen}
        lessons={allLessons}
        suggestions={bundle.searchSuggestions}
        cheatsheetMeta={bundle.cheatsheetMeta}
        onClose={() => setSearchOpen(false)}
        onSelectTarget={({ mode, lessonSlug, stepNumber }) => {
          if (mode === 'cheatsheet') handleChangeMode('cheatsheet');
          else if (lessonSlug) handleSelectLesson(lessonSlug, stepNumber ?? 1);
        }}
      />
    </div>
  );
}
