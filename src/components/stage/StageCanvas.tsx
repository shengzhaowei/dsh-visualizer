import type { StageScene } from '../../types/lesson';
import { IsoFlowSvg } from './IsoFlowSvg';
import { SwimlaneSvg } from './SwimlaneSvg';
import { TreeSvg } from './TreeSvg';

export function StageCanvas({ scene, isPlaying }: { scene: StageScene; isPlaying: boolean }) {
  if (scene.kind === 'iso-flow') return <IsoFlowSvg scene={scene} active={isPlaying} />;
  if (scene.kind === 'swimlane') return <SwimlaneSvg scene={scene} />;
  return <TreeSvg scene={scene} />;
}
