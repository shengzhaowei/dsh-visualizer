import type { ReactNode } from 'react';
import type { SourceLanguage } from '../types/lesson';

const TS_KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do',
  'switch', 'case', 'default', 'break', 'continue', 'import', 'export', 'from', 'new',
  'class', 'extends', 'await', 'async', 'type', 'interface', 'try', 'catch', 'finally',
  'throw', 'typeof', 'instanceof', 'of', 'in', 'this', 'true', 'false', 'null',
  'undefined', 'void', 'delete', 'yield', 'static', 'get', 'set',
]);

const RS_KEYWORDS = new Set([
  'fn', 'let', 'mut', 'pub', 'struct', 'enum', 'impl', 'trait', 'match', 'if', 'else',
  'for', 'while', 'loop', 'in', 'return', 'use', 'mod', 'crate', 'async', 'await',
  'move', 'ref', 'const', 'static', 'type', 'where', 'true', 'false', 'Some', 'None',
  'Ok', 'Err', 'Result', 'Option', 'Self', 'self', 'super', 'as', 'break', 'continue',
]);

const PY_KEYWORDS = new Set([
  'def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'in', 'not', 'and',
  'or', 'is', 'import', 'from', 'as', 'with', 'async', 'await', 'yield', 'try',
  'except', 'finally', 'raise', 'pass', 'break', 'continue', 'lambda', 'True', 'False',
  'None', 'self', 'Annotated', 'TypedDict',
]);

const SH_KEYWORDS = new Set([
  'if', 'then', 'else', 'elif', 'fi', 'for', 'do', 'done', 'while', 'case', 'esac',
  'exit', 'return', 'echo', 'export', 'local', 'readonly', 'set', 'jq', 'true', 'false',
]);

function keywordsFor(lang: SourceLanguage): Set<string> | null {
  if (lang === 'ts') return TS_KEYWORDS;
  if (lang === 'rs') return RS_KEYWORDS;
  if (lang === 'py') return PY_KEYWORDS;
  if (lang === 'sh') return SH_KEYWORDS;
  return null;
}

/**
 * 轻量多语言行内高亮（TS / JSON / Rust / Python / Shell / TOML）：
 * 字符串优先于注释匹配，避免字符串里的 `//` 或 `#` 被误判为注释。
 */
const SLASH_TOKEN_RE =
  /(\/\*[\s\S]*?\*\/)|(\/\/.*$)|("(?:[^"\\\n]|\\.)*")(?=\s*:)|(`(?:[^`\\]|\\.)*`)|('(?:[^'\\]|\\.)*')|("(?:[^"\\\n]|\\.)*")|\b([A-Za-z_][A-Za-z0-9_]*)\b|(\b\d+(?:\.\d+)?\b)/g;

const HASH_TOKEN_RE =
  /(#.*$)|("(?:[^"\\\n]|\\.)*")(?=\s*:)|(`(?:[^`\\]|\\.)*`)|('(?:[^'\\]|\\.)*')|("(?:[^"\\\n]|\\.)*")|\b([A-Za-z_][A-Za-z0-9_]*)\b|(\b\d+(?:\.\d+)?\b)/g;

export function highlightLine(line: string, language: SourceLanguage): ReactNode[] {
  if (language === 'text' || line.trim() === '') return [line || ' '];
  const useHashComment = language === 'py' || language === 'sh' || language === 'toml';
  const re = useHashComment ? HASH_TOKEN_RE : SLASH_TOKEN_RE;
  const kwSet = keywordsFor(language);

  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  re.lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(line)) !== null) {
    if (m.index > last) out.push(line.slice(last, m.index));
    if (useHashComment) {
      const [tok, hashComment, jsonKey, template, single, double, ident, number] = m;
      if (hashComment) out.push(<span key={key++} className="tok-comment">{tok}</span>);
      else if (jsonKey) out.push(<span key={key++} className="tok-key">{tok}</span>);
      else if (template || single || double) out.push(<span key={key++} className="tok-string">{tok}</span>);
      else if (ident && kwSet?.has(ident)) out.push(<span key={key++} className="tok-keyword">{tok}</span>);
      else if (number) out.push(<span key={key++} className="tok-number">{tok}</span>);
      else out.push(tok);
    } else {
      const [tok, blockComment, lineComment, jsonKey, template, single, double, ident, number] = m;
      if (blockComment || lineComment) out.push(<span key={key++} className="tok-comment">{tok}</span>);
      else if (jsonKey) out.push(<span key={key++} className="tok-key">{tok}</span>);
      else if (template || single || double) out.push(<span key={key++} className="tok-string">{tok}</span>);
      else if (ident && kwSet?.has(ident)) out.push(<span key={key++} className="tok-keyword">{tok}</span>);
      else if (number) out.push(<span key={key++} className="tok-number">{tok}</span>);
      else out.push(tok);
    }
    last = m.index + m[0].length;
    if (m[0].length === 0) re.lastIndex++;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}
