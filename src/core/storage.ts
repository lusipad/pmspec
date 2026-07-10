import matter from 'gray-matter';

/**
 * Markdown + YAML frontmatter 的读写层。
 * 只负责文件内容 <-> {frontmatter, body} 的往返，不做业务校验。
 *
 * 往返保真原则：读取时保留 frontmatter 的原始键值（含 schema 之外的
 * 自定义键），更新时由调用方将变更合并进原始对象后整体写回，
 * 避免丢失用户手写的自定义字段。
 */

export interface RawEntityFile {
  /** frontmatter 原始键值（未经 schema 校验） */
  data: Record<string, unknown>;
  /** frontmatter 之后的 Markdown 正文（已去除首尾空行） */
  body: string;
}

export function parseEntityFile(content: string): RawEntityFile {
  const parsed = matter(content);
  return {
    data: parsed.data as Record<string, unknown>,
    body: parsed.content.trim(),
  };
}

/** 序列化为带 frontmatter 的 Markdown。undefined 值的键会被剔除。 */
export function serializeEntityFile(
  data: Record<string, unknown>,
  body: string
): string {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) clean[key] = value;
  }
  const trimmedBody = body.trim();
  const result = matter.stringify(
    trimmedBody.length > 0 ? `${trimmedBody}\n` : '',
    clean
  );
  // gray-matter 对空正文会留下多余空行，收敛为单个换行结尾
  return result.trimEnd() + '\n';
}
