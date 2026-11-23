// DSH Agent Loop Visualizer — lesson data contract.
// Original schema written for this project (style inspired by pi-visualizer).

export type ChapterColor = 'sage' | 'blue' | 'violet' | 'amber' | 'coral' | 'teal';
export type LessonLevel = '入门' | '核心' | '进阶';
export type StepBadge = 'PROBLEM' | 'TECHNIQUE' | 'SOLUTION' | 'INSIGHT' | 'RECAP';
export type CalloutKind = 'idea' | 'tip' | 'warn';
export type KpiStatus = 'neutral' | 'good' | 'warn' | 'bad';
export type SourceLanguage = 'ts' | 'json' | 'text';
export type StageTone = 'neutral' | 'green' | 'violet' | 'blue' | 'orange' | 'rose';
export type IsoNodeTone = StageTone | 'dark';

// ---------------------------------------------------------------------------
// Stage scenes — three original SVG renderers, all driven by lesson data.
// ---------------------------------------------------------------------------

export interface IsoNode {
  id: string;
  x: number; // 0..1000
  y: number; // 0..560
  label: string;
  sublabel?: string;
  tone: IsoNodeTone;
  size?: 'sm' | 'md' | 'lg' | 'platform';
  active?: boolean;
  dimmed?: boolean;
  badge?: string;
}

export interface IsoEdge {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
  status?: 'normal' | 'active' | 'error' | 'dimmed';
}

export interface IsoCallout {
  x: number;
  y: number;
  text: string;
  tone?: StageTone;
}

export interface IsoFlowScene {
  kind: 'iso-flow';
  title?: string;
  nodes: IsoNode[];
  edges: IsoEdge[];
  callouts?: IsoCallout[];
}

export interface SwimlaneLane {
  id: string;
  label: string;
  sublabel?: string;
  tone?: StageTone;
}

export interface SwimlaneBar {
  id: string;
  laneId: string;
  start: number; // 0..100
  end: number; // 0..100
  label: string;
  sublabel?: string;
  tone: StageTone;
  status?: 'running' | 'done' | 'blocked' | 'error' | 'parallel' | 'queued';
}

export interface SwimlaneEvent {
  id: string;
  laneId: string;
  pos: number; // 0..100
  label: string;
  tone?: StageTone;
  emphasized?: boolean;
}

export interface SwimlaneScene {
  kind: 'swimlane';
  title?: string;
  lanes: SwimlaneLane[];
  ticks?: { pos: number; label: string }[];
  bars: SwimlaneBar[];
  events?: SwimlaneEvent[];
}

export type TreeNodeKind = 'root' | 'plugin' | 'service' | 'event' | 'user' | 'assistant' | 'tool' | 'log';

export interface TreeNode {
  id: string;
  x: number; // 0..1000
  y: number; // 0..560
  kind: TreeNodeKind;
  label: string;
  sublabel?: string;
  status?: 'active' | 'done' | 'highlight' | 'new' | 'dimmed';
  badge?: string;
}

export interface TreeEdge {
  from: string;
  to: string;
  label?: string;
  animated?: boolean;
}

export interface TreeScene {
  kind: 'tree';
  title?: string;
  nodes: TreeNode[];
  edges: TreeEdge[];
  annotations?: { x: number; y: number; text: string; tone?: StageTone }[];
}

export type StageScene = IsoFlowScene | SwimlaneScene | TreeScene;

// ---------------------------------------------------------------------------
// Lesson & curriculum
// ---------------------------------------------------------------------------

export interface LessonObjective {
  id: string;
  text: string;
  completedAtStep: number; // 1-based
}

export interface StepCallout {
  kind: CalloutKind;
  title?: string;
  text: string;
}

export interface SourceDrawer {
  title: string;
  filePath: string;
  githubUrl: string;
  language: SourceLanguage;
  code: string;
  caption?: string;
}

export interface RecapRow {
  question: string;
  decision: string;
  because: string;
}

export interface StepKpi {
  label: string;
  value: string;
  status?: KpiStatus;
}

export interface LessonStep {
  stepNumber: number; // 1-based
  shortLabel: string;
  badge: StepBadge;
  title: string;
  paragraphs: string[]; // supports inline `code` backticks
  callout?: StepCallout;
  sourceDrawer?: SourceDrawer;
  recapTable?: RecapRow[];
  kpis: StepKpi[];
  scene: StageScene;
}

export interface Lesson {
  id: string;
  slug: string;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  lessonIndexInChapter: number;
  totalInChapter: number;
  title: string;
  subtitle: string;
  durationMin: number;
  level: LessonLevel;
  objectives: LessonObjective[];
  steps: LessonStep[];
}

export interface Chapter {
  id: string;
  number: number;
  title: string;
  color: ChapterColor;
  lessons: Lesson[];
}

// ---------------------------------------------------------------------------
// Cheatsheet contract
// ---------------------------------------------------------------------------

export interface CheatsheetSection {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  lessonSlug?: string;
  stepNumber?: number;
  kind: 'table' | 'cards' | 'map';
  headers: string[];
  rows: string[][];
}

export interface CheatsheetData {
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    repoNote: string;
    scopeNote: string;
    stats: { label: string; value: string }[];
  };
  sections: CheatsheetSection[];
}
