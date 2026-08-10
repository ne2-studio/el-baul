using ElBaul.Ports.Output;

namespace ElBaul.Api.Models;

public record CreateRemovalRequestRequest(PhotoId PhotoId, string? Reason);
