# SlimJSON (SPEC v1.0)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Specification](https://img.shields.io/badge/Specification-v1.0-brightgreen.svg)](SPEC.md)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green.svg)](packages/js)
[![.NET](https://img.shields.io/badge/.NET-8.0%20%7C%209.0%20%7C%2010.0-purple.svg)](packages/dotnet)

> **SlimJSON** is an open, compact tabular data serialization format built on standard JSON. It eliminates repeated object key redundancy in collections, reducing raw payload size by **40% to 70%** while maintaining instant zero-copy client querying via JavaScript Proxies.

---

## 💡 The Problem

Standard JSON ([RFC 8259](https://www.rfc-editor.org/rfc/rfc8259)) repeats property names for every single object in an array. When transmitting database queries, tabular data, paginated API responses, or analytics events, the key names quickly overwhelm the actual data payload:

```json
[
  {"customer_id": 101, "customer_name": "Budi Santoso", "customer_address": "Jl. Sudirman 10 Jakarta", "balance": 250000.0},
  {"customer_id": 102, "customer_name": "Siti Rahma", "customer_address": "Jl. Thamrin 5 Bandung", "balance": 120500.0},
  {"customer_id": 103, "customer_name": "Andi Wijaya", "customer_address": "Jl. Gatot Subroto 1 Surabaya", "balance": 85000.0}
]
```

For thousands of records, `"customer_name"`, `"customer_address"`, and punctuation are redundantly sent over the network thousands of times, wasting network bandwidth, battery, and parsing memory on client devices.

---

## ✨ The SlimJSON Solution

SlimJSON isolates property headers into a `cols` array and represents records as a 2D matrix of values in `rows`:

```json
{
  "__slim__": "1.0",
  "cols": ["customer_id", "customer_name", "customer_address", "balance"],
  "rows": [
    [101, "Budi Santoso", "Jl. Sudirman 10 Jakarta", 250000.0],
    [102, "Siti Rahma", "Jl. Thamrin 5 Bandung", 120500.0],
    [103, "Andi Wijaya", "Jl. Gatot Subroto 1 Surabaya", 85000.0]
  ]
}
```

- ✅ **Standard JSON Compatible**: Validated by any standard JSON parser.
- ✅ **Massive Size Reduction**: ~50% raw size reduction out of the box.
- ✅ **HTTP Compression Friendly**: Gzip and Brotli compress tabular data even more effectively.
- ✅ **Zero-Copy Lazy Reading**: In JavaScript, rows can be read directly via Proxies without allocating thousands of intermediate heap objects.

---

## 📊 Benchmark Results

Benchmarked on **5,000 real-world customer records** (8 fields per record: IDs, strings, dates, decimals, booleans):

### Payload Size Comparison

| Metric | Standard JSON (RFC 8259) | SlimJSON (SPEC v1.0) | Bandwidth Saved |
| :--- | :--- | :--- | :--- |
| **Raw Uncompressed** | **1,368.7 KB** | **685.2 KB** | **🔥 49.9%** |
| **HTTP Gzip** | 110.8 KB | 96.7 KB | **12.7%** |
| **HTTP Brotli** | 45.2 KB | 40.8 KB | **9.7%** |

### Client Parsing & Access Time

| Method | Execution Time | Memory Overhead |
| :--- | :--- | :--- |
| `Standard JSON.parse()` | 7.98 ms | Allocates 5,000 distinct heap objects upfront |
| `SlimJSON JSON.parse() + lazy()` | **4.52 ms (~1.8x faster)** | **0 upfront row object allocations** (Proxy on demand) |
| `SlimJSON JSON.parse() + unpack()` | 6.53 ms | Eagerly reconstitutes 5,000 objects |

---

## 📁 Repository Structure

```
slimjson/
├── SPEC.md                    # Official SlimJSON Specification v1.0 (RFC-style standard)
├── LICENSE                    # MIT License
├── README.md                  # Project overview & documentation
│
├── packages/
│   ├── js/                    # TypeScript / JavaScript client library
│   │   ├── src/
│   │   │   ├── pack.ts        # Array of objects -> SlimDocument
│   │   │   ├── unpack.ts      # SlimDocument -> Array of objects
│   │   │   ├── lazy.ts        # Zero-copy Proxy lazy reader
│   │   │   └── types.ts       # TypeScript interfaces & types
│   │   └── test/              # Unit tests (node:test)
│   │
│   └── dotnet/                # C# / .NET library (System.Text.Json)
│       ├── SlimJson.slnx      # Solution file (.NET 8, 9, 10)
│       ├── src/SlimJson/      # Core .NET library
│       │   ├── SlimDocument.cs
│       │   ├── SlimJsonSerializer.cs
│       │   └── Options.cs
│       └── tests/             # xUnit test suite
│
└── examples/
    ├── benchmark/             # Automated benchmark script (Node.js)
    ├── browser/               # Interactive HTML demo with live inspector & size calculator
    └── dotnet-api/            # Runnable .NET 10 console & Web API sample
```

---

## 🚀 Quick Start

### TypeScript / JavaScript (`packages/js`)

#### 1. Installation
```bash
npm install slimjson
```

#### 2. Packing and Unpacking
```typescript
import { pack, unpack, lazy } from 'slimjson';

// Packing: Array of objects -> SlimJSON
const users = [
  { id: 1, name: "Budi", city: "Jakarta" },
  { id: 2, name: "Siti", city: "Bandung" }
];

const slim = pack(users);
console.log(JSON.stringify(slim));
// {"__slim__":"1.0","cols":["id","name","city"],"rows":[[1,"Budi","Jakarta"],[2,"Siti","Bandung"]]}

// Unpacking: SlimJSON -> Array of objects
const restored = unpack(slim);
```

#### 3. Zero-Copy Lazy Reader (Recommended for Frontend & Virtual Lists)
Avoid allocating thousands of objects in memory. Access properties directly with $O(1)$ efficiency:
```typescript
const list = lazy(slim);

console.log(list.length);            // 2
console.log(list[0].name);           // "Budi" (instant read, 0 heap allocations)
console.log(Object.keys(list[0]));   // ["id", "name", "city"]

// Map / filter directly
const names = list.map(u => u.name); // ["Budi", "Siti"]
```

---

### C# / .NET (`packages/dotnet`)

Compatible with **.NET 8.0, .NET 9.0, and .NET 10.0**.

#### 1. Installation
```bash
dotnet add package SlimJson
```

#### 2. Model Definition
```csharp
using System.Text.Json.Serialization;

public class Customer
{
    public int Id { get; set; }

    [JsonPropertyName("customer_name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("customer_address")]
    public string Address { get; set; } = string.Empty;

    public decimal Balance { get; set; }
}
```

#### 3. Serialization & Deserialization
```csharp
using SlimJson;

var customers = new List<Customer>
{
    new() { Id = 1, Name = "Budi", Address = "Jakarta", Balance = 250000m },
    new() { Id = 2, Name = "Siti", Address = "Bandung", Balance = 120000m }
};

// Serialize directly to SlimJSON string
string slimJson = SlimJsonSerializer.Serialize(customers);

// Deserialize directly back to List<Customer>
List<Customer> restored = SlimJsonSerializer.Deserialize<Customer>(slimJson);
```

#### 4. ASP.NET Core Endpoint Example
```csharp
app.MapGet("/api/customers", (CustomerDbContext db) =>
{
    var data = db.Customers.Take(5000).ToList();
    var slimDoc = SlimJsonSerializer.Pack(data);
    return Results.Json(slimDoc, contentType: "application/vnd.slimjson+json");
});
```

---

## 🌐 HTTP Content Negotiation & MIME Type

Clients requesting SlimJSON formatted responses should advertise support via the `Accept` header:
```http
Accept: application/vnd.slimjson+json, application/json;q=0.9
```

Servers responding with SlimJSON should provide the corresponding `Content-Type`:
```http
Content-Type: application/vnd.slimjson+json; charset=utf-8
```

---

## 🧪 Running Tests & Examples

### Run JavaScript Tests
```bash
cd packages/js
npm install
npm test
```

### Run .NET Tests
```bash
cd packages/dotnet
dotnet test SlimJson.slnx
```

### Run Benchmark
```bash
cd examples/benchmark
npm install
node benchmark.mjs
```

### Run Interactive Browser Demo
Open `examples/browser/index.html` in any web browser.

---

## 📜 Specification & RFC

Full technical specifications, formal grammar, dimension invariants, and security guidelines are documented in [**SPEC.md**](SPEC.md).

## 📄 License

This project is licensed under the [MIT License](LICENSE).
