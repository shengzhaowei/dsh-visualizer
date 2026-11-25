import { CODEX_MINDMAP_DATA } from '../../data/harnesses/codex/mindmap';
import { CODEX_REPO } from '../../data/helpers';
import { SourceMindmapView } from '../../components/SourceMindmapView';

interface CodexMindmapViewProps {
  initialNodeId?: string;
  onJumpToLesson: (slug: string, stepNumber?: number) => void;
  onOpenWorkbench: () => void;
}

export function CodexMindmapView({ initialNodeId, onJumpToLesson, onOpenWorkbench }: CodexMindmapViewProps) {
  return (
    <SourceMindmapView
      root={CODEX_MINDMAP_DATA}
      repoUrl={CODEX_REPO}
      initialNodeId={initialNodeId}
      searchPlaceholder="搜索 crate、枚举、源码…"
      onJumpToLesson={onJumpToLesson}
      secondaryAction={{ label: '打开 SQ/EQ 内核实验台', onClick: onOpenWorkbench }}
    />
  );
}
