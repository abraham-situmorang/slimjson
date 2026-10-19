/**
 * SlimJSON Document interface conforming to SlimJSON Specification v1.0.
 */
export interface SlimDocument<
  T extends Record<string, unknown> = Record<string, unknown>,
  TMeta = Record<string, unknown>
> {
  /**
   * SlimJSON specification version identifier.
   */
  readonly __slim__: string;

  /**
   * Optional application metadata (pagination, timestamp, schema hints, etc.).
   */
  meta?: TMeta;

  /**
   * Ordered column headers.
   */
  cols: (keyof T & string)[];

  /**
   * 2D array of rows, where each row array matches the column ordering in `cols`.
   */
  rows: unknown[][];
}

/**
 * Options for packing an array of objects into a SlimDocument.
 */
export interface PackOptions<T extends Record<string, unknown> = Record<string, unknown>> {
  /**
   * Explicit column list. If provided, only these keys will be extracted in this specific order.
   * If omitted, column names will be automatically inferred.
   */
  columns?: (keyof T & string)[];

  /**
   * If true, only scan the first object to infer column keys (faster for uniform collections).
   * If false (default), scans all objects to produce the union of all keys (handles optional keys).
   */
  strictSchema?: boolean;

  /**
   * Custom metadata to attach to the resulting SlimDocument.
   */
  meta?: Record<string, unknown>;
}

/**
 * Options for unpacking a SlimDocument into an array of objects.
 */
export interface UnpackOptions {
  /**
   * If true, allows rows that have fewer or more elements than `cols`, padding with `undefined`
   * or discarding extra values without throwing an error.
   * Default is false (strict validation).
   */
  lenient?: boolean;
}
