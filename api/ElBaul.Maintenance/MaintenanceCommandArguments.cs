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
}
