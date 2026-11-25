import { CHAPTERS } from './curriculum';
import { CHEATSHEET_DATA } from './cheatsheet';
import { PLUGIN_HOLO_CARDS } from './cards';
import { DSH_MINDMAP_DATA } from './harnesses/dsh/mindmap';
import { PI_BUNDLE } from './harnesses/pi';
import { CODEX_BUNDLE } from './harnesses/codex';
import { CLAUDE_CODE_BUNDLE } from './harnesses/claude-code';
import { LANGCHAIN_BUNDLE } from './harnesses/langchain';
import type { HarnessBundle } from '../types/harnessBundle';
import type { HarnessId } from '../types/lesson';

export const DSH_BUNDLE: HarnessBundle = {
  id: 'dsh',
  name: 'DeepSeek Harness',
  brandIcon: '/whale-girl-icon.png',
  repoUrl: 'https://github.com/shengzhaowei/dsh-visualizer',
  repoLabel: '本站源码',
  storagePrefix: 'dsh-visualizer',
  deckTitle: 'DSH 插件全息卡册',
  packLabel: 'DEEPSEEK HARNESS · PLUGIN PACK',
  searchSuggestions: ['Cordis', 'waterfall', 'agentLoop', 'sessions.jsonl', '审批', '沙箱'],
  cheatsheetMeta: '8 个速查区 · 插件树 / 事件 / dsh-scope / 安全审批 / 会话 / 装机清单',
  chapters: CHAPTERS,
  cheatsheet: CHEATSHEET_DATA,
  cards: PLUGIN_HOLO_CARDS,
  mindmap: DSH_MINDMAP_DATA,
  legacySlugRedirect: {
    'profile-bundle-patch': 'product-assembly',
    'spine-to-products': 'product-assembly',
  },
};

export const HARNESS_BUNDLES: Record<HarnessId, HarnessBundle> = {
  dsh: DSH_BUNDLE,
  pi: PI_BUNDLE,
  codex: CODEX_BUNDLE,
  'claude-code': CLAUDE_CODE_BUNDLE,
  langchain: LANGCHAIN_BUNDLE,
};

export const HARNESS_IDS: HarnessId[] = ['dsh', 'pi', 'codex', 'claude-code', 'langchain'];

export function isHarnessId(value: string): value is HarnessId {
  return value === 'dsh' || value === 'pi' || value === 'codex' || value === 'claude-code' || value === 'langchain';
}
