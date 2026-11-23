import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import { Code2, ExternalLink, X } from 'lucide-react';
import { CHEATSHEET_DATA } from './data/cheatsheet';
import { ALL_LESSONS, CHAPTERS, getChapterForLesson, getLessonBySlug, getNextLesson } from './data/curriculum';
import { CheatsheetView } from './components/CheatsheetView';
import { InspectorPanel } from './components/InspectorPanel';
import { SearchModal } from './components/SearchModal';
import { Sidebar } from './components/Sidebar';
import { StagePanel } from './components/StagePanel';
import { TopBar } from './components/TopBar';

type AppMode = 'learn' | 'cheatsheet';
type Theme = 'light' | 'dark';

interface RouteState {
  mode: AppMode;
  lessonSlug: string;
  stepIndex: number; // 0-based
}

const STORAGE_THEME_KEY = 'dsh-visualizer-theme';
const STORAGE_PROGRESS_KEY = 'dsh-visualizer-completed';

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // ignore
  }
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function loadCompletedLessons(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_PROGRESS_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed.filter((v): v is string => typeof v === 'string'));
  } catch {
    // ignore
  }
  return new Set();
}

function parseHashRoute(hash: string): RouteState {
  const fallbackSlug = ALL_LESSONS[0]?.slug ?? '';
  const cleaned = hash.replace(/^#\/?/, '').trim();
  if (/^cheatsheet\/?$/.test(cleaned)) return { mode: 'cheatsheet', lessonSlug: fallbackSlug, stepIndex: 0 };
  const m = cleaned.match(/^learn\/([^/]+)(?:\/(\d+))?\/?$/);
  if (m) {
    let slug = m[1];
    try { slug = decodeURIComponent(m[1]); } catch { /* keep raw */ }
    const lesson = getLessonBySlug(slug) ?? ALL_LESSONS[0];
    if (lesson) {
      const requested = m[2] ? parseInt(m[2], 10) : 1;
      return {
        mode: 'learn',
        lessonSlug: lesson.slug,
        stepIndex: Math.max(0, Math.min(lesson.steps.length - 1, (Number.isNaN(requested) ? 1 : requested) - 1)),
      };
    }
  }
  return { mode: 'learn', lessonSlug: fallbackSlug, stepIndex: 0 };
}

function buildHash(route: RouteState): string {
  if (route.mode === 'cheatsheet') return '#/cheatsheet';
  if (!route.lessonSlug) return '#/learn';
  return `#/learn/${encodeURIComponent(route.lessonSlug)}/${route.stepIndex + 1}`;
}

export function App() {
  const [route, setRoute] = useState<RouteState>(() =>
    parseHashRoute(typeof window !== 'undefined' ? window.location.hash : ''),
  );
  const [lastLearnRoute, setLastLearnRoute] = useState({ lessonSlug: route.lessonSlug, stepIndex: route.mode === 'learn' ? route.stepIndex : 0 });
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(loadCompletedLessons);
  const [isPlaying, setIsPlaying] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navigate = useCallback((next: RouteState) => {
    setRoute(next);
    if (next.mode === 'learn' && next.lessonSlug) setLastLearnRoute({ lessonSlug: next.lessonSlug, stepIndex: next.stepIndex });
    const targetHash = buildHash(next);
    if (window.location.hash !== targetHash) window.location.hash = targetHash;
  }, []);

  useEffect(() => {
    const canonical = buildHash(parseHashRoute(window.location.hash));
    if (window.location.hash !== canonical) window.history.replaceState(null, '', canonical);
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const parsed = parseHashRoute(window.location.hash);
      setRoute(parsed);
      if (parsed.mode === 'learn' && parsed.lessonSlug) setLastLearnRoute({ lessonSlug: parsed.lessonSlug, stepIndex: parsed.stepIndex });
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const currentLesson = useMemo(() => getLessonBySlug(route.lessonSlug) ?? ALL_LESSONS[0], [route.lessonSlug]);
  const safeStepIndex = useMemo(() => {
    if (!currentLesson) return 0;
    return Math.max(0, Math.min(currentLesson.steps.length - 1, route.stepIndex));
  }, [currentLesson, route.stepIndex]);
  const currentStep = currentLesson?.steps[safeStepIndex];
  const currentChapter = currentLesson ? getChapterForLesson(currentLesson) : undefined;
  const nextLesson = currentLesson ? getNextLesson(currentLesson.slug) : undefined;

  // Mark lesson complete when the final step is reached.
  useEffect(() => {
    if (route.mode !== 'learn' || !currentLesson) return;
    if (safeStepIndex === currentLesson.steps.length - 1) {
      setCompletedLessons((prev) => {
        if (prev.has(currentLesson.slug)) return prev;
        const next = new Set(prev);
        next.add(currentLesson.slug);
        try { localStorage.setItem(STORAGE_PROGRESS_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
        return next;
      });
    }
  }, [route.mode, currentLesson, safeStepIndex]);

  const applyThemeDom = useCallback((nextTheme: Theme) => {
    if (nextTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    try { localStorage.setItem(STORAGE_THEME_KEY, nextTheme); } catch { /* ignore */ }
  }, []);

  const handleToggleTheme = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
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
    const lesson = getLessonBySlug(slug);
    const maxIdx = lesson ? lesson.steps.length - 1 : 0;
    navigate({ mode: 'learn', lessonSlug: slug, stepIndex: Math.max(0, Math.min(maxIdx, stepNumber - 1)) });
    setIsPlaying(false);
    setReplayKey((k) => k + 1);
    setMobileDrawerOpen(false);
  }, [navigate]);

  const handleSelectStep = useCallback((stepIdx: number) => {
    if (!currentLesson) return;
    navigate({ mode: 'learn', lessonSlug: currentLesson.slug, stepIndex: Math.max(0, Math.min(currentLesson.steps.length - 1, stepIdx)) });
  }, [currentLesson, navigate]);

  const handlePrevStep = useCallback(() => { if (safeStepIndex > 0) handleSelectStep(safeStepIndex - 1); }, [safeStepIndex, handleSelectStep]);
  const handleNextStep = useCallback(() => { if (currentLesson && safeStepIndex < currentLesson.steps.length - 1) handleSelectStep(safeStepIndex + 1); }, [currentLesson, safeStepIndex, handleSelectStep]);
  const handleTogglePlay = useCallback(() => setIsPlaying((p) => !p), []);
  const handleReplay = useCallback(() => { setIsPlaying(true); setReplayKey((k) => k + 1); }, []);

  const handleChangeMode = useCallback((nextMode: AppMode) => {
    if (nextMode === 'cheatsheet') navigate({ mode: 'cheatsheet', lessonSlug: lastLearnRoute.lessonSlug, stepIndex: lastLearnRoute.stepIndex });
    else navigate({ mode: 'learn', lessonSlug: lastLearnRoute.lessonSlug || ALL_LESSONS[0]?.slug || '', stepIndex: lastLearnRoute.stepIndex });
    setMobileDrawerOpen(false);
  }, [navigate, lastLearnRoute]);

  const handleGoHome = useCallback(() => {
    const first = ALL_LESSONS[0];
    if (first) handleSelectLesson(first.slug, 1);
  }, [handleSelectLesson]);

  const handleContinue = useCallback(() => {
    const next = ALL_LESSONS.find((l) => !completedLessons.has(l.slug)) ?? ALL_LESSONS[0];
    if (next) handleSelectLesson(next.slug, 1);
  }, [completedLessons, handleSelectLesson]);

  const handleResetProgress = useCallback(() => {
    setCompletedLessons(new Set());
    try { localStorage.removeItem(STORAGE_PROGRESS_KEY); } catch { /* ignore */ }
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
      if (searchOpen || mobileDrawerOpen || route.mode !== 'learn') return;
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
  }, [searchOpen, mobileDrawerOpen, route.mode, handlePrevStep, handleNextStep, handleTogglePlay, handleReplay]);

  const canPrev = safeStepIndex > 0;
  const canNext = currentLesson ? safeStepIndex < currentLesson.steps.length - 1 : false;

  return (
    <div className="app-shell">
      <TopBar
        mode={route.mode}
        theme={theme}
        onChangeMode={handleChangeMode}
        onOpenSearch={() => setSearchOpen(true)}
        onToggleTheme={handleToggleTheme}
        onOpenMobileDrawer={() => setMobileDrawerOpen(true)}
        onGoHome={handleGoHome}
      />

      {route.mode === 'cheatsheet' ? (
        <div className="cheatsheet-scroll-container">
          <CheatsheetView
            data={CHEATSHEET_DATA}
            onJumpToLesson={(slug, stepNumber) => handleSelectLesson(slug, stepNumber)}
            onBackToLearn={() => handleChangeMode('learn')}
          />
        </div>
      ) : currentLesson && currentStep ? (
        <div className={sidebarCollapsed ? 'workspace-grid workspace-grid--sidebar-collapsed' : 'workspace-grid'}>
          <Sidebar
            chapters={CHAPTERS}
            activeLessonSlug={currentLesson.slug}
            currentStepIndex={safeStepIndex}
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
            onPrevStep={handlePrevStep}
            onNextStep={handleNextStep}
            onSelectLesson={(slug) => handleSelectLesson(slug, 1)}
            onOpenCheatsheet={() => handleChangeMode('cheatsheet')}
          />
        </div>
      ) : (
        <div className="empty-curriculum">
          <div className="empty-curriculum-card">
            <h2>课程数据尚未载入</h2>
            <p>等待章节作者填充 <code>src/data/chapters/*.ts</code> 内容，或切换到速查表查看架构总览。</p>
          </div>
        </div>
      )}

      {mobileDrawerOpen && (
        <div className="mobile-drawer-backdrop" role="dialog" aria-modal="true" aria-label="课程目录抽屉" onClick={(e) => { if (e.target === e.currentTarget) setMobileDrawerOpen(false); }}>
          <div className="mobile-drawer">
            <div className="mobile-drawer-top">
              <span className="brand-title">DSH Agent Loop</span>
              <button type="button" className="tactile-btn" style={{ width: 30, height: 30, padding: 0 }} onClick={() => setMobileDrawerOpen(false)} aria-label="关闭目录">
                <X size={15} />
              </button>
            </div>
            <div className="mobile-drawer-content">
              <Sidebar
                chapters={CHAPTERS}
                activeLessonSlug={currentLesson?.slug ?? ''}
                currentStepIndex={safeStepIndex}
                completedLessons={completedLessons}
                onSelectLesson={(slug) => handleSelectLesson(slug, 1)}
                onContinue={handleContinue}
                onResetProgress={handleResetProgress}
              />
            </div>
            <div className="mobile-drawer-links">
              <a className="topbar-pill" href="https://github.com/deepseek-ai/deepseek-harness" target="_blank" rel="noopener noreferrer">
                <Code2 size={13} /> DSH 源码 <ExternalLink size={11} />
              </a>
              <a className="topbar-pill" href="https://namiai.tech/dsh/" target="_blank" rel="noopener noreferrer">
                namiai.tech/dsh
              </a>
            </div>
          </div>
        </div>
      )}

      <SearchModal
        isOpen={searchOpen}
        lessons={ALL_LESSONS}
        onClose={() => setSearchOpen(false)}
        onSelectTarget={({ mode, lessonSlug, stepNumber }) => {
          if (mode === 'cheatsheet') handleChangeMode('cheatsheet');
          else if (lessonSlug) handleSelectLesson(lessonSlug, stepNumber ?? 1);
        }}
      />
    </div>
  );
}

export default App;
