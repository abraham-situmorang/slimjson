using System.Collections.Concurrent;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace SlimJson;

/// <summary>
/// Provides high-performance methods for packing, unpacking, serializing, and deserializing SlimJSON documents.
/// </summary>
public static class SlimJsonSerializer
{
    private static readonly ConcurrentDictionary<Type, PropertyAccessorInfo[]> PropertyCache = new();

    private sealed class PropertyAccessorInfo
    {
        public required string PropertyName { get; init; }
        public required string JsonName { get; init; }
        public required PropertyInfo PropertyInfo { get; init; }
        public required Type PropertyType { get; init; }
    }

    private static PropertyAccessorInfo[] GetCachedProperties(Type type)
    {
        return PropertyCache.GetOrAdd(type, t =>
        {
            var props = t.GetProperties(BindingFlags.Public | BindingFlags.Instance)
                         .Where(p => p.CanRead);

            var list = new List<PropertyAccessorInfo>();
            foreach (var p in props)
            {
                var jsonPropAttr = p.GetCustomAttribute<JsonPropertyNameAttribute>();
                string jsonName = jsonPropAttr?.Name ?? p.Name;
                list.Add(new PropertyAccessorInfo
                {
                    PropertyName = p.Name,
                    JsonName = jsonName,
                    PropertyInfo = p,
                    PropertyType = p.PropertyType
                });
            }
            return list.ToArray();
        });
    }

