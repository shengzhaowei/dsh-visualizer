// Original SVG renderers for DSH Visualizer — iso-flow, swimlane, tree.
// All geometry comes from lesson data; nothing is hardcoded per lesson.

export const TONE_FILL: Record<string, string> = {
  neutral: 'var(--card)',
  green: 'var(--green)',
  violet: 'var(--violet)',
  blue: 'var(--blue)',
  orange: 'var(--orange)',
  rose: 'var(--rose)',
  dark: 'var(--ink)',
};

export const TONE_STROKE: Record<string, string> = {
  neutral: 'var(--edge)',
  green: 'var(--green-stroke)',
  violet: 'var(--violet-stroke)',
  blue: 'var(--blue-stroke)',
  orange: 'var(--orange-stroke)',
  rose: 'var(--rose-stroke)',
  dark: 'var(--edge)',
};
