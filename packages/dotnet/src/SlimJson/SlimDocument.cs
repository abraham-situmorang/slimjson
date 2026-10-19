using System.Text.Json.Serialization;

namespace SlimJson;

/// <summary>
/// Represents a document adhering to the SlimJSON Specification v1.0.
/// </summary>
public sealed class SlimDocument
{
    /// <summary>
    /// The specification version string (MUST be "1.0" for this release).
    /// </summary>
    [JsonPropertyName("__slim__")]
    public string SlimVersion { get; set; } = "1.0";

    /// <summary>
    /// Optional application-level metadata (such as pagination, timestamps, or schema info).
    /// </summary>
    [JsonPropertyName("meta")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public Dictionary<string, object?>? Meta { get; set; }

    /// <summary>
    /// The ordered list of column identifiers.
    /// </summary>
    [JsonPropertyName("cols")]
    public List<string> Cols { get; set; } = new();

    /// <summary>
    /// Two-dimensional array representing rows of values matching the column order in <see cref="Cols"/>.
    /// </summary>
    [JsonPropertyName("rows")]
    public List<List<object?>> Rows { get; set; } = new();

    /// <summary>
    /// Gets the number of rows contained in this document.
    /// </summary>
    [JsonIgnore]
    public int RowCount => Rows.Count;

    /// <summary>
    /// Gets the number of columns defined in this document.
    /// </summary>
    [JsonIgnore]
    public int ColumnCount => Cols.Count;

    /// <summary>
    /// Validates whether the document conforms to basic SlimJSON structural invariants.
    /// </summary>
    /// <param name="errorMessage">Error description if invalid.</param>
    /// <returns>True if valid, false otherwise.</returns>
    public bool Validate(out string? errorMessage)
    {
        if (string.IsNullOrWhiteSpace(SlimVersion))
        {
            errorMessage = "SlimDocument is missing __slim__ version header.";
            return false;
        }

        if (Cols == null)
        {
            errorMessage = "SlimDocument 'cols' array is null.";
            return false;
        }

        if (Rows == null)
        {
            errorMessage = "SlimDocument 'rows' array is null.";
            return false;
        }

        int colCount = Cols.Count;
        for (int i = 0; i < Rows.Count; i++)
        {
            var row = Rows[i];
            if (row == null)
            {
                errorMessage = $"Row at index {i} is null.";
                return false;
            }

            if (row.Count != colCount)
            {
                errorMessage = $"Dimension mismatch at row index {i}: expected {colCount} columns, found {row.Count}.";
                return false;
            }
        }

        errorMessage = null;
        return true;
    }
}
