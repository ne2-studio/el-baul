using ElBaul.Shared;
namespace ElBaul.Api.Models;

public record CreateRemovalRequestRequest(PhotoId PhotoId, string? Reason);
