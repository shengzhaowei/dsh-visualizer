import { useEffect, useState } from 'react';
import { ArrowLeftRight, ArrowRight, ExternalLink, X } from 'lucide-react';
import { HARNESS_ENTRIES, type HarnessEntry } from '../../data/harnesses';
import type { WarpRequest } from '../../components/PortalWarpOverlay';
import { HarnessCompareModal } from './HarnessCompareModal';

interface LearnAgentPortalProps {
  onEnterDsh: (origin?: { x: number; y: number }) => void;
  onTriggerWarp: (
    harness: WarpRequest['harness'],
    label: string,
    originX: number,
    originY: number,
    onMidpoint: () => void,
  ) => void;
}

/** 独立的 Learn Agent 全屏入口：不依赖任何单个 Harness 的壳子，撕开卡包后平等路由到 5 个 Harness。 */
export function LearnAgentPortal({ onEnterDsh, onTriggerWarp }: LearnAgentPortalProps) {
  const [selectedHarness, setSelectedHarness] = useState<HarnessEntry | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as {
        type?: string;
        harness?: WarpRequest['harness'];
        name?: string;
        x?: number;
        y?: number;
      } | null;
      if (!data || data.type !== 'learn-agent:select' || !data.harness) return;

      const ox = typeof data.x === 'number' ? data.x : 0.5;
      const oy = typeof data.y === 'number' ? data.y : 0.5;

      if (data.harness === 'dsh') {
        onEnterDsh({ x: ox, y: oy });
        return;
      }

      const entry = HARNESS_ENTRIES.find((h) => h.id === data.harness);
      if (!entry) return;

      onTriggerWarp(entry.id, entry.name, ox, oy, () => {
        if (entry.status === 'external' && entry.href) {
          const win = window.open(entry.href, '_blank', 'noopener,noreferrer');
          if (!win) setSelectedHarness(entry);
        } else {
          setSelectedHarness(entry);
        }
      });
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onEnterDsh, onTriggerWarp]);

  useEffect(() => {
    if (!selectedHarness) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedHarness(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedHarness]);

  return (
    <main className="portal-fullscreen" aria-label="Learn Agent">
      <iframe
        src="/holo/index.html"
        className="holo-home-iframe"
        title="Learn Agent — Agent 学习包"
        allow="autoplay"
      />

      <button
        type="button"
        className="portal-compare-fab"
        onClick={() => setCompareOpen(true)}
      >
        <ArrowLeftRight size={14} /> 机制对比
      </button>

      <HarnessCompareModal
        isOpen={compareOpen}
        onClose={() => setCompareOpen(false)}
        onEnterDsh={() => onEnterDsh()}
      />

      {selectedHarness && (
        <div
          className="harness-sheet-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={selectedHarness.name}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedHarness(null);
          }}
        >
          <div className="harness-sheet app-warp-land">
            <button
              type="button"
              className="guide-close"
              onClick={() => setSelectedHarness(null)}
              aria-label="关闭"
            >
              <X size={15} />
            </button>
            <h2 className="harness-sheet-title">{selectedHarness.name}</h2>
            <div className="harness-sheet-prims">
              {selectedHarness.primitives.map((p) => (
                <span key={p} className="harness-sheet-prim mono">{p}</span>
              ))}
            </div>
            <ul className="harness-sheet-list">
              {selectedHarness.decisions.map((d, i) => (
                <li key={i}>
                  <strong>{d.q}</strong>
                  <span>{d.a}</span>
                </li>
              ))}
            </ul>
            <div className="harness-sheet-actions">
              <a
                className="tactile-btn tactile-btn--primary"
                href={selectedHarness.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                查看源码仓库 <ExternalLink size={13} />
              </a>
              <button
                type="button"
                className="tactile-btn"
                onClick={() => {
                  setSelectedHarness(null);
                  onEnterDsh();
                }}
              >
                进入 DeepSeek Harness <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
