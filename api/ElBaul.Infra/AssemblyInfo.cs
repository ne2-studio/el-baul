using System.Runtime.CompilerServices;

// Lets ElBaul.Infra.Tests exercise the internal Scriban email-rendering types
// (IEmailRenderer/ScribanEmailRenderer/EmbeddedTemplateLoader) directly, without promoting
// them to a public Ports/Output contract.
[assembly: InternalsVisibleTo("ElBaul.Infra.Tests")]
