import type { Chapter, Lesson } from '../types/lesson';
import { chapter } from './helpers';
import { L1, L3, L4 } from './chapters/ch01_02';
import { L5, L6, L7, L8, L9, L10 } from './chapters/ch03_04';
import { L11, L12, L14 } from './chapters/ch05_06';
import { L_APPROVAL_PIPELINE, L_DSH_SCOPE, L_PRODUCT_ASSEMBLY } from './chapters/ch_new';

export const CHAPTERS: Chapter[] = [
  chapter('ch01', 1, '整机全景与核心理念', 'sage', [L1, L7]),
  chapter('ch02', 2, 'Cordis 主板与作用域', 'blue', [L3, L4, L5, L6, L_DSH_SCOPE]),
  chapter('ch03', 3, 'Agent 循环与记忆', 'violet', [L8, L11, L12]),
  chapter('ch04', 4, '工具管线与安全审批', 'amber', [L9, L_APPROVAL_PIPELINE, L10]),
  chapter('ch05', 5, '产品组装与源码对照', 'teal', [L_PRODUCT_ASSEMBLY, L14]),
].sort((a, b) => a.number - b.number);

export const ALL_LESSONS: Lesson[] = CHAPTERS.flatMap((ch) => ch.lessons);

const LESSON_BY_SLUG = new Map<string, Lesson>(
  ALL_LESSONS.map((lesson) => [lesson.slug, lesson]),
);

// 旧路由兼容映射：合并前的重复课自动重定向到合并后的 product-assembly。
const LEGACY_SLUG_REDIRECT: Record<string, string> = {
  'profile-bundle-patch': 'product-assembly',
  'spine-to-products': 'product-assembly',
};

const CHAPTER_BY_ID = new Map<string, Chapter>(
  CHAPTERS.map((ch) => [ch.id, ch]),
);

export function getLessonBySlug(slug: string): Lesson | undefined {
  const canonical = LEGACY_SLUG_REDIRECT[slug] ?? slug;
  return LESSON_BY_SLUG.get(canonical);
}

export function getChapterForLesson(lesson: Lesson): Chapter | undefined {
  return CHAPTER_BY_ID.get(lesson.chapterId);
}

export function getLessonIndex(slug: string): number {
  const canonical = LEGACY_SLUG_REDIRECT[slug] ?? slug;
  return ALL_LESSONS.findIndex((lesson) => lesson.slug === canonical);
}

export function getNextLesson(slug: string): Lesson | undefined {
  const index = getLessonIndex(slug);
  if (index < 0 || index >= ALL_LESSONS.length - 1) return undefined;
  return ALL_LESSONS[index + 1];
}

export function getPrevLesson(slug: string): Lesson | undefined {
  const index = getLessonIndex(slug);
  if (index <= 0) return undefined;
  return ALL_LESSONS[index - 1];
}
