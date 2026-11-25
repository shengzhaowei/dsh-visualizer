import { HarnessApp, type HarnessRouteState } from '../harness/HarnessApp';
import { DSH_BUNDLE } from '../../data/harnessRegistry';

export type DshRouteState = HarnessRouteState;

interface DshAppProps {
  route: DshRouteState;
  onNavigate: (next: DshRouteState) => void;
  onBackToPortal: () => void;
}

/** 兼容包装：委托至通用 HarnessApp 渲染 DeepSeek Harness。 */
export function DshApp({ route, onNavigate, onBackToPortal }: DshAppProps) {
  return (
    <HarnessApp
      bundle={DSH_BUNDLE}
      route={route}
      onNavigate={onNavigate}
      onBackToPortal={onBackToPortal}
    />
  );
}
