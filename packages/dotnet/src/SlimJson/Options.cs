namespace SlimJson;

/// <summary>
/// Exception thrown when a SlimJSON packing, unpacking, or validation operation fails.
/// </summary>
public class SlimJsonException : Exception
{
    public SlimJsonException(string message) : base(message) { }

    public SlimJsonException(string message, Exception innerException) : base(message, innerException) { }
}

/// <summary>
/// Configuration options for packing an object collection into a SlimDocument.
/// </summary>
public sealed class SlimPackOptions
{
    /// <summary>
    /// Explicit list of property/column names to include, in the specified order.
    /// If null, all public readable instance properties are included.
    /// </summary>
    public IReadOnlyList<string>? Columns { get; set; }

    /// <summary>
    /// Optional metadata dictionary to attach to the document.
    /// </summary>
    public Dictionary<string, object?>? Meta { get; set; }

    /// <summary>
    /// Whether to use camelCase naming for inferred column names. Default is false (preserves C# property names or JsonPropertyName).
    /// </summary>
    public bool UseCamelCase { get; set; }
}

/// <summary>
/// Configuration options for unpacking a SlimDocument back into C# objects.
/// </summary>
public sealed class SlimUnpackOptions
{
    /// <summary>
    /// If true, skips or tolerates row length mismatches instead of throwing <see cref="SlimJsonException"/>.
    /// Default is false.
    /// </summary>
    public bool Lenient { get; set; }

    /// <summary>
    /// Whether property matching is case-insensitive. Default is true.
    /// </summary>
    public bool PropertyNameCaseInsensitive { get; set; } = true;
}
