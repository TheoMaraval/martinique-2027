/** Champs de `next` qui diffèrent de `prev` (comparaison JSON), pour n'envoyer que ce qui a changé. */
export function changedFields<T extends object>(next: T, prev: T): Partial<T> {
  return Object.fromEntries(
    (Object.keys(next) as (keyof T)[])
      .filter(k => JSON.stringify(next[k]) !== JSON.stringify(prev[k]))
      .map(k => [k, next[k]]),
  ) as Partial<T>;
}
