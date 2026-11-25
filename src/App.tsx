import { useCallback, useEffect, useRef, useState } from 'react';
import { HARNESS_BUNDLES, isHarnessId } from './data/harnessRegistry';
import type { HarnessId } from './types/lesson';
import { LearnAgentPortal } from './apps/learn-agent/LearnAgentPortal';
import { HarnessApp, type HarnessRouteState } from './apps/harness/HarnessApp';
import { PortalWarpOverlay, type WarpRequest } from './components/PortalWarpOverlay';

type RootRoute =
  | { app: 'portal' }
  | { app: 'harness'; harnessId: HarnessId; state: HarnessRouteState };

function defaultStateFor(harnessId: HarnessId): HarnessRouteState {
  const bundle = HARNESS_BUNDLES[harnessId];
  const firstSlug = bundle.chapters[0]?.lessons[0]?.slug ?? '';
  return { mode: 'learn', lessonSlug: firstSlug, stepIndex: 0 };
}

function parseHarnessSubpath(harnessId: HarnessId, subPath: string): HarnessRouteState {
  const bundle = HARNESS_BUNDLES[harnessId];
  const allLessons = bundle.chapters.flatMap((ch) => ch.lessons);
  const fallbackSlug = allLessons[0]?.slug ?? '';

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

  if (isHarnessId(firstSeg)) {
    return {
      app: 'harness',
      harnessId: firstSeg,
      state: parseHarnessSubpath(firstSeg, rest),
    };
  }

  // 兼容旧版不带前缀的 DSH 路由（#/learn/...、#/cheatsheet、#/deck）
  if (/^(learn|cheatsheet|deck)(\/|$)/.test(cleaned)) {
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
  const { harnessId, state } = route;
  if (state.mode === 'cheatsheet') return `#/${harnessId}/cheatsheet`;
  if (state.mode === 'deck') return `#/${harnessId}/deck`;
  return `#/${harnessId}/learn/${encodeURIComponent(state.lessonSlug)}/${state.stepIndex + 1}`;
}

/** 顶层路由分发器：承载驻留于父层的 60fps 星际光隧穿越特效，平等路由到全部 5 个 Harness 交互式可视化子应用。 */
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
      triggerWarp(harnessId, bundle.name, origin?.x ?? 0.5, origin?.y ?? 0.5, () =>
        navigate({
          app: 'harness',
          harnessId,
          state: defaultStateFor(harnessId),
        }),
      );
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
