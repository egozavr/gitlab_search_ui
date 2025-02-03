export function objectValues<T>(obj: T): (string | number)[] {
  if (typeof obj !== 'object' || obj === null) {
    return [];
  }
  const res: (string | number)[] = [];
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const v = obj[key];
      switch (typeof v) {
        case 'number':
        case 'string':
          res.push(v);
          break;
        case 'object':
          res.push(...objectValues(v));
          break;
      }
    }
  }
  return res;
}
