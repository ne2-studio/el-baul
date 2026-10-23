namespace ElBaul.Api.Models;

/// <summary>Documentation-only shape for OpenAPI: matches AdminController.GetDashboard's
/// anonymous response object. Never constructed at runtime — referenced only from
/// [ProducesResponseType] attributes.</summary>
public record AdminDashboardResponse(
    int RegisteredUsers,
    int TotalBaules,
    int TotalPhotos,
    int PhotosUploadedToday,
    int EmailsSentLast30Days,
    int EmailsOpenedLast30Days,
    int PushNotificationsSentLast30Days,
    int PushNotificationsOpenedLast30Days,
    IReadOnlyList<AdminExternalLinkDto> ExternalLinks);
