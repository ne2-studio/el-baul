using ElBaul.OutputPorts.Shared;
using ElBaul.Domain;
namespace ElBaul.Api.Models;

public record CreateRemovalRequestRequest(PhotoId PhotoId, string? Reason);
