# @slimjson/core (or `slimjson`)

> High-performance TypeScript / JavaScript implementation of the SlimJSON Specification v1.0.

SlimJSON packs arrays of uniform JavaScript objects into a compact tabular JSON representation, cutting raw payload sizes by **40% to 70%** and eliminating redundant keys.

## Features

- ⚡ **Lightweight & Dependency-Free**: Zero runtime dependencies.
- 🚀 **Zero-Copy Lazy Reader (`lazy`)**: Direct $O(1)$ access to rows via JavaScript Proxies without allocating thousands of intermediate objects.
- 🛡️ **Full Type Safety**: Generics preserve original object types for both `pack`, `unpack`, and `lazy`.
- 🔄 **Lossless Roundtrip**: Preserves numbers, strings, booleans, nested objects, and arrays.

## Installation

```bash
npm install slimjson
```

## Quick Start

### 1. Packing (Serialize array of objects to SlimJSON)

```typescript
import { pack } from 'slimjson';

const users = [
  { id: 1, name: "Budi", city: "Jakarta", balance: 150000 },
  { id: 2, name: "Siti", city: "Bandung", balance: 250000 }
];

const slim = pack(users);
console.log(JSON.stringify(slim));
/*
{
  "__slim__": "1.0",
  "cols": ["id", "name", "city", "balance"],
  "rows": [
    [1, "Budi", "Jakarta", 150000],
    [2, "Siti", "Bandung", 250000]
  ]
}
*/
```

### 2. Unpacking (Restore standard objects)

```typescript
import { unpack } from 'slimjson';

const users = unpack(slim);
// [{ id: 1, name: "Budi", ... }, { id: 2, name: "Siti", ... }]
```

### 3. Zero-Copy Lazy Reader (Best for UI & Virtual Tables)

When fetching large datasets (e.g., 50,000 rows), unpacking eagerly allocates 50,000 objects in memory. With `lazy()`, rows are accessed on demand:

```typescript
import { lazy } from 'slimjson';

const list = lazy(slim);

// Instant length
console.log(list.length); // 2

// O(1) direct property access without upfront object allocation
console.log(list[0].name); // "Budi"

// Standard iteration
list.forEach(row => {
  console.log(row.city);
});

// Convert single row or whole dataset if needed
const firstObj = list[0].toJSON();
const allObjs = list.toArray();
```

## API Reference

### `pack<T>(items: T[], options?: PackOptions<T>): SlimDocument<T>`
Packs an array of objects into a `SlimDocument`.
- `options.columns`: Explicit column subset/ordering.
- `options.strictSchema`: If `true`, inspects only the first item (fastest).
- `options.meta`: Custom metadata object attached to document root.

### `unpack<T>(doc: SlimDocument<T>, options?: UnpackOptions): T[]`
Reconstitutes a `SlimDocument` back into an array of objects `T[]`.
- `options.lenient`: If `true`, ignores column count mismatches.

### `lazy<T>(doc: SlimDocument<T>): LazyList<T>`
Returns a lazy proxy-wrapped collection for instant, zero-allocation querying.

### `isSlimDocument(value: unknown): boolean`
Type guard verifying whether an object conforms to the SlimJSON v1.0 structure.

## License

MIT
