import type { Chapter, Lesson } from '../types/lesson';
import { CHAPTERS_01_02 } from './chapters/ch01_02';
import { CHAPTERS_03_04 } from './chapters/ch03_04';
import { CHAPTERS_05_06 } from './chapters/ch05_06';

export const CHAPTERS: Chapter[] = [
  ...CHAPTERS_01_02,
  ...CHAPTERS_03_04,
  ...CHAPTERS_05_06,
].sort((a, b) => a.number - b.number);

export const ALL_LESSONS: Lesson[] = CHAPTERS.flatMap((chapter) => chapter.lessons);

const LESSON_BY_SLUG = new Map<string, Lesson>(
  ALL_LESSONS.map((lesson) => [lesson.slug, lesson]),
);

const CHAPTER_BY_ID = new Map<string, Chapter>(
  CHAPTERS.map((chapter) => [chapter.id, chapter]),
);

export function getLessonBySlug(slug: string): Lesson | undefined {
  return LESSON_BY_SLUG.get(slug);
}

export function getChapterForLesson(lesson: Lesson): Chapter | undefined {
  return CHAPTER_BY_ID.get(lesson.chapterId);
}

export function getLessonIndex(slug: string): number {
  return ALL_LESSONS.findIndex((lesson) => lesson.slug === slug);
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
