using System.Text.Json;
using System.Text.Json.Serialization;
using SlimJson;
using Xunit;

namespace SlimJson.Tests;

public class Customer
{
    public int Id { get; set; }

    [JsonPropertyName("customer_name")]
    public string? CustomerName { get; set; }

    [JsonPropertyName("customer_address")]
    public string? CustomerAddress { get; set; }

    public bool IsActive { get; set; }

    public decimal? Balance { get; set; }
}

public class SerializerTests
{
    private static List<Customer> CreateSampleCustomers() => new()
    {
        new Customer { Id = 1, CustomerName = "Budi Santoso", CustomerAddress = "Jl. Sudirman 10 Jakarta", IsActive = true, Balance = 250000.50m },
        new Customer { Id = 2, CustomerName = "Siti Rahma", CustomerAddress = "Jl. Thamrin 5 Bandung", IsActive = false, Balance = null },
        new Customer { Id = 3, CustomerName = "Andi Wijaya", CustomerAddress = "Jl. Gatot Subroto 1 Surabaya", IsActive = true, Balance = 120000m }
    };

    [Fact]
    public void Pack_UniformObjects_ProducesValidSlimDocument()
    {
        var customers = CreateSampleCustomers();
        var doc = SlimJsonSerializer.Pack(customers);

        Assert.Equal("1.0", doc.SlimVersion);
        Assert.Equal(3, doc.RowCount);
        Assert.Equal(5, doc.ColumnCount);
        Assert.Contains("customer_name", doc.Cols);
        Assert.Contains("customer_address", doc.Cols);

        Assert.True(doc.Validate(out var error), error);
    }

    [Fact]
    public void Serialize_And_Deserialize_RoundTripFidelity()
    {
        var original = CreateSampleCustomers();
        var json = SlimJsonSerializer.Serialize(original);

        Assert.Contains("\"__slim__\":\"1.0\"", json);
        Assert.Contains("\"cols\":", json);
        Assert.Contains("\"rows\":", json);

        var unpacked = SlimJsonSerializer.Deserialize<Customer>(json);

        Assert.Equal(original.Count, unpacked.Count);
        for (int i = 0; i < original.Count; i++)
        {
            Assert.Equal(original[i].Id, unpacked[i].Id);
            Assert.Equal(original[i].CustomerName, unpacked[i].CustomerName);
            Assert.Equal(original[i].CustomerAddress, unpacked[i].CustomerAddress);
            Assert.Equal(original[i].IsActive, unpacked[i].IsActive);
            Assert.Equal(original[i].Balance, unpacked[i].Balance);
        }
    }

    [Fact]
    public void Pack_WithMetadata_PreservesMetadata()
    {
        var customers = CreateSampleCustomers();
        var meta = new Dictionary<string, object?>
        {
            ["page"] = 1,
            ["totalRecords"] = 3
        };

        var doc = SlimJsonSerializer.Pack(customers, new SlimPackOptions { Meta = meta });
        Assert.NotNull(doc.Meta);
        Assert.Equal(1, doc.Meta["page"]);

        var json = JsonSerializer.Serialize(doc);
        var unpackedDoc = JsonSerializer.Deserialize<SlimDocument>(json);
        Assert.NotNull(unpackedDoc?.Meta);
    }

    [Fact]
    public void Pack_ExplicitColumns_LimitsAndOrdersColumns()
    {
        var customers = CreateSampleCustomers();
        var options = new SlimPackOptions
        {
            Columns = new[] { "customer_name", "Id" }
        };

        var doc = SlimJsonSerializer.Pack(customers, options);
        Assert.Equal(2, doc.ColumnCount);
        Assert.Equal(new[] { "customer_name", "Id" }, doc.Cols);
        Assert.Equal("Budi Santoso", doc.Rows[0][0]);
        Assert.Equal(1, doc.Rows[0][1]);
    }

    [Fact]
    public void Unpack_DimensionMismatch_ThrowsSlimJsonException()
    {
        var doc = new SlimDocument
        {
            Cols = new List<string> { "Id", "customer_name" },
            Rows = new List<List<object?>>
            {
                new() { 1, "Budi" },
                new() { 2 } // Missing second column
            }
        };

        Assert.Throws<SlimJsonException>(() => SlimJsonSerializer.Unpack<Customer>(doc));

        // Lenient mode should succeed
        var lenient = SlimJsonSerializer.Unpack<Customer>(doc, new SlimUnpackOptions { Lenient = true });
        Assert.Equal(2, lenient.Count);
        Assert.Equal(2, lenient[1].Id);
        Assert.Null(lenient[1].CustomerName);
    }

    [Fact]
    public async Task Async_SerializeAndDeserialize_Stream_WorksCorrectly()
    {
        var original = CreateSampleCustomers();
        using var stream = new MemoryStream();

        await SlimJsonSerializer.SerializeAsync(stream, original);
        stream.Position = 0;

        var unpacked = await SlimJsonSerializer.DeserializeAsync<Customer>(stream);
        Assert.Equal(original.Count, unpacked.Count);
        Assert.Equal("Budi Santoso", unpacked[0].CustomerName);
    }
}
