import type { PackOptions, SlimDocument } from './types.js';

/**
 * Packs an array of JavaScript objects into a compact SlimJSON document.
 *
 * @param items Array of uniform or semi-uniform objects.
 * @param options Configuration options for packing.
 * @returns A validated SlimDocument object.
 *
 * @example
 * ```typescript
 * const users = [
 *   { id: 1, name: "Budi", city: "Jakarta" },
 *   { id: 2, name: "Siti", city: "Bandung" }
 * ];
 * const slim = pack(users);
 * // Output:
 * // {
 * //   __slim__: "1.0",
 * //   cols: ["id", "name", "city"],
 * //   rows: [[1, "Budi", "Jakarta"], [2, "Siti", "Bandung"]]
 * // }
 * ```
 */
export function pack<T extends Record<string, unknown>>(
  items: T[],
  options?: PackOptions<T>
): SlimDocument<T> {
  if (!Array.isArray(items)) {
    throw new TypeError(`SlimJSON pack expects an array of objects, received ${typeof items}`);
  }

  if (items.length === 0) {
    return {
      __slim__: '1.0',
      ...(options?.meta ? { meta: options.meta } : {}),
      cols: (options?.columns ?? []) as (keyof T & string)[],
      rows: []
    };
  }

  // Determine columns
  let cols: (keyof T & string)[];
  if (options?.columns && options.columns.length > 0) {
    cols = options.columns;
  } else if (options?.strictSchema) {
    cols = Object.keys(items[0]) as (keyof T & string)[];
  } else {
    const keySet = new Set<string>();
    for (let i = 0; i < items.length; i++) {
      const obj = items[i];
      if (obj && typeof obj === 'object') {
        const keys = Object.keys(obj);
        for (let k = 0; k < keys.length; k++) {
          keySet.add(keys[k]);
        }
      }
    }
    cols = Array.from(keySet) as (keyof T & string)[];
  }

  const colCount = cols.length;
  const rowCount = items.length;
  const rows: unknown[][] = new Array(rowCount);

  for (let r = 0; r < rowCount; r++) {
    const item = items[r];
    const row = new Array(colCount);
    if (item && typeof item === 'object') {
      for (let c = 0; c < colCount; c++) {
        const col = cols[c];
        const val = (item as Record<string, unknown>)[col];
        row[c] = val !== undefined ? val : null;
      }
    } else {
      for (let c = 0; c < colCount; c++) {
        row[c] = null;
      }
    }
    rows[r] = row;
  }

  const result: SlimDocument<T> = {
    __slim__: '1.0',
    cols,
    rows
  };

  if (options?.meta) {
    result.meta = options.meta;
  }

  return result;
}
