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

/** 叠层“纸片”底边颜色（每种语义色一个深色底边） */
export const TONE_LIP: Record<string, string> = {
  neutral: 'var(--iso-lip-neutral)',
  green: 'var(--iso-lip-green)',
  violet: 'var(--iso-lip-violet)',
  blue: 'var(--iso-lip-blue)',
  orange: 'var(--iso-lip-orange)',
  rose: 'var(--iso-lip-rose)',
  dark: 'var(--iso-lip-dark)',
};

/** 语义配色说明（图例用）：用户/输入蓝、LLM 紫、工具橙、缓存/成功绿、错误红 */
export const TONE_LABEL: Record<string, string> = {
  neutral: '框架 / 其他',
  green: '会话 / 成功',
  violet: '循环 / 核心',
  blue: '模型 / 输入',
  orange: '工具 / 审批',
  rose: '提示词 / 错误',
  dark: 'Cordis 主板',
};

export const KIND_LABEL: Record<string, string> = {
  root: '根',
  plugin: '插件',
  service: '服务',
  event: '事件',
  user: '用户',
  assistant: '模型',
  tool: '工具',
  log: '日志',
};

export const KIND_FILL: Record<string, string> = {
  root: 'var(--ink)',
  plugin: 'var(--blue)',
  service: 'var(--green)',
  event: 'var(--orange)',
  user: 'var(--violet)',
  assistant: 'var(--mint)',
  tool: 'var(--rose)',
  log: 'var(--card)',
};

export const KIND_STROKE: Record<string, string> = {
  root: 'var(--edge)',
  plugin: 'var(--blue-stroke)',
  service: 'var(--green-stroke)',
  event: 'var(--orange-stroke)',
  user: 'var(--violet-stroke)',
  assistant: 'var(--green-stroke)',
  tool: 'var(--rose-stroke)',
  log: 'var(--edge)',
};
