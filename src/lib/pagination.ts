export const PAGE_SIZE = 20;

export function parsePageParam(page: string | undefined): number {
  const n = Number(page);
  return Number.isInteger(n) && n > 0 ? n : 1;
}
