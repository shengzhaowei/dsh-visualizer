import type { ReactNode } from 'react';

/** Render paragraphs with inline `code` backticks as <code> spans. */
export function renderInline(text: string, keyPrefix = ''): ReactNode[] {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={`${keyPrefix}-${i}`} className="inline-code">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={`${keyPrefix}-${i}`}>{part}</span>;
  });
}
