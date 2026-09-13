namespace ElBaul.Maintenance;

public sealed record MaintenanceCommandArguments(IReadOnlyList<string> Values)
{
    /// <summary>Reads an `--optionName N` pair — null if the flag wasn't passed or its value
    /// isn't a valid int. Used by commands accepting `--limit N`.</summary>
    public int? TryGetInt(string optionName)
    {
        var index = Values.ToList().IndexOf(optionName);
        return index >= 0 && index + 1 < Values.Count && int.TryParse(Values[index + 1], out var value)
            ? value
            : null;
    }

    /// <summary>Reads an `--optionName value` pair — null if the flag wasn't passed. Used by
    /// commands accepting e.g. `--hash <hash>` or `--asset-id <id>`.</summary>
    public string? TryGetString(string optionName)
    {
        var index = Values.ToList().IndexOf(optionName);
        return index >= 0 && index + 1 < Values.Count ? Values[index + 1] : null;
    }
}
