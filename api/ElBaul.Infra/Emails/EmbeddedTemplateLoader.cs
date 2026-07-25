using Scriban;
using Scriban.Parsing;
using Scriban.Runtime;

namespace ElBaul.Infra.Emails;

/// <summary>
/// Resolves Scriban `include "Name.html"` calls against templates embedded into this
/// assembly at build time, so the shipped .dll is the single source of truth for markup —
/// no loose files, no path resolution relative to the process's working directory.
/// </summary>
internal sealed class EmbeddedTemplateLoader : ITemplateLoader
{
    private const string ResourcePrefix = "ElBaul.Infra.Emails.Templates.";
    private readonly Dictionary<string, string> _resourceNameByTemplateName;

    public EmbeddedTemplateLoader()
    {
        var assembly = typeof(EmbeddedTemplateLoader).Assembly;
        _resourceNameByTemplateName = assembly.GetManifestResourceNames()
            .Where(name => name.StartsWith(ResourcePrefix, StringComparison.Ordinal))
            .ToDictionary(name => StripExtension(name[ResourcePrefix.Length..]), name => name);
    }

    public IReadOnlyCollection<string> TemplateNames => _resourceNameByTemplateName.Keys;

    // "Layout.html.sbnhtml" -> "Layout.html"; "Footer.text.sbntxt" -> "Footer.text"
    private static string StripExtension(string resourceSuffix) =>
        resourceSuffix[..resourceSuffix.LastIndexOf('.')];

    public string? GetPath(TemplateContext context, SourceSpan callerSpan, string templateName) =>
        _resourceNameByTemplateName.TryGetValue(templateName, out var resourceName) ? resourceName : null;

    public string? Load(TemplateContext context, SourceSpan callerSpan, string templatePath)
    {
        using var stream = typeof(EmbeddedTemplateLoader).Assembly.GetManifestResourceStream(templatePath)
            ?? throw new InvalidOperationException($"Embedded email template resource not found: {templatePath}");
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }

    public ValueTask<string?> LoadAsync(TemplateContext context, SourceSpan callerSpan, string templatePath) =>
        ValueTask.FromResult(Load(context, callerSpan, templatePath));

    /// <summary>Reads a template's source by its `include`-visible name, for eager startup parsing.</summary>
    public string LoadByTemplateName(string templateName)
    {
        var path = GetPath(null!, default, templateName)
            ?? throw new InvalidOperationException($"Unknown email template: {templateName}");
        return Load(null!, default, path)!;
    }
}
