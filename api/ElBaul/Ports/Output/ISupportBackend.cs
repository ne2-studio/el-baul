using CSharpFunctionalExtensions;

namespace ElBaul.Ports.Output;

// Secondary port for wherever support requests actually end up (currently LeadHub,
// see ElBaul.Infra/LeadHubSupportBackend). Lets us swap or add ticket backends
// without touching SupportManager.
public interface ISupportBackend
{
    Task<Result> SubmitAsync(SupportSubmission submission);
}
