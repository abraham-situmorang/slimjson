import type { SlimDocument } from './types.js';
import { isSlimDocument, unpack } from './unpack.js';

export interface LazyRow<T extends Record<string, unknown>> {
  toJSON(): T;
}

export type LazyList<T extends Record<string, unknown>> = Array<T & LazyRow<T>> & {
  /**
   * Eagerly unpacks the entire dataset into plain JavaScript objects.
   */
  toArray(): T[];
};

/**
 * Creates a zero-copy, lazy-evaluating reader over a SlimDocument using JavaScript Proxies.
 *
 * Each row behaves like a standard JavaScript object without allocating thousands
 * of memory objects upfront. Ideal for large lists rendered in virtual grids or paginated tables.
 *
 * @param doc The SlimDocument to wrap.
 * @returns An array-like collection of proxy-wrapped rows with standard object semantics.
 *
 * @example
 * ```typescript
 * const slim = {
 *   __slim__: "1.0",
 *   cols: ["id", "customer_name"],
 *   rows: [[1, "Budi"], [2, "Siti"]]
 * };
 *
 * const list = lazy(slim);
 * console.log(list.length); // 2
 * console.log(list[0].customer_name); // "Budi" (O(1) direct access, 0 allocation)
 * console.log(Object.keys(list[0])); // ["id", "customer_name"]
 * ```
 */
export function lazy<T extends Record<string, unknown> = Record<string, unknown>>(
  doc: SlimDocument<T>
): LazyList<T> {
  if (!isSlimDocument(doc)) {
    throw new TypeError('Invalid SlimDocument provided to lazy()');
  }

  const { cols, rows } = doc;
  const colIndexMap = new Map<string, number>();
  for (let i = 0; i < cols.length; i++) {
    colIndexMap.set(cols[i], i);
  }

  // Row Proxy factory
  function createRowProxy(rawRow: unknown[]): T & LazyRow<T> {
    return new Proxy({} as object, {
      get(_target, prop: string | symbol) {
        if (typeof prop === 'string') {
          if (prop === 'toJSON') {
            return () => {
              const plain: Record<string, unknown> = {};
              for (let i = 0; i < cols.length; i++) {
                plain[cols[i]] = rawRow[i];
              }
              return plain;
            };
          }
          if (prop === 'toString') {
            return () => `[SlimRow ${JSON.stringify(rawRow)}]`;
          }
          const idx = colIndexMap.get(prop);
          if (idx !== undefined) {
            return rawRow[idx];
          }
        }
        return undefined;
      },
      has(_target, prop) {
        return typeof prop === 'string' && colIndexMap.has(prop);
      },
      ownKeys() {
        return cols;
      },
      getOwnPropertyDescriptor(_target, prop: string | symbol) {
        if (typeof prop === 'string') {
          const idx = colIndexMap.get(prop);
          if (idx !== undefined) {
            return {
              value: rawRow[idx],
              writable: false,
              enumerable: true,
              configurable: true
            };
          }
        }
        return undefined;
      }
    }) as unknown as T & LazyRow<T>;
  }

  // Cache to avoid re-instantiating proxies for identical index lookups
  const rowProxyCache: Array<(T & LazyRow<T>) | undefined> = new Array(rows.length);

  const arrayProxy = new Proxy(rows, {
    get(target, prop, receiver) {
      if (prop === 'toArray') {
        return () => unpack(doc);
      }
      if (typeof prop === 'string') {
        const index = Number(prop);
        if (Number.isInteger(index) && index >= 0 && index < rows.length) {
          let cached = rowProxyCache[index];
          if (!cached) {
            cached = createRowProxy(rows[index]);
            rowProxyCache[index] = cached;
          }
          return cached;
        }
      }
      return Reflect.get(target, prop, receiver);
    }
  });

  return arrayProxy as unknown as LazyList<T>;
}
