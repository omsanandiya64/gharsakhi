export const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 20;

export function parsePagination({ page, page_size } = {}) {
  const parsedPage = Math.max(1, Math.trunc(Number(page)) || 1);
  const parsedSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(Number(page_size)) || DEFAULT_PAGE_SIZE));
  return { page: parsedPage, pageSize: parsedSize, offset: (parsedPage - 1) * parsedSize };
}

/**
 * `total` must come from its own COUNT(*) query, not a COUNT(*) OVER() window
 * column on the paginated data query - that column only rides along on rows
 * that are actually returned, so a page landing beyond the last row (a common,
 * valid request) would get zero data rows and silently report total=0 even
 * when earlier pages have matches.
 */
export function toEnvelope(rows, total, { page, pageSize }) {
  return { data: rows, page, page_size: pageSize, total };
}
