export interface Diff<T> {
  added: T;
  removed: T;
  common: T;
}

class SetDiff<T> implements Diff<Set<T>> {
  added: Set<T>;
  removed: Set<T>;
  common: Set<T>;
  constructor() {
    this.added = new Set<T>();
    this.removed = new Set<T>();
    this.common = new Set<T>();
  }
}

export function diffSets<T>(prev: Set<T>, curr: Set<T>): SetDiff<T> {
  const diff = new SetDiff<T>();
  for (const item of curr) {
    if (prev.has(item)) {
      diff.common.add(item);
    } else {
      diff.added.add(item);
    }
  }
  for (const item of prev) {
    if (!diff.common.has(item)) {
      diff.removed.add(item);
    }
  }
  return diff;
}

export function diffArraysWithSets<T>(prev: T[], curr: T[]): Diff<T[]> {
  const [prevSet, currSet] = [new Set(prev), new Set(curr)];
  const diff = diffSets(prevSet, currSet);
  return {
    added: Array.from(diff.added),
    removed: Array.from(diff.removed),
    common: Array.from(diff.common),
  };
}
