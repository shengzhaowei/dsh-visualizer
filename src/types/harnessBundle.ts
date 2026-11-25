import type { Chapter, CheatsheetData, HarnessId } from './lesson';
import type { MindNode } from './mindmap';
import type { PluginHoloCard } from '../data/cards';

export interface HarnessBundle {
  id: HarnessId;
  name: string;
  brandIcon: string;
  repoUrl: string;
  repoLabel: string;
  storagePrefix: string;
  deckTitle: string;
  packLabel: string;
  searchSuggestions: string[];
  cheatsheetMeta: string;
  chapters: Chapter[];
  cheatsheet: CheatsheetData;
  cards: PluginHoloCard[];
  mindmap: MindNode;
  legacySlugRedirect?: Record<string, string>;
}
