import MiniSearch from 'minisearch';
import { EntityKind } from './schema.js';
import { Workspace, allEntities } from './workspace.js';

export interface SearchHit {
  id: string;
  kind: EntityKind;
  title: string;
  score: number;
  /** 正文中匹配位置附近的摘录（没有正文时为空串） */
  snippet: string;
}

interface IndexedDoc {
  id: string;
  kind: EntityKind;
  title: string;
  body: string;
  [key: string]: unknown;
}

export function searchWorkspace(ws: Workspace, query: string): SearchHit[] {
  const docs: IndexedDoc[] = allEntities(ws).map(({ kind, loaded }) => ({
    id: loaded.entity.id,
    kind,
    title: loaded.entity.title,
    body: loaded.entity.body,
  }));

  const mini = new MiniSearch<IndexedDoc>({
    fields: ['id', 'title', 'body'],
    storeFields: ['kind', 'title', 'body'],
    tokenize: tokenizeCjk,
    searchOptions: {
      boost: { title: 3, id: 5 },
      prefix: true,
      fuzzy: 0.2,
      combineWith: 'AND',
    },
  });
  mini.addAll(docs);

  return mini.search(query).map((result) => {
    const body = String(result.body ?? '');
    return {
      id: String(result.id),
      kind: result.kind as EntityKind,
      title: String(result.title),
      score: Number(result.score.toFixed(2)),
      snippet: makeSnippet(body, query),
    };
  });
}

/**
 * CJK 友好分词：汉字逐字成 token（查询词按 AND 组合命中），
 * 拉丁字母/数字按连续串成 token。MiniSearch 默认分词对中文无效。
 */
function tokenizeCjk(text: string): string[] {
  const tokens: string[] = [];
  for (const match of text.matchAll(
    /\p{Script=Han}|(?:(?!\p{Script=Han})[\p{L}\p{N}_-])+/gu
  )) {
    tokens.push(match[0].toLowerCase());
  }
  return tokens;
}

function makeSnippet(body: string, query: string, radius = 60): string {
  if (!body) return '';
  const flat = body.replace(/\s+/g, ' ');
  const terms = query.split(/\s+/).filter(Boolean);
  let index = -1;
  for (const term of terms) {
    index = flat.toLowerCase().indexOf(term.toLowerCase());
    if (index >= 0) break;
  }
  if (index < 0) return flat.slice(0, radius * 2) + (flat.length > radius * 2 ? '…' : '');
  const start = Math.max(0, index - radius);
  const end = Math.min(flat.length, index + radius);
  return (start > 0 ? '…' : '') + flat.slice(start, end) + (end < flat.length ? '…' : '');
}
