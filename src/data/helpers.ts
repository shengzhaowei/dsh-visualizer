// Compact builders so chapter files stay readable: every lesson is 6 steps,
// every step carries a scene, KPIs, and (usually) a source drawer or recap.
import type {
  Chapter,
  IsoFlowScene,
  Lesson,
  LessonStep,
  SourceDrawer,
  StageScene,
  StepBadge,
  StepKpi,
  SwimlaneScene,
  TreeScene,
} from '../types/lesson';

export const DSH_REPO = 'https://github.com/deepseek-ai/deepseek-harness';
export const NAMI_REPO = 'https://github.com/aa1143/NamiDSH';

export function src(
  title: string,
  filePath: string,
  githubUrl: string,
  language: SourceDrawer['language'],
  code: string,
  caption?: string,
): SourceDrawer {
  return { title, filePath, githubUrl, language, code, caption };
}

export function dshSrc(
  title: string,
  filePath: string,
  language: SourceDrawer['language'],
  code: string,
  caption?: string,
): SourceDrawer {
  return src(title, filePath, `${DSH_REPO}/blob/main/${filePath}`, language, code, caption);
}

export function namiSrc(
  title: string,
  filePath: string,
  language: SourceDrawer['language'],
  code: string,
  caption?: string,
): SourceDrawer {
  return src(title, filePath, `${NAMI_REPO}/blob/main/${filePath}`, language, code, caption);
}

export function kpi(label: string, value: string, status?: StepKpi['status']): StepKpi {
  return { label, value, status };
}

export function iso(
  title: string,
  nodes: IsoFlowScene['nodes'],
  edges: IsoFlowScene['edges'],
  callouts?: IsoFlowScene['callouts'],
  zones?: IsoFlowScene['zones'],
): IsoFlowScene {
  return { kind: 'iso-flow', title, nodes, edges, callouts, zones };
}

export function swim(
  title: string,
  lanes: SwimlaneScene['lanes'],
  bars: SwimlaneScene['bars'],
  events?: SwimlaneScene['events'],
  ticks?: SwimlaneScene['ticks'],
  phaseBands?: SwimlaneScene['phaseBands'],
  connectors?: SwimlaneScene['connectors'],
): SwimlaneScene {
  return { kind: 'swimlane', title, lanes, bars, events, ticks, phaseBands, connectors };
}

export function tree(
  title: string,
  nodes: TreeScene['nodes'],
  edges: TreeScene['edges'],
  annotations?: TreeScene['annotations'],
  filePreview?: TreeScene['filePreview'],
): TreeScene {
  return { kind: 'tree', title, nodes, edges, annotations, filePreview };
}

export interface StepSpec {
  shortLabel: string;
  badge: StepBadge;
  title: string;
  paragraphs: string[];
  callout?: LessonStep['callout'];
  sourceDrawer?: SourceDrawer;
  recapTable?: LessonStep['recapTable'];
  kpis: StepKpi[];
  scene: StageScene;
}

export function steps(specs: StepSpec[]): LessonStep[] {
  return specs.map((s, i) => ({ ...s, stepNumber: i + 1 }));
}

export function lesson(
  slug: string,
  chapterId: string,
  chapterNumber: number,
  chapterTitle: string,
  lessonIndexInChapter: number,
  totalInChapter: number,
  title: string,
  subtitle: string,
  durationMin: number,
  level: Lesson['level'],
  objectives: { text: string; completedAtStep: number }[],
  stepList: LessonStep[],
): Lesson {
  return {
    id: slug,
    slug,
    chapterId,
    chapterNumber,
    chapterTitle,
    lessonIndexInChapter,
    totalInChapter,
    title,
    subtitle,
    durationMin,
    level,
    objectives: objectives.map((o, i) => ({ id: `${slug}-obj-${i + 1}`, ...o })),
    steps: stepList,
  };
}

export function chapter(
  id: string,
  number: number,
  title: string,
  color: Chapter['color'],
  lessons: Lesson[],
): Chapter {
  return { id, number, title, color, lessons };
}
