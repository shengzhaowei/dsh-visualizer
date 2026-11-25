import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Code2,
  ExternalLink,
  FlaskConical,
  Home,
  Menu,
  Moon,
  Network,
  Search,
  Sparkles,
  Sun,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { CODEX_BUNDLE } from '../../data/harnesses/codex';
import { HARNESS_STUDIOS } from '../../data/studios';
import {
  findMindNodeByLesson,
} from '../../data/harnesses/codex/mindmap';
import type { PluginHoloCard } from '../../data/cards';
import { CheatsheetView } from '../../components/CheatsheetView';
import { DeckView } from '../../components/DeckView';
import { HarnessStudioView } from '../../components/HarnessStudioView';
import { InspectorPanel } from '../../components/InspectorPanel';
import { PluginPackModal } from '../../components/PluginPackModal';
import { SearchModal } from '../../components/SearchModal';
import { Sidebar } from '../../components/Sidebar';
import { StagePanel } from '../../components/StagePanel';
import { CodexMindmapView } from './CodexMindmapView';
import { CodexWorkbenchView } from './CodexWorkbenchView';
import { isSoundMuted, playSoundEnabledPing, playStepTick, setSoundMuted } from '../../utils/sound';

export type CodexMode = 'studio' | 'learn' | 'mindmap' | 'workbench' | 'cheatsheet' | 'deck';
type CodexTheme = 'carbon' | 'blueprint';

export interface CodexRouteState {
  mode: CodexMode;
  lessonSlug: string;
  stepIndex: number; // 0-based
  mindNodeId?: string;
}

interface CodexAppProps {
  route: CodexRouteState;
  onNavigate: (next: CodexRouteState) => void;
  onBackToPortal: () => void;
}

const CODEX_THEME_KEY = 'codex-workbench-theme';
const PROGRESS_KEY = `${CODEX_BUNDLE.storagePrefix}-completed`;
const CLAIMED_KEY = `${CODEX_BUNDLE.storagePrefix}-claimed-packs`;

function loadCodexTheme(): CodexTheme {
  try {
    const saved = localStorage.getItem(CODEX_THEME_KEY);
    if (saved === 'blueprint' || saved === 'carbon') return saved;
  } catch { /* ignore */ }
  return 'carbon'; // 默认碳黑内核风，彻底区别于 DSH 暖纸风
}

function loadSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed.filter((v): v is string => typeof v === 'string'));
  } catch { /* ignore */ }
  return new Set();
}

