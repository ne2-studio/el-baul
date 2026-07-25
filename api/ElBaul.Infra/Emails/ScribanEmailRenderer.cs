using Scriban;
using Scriban.Runtime;

namespace ElBaul.Infra.Emails;

/// <summary>
/// Renders email templates (Layout + components + the two top-level email templates) via
/// Scriban. Registered as a singleton: parsed Scriban `Template` objects are immutable and
/// safe to reuse across concurrent renders, and eagerly parsing everything at construction
/// means a template syntax error fails fast at startup instead of on the first send.
/// </summary>
internal sealed class ScribanEmailRenderer : IEmailRenderer
{
    private readonly EmbeddedTemplateLoader _loader = new();
    private readonly Dictionary<string, Template> _parsed;

    public ScribanEmailRenderer()
    {
        _parsed = _loader.TemplateNames.ToDictionary(name => name, Parse);
    }

    private Template Parse(string name)
    {
        var source = _loader.LoadByTemplateName(name);
        var template = Template.Parse(source, name);
        if (template.HasErrors)
            throw new InvalidOperationException(
                $"Email template '{name}' failed to parse: {string.Join("; ", template.Messages)}");
        return template;
    }

    public Task<ScribanRenderResult> RenderAsync<T>(string template, T model, CancellationToken cancellationToken = default)
    {
        var (subject, html) = RenderOne($"{template}.html", model);
        var (_, text) = RenderOne($"{template}.text", model);
        return Task.FromResult(new ScribanRenderResult(subject, html, text));
    }

    private (string Subject, string Body) RenderOne<T>(string templateName, T model)
    {
        if (!_parsed.TryGetValue(templateName, out var parsedTemplate))
            throw new InvalidOperationException($"Unknown email template: {templateName}");

        var scriptObject = new ScriptObject();
        scriptObject.Import(model);
        scriptObject.Import("truncate", new Func<string, int, string>(Truncate));

        var context = new TemplateContext
        {
            TemplateLoader = _loader,
            // An unbound field referenced by a template throws immediately at render time
            // instead of silently rendering nothing — the primary defense against a template
            // referencing a model property that was renamed or never existed.
            StrictVariables = true
        };
        foreach (var (name, parsed) in _parsed)
            context.CachedTemplates[name] = parsed;
        context.PushGlobal(scriptObject);

        var body = parsedTemplate.Render(context);
        // `capture` stores its captured output as a Scriban StringBuilderOutput, not a plain
        // string — ToString() is required to get the literal text back out.
        var found = scriptObject.TryGetValue(context, default, "subject", out var subjectValue);
        var subject = found ? subjectValue?.ToString() : null;
        if (string.IsNullOrEmpty(subject))
            throw new InvalidOperationException($"Template '{templateName}' did not capture a subject.");

        return (subject, body);
    }

    // Scriban's built-in `string.truncate` pads with "..." rather than a single "…" and
    // counts differently — this replicates the exact ellipsis behavior the emails have always
    // used, imported as a callable template function so both .html and .text templates share it.
    private static string Truncate(string value, int maxLength) =>
        value.Length <= maxLength ? value : value[..(maxLength - 1)] + "…";
}