    /// <summary>
    /// Packs an enumerable collection of objects into a <see cref="SlimDocument"/>.
    /// </summary>
    public static SlimDocument Pack<T>(IEnumerable<T> items, SlimPackOptions? options = null)
    {
        ArgumentNullException.ThrowIfNull(items);

        var doc = new SlimDocument
        {
            SlimVersion = "1.0",
            Meta = options?.Meta
        };

        var props = GetCachedProperties(typeof(T));

        // Filter / reorder properties if explicit columns were provided
        List<PropertyAccessorInfo> selectedProps;
        if (options?.Columns != null && options.Columns.Count > 0)
        {
            selectedProps = new List<PropertyAccessorInfo>();
            foreach (var col in options.Columns)
            {
                var match = props.FirstOrDefault(p =>
                    string.Equals(p.JsonName, col, StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(p.PropertyName, col, StringComparison.OrdinalIgnoreCase));

                if (match != null)
                {
                    selectedProps.Add(match);
                    doc.Cols.Add(col);
                }
            }
        }
        else
        {
            selectedProps = props.ToList();
            foreach (var p in selectedProps)
            {
                string colName = p.JsonName;
                if (options?.UseCamelCase == true && colName.Length > 0 && char.IsUpper(colName[0]))
                {
                    colName = char.ToLowerInvariant(colName[0]) + colName[1..];
                }
                doc.Cols.Add(colName);
            }
        }

        foreach (var item in items)
        {
            var row = new List<object?>(selectedProps.Count);
            if (item == null)
            {
                for (int i = 0; i < selectedProps.Count; i++) row.Add(null);
            }
            else
            {
                for (int i = 0; i < selectedProps.Count; i++)
                {
                    row.Add(selectedProps[i].PropertyInfo.GetValue(item));
                }
            }
            doc.Rows.Add(row);
        }

        return doc;
    }

    /// <summary>
    /// Unpacks a <see cref="SlimDocument"/> into a list of strongly typed objects.
    /// </summary>
    public static List<T> Unpack<T>(SlimDocument document, SlimUnpackOptions? options = null, JsonSerializerOptions? jsonOptions = null)
        where T : new()
    {
        ArgumentNullException.ThrowIfNull(document);

        var lenient = options?.Lenient ?? false;
        if (!lenient && !document.Validate(out var error))
        {
            throw new SlimJsonException(error ?? "Invalid SlimDocument structure.");
        }

        var props = GetCachedProperties(typeof(T));
        var colMap = new PropertyAccessorInfo?[document.Cols.Count];

        for (int c = 0; c < document.Cols.Count; c++)
        {
            string colName = document.Cols[c];
            colMap[c] = props.FirstOrDefault(p =>
                string.Equals(p.JsonName, colName, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(p.PropertyName, colName, StringComparison.OrdinalIgnoreCase));
        }

        var result = new List<T>(document.Rows.Count);

        for (int r = 0; r < document.Rows.Count; r++)
        {
            var row = document.Rows[r];
            if (row == null)
            {
                if (lenient) continue;
                throw new SlimJsonException($"Row at index {r} is null.");
            }

            if (!lenient && row.Count != document.Cols.Count)
            {
                throw new SlimJsonException($"Dimension mismatch at row index {r}: expected {document.Cols.Count} columns, found {row.Count}.");
            }

            var item = new T();
            int bound = Math.Min(row.Count, colMap.Length);
            for (int c = 0; c < bound; c++)
            {
                var accessor = colMap[c];
                if (accessor == null || !accessor.PropertyInfo.CanWrite) continue;

                var rawVal = row[c];
                var converted = ConvertValue(rawVal, accessor.PropertyType, jsonOptions);
                accessor.PropertyInfo.SetValue(item, converted);
            }

            result.Add(item);
        }

        return result;
    }

    /// <summary>
    /// Serializes an enumerable of objects directly into a SlimJSON string.
    /// </summary>
    public static string Serialize<T>(IEnumerable<T> items, SlimPackOptions? packOptions = null, JsonSerializerOptions? jsonOptions = null)
    {
        var doc = Pack(items, packOptions);
        return JsonSerializer.Serialize(doc, jsonOptions);
    }

    /// <summary>
    /// Deserializes a SlimJSON string into a list of strongly typed objects.
    /// </summary>
    public static List<T> Deserialize<T>(string slimJson, SlimUnpackOptions? unpackOptions = null, JsonSerializerOptions? jsonOptions = null)
        where T : new()
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(slimJson);

        var doc = JsonSerializer.Deserialize<SlimDocument>(slimJson, jsonOptions)
            ?? throw new SlimJsonException("Failed to deserialize JSON into SlimDocument.");

        return Unpack<T>(doc, unpackOptions, jsonOptions);
    }

    /// <summary>
    /// Asynchronously serializes an enumerable of objects as a SlimJSON document directly into a stream.
    /// </summary>
    public static async Task SerializeAsync<T>(Stream utf8JsonStream, IEnumerable<T> items, SlimPackOptions? packOptions = null, JsonSerializerOptions? jsonOptions = null, CancellationToken cancellationToken = default)
    {
        var doc = Pack(items, packOptions);
        await JsonSerializer.SerializeAsync(utf8JsonStream, doc, jsonOptions, cancellationToken);
    }

    /// <summary>
    /// Asynchronously deserializes a UTF-8 stream containing a SlimJSON document into a list of strongly typed objects.
    /// </summary>
    public static async Task<List<T>> DeserializeAsync<T>(Stream utf8JsonStream, SlimUnpackOptions? unpackOptions = null, JsonSerializerOptions? jsonOptions = null, CancellationToken cancellationToken = default)
        where T : new()
    {
        var doc = await JsonSerializer.DeserializeAsync<SlimDocument>(utf8JsonStream, jsonOptions, cancellationToken)
            ?? throw new SlimJsonException("Failed to deserialize JSON stream into SlimDocument.");

        return Unpack<T>(doc, unpackOptions, jsonOptions);
    }

    private static object? ConvertValue(object? rawValue, Type targetType, JsonSerializerOptions? jsonOptions)
    {
        if (rawValue == null) return null;

        var underlyingType = Nullable.GetUnderlyingType(targetType) ?? targetType;

        if (rawValue is JsonElement element)
        {
            if (element.ValueKind == JsonValueKind.Null || element.ValueKind == JsonValueKind.Undefined)
            {
                return null;
            }

            if (underlyingType == typeof(string)) return element.GetString();
            if (underlyingType == typeof(int)) return element.GetInt32();
            if (underlyingType == typeof(long)) return element.GetInt64();
            if (underlyingType == typeof(double)) return element.GetDouble();
            if (underlyingType == typeof(decimal)) return element.GetDecimal();
            if (underlyingType == typeof(bool)) return element.GetBoolean();
            if (underlyingType == typeof(DateTime)) return element.GetDateTime();
            if (underlyingType == typeof(DateTimeOffset)) return element.GetDateTimeOffset();
            if (underlyingType == typeof(Guid)) return element.GetGuid();

            return element.Deserialize(targetType, jsonOptions);
        }

        if (targetType.IsInstanceOfType(rawValue))
        {
            return rawValue;
        }

        try
        {
            return Convert.ChangeType(rawValue, underlyingType);
        }
        catch
        {
            return rawValue;
        }
    }
}
