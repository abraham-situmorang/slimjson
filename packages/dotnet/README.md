# SlimJson (.NET)

> High-performance compact tabular JSON serialization and deserialization library for .NET 8, .NET 9, and .NET 10.

`SlimJson` cuts payload sizes by **40% to 70%** for `IEnumerable<T>` collections by isolating column names into a header array and serializing records as 2D value arrays.

## Features

- ⚡ **Blazing Fast**: Built on top of `System.Text.Json` with property metadata caching.
- 🎯 **Strongly Typed**: Seamlessly serialize and deserialize `IEnumerable<T>` to/from SlimJSON.
- 📦 **Lossless Roundtrip**: Automatically preserves numbers, strings, dates, booleans, GUIDs, and nulls.
- 🌐 **ASP.NET Core Friendly**: Readily usable in Minimal APIs, Controller actions, or custom output formatters.
- 🧵 **Async & Streaming**: Direct stream serialization and deserialization via `SerializeAsync` and `DeserializeAsync`.

## Installation

```bash
dotnet add package SlimJson
```

## Quick Start

### 1. Define Model

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

### 2. Serialize to SlimJSON

```csharp
using SlimJson;

var customers = new List<Customer>
{
    new() { Id = 1, Name = "Budi Santoso", Address = "Jl. Sudirman 10 Jakarta", Balance = 250000m },
    new() { Id = 2, Name = "Siti Rahma", Address = "Jl. Thamrin 5 Bandung", Balance = 120000m }
};

// Direct JSON string serialization
string slimJson = SlimJsonSerializer.Serialize(customers);
Console.WriteLine(slimJson);

/* Produces:
{
  "__slim__": "1.0",
  "cols": ["Id", "customer_name", "customer_address", "Balance"],
  "rows": [
    [1, "Budi Santoso", "Jl. Sudirman 10 Jakarta", 250000],
    [2, "Siti Rahma", "Jl. Thamrin 5 Bandung", 120000]
  ]
}
*/
```

### 3. Deserialize back to Strongly Typed Objects

```csharp
List<Customer> unpacked = SlimJsonSerializer.Deserialize<Customer>(slimJson);

Console.WriteLine($"Restored {unpacked.Count} customers.");
Console.WriteLine($"First: {unpacked[0].Name} in {unpacked[0].Address}");
```

### 4. Pack & Attach Metadata

```csharp
var doc = SlimJsonSerializer.Pack(customers, new SlimPackOptions
{
    Meta = new Dictionary<string, object?>
    {
        ["page"] = 1,
        ["pageSize"] = 50,
        ["totalRecords"] = 1500
    }
});
```

### 5. Stream Serialization (High Volume)

```csharp
await SlimJsonSerializer.SerializeAsync(responseStream, customers);
```

## ASP.NET Core Minimal API Example

```csharp
app.MapGet("/api/customers", (CustomerDbContext db) =>
{
    var list = db.Customers.Take(1000).ToList();
    var slimDoc = SlimJsonSerializer.Pack(list);
    return Results.Json(slimDoc, contentType: "application/vnd.slimjson+json");
});
```

## License

MIT
