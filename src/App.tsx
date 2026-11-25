import { useCallback, useEffect, useRef, useState } from 'react';
import { HARNESS_BUNDLES, isHarnessId } from './data/harnessRegistry';
import { CODEX_BUNDLE } from './data/harnesses/codex';
import { CLAUDE_CODE_BUNDLE } from './data/harnesses/claude-code';
import type { HarnessId } from './types/lesson';
import { LearnAgentPortal } from './apps/learn-agent/LearnAgentPortal';
import { HarnessApp, type HarnessRouteState } from './apps/harness/HarnessApp';
import { CodexApp, type CodexRouteState } from './apps/codex/CodexApp';
import { ClaudeCodeApp, type ClaudeCodeRouteState } from './apps/claude-code/ClaudeCodeApp';
import { PortalWarpOverlay, type WarpRequest } from './components/PortalWarpOverlay';

type GenericHarnessId = Exclude<HarnessId, 'codex' | 'claude-code'>;

type RootRoute =
  | { app: 'portal' }
  | { app: 'codex'; state: CodexRouteState }
  | { app: 'claude-code'; state: ClaudeCodeRouteState }
  | { app: 'harness'; harnessId: GenericHarnessId; state: HarnessRouteState };

function defaultStateFor(harnessId: GenericHarnessId): HarnessRouteState {
  const bundle = HARNESS_BUNDLES[harnessId];
  const firstSlug = bundle.chapters[0]?.lessons[0]?.slug ?? '';
  return { mode: 'studio', lessonSlug: firstSlug, stepIndex: 0 };
}

