# SlimJSON Specification — Version 1.0

- **Document Status**: Draft Standard / Open Community Specification
- **Version**: 1.0.0
- **Suggested Media Type**: `application/vnd.slimjson+json`
- **File Extension**: `.slim.json` or `.sjson`
- **Specification URL**: https://github.com/slimjson/slimjson/blob/main/SPEC.md

---

## 1. Abstract

JSON (RFC 8259) is the predominant data interchange format for modern APIs and web applications. However, when transporting large arrays of uniform objects (e.g., database queries, paginated API responses, analytics events, tabular reports), JSON suffers from severe payload bloat because property names are redundantly repeated for every single record.

**SlimJSON** defines an open, standard, human-readable, schema-free envelope on top of standard JSON that isolates column headers from row values. It delivers **40% to 70% reduction in raw payload size** and eliminates significant memory and garbage-collection overhead on clients, while retaining full compatibility with standard JSON parsers and HTTP compression (Gzip / Brotli).

---

## 2. Terminology and Conformance

The key words **"MUST"**, **"MUST NOT"**, **"REQUIRED"**, **"SHALL"**, **"SHALL NOT"**, **"SHOULD"**, **"SHOULD NOT"**, **"RECOMMENDED"**, **"MAY"**, and **"OPTIONAL"** in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

An implementation is **SlimJSON-compliant** if it accepts any valid SlimJSON Document meeting the requirements of Section 3 and produces valid SlimJSON documents conforming to the grammar.

---

## 3. Data Structure

A valid SlimJSON document is a standard JSON Object with the following top-level members:

```json
{
  "__slim__": "1.0",
  "cols": ["id", "customer_name", "customer_address", "is_active", "balance"],
  "rows": [
    [101, "Budi Santoso", "Jl. Sudirman 10 Jakarta", true, 250000.00],
    [102, "Siti Rahma", "Jl. Thamrin 5 Bandung", false, null],
    [103, "Andi Wijaya", "Jl. Gatot Subroto 1 Surabaya", true, 120500.50]
  ]
}
```

### 3.1. Field Definitions

| Field | Type | Presence | Description |
| :--- | :--- | :--- | :--- |
| `__slim__` | `String` | **REQUIRED** | Specifies the SlimJSON specification version. For this specification, the value MUST be `"1.0"`. |
| `cols` | `Array<String>` | **REQUIRED** | An ordered list of column identifiers. Each element MUST be a string. |
| `rows` | `Array<Array<Any>>` | **REQUIRED** | A two-dimensional array representing rows of data. Each element of `rows` MUST be an array representing a single row. |
| `meta` | `Object` | **OPTIONAL** | An arbitrary JSON object containing metadata (such as pagination, execution time, total record count, or schema descriptions). |

### 3.2. Structural Invariants

1. **Dimensional Uniformity**: For every array `R` in `rows`, the length of `R` MUST be equal to the length of `cols`:
   $$\forall R \in \text{rows}, \quad \text{length}(R) == \text{length}(\text{cols})$$
2. **Column Position Mapping**: For any row `R` in `rows`, the value at `R[i]` corresponds strictly to the property identified by `cols[i]`.
3. **Column Uniqueness**: All string elements within `cols` SHOULD be distinct. If duplicate column names are present, unpackers MUST either reject the document with a parsing error or rename subsequent duplicates according to an explicit policy.
4. **Value Types**: Elements within each row array MAY be any valid JSON value: `string`, `number`, `boolean`, `null`, `object`, or `array`.

---

## 4. Packing Algorithm (Object Array to SlimJSON)

When converting an array of homogeneous or semi-heterogeneous objects into a SlimJSON document:

1. **Extract Columns**:
   * Determine the ordered list of keys `cols`.
   * *Strict Mode*: If all objects share an identical schema, extract keys from the first object or explicit schema definition.
   * *Union Mode (Default)*: Collect the union of all unique keys across all objects in insertion order to accommodate optional or missing properties.
2. **Transform Rows**:
   * For each object $O$ in the input collection:
     * Construct a new array $R$ where $R[i] = O[\text{cols}[i]]$ if $\text{cols}[i] \in O$, otherwise $R[i] = \text{null}$.
3. **Construct Envelope**:
   * Return `{"__slim__": "1.0", "cols": cols, "rows": rows}`.

---

## 5. Unpacking Algorithm (SlimJSON to Object Array)

When converting a SlimJSON document back into standard objects:

1. **Validation**:
   * Verify that `__slim__` matches a supported version prefix (e.g., `"1."`).
   * Verify that `cols` is an array of strings.
   * Verify that `rows` is an array of arrays.
2. **Object Reconstitution**:
   * For each row array $R$ in `rows`:
     * Instantiate a new object $O$.
     * For each index $i$ from $0$ to $\text{length}(\text{cols}) - 1$:
       * Set $O[\text{cols}[i]] = R[i]$.
     * Append $O$ to the result array.
3. **Return Reconstituted Array**:
   * Return the array of reconstituted objects.

---

## 6. Zero-Copy / Lazy Access Pattern

In memory-constrained environments (such as mobile browsers or serverless runtimes), full unpacking can cause high memory churn by instantiating tens of thousands of intermediate JavaScript objects.

SlimJSON implementations SHOULD provide a **Lazy Reader** abstraction. In JavaScript, this is accomplished via `Proxy`:

```typescript
const colMap = new Map(doc.cols.map((name, idx) => [name, idx]));

const record = new Proxy(doc.rows[rowIndex], {
  get(target, prop) {
    const idx = colMap.get(prop);
    return idx !== undefined ? target[idx] : undefined;
  }
});
```

This pattern provides immediate $O(1)$ property access without mutating or converting the raw row array, resulting in **zero memory allocations per record**.

---

## 7. Metadata and Extensibility

SlimJSON supports an optional `meta` object at the root level. Applications MAY use `meta` for pagination, total counts, timestamps, or types:

```json
{
  "__slim__": "1.0",
  "meta": {
    "page": 1,
    "pageSize": 50,
    "totalCount": 12500,
    "types": {
      "id": "int64",
      "balance": "decimal",
      "created_at": "date-time"
    }
  },
  "cols": ["id", "balance", "created_at"],
  "rows": [
    [101, 250000.0, "2026-10-19T10:00:00Z"]
  ]
}
```

Implementations MUST ignore unrecognized keys inside `meta`.

---

## 8. HTTP Negotiation and Media Type

### 8.1. Media Type
The designated MIME media type for SlimJSON is:
```text
application/vnd.slimjson+json
```

### 8.2. Content Negotiation
Clients supporting SlimJSON SHOULD send the `Accept` header:
```http
Accept: application/vnd.slimjson+json, application/json;q=0.9
```

Servers responding with a SlimJSON payload MUST set the `Content-Type` header:
```http
Content-Type: application/vnd.slimjson+json; charset=utf-8
```

---

## 9. Security and Parsing Limits

1. **Maximum Row and Column Limits**: Parsers SHOULD allow callers to enforce maximum row count and column count limits to defend against resource exhaustion / Denial of Service (DoS).
2. **Dimension Mismatch Handling**: If a row array length does not match `cols.length`, parsers MUST either reject the document with a `SlimJsonDimensionMismatchException` or pad with `null` if explicit lenient mode is enabled.
3. **Deep Nesting**: Cell values containing nested JSON structures remain subject to standard JSON parser depth limits.

---

## 10. Reference Implementations

Official open-source libraries implementing this specification:
* **TypeScript / JavaScript**: `@slimjson/core` (Node.js & Browser)
* **C# / .NET**: `SlimJson` (System.Text.Json compliant, .NET 8+)
