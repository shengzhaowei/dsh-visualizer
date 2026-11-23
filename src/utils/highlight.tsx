import type { ReactNode } from 'react';
import type { SourceLanguage } from '../types/lesson';

const KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do',
  'switch', 'case', 'default', 'break', 'continue', 'import', 'export', 'from', 'new',
  'class', 'extends', 'await', 'async', 'type', 'interface', 'try', 'catch', 'finally',
  'throw', 'typeof', 'instanceof', 'of', 'in', 'this', 'true', 'false', 'null',
  'undefined', 'void', 'delete', 'yield', 'static', 'get', 'set',
]);

/**
 * 极简行内高亮：注释灰、字符串橙、JSON 键蓝、关键字着色加粗、数字蓝。
 * 按行处理；`text` 语言不着色。扫描从左到右，字符串优先于注释匹配，
 * 所以 `//` 出现在字符串里时不会被误判为注释。
 */
const TOKEN_RE =
  /(\/\*[\s\S]*?\*\/)|(\/\/.*$)|("(?:[^"\\\n]|\\.)*")(?=\s*:)|(`(?:[^`\\]|\\.)*`)|('(?:[^'\\]|\\.)*')|("(?:[^"\\]|\\.)*")|\b(const|let|var|function|return|if|else|for|while|do|switch|case|default|break|continue|import|export|from|new|class|extends|await|async|type|interface|try|catch|finally|throw|typeof|instanceof|of|in|this|true|false|null|undefined|void|delete|yield|static|get|set)\b|(\b\d+(?:\.\d+)?\b)/g;

export function highlightLine(line: string, language: SourceLanguage): ReactNode[] {
  if (language === 'text' || line.trim() === '') return [line || ' '];
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(line)) !== null) {
    if (m.index > last) out.push(line.slice(last, m.index));
    const [tok, blockComment, lineComment, jsonKey, template, single, double, keyword, number] = m;
    if (blockComment || lineComment) out.push(<span key={key++} className="tok-comment">{tok}</span>);
    else if (jsonKey) out.push(<span key={key++} className="tok-key">{tok}</span>);
    else if (template || single || double) out.push(<span key={key++} className="tok-string">{tok}</span>);
    else if (keyword && KEYWORDS.has(keyword)) out.push(<span key={key++} className="tok-keyword">{tok}</span>);
    else if (number) out.push(<span key={key++} className="tok-number">{tok}</span>);
    else out.push(tok);
    last = m.index + tok.length;
    if (tok.length === 0) TOKEN_RE.lastIndex++;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}