function parseCodexSubpath(subPath: string): CodexRouteState {
  const allLessons = CODEX_BUNDLE.chapters.flatMap((ch) => ch.lessons);
  const fallbackSlug = allLessons[0]?.slug ?? 'codex-sq-eq';

  if (!subPath || /^studio\/?$/.test(subPath)) {
    return { mode: 'studio', lessonSlug: fallbackSlug, stepIndex: 0 };
  }
  const mm = subPath.match(/^mindmap(?:\/([^/]+))?\/?$/);
  if (mm) {
    let nodeId = mm[1];
    if (nodeId) {
      try { nodeId = decodeURIComponent(nodeId); } catch { /* keep raw */ }
    }
    return { mode: 'mindmap', lessonSlug: fallbackSlug, stepIndex: 0, mindNodeId: nodeId || 'root' };
  }
  if (/^workbench\/?$/.test(subPath)) {
    return { mode: 'workbench', lessonSlug: fallbackSlug, stepIndex: 0 };
  }
  if (/^cheatsheet\/?$/.test(subPath)) {
    return { mode: 'cheatsheet', lessonSlug: fallbackSlug, stepIndex: 0 };
  }
  if (/^deck\/?$/.test(subPath)) {
    return { mode: 'deck', lessonSlug: fallbackSlug, stepIndex: 0 };
  }
  if (/^learn\/?$/.test(subPath)) {
    return { mode: 'learn', lessonSlug: fallbackSlug, stepIndex: 0 };
  }
  const m = subPath.match(/^learn\/([^/]+)(?:\/(\d+))?\/?$/);
  if (m) {
    let rawSlug = m[1];
    try { rawSlug = decodeURIComponent(m[1]); } catch { /* keep raw */ }
    const lesson = allLessons.find((l) => l.slug === rawSlug) ?? allLessons[0];
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

function parseClaudeCodeSubpath(subPath: string): ClaudeCodeRouteState {
  const allLessons = CLAUDE_CODE_BUNDLE.chapters.flatMap((ch) => ch.lessons);
  const fallbackSlug = allLessons[0]?.slug ?? 'cc-master-loop';

  if (!subPath || /^studio\/?$/.test(subPath)) {
    return { mode: 'studio', lessonSlug: fallbackSlug, stepIndex: 0 };
  }
  const mm = subPath.match(/^mindmap(?:\/([^/]+))?\/?$/);
  if (mm) {
    let nodeId = mm[1];
    if (nodeId) {
      try { nodeId = decodeURIComponent(nodeId); } catch { /* keep raw */ }
    }
    return { mode: 'mindmap', lessonSlug: fallbackSlug, stepIndex: 0, mindNodeId: nodeId || 'root' };
  }
  if (/^playground\/?$/.test(subPath)) {
    return { mode: 'playground', lessonSlug: fallbackSlug, stepIndex: 0 };
  }
  if (/^cheatsheet\/?$/.test(subPath)) {
    return { mode: 'cheatsheet', lessonSlug: fallbackSlug, stepIndex: 0 };
  }
  if (/^deck\/?$/.test(subPath)) {
    return { mode: 'deck', lessonSlug: fallbackSlug, stepIndex: 0 };
  }
  if (/^learn\/?$/.test(subPath)) {
    return { mode: 'learn', lessonSlug: fallbackSlug, stepIndex: 0 };
  }
  const m = subPath.match(/^learn\/([^/]+)(?:\/(\d+))?\/?$/);
  if (m) {
    let rawSlug = m[1];
    try { rawSlug = decodeURIComponent(m[1]); } catch { /* keep raw */ }
    const lesson = allLessons.find((l) => l.slug === rawSlug) ?? allLessons[0];
    if (lesson) {
      const requested = m[2] ? parseInt(m[2], 10) : 1;
      return {
        mode: 'learn',
        lessonSlug: lesson.slug,
        stepIndex: Math.max(0, Math.min(lesson.steps.length - 1, (Number.isNaN(requested) ? 1 : requested) - 1)),
      };
    }
  }
  return { mode: 'studio', lessonSlug: fallbackSlug, stepIndex: 0 };
}

function parseHarnessSubpath(harnessId: GenericHarnessId, subPath: string): HarnessRouteState {
  const bundle = HARNESS_BUNDLES[harnessId];
  const allLessons = bundle.chapters.flatMap((ch) => ch.lessons);
  const fallbackSlug = allLessons[0]?.slug ?? '';

  if (!subPath || /^studio\/?$/.test(subPath)) {
    return { mode: 'studio', lessonSlug: fallbackSlug, stepIndex: 0 };
  }
  const mm = subPath.match(/^mindmap(?:\/([^/]+))?\/?$/);
  if (mm) {
    let nodeId = mm[1];
    if (nodeId) {
      try { nodeId = decodeURIComponent(nodeId); } catch { /* keep raw */ }
    }
    return { mode: 'mindmap', lessonSlug: fallbackSlug, stepIndex: 0, mindNodeId: nodeId || 'root' };
  }
  if (/^cheatsheet\/?$/.test(subPath)) {
    return { mode: 'cheatsheet', lessonSlug: fallbackSlug, stepIndex: 0 };
  }
  if (/^deck\/?$/.test(subPath)) {
    return { mode: 'deck', lessonSlug: fallbackSlug, stepIndex: 0 };
  }
  const m = subPath.match(/^learn\/([^/]+)(?:\/(\d+))?\/?$/);
  if (m) {
    let rawSlug = m[1];
    try { rawSlug = decodeURIComponent(m[1]); } catch { /* keep raw */ }
    const canonicalSlug = bundle.legacySlugRedirect?.[rawSlug] ?? rawSlug;
    const lesson = allLessons.find((l) => l.slug === canonicalSlug) ?? allLessons[0];
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

function parseRootHash(hash: string): RootRoute {
  const cleaned = hash.replace(/^#\/?/, '').trim();
  if (!cleaned || /^home\/?$/.test(cleaned)) return { app: 'portal' };

  const slashIdx = cleaned.indexOf('/');
  const firstSeg = slashIdx === -1 ? cleaned : cleaned.slice(0, slashIdx);
  const rest = slashIdx === -1 ? '' : cleaned.slice(slashIdx + 1);

  if (firstSeg === 'codex') {
    return { app: 'codex', state: parseCodexSubpath(rest) };
  }
  if (firstSeg === 'claude-code') {
    return { app: 'claude-code', state: parseClaudeCodeSubpath(rest) };
  }

  if (isHarnessId(firstSeg) && firstSeg !== 'codex' && firstSeg !== 'claude-code') {
    return {
      app: 'harness',
      harnessId: firstSeg,
      state: parseHarnessSubpath(firstSeg, rest),
    };
  }

  // 兼容旧版不带前缀的 DSH 路由
  if (/^(studio|learn|mindmap|cheatsheet|deck)(\/|$)/.test(cleaned)) {
    return {
      app: 'harness',
      harnessId: 'dsh',
      state: parseHarnessSubpath('dsh', cleaned),
    };
  }

  return { app: 'portal' };
}

function buildRootHash(route: RootRoute): string {
  if (route.app === 'portal') return '#/';
  if (route.app === 'codex') {
    const { mode, lessonSlug, stepIndex, mindNodeId } = route.state;
    if (mode === 'studio') return '#/codex/studio';
    if (mode === 'mindmap') return mindNodeId && mindNodeId !== 'root' ? `#/codex/mindmap/${encodeURIComponent(mindNodeId)}` : '#/codex/mindmap';
    if (mode === 'workbench') return '#/codex/workbench';
    if (mode === 'cheatsheet') return '#/codex/cheatsheet';
    if (mode === 'deck') return '#/codex/deck';
    return `#/codex/learn/${encodeURIComponent(lessonSlug)}/${stepIndex + 1}`;
  }
  if (route.app === 'claude-code') {
    const { mode, lessonSlug, stepIndex, mindNodeId } = route.state;
    if (mode === 'studio') return '#/claude-code/studio';
    if (mode === 'mindmap') return mindNodeId && mindNodeId !== 'root' ? `#/claude-code/mindmap/${encodeURIComponent(mindNodeId)}` : '#/claude-code/mindmap';
    if (mode === 'playground') return '#/claude-code/playground';
    if (mode === 'cheatsheet') return '#/claude-code/cheatsheet';
    if (mode === 'deck') return '#/claude-code/deck';
    return `#/claude-code/learn/${encodeURIComponent(lessonSlug)}/${stepIndex + 1}`;
  }
  const { harnessId, state } = route;
  if (state.mode === 'studio') return `#/${harnessId}/studio`;
  if (state.mode === 'mindmap') {
    return state.mindNodeId && state.mindNodeId !== 'root'
      ? `#/${harnessId}/mindmap/${encodeURIComponent(state.mindNodeId)}`
      : `#/${harnessId}/mindmap`;
  }
  if (state.mode === 'cheatsheet') return `#/${harnessId}/cheatsheet`;
  if (state.mode === 'deck') return `#/${harnessId}/deck`;
  return `#/${harnessId}/learn/${encodeURIComponent(state.lessonSlug)}/${state.stepIndex + 1}`;
}

/** 顶层路由分发器：承载 60fps 星际光隧穿越特效，Codex 与 Claude Code 均使用各自差异化定制子应用。 */
export function App() {
  const [route, setRoute] = useState<RootRoute>(() =>
    parseRootHash(typeof window !== 'undefined' ? window.location.hash : ''),
  );
  const [warpRequest, setWarpRequest] = useState<WarpRequest | null>(null);
  const warpSeqRef = useRef(0);

  const navigate = useCallback((next: RootRoute) => {
    setRoute(next);
    const targetHash = buildRootHash(next);
    if (window.location.hash !== targetHash) window.location.hash = targetHash;
  }, []);

  const triggerWarp = useCallback(
    (
      harness: WarpRequest['harness'],
      label: string,
      originX: number,
      originY: number,
      onMidpoint: () => void,
    ) => {
      warpSeqRef.current += 1;
      setWarpRequest({
        id: warpSeqRef.current,
        harness,
        label,
        originX,
        originY,
        onMidpoint,
      });
    },
    [],
  );

  const enterHarness = useCallback(
    (harnessId: HarnessId, origin?: { x: number; y: number }) => {
      const bundle = HARNESS_BUNDLES[harnessId];
      triggerWarp(harnessId, bundle.name, origin?.x ?? 0.5, origin?.y ?? 0.5, () => {
        if (harnessId === 'codex') {
          navigate({
            app: 'codex',
            state: {
              mode: 'studio',
              lessonSlug: CODEX_BUNDLE.chapters[0]?.lessons[0]?.slug ?? 'codex-sq-eq',
              stepIndex: 0,
            },
          });
        } else if (harnessId === 'claude-code') {
          navigate({
            app: 'claude-code',
            state: {
              mode: 'studio',
              lessonSlug: CLAUDE_CODE_BUNDLE.chapters[0]?.lessons[0]?.slug ?? 'cc-master-loop',
              stepIndex: 0,
            },
          });
        } else {
          navigate({
            app: 'harness',
            harnessId,
            state: defaultStateFor(harnessId),
          });
        }
      });
    },
    [navigate, triggerWarp],
  );

  useEffect(() => {
    const canonical = buildRootHash(parseRootHash(window.location.hash));
    if (window.location.hash !== canonical) window.history.replaceState(null, '', canonical);
  }, []);

  useEffect(() => {
    const onHashChange = () => setRoute(parseRootHash(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return (
    <>
      {route.app === 'portal' ? (
        <div className="app-warp-land">
          <LearnAgentPortal onEnterHarness={enterHarness} />
        </div>
      ) : route.app === 'codex' ? (
        <div className="app-warp-land" key="codex">
          <CodexApp
            route={route.state}
            onNavigate={(state) => navigate({ app: 'codex', state })}
            onBackToPortal={() =>
              triggerWarp('portal', 'Agent 学习包', 0.12, 0.05, () => navigate({ app: 'portal' }))
            }
          />
        </div>
      ) : route.app === 'claude-code' ? (
        <div className="app-warp-land" key="claude-code">
          <ClaudeCodeApp
            route={route.state}
            onNavigate={(state) => navigate({ app: 'claude-code', state })}
            onBackToPortal={() =>
              triggerWarp('portal', 'Agent 学习包', 0.12, 0.05, () => navigate({ app: 'portal' }))
            }
          />
        </div>
      ) : (
        <div className="app-warp-land" key={route.harnessId}>
          <HarnessApp
            bundle={HARNESS_BUNDLES[route.harnessId]}
            route={route.state}
            onNavigate={(state) => navigate({ app: 'harness', harnessId: route.harnessId, state })}
            onBackToPortal={() =>
              triggerWarp('portal', 'Agent 学习包', 0.12, 0.05, () => navigate({ app: 'portal' }))
            }
          />
        </div>
      )}

      <PortalWarpOverlay request={warpRequest} onDone={() => setWarpRequest(null)} />
    </>
  );
}

export default App;
