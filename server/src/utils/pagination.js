export const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 20;

export function parsePagination({ page, page_size } = {}) {
  const parsedPage = Math.max(1, Math.trunc(Number(page)) || 1);
  const parsedSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(Number(page_size)) || DEFAULT_PAGE_SIZE));
  return { page: parsedPage, pageSize: parsedSize, offset: (parsedPage - 1) * parsedSize };
}

/**
 * Strips the COUNT(*) OVER() window-function column off each row and returns
 * the clean envelope. Total is read off the first row (0 if the page is empty).
 */
export function toEnvelope(rows, { page, pageSize }) {
  const total = rows[0]?.total_count ?? 0;
  const data = rows.map(({ total_count, ...rest }) => rest);
  return { data, page, page_size: pageSize, total };
}
