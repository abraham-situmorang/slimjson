import type { SlimDocument, UnpackOptions } from './types.js';

/**
 * Validates whether an unknown value conforms to a SlimDocument structure.
 */
export function isSlimDocument(value: unknown): value is SlimDocument {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.__slim__ === 'string' &&
    Array.isArray(candidate.cols) &&
    Array.isArray(candidate.rows)
  );
}

/**
 * Unpacks a SlimJSON document back into a standard array of JavaScript objects.
 *
 * @param doc The SlimDocument to unpack.
 * @param options Unpack configuration options.
 * @returns Reconstituted array of objects.
 *
 * @example
 * ```typescript
 * const slim = {
 *   __slim__: "1.0",
 *   cols: ["id", "name"],
 *   rows: [[1, "Budi"], [2, "Siti"]]
 * };
 * const users = unpack(slim);
 * // [{ id: 1, name: "Budi" }, { id: 2, name: "Siti" }]
 * ```
 */
export function unpack<T extends Record<string, unknown> = Record<string, unknown>>(
  doc: SlimDocument<T>,
  options?: UnpackOptions
): T[] {
  if (!isSlimDocument(doc)) {
    throw new TypeError(
      'Invalid SlimDocument: expected an object containing __slim__, cols, and rows arrays'
    );
  }

  const { cols, rows } = doc;
  const colCount = cols.length;
  const rowCount = rows.length;
  const lenient = options?.lenient ?? false;

  const result: T[] = new Array(rowCount);

  for (let r = 0; r < rowCount; r++) {
    const row = rows[r];
    if (!Array.isArray(row)) {
      if (lenient) {
        result[r] = {} as T;
        continue;
      }
      throw new Error(`SlimJSON dimension error: row at index ${r} is not an array`);
    }

    if (!lenient && row.length !== colCount) {
      throw new Error(
        `SlimJSON dimension mismatch at row ${r}: expected ${colCount} columns, found ${row.length}`
      );
    }

    const obj: Record<string, unknown> = {};
    for (let c = 0; c < colCount; c++) {
      obj[cols[c]] = row[c];
    }
    result[r] = obj as T;
  }

  return result;
}
