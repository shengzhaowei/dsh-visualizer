import { useEffect, useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { isHarnessId } from '../../data/harnessRegistry';
import type { HarnessId } from '../../types/lesson';
import { HarnessCompareModal } from './HarnessCompareModal';

interface LearnAgentPortalProps {
  onEnterHarness: (harnessId: HarnessId, origin?: { x: number; y: number }) => void;
}

/** 独立的 Learn Agent 全屏入口：不依赖任何单个 Harness 的壳子，撕开卡包后平等星际穿越路由到全部 5 个站内可视化子应用。 */
export function LearnAgentPortal({ onEnterHarness }: LearnAgentPortalProps) {
  const [compareOpen, setCompareOpen] = useState(false);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as {
        type?: string;
        harness?: string;
        x?: number;
        y?: number;
      } | null;
      if (!data || data.type !== 'learn-agent:select' || !data.harness) return;
      if (!isHarnessId(data.harness)) return;

      const ox = typeof data.x === 'number' ? data.x : 0.5;
      const oy = typeof data.y === 'number' ? data.y : 0.5;
      onEnterHarness(data.harness, { x: ox, y: oy });
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onEnterHarness]);

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
        onEnterHarness={(id) => onEnterHarness(id)}
      />
    </main>
  );
}
