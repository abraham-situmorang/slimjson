using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using SlimJson;

Console.OutputEncoding = Encoding.UTF8;
Console.WriteLine("=================================================");
Console.WriteLine("🚀 SlimJSON .NET Integration Demo (SPEC v1.0)");
Console.WriteLine("=================================================\n");

// 1. Generate 1,000 sample records
int recordCount = 1000;
var customers = Enumerable.Range(1, recordCount).Select(i => new CustomerRecord
{
    CustomerId = 10000 + i,
    CustomerName = $"Customer #{i}",
    CustomerAddress = $"Jl. Merdeka Barat No. {i}, Jakarta",
    Email = $"user{i}@example.com",
    IsActive = i % 2 == 0,
    CreditLimit = 50000m + (i * 100m),
    CreatedAt = DateTime.UtcNow.AddDays(-i)
}).ToList();

// 2. Standard JSON serialization
string standardJson = JsonSerializer.Serialize(customers, new JsonSerializerOptions { WriteIndented = false });
int standardBytes = Encoding.UTF8.GetByteCount(standardJson);

// 3. SlimJSON serialization
string slimJson = SlimJsonSerializer.Serialize(customers);
int slimBytes = Encoding.UTF8.GetByteCount(slimJson);

double savedPct = (1.0 - (double)slimBytes / standardBytes) * 100;

Console.WriteLine($"📊 Dataset Size: {recordCount:N0} records");
Console.WriteLine($"   Standard JSON: {standardBytes / 1024.0:F1} KB ({standardBytes:N0} bytes)");
Console.WriteLine($"   SlimJSON:      {slimBytes / 1024.0:F1} KB ({slimBytes:N0} bytes)");
Console.WriteLine($"   🔥 Bandwidth Saved: {savedPct:F1}%\n");

// 4. Sample preview of SlimJSON output
Console.WriteLine("📄 Sample SlimJSON Payload (first 3 records):");
var previewDoc = SlimJsonSerializer.Pack(customers.Take(3));
Console.WriteLine(JsonSerializer.Serialize(previewDoc, new JsonSerializerOptions { WriteIndented = true }));

// 5. Deserialization / Roundtrip Verification
Console.WriteLine("\n🔄 Unpacking & Roundtrip Deserialization Test...");
var stopwatch = System.Diagnostics.Stopwatch.StartNew();
var restoredList = SlimJsonSerializer.Deserialize<CustomerRecord>(slimJson);
stopwatch.Stop();

Console.WriteLine($"✅ Successfully unpacked {restoredList.Count:N0} objects in {stopwatch.Elapsed.TotalMilliseconds:F2} ms!");
Console.WriteLine($"   First customer: {restoredList[0].CustomerName} | Address: {restoredList[0].CustomerAddress}");
Console.WriteLine($"   Last customer:  {restoredList[^1].CustomerName} | Limit: {restoredList[^1].CreditLimit:C}\n");

public class CustomerRecord
{
    [JsonPropertyName("customer_id")]
    public int CustomerId { get; set; }

    [JsonPropertyName("customer_name")]
    public string CustomerName { get; set; } = string.Empty;

    [JsonPropertyName("customer_address")]
    public string CustomerAddress { get; set; } = string.Empty;

    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("is_active")]
    public bool IsActive { get; set; }

    [JsonPropertyName("credit_limit")]
    public decimal CreditLimit { get; set; }

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }
}
