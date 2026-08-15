namespace ElBaul.Core.Notifications.OutputPorts;
public enum DigestBlockKind
{
    NewChapter,
    NewRecuerdos,
    NewPhotosInChapter,
    NewLoosePhotos
}

public record DigestActivityBlock(DigestBlockKind Kind, string Label, string DeepLinkUrl, int Count);

public record BaulDigestSection(string BaulName, string BaulUrl, IReadOnlyList<DigestActivityBlock> Blocks, string? OverflowSummary);

public record WeeklyDigestEmailModel(
    string UserName,
    bool HasBaules,
    bool HasActivity,
    IReadOnlyList<BaulDigestSection> Sections,
    string PrimaryCtaUrl,
    string PrimaryCtaLabel,
    string NotificationSettingsUrl,
    EmailFooterLinks Footer,
    string PixelUrl,
    string LogoUrl);