/** OpenAI Codex (codex-rs) 专属内核工作台：独立视觉主题 + 交互源码脑图 + SQ/EQ 内核实验台 + 6 章 10 课源码精读。 */
export function CodexApp({ route, onNavigate, onBackToPortal }: CodexAppProps) {
  const allLessons = useMemo(() => CODEX_BUNDLE.chapters.flatMap((c) => c.lessons), []);
  const lessonBySlug = useMemo(() => new Map(allLessons.map((l) => [l.slug, l])), [allLessons]);
  const chapterById = useMemo(() => new Map(CODEX_BUNDLE.chapters.map((c) => [c.id, c])), []);

  const [codexTheme, setCodexTheme] = useState<CodexTheme>(loadCodexTheme);
  const [lastLearnRoute, setLastLearnRoute] = useState({
    lessonSlug: route.lessonSlug || allLessons[0]?.slug || 'codex-sq-eq',
    stepIndex: route.mode === 'learn' ? route.stepIndex : 0,
  });
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(() => loadSet(PROGRESS_KEY));
  const [claimedPacks, setClaimedPacks] = useState<Set<string>>(() => loadSet(CLAIMED_KEY));
  const [packModal, setPackModal] = useState<{ card: PluginHoloCard; isDemo?: boolean } | null>(null);
  const [soundMutedState, setSoundMutedState] = useState<boolean>(isSoundMuted);
  const [isPlaying, setIsPlaying] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (route.mode === 'learn' && route.lessonSlug) {
      setLastLearnRoute({ lessonSlug: route.lessonSlug, stepIndex: route.stepIndex });
    }
  }, [route]);

  const currentLesson = useMemo(
    () => lessonBySlug.get(route.lessonSlug) ?? allLessons[0],
    [lessonBySlug, route.lessonSlug, allLessons],
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

  const matchedMindNode = useMemo(
    () => (currentLesson ? findMindNodeByLesson(currentLesson.slug) : null),
    [currentLesson],
  );

  // 自动记录完课与章节卡包解锁
  useEffect(() => {
    if (route.mode !== 'learn' || !currentLesson) return;
    if (safeStepIndex !== currentLesson.steps.length - 1) return;
    if (completedLessons.has(currentLesson.slug)) return;

    const nextCompleted = new Set(completedLessons);
    nextCompleted.add(currentLesson.slug);
    setCompletedLessons(nextCompleted);
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify([...nextCompleted])); } catch { /* ignore */ }

    const chapter = chapterById.get(currentLesson.chapterId);
    const newlyCompletedChapter = chapter && chapter.lessons.every((l) => nextCompleted.has(l.slug));
    const allCompleted = allLessons.every((l) => nextCompleted.has(l.slug));

    let unlockedCard: PluginHoloCard | undefined;
    let claimKey: string | undefined;
    if (newlyCompletedChapter && chapter && !claimedPacks.has(chapter.id)) {
      unlockedCard = CODEX_BUNDLE.cards.find((c) => c.chapterId === chapter.id);
      claimKey = chapter.id;
    } else if (allCompleted && !claimedPacks.has('all')) {
      unlockedCard = CODEX_BUNDLE.cards.find((c) => c.chapterId === 'all');
      claimKey = 'all';
    }

    if (unlockedCard && claimKey) {
      const nextClaimed = new Set(claimedPacks);
      nextClaimed.add(claimKey);
      setClaimedPacks(nextClaimed);
      try { localStorage.setItem(CLAIMED_KEY, JSON.stringify([...nextClaimed])); } catch { /* ignore */ }
      setIsPlaying(false);
      setPackModal({ card: unlockedCard, isDemo: false });
    }
  }, [route.mode, currentLesson, safeStepIndex, completedLessons, claimedPacks, chapterById, allLessons]);

  const unlockedCardsCount = useMemo(() => {
    return CODEX_BUNDLE.cards.filter((card) => {
      if (card.chapterId === 'all') return allLessons.every((l) => completedLessons.has(l.slug));
      const ch = chapterById.get(card.chapterId);
      return Boolean(ch && ch.lessons.length > 0 && ch.lessons.every((l) => completedLessons.has(l.slug)));
    }).length;
  }, [allLessons, chapterById, completedLessons]);

  const handleToggleTheme = useCallback(() => {
    playStepTick();
    setCodexTheme((prev) => {
      const next: CodexTheme = prev === 'carbon' ? 'blueprint' : 'carbon';
      try { localStorage.setItem(CODEX_THEME_KEY, next); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const handleToggleSound = useCallback(() => {
    setSoundMutedState((prev) => {
      const next = !prev;
      setSoundMuted(next);
      if (!next) playSoundEnabledPing();
      return next;
    });
  }, []);

  const handleSelectLesson = useCallback(
    (slug: string, stepNumber = 1) => {
      const lesson = lessonBySlug.get(slug);
      const maxIdx = lesson ? lesson.steps.length - 1 : 0;
      onNavigate({
        mode: 'learn',
        lessonSlug: lesson?.slug ?? slug,
        stepIndex: Math.max(0, Math.min(maxIdx, stepNumber - 1)),
      });
      setIsPlaying(false);
      setReplayKey((k) => k + 1);
      setMobileDrawerOpen(false);
    },
    [lessonBySlug, onNavigate],
  );

  const handleSelectStep = useCallback(
    (stepIdx: number) => {
      if (!currentLesson) return;
      const clamped = Math.max(0, Math.min(currentLesson.steps.length - 1, stepIdx));
      if (clamped !== safeStepIndex) playStepTick();
      onNavigate({ mode: 'learn', lessonSlug: currentLesson.slug, stepIndex: clamped });
    },
    [currentLesson, safeStepIndex, onNavigate],
  );

  const handleChangeMode = useCallback(
    (nextMode: CodexMode, mindNodeId?: string) => {
      playStepTick();
      onNavigate({
        mode: nextMode,
        lessonSlug: lastLearnRoute.lessonSlug || allLessons[0]?.slug || 'codex-sq-eq',
        stepIndex: lastLearnRoute.stepIndex,
        mindNodeId,
      });
      setMobileDrawerOpen(false);
    },
    [onNavigate, lastLearnRoute, allLessons],
  );

  const handlePrevStep = useCallback(() => { if (safeStepIndex > 0) handleSelectStep(safeStepIndex - 1); }, [safeStepIndex, handleSelectStep]);
  const handleNextStep = useCallback(() => { if (currentLesson && safeStepIndex < currentLesson.steps.length - 1) handleSelectStep(safeStepIndex + 1); }, [currentLesson, safeStepIndex, handleSelectStep]);
  const handleTogglePlay = useCallback(() => setIsPlaying((p) => !p), []);
  const handleReplay = useCallback(() => { setIsPlaying(true); setReplayKey((k) => k + 1); }, []);

  const handleContinue = useCallback(() => {
    const next = allLessons.find((l) => !completedLessons.has(l.slug)) ?? allLessons[0];
    if (next) handleSelectLesson(next.slug, 1);
  }, [allLessons, completedLessons, handleSelectLesson]);

  const handleResetProgress = useCallback(() => {
    setCompletedLessons(new Set());
    setClaimedPacks(new Set());
    try {
      localStorage.removeItem(PROGRESS_KEY);
      localStorage.removeItem(CLAIMED_KEY);
    } catch { /* ignore */ }
  }, []);

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
    <div className="app-shell codex-shell" data-codex-theme={codexTheme}>
      {/* Dedicated Codex Rust Kernel Topbar */}
      <header className="topbar cdx-topbar">
        <button
          type="button"
          className="tactile-btn topbar-icon-btn topbar-menu-btn"
          onClick={() => setMobileDrawerOpen(true)}
          aria-label="打开课程目录"
        >
          <Menu size={15} />
        </button>

        <button type="button" className="topbar-pill cdx-back-pill" onClick={onBackToPortal} title="返回 Learn Agent 学习包">
          <ArrowLeft size={13} /> Learn Agent
        </button>

        <div
          className="brand cdx-brand"
          onClick={() => handleChangeMode('studio')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleChangeMode('studio')}
        >
          <div className="cdx-brand-badge">
            <img src={CODEX_BUNDLE.brandIcon} alt="Codex" />
          </div>
          <span className="brand-title">OpenAI Codex</span>
        </div>

        <nav className="topbar-modes cdx-mode-tabs" aria-label="Codex 视图切换">
          <button
            type="button"
            className={`topbar-pill ${route.mode === 'studio' ? 'topbar-pill--active' : ''}`}
            onClick={() => handleChangeMode('studio')}
          >
            <Home size={13} /> 欢迎画室
          </button>
          <button
            type="button"
            className={`topbar-pill ${route.mode === 'mindmap' ? 'topbar-pill--active' : ''}`}
            onClick={() => handleChangeMode('mindmap', matchedMindNode?.id ?? 'root')}
          >
            <Network size={13} /> 源码脑图
          </button>
          <button
            type="button"
            className={`topbar-pill ${route.mode === 'learn' ? 'topbar-pill--active' : ''}`}
            onClick={() => handleChangeMode('learn')}
          >
            <BookOpen size={13} /> 源码精读
          </button>
          <button
            type="button"
            className={`topbar-pill ${route.mode === 'workbench' ? 'topbar-pill--active' : ''}`}
            onClick={() => handleChangeMode('workbench')}
          >
            <FlaskConical size={13} /> 内核实验台
          </button>
          <button
            type="button"
            className={`topbar-pill ${route.mode === 'cheatsheet' ? 'topbar-pill--active' : ''}`}
            onClick={() => handleChangeMode('cheatsheet')}
          >
            速查表
          </button>
          <button
            type="button"
            className={`topbar-pill ${route.mode === 'deck' ? 'topbar-pill--active' : ''}`}
            onClick={() => handleChangeMode('deck')}
          >
            <Sparkles size={13} /> 卡册
            <span className="topbar-deck-badge">{unlockedCardsCount}/{CODEX_BUNDLE.cards.length}</span>
          </button>
        </nav>

        <div className="topbar-spacer" />

        <button type="button" className="topbar-search" onClick={() => setSearchOpen(true)} aria-label="搜索 Codex 源码课">
          <Search size={13} />
          <span>搜索 codex-rs…</span>
          <span className="kbd">Ctrl K</span>
        </button>

        <div className="topbar-links">
          <a className="topbar-pill" href={CODEX_BUNDLE.repoUrl} target="_blank" rel="noopener noreferrer">
            <Code2 size={13} /> openai/codex <ExternalLink size={11} />
          </a>
        </div>

        <button
          type="button"
          className="tactile-btn topbar-icon-btn"
          onClick={handleToggleSound}
          title={soundMutedState ? '开启音效' : '静音'}
          aria-label={soundMutedState ? '开启音效' : '静音'}
          aria-pressed={!soundMutedState}
        >
          {soundMutedState ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>

        <button
          type="button"
          className="tactile-btn topbar-icon-btn"
          onClick={handleToggleTheme}
          title={codexTheme === 'carbon' ? '切换工程蓝图浅色主题' : '切换碳黑内核深色主题'}
          aria-label="切换 Codex 主题"
        >
          {codexTheme === 'carbon' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </header>

      {/* Main Content Area by Mode */}
      {route.mode === 'studio' ? (
        <HarnessStudioView
          config={HARNESS_STUDIOS.codex}
          chapters={CODEX_BUNDLE.chapters}
          completedLessons={completedLessons}
          onJumpToLesson={(slug, stepNumber) => handleSelectLesson(slug, stepNumber)}
          onOpenMindmap={() => handleChangeMode('mindmap', matchedMindNode?.id ?? 'root')}
          onOpenDeck={() => handleChangeMode('deck')}
          extraAction={{ label: '内核实验台', onClick: () => handleChangeMode('workbench') }}
        />
      ) : route.mode === 'mindmap' ? (
        <CodexMindmapView
          initialNodeId={route.mindNodeId}
          onJumpToLesson={(slug, stepNumber) => handleSelectLesson(slug, stepNumber)}
          onOpenWorkbench={() => handleChangeMode('workbench')}
        />
      ) : route.mode === 'workbench' ? (
        <div className="cheatsheet-scroll-container cdx-wb-scroll">
          <CodexWorkbenchView onJumpToLesson={(slug, stepNumber) => handleSelectLesson(slug, stepNumber)} />
        </div>
      ) : route.mode === 'cheatsheet' ? (
        <div className="cheatsheet-scroll-container">
          <CheatsheetView
            data={CODEX_BUNDLE.cheatsheet}
            onJumpToLesson={(slug, stepNumber) => handleSelectLesson(slug, stepNumber)}
            onBackToLearn={() => handleChangeMode('learn')}
          />
        </div>
      ) : route.mode === 'deck' ? (
        <div className="cheatsheet-scroll-container">
          <DeckView
            deckTitle={CODEX_BUNDLE.deckTitle}
            brandIcon={CODEX_BUNDLE.brandIcon}
            cards={CODEX_BUNDLE.cards}
            chapters={CODEX_BUNDLE.chapters}
            completedLessons={completedLessons}
            onOpenPack={(card, isDemo) => setPackModal({ card, isDemo })}
            onJumpToLesson={(slug) => handleSelectLesson(slug, 1)}
            onBackToLearn={() => handleChangeMode('learn')}
          />
        </div>
      ) : currentLesson && currentStep ? (
        <div className={sidebarCollapsed ? 'workspace-grid workspace-grid--sidebar-collapsed' : 'workspace-grid'}>
          <Sidebar
            chapters={CODEX_BUNDLE.chapters}
            activeLessonSlug={currentLesson.slug}
            completedLessons={completedLessons}
            onSelectLesson={(slug) => handleSelectLesson(slug, 1)}
            onContinue={handleContinue}
            onResetProgress={handleResetProgress}
            collapsed={sidebarCollapsed}
            onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
          />

          <div className="stage-slot cdx-stage-slot">
            <StagePanel
              lesson={currentLesson}
              step={currentStep}
              stepIndex={safeStepIndex}
              totalSteps={currentLesson.steps.length}
              chapterColor={currentChapter?.color ?? 'violet'}
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

      {mobileDrawerOpen && (
        <div
          className="mobile-drawer-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Codex 课程目录抽屉"
          onClick={(e) => { if (e.target === e.currentTarget) setMobileDrawerOpen(false); }}
        >
          <div className="mobile-drawer">
            <div className="mobile-drawer-top">
              <span className="brand-title">OpenAI Codex (codex-rs)</span>
              <button type="button" className="tactile-btn" style={{ width: 30, height: 30, padding: 0 }} onClick={() => setMobileDrawerOpen(false)} aria-label="关闭目录">
                <X size={15} />
              </button>
            </div>
            <div className="mobile-drawer-content">
              <Sidebar
                chapters={CODEX_BUNDLE.chapters}
                activeLessonSlug={currentLesson?.slug ?? ''}
                completedLessons={completedLessons}
                onSelectLesson={(slug) => handleSelectLesson(slug, 1)}
                onContinue={handleContinue}
                onResetProgress={handleResetProgress}
              />
            </div>
            <div className="mobile-drawer-links">
              <a className="topbar-pill" href={CODEX_BUNDLE.repoUrl} target="_blank" rel="noopener noreferrer">
                <Code2 size={13} /> openai/codex <ExternalLink size={11} />
              </a>
            </div>
          </div>
        </div>
      )}

      <PluginPackModal
        card={packModal?.card ?? null}
        isDemo={packModal?.isDemo}
        packLabel={CODEX_BUNDLE.packLabel}
        brandIcon={CODEX_BUNDLE.brandIcon}
        onClose={() => setPackModal(null)}
        onJumpToLesson={(slug) => handleSelectLesson(slug, 1)}
        onOpenDeck={() => handleChangeMode('deck')}
      />

      <SearchModal
        isOpen={searchOpen}
        lessons={allLessons}
        suggestions={CODEX_BUNDLE.searchSuggestions}
        cheatsheetMeta={CODEX_BUNDLE.cheatsheetMeta}
        onClose={() => setSearchOpen(false)}
        onSelectTarget={({ mode, lessonSlug, stepNumber }) => {
          if (mode === 'cheatsheet') handleChangeMode('cheatsheet');
          else if (lessonSlug) handleSelectLesson(lessonSlug, stepNumber ?? 1);
        }}
      />
    </div>
  );
}
