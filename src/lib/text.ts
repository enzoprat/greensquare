/**
 * Text / HTML normalization helpers used by the import pipeline and UI.
 * Preserves accents, produces clean UTF-8, never invents content.
 */

/**
 * Decode the common HTML entities that WooCommerce leaves in titles and
 * category names (e.g. "Desserts &amp; Fruits" -> "Desserts & Fruits").
 * Also decodes numeric entities. Used for plain-text fields, not HTML bodies.
 */
export function decodeEntities(input: string): string {
  if (!input) return '';
  const named: Record<string, string> = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    eacute: 'é', egrave: 'è', agrave: 'à', ccedil: 'ç', ocirc: 'ô',
    ecirc: 'ê', icirc: 'î', ucirc: 'û', agraveu: 'ù', laquo: '«', raquo: '»',
    rsquo: '’', lsquo: '‘', hellip: '…', deg: '°', euro: '€',
  };
  return input
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => named[name.toLowerCase()] ?? m)
    .trim();
}

/** URL-friendly slug, accent-folded, lowercase. */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics for the slug only
    .toLowerCase()
    .replace(/&/g, ' et ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

/** Normalize a title for fuzzy matching (accents kept, case/space folded). */
export function normalizeTitle(input: string): string {
  return input.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Clean HTML coming from the source shop:
 * - keep paragraphs and useful lists as plain text
 * - drop review forms, generic Mondial Food blocks, source CTAs and contact info
 * - never alter the meaning of the remaining text
 * Returns plain-ish HTML limited to <p>, <ul>, <ol>, <li>, <strong>, <em>, <br>.
 */
export function cleanSourceHtml(html: string): string {
  if (!html) return '';
  let out = html;

  // Remove scripts/styles/forms (review forms etc.) entirely.
  out = out.replace(/<(script|style|form)[\s\S]*?<\/\1>/gi, '');
  // Remove obvious source-site blocks / CTAs / contact lines.
  out = out.replace(/<[^>]*class="[^"]*(woocommerce-tabs|reviews|related|comment|cart|shipping)[^"]*"[\s\S]*?<\/[^>]+>/gi, '');
  out = out.replace(/mondial\s*food/gi, 'Green Square');
  out = out.replace(/https?:\/\/(www\.)?mondialfood\.fr[^\s"'<)]*/gi, '');
  // Strip contact patterns (phones / emails) that belong to the source.
  out = out.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '');
  out = out.replace(/(\+?\d[\d .]{8,}\d)/g, '');

  // Keep only a safe subset of tags.
  const allowed = /<\/?(p|ul|ol|li|strong|em|br)\s*\/?>/gi;
  const placeholders: string[] = [];
  out = out.replace(allowed, (m) => {
    placeholders.push(m);
    return `\u0000${placeholders.length - 1}\u0000`;
  });
  out = out.replace(/<[^>]+>/g, ''); // drop all other tags
  out = out.replace(/\u0000(\d+)\u0000/g, (_, i) => placeholders[Number(i)]);

  // Collapse whitespace and empty paragraphs.
  out = out
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/<p>\s*<\/p>/gi, '')
    .trim();
  return out;
}

/** Plain-text excerpt for meta descriptions / short desc, length-capped. */
export function toPlainText(html: string, maxLen = 300): string {
  const text = cleanSourceHtml(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1).replace(/\s\S*$/, '') + '…';
}
