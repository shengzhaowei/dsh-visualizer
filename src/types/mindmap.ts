import type { SourceLanguage } from './lesson';

export type MindBranchTone = 'violet' | 'blue' | 'amber' | 'emerald' | 'rose' | 'cyan';

export interface MindNode {
  id: string;
  label: string;
  sub?: string;
  tone: MindBranchTone;
  badge: string;
  file?: string;
  lessonSlug: string;
  stepNumber?: number;
  summary: string;
  points?: string[];
  code?: string;
  codeLang?: SourceLanguage;
  children?: MindNode[];
}

export function findMindNode(root: MindNode, id: string): MindNode | null {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const hit = findMindNode(child, id);
    if (hit) return hit;
  }
  return null;
}

export function findMindNodeByLesson(root: MindNode, slug: string): MindNode | null {
  const stack: MindNode[] = [root];
  let fallback: MindNode | null = null;
  while (stack.length > 0) {
    const cur = stack.shift()!;
    if (cur.lessonSlug === slug) {
      if (cur.id !== 'root') return cur;
      fallback = cur;
    }
    if (cur.children) stack.push(...cur.children);
  }
  return fallback;
}
