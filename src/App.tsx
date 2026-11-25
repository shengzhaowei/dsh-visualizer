import { useCallback, useEffect, useRef, useState } from 'react';
import { ALL_LESSONS, getLessonBySlug } from './data/curriculum';
import { LearnAgentPortal } from './apps/learn-agent/LearnAgentPortal';
import { DshApp, type DshRouteState } from './apps/dsh/DshApp';
import { PortalWarpOverlay, type WarpRequest } from './components/PortalWarpOverlay';

type RootRoute =
  | { app: 'portal' }
  | { app: 'dsh'; dsh: DshRouteState };

function parseRootHash(hash: string): RootRoute {
  const fallbackSlug = ALL_LESSONS[0]?.slug ?? '';
  const cleaned = hash.replace(/^#\/?/, '').trim();
  if (!cleaned || /^home\/?$/.test(cleaned)) return { app: 'portal' };

  const dshPath = cleaned.replace(/^dsh\/?/, '');
  if (/^cheatsheet\/?$/.test(dshPath)) {
    return { app: 'dsh', dsh: { mode: 'cheatsheet', lessonSlug: fallbackSlug, stepIndex: 0 } };
  }
  if (/^deck\/?$/.test(dshPath)) {
    return { app: 'dsh', dsh: { mode: 'deck', lessonSlug: fallbackSlug, stepIndex: 0 } };
  }
  const m = dshPath.match(/^learn\/([^/]+)(?:\/(\d+))?\/?$/);
  if (m) {
    let slug = m[1];
    try { slug = decodeURIComponent(m[1]); } catch { /* keep raw */ }
    const lesson = getLessonBySlug(slug) ?? ALL_LESSONS[0];
    if (lesson) {
      const requested = m[2] ? parseInt(m[2], 10) : 1;
      return {
        app: 'dsh',
        dsh: {
          mode: 'learn',
          lessonSlug: lesson.slug,
          stepIndex: Math.max(0, Math.min(lesson.steps.length - 1, (Number.isNaN(requested) ? 1 : requested) - 1)),
        },
      };
    }
  }
  if (/^dsh\/?$/.test(cleaned)) {
    return { app: 'dsh', dsh: { mode: 'learn', lessonSlug: fallbackSlug, stepIndex: 0 } };
  }
  return { app: 'portal' };
}

function buildRootHash(route: RootRoute): string {
  if (route.app === 'portal') return '#/';
  const { mode, lessonSlug, stepIndex } = route.dsh;
  if (mode === 'cheatsheet') return '#/dsh/cheatsheet';
  if (mode === 'deck') return '#/dsh/deck';
  return `#/dsh/learn/${encodeURIComponent(lessonSlug)}/${stepIndex + 1}`;
}

/** 顶层路由分发器：承载驻留于父层的 60fps 星际光隧穿越特效，彻底解耦入口与子应用。 */
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
          <LearnAgentPortal
            onTriggerWarp={triggerWarp}
            onEnterDsh={(origin) =>
              triggerWarp('dsh', 'DeepSeek Harness', origin?.x ?? 0.5, origin?.y ?? 0.5, () =>
                navigate({
                  app: 'dsh',
                  dsh: { mode: 'learn', lessonSlug: ALL_LESSONS[0]?.slug ?? '', stepIndex: 0 },
                }),
              )
            }
          />
        </div>
      ) : (
        <div className="app-warp-land">
          <DshApp
            route={route.dsh}
            onNavigate={(dsh) => navigate({ app: 'dsh', dsh })}
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
