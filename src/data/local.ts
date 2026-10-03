export function upsertBy<T>(list: T[], item: T, same: (a: T, b: T) => boolean): T[] {
  const i = list.findIndex(x => same(x, item));
  if (i < 0) return [...list, item];
  const copy = [...list];
  copy[i] = item;
  return copy;
}

export const sameId = <T extends { id: string }>(a: T, b: T) => a.id === b.id;
