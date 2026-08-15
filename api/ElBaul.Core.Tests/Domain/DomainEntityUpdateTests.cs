using ElBaul.Domain;
using ElBaul.OutputPorts.Bauls;
using ElBaul.OutputPorts.Chapters;
using ElBaul.OutputPorts.Notifications;
using ElBaul.OutputPorts.Personas;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Sharing;

namespace ElBaul.Tests;

public class DomainEntityUpdateTests
{
    [Fact]
    public void Photo_MarkDeleted_StoresDeletionStateAndReason()
    {
        var photo = Photo.Create(
            new PhotoId(Guid.NewGuid()),
            new ChapterId(Guid.NewGuid()),
            new BaulId(Guid.NewGuid()),
            "photos/one.jpg",
            null,
            new UserId("user-1"),
            new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc));
        var deletedAt = new DateTime(2026, 1, 2, 10, 0, 0, DateTimeKind.Utc);

        var updated = photo.MarkDeleted("duplicate", deletedAt);

        Assert.Equal(PhotoStatus.Deleted, updated.Status);
        Assert.Equal(deletedAt, updated.DeletedAt);
        Assert.Equal("duplicate", updated.DeletionReason);
    }

    [Fact]
    public void Persona_WithAvatarPhoto_UsesThePhotoIdAndClearsImportedAvatarKey()
    {
        var persona = new Persona(
            new PersonaId(Guid.NewGuid()),
            new BaulId(Guid.NewGuid()),
            new UserId("user-1"),
            "Tita",
            BaulRole.Colaborador,
            new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc),
            AvatarPhotoKey: "imported/avatar.jpg");
        var photo = Photo.Create(
            new PhotoId(Guid.NewGuid()),
            null,
            persona.BaulId,
            "photos/avatar.jpg",
            null,
            new UserId("user-1"),
            persona.InvitedDate);

        var updated = persona.WithAvatarPhoto(photo, cropX: 0.2m, cropY: 0.3m, cropScale: 1.4m);

        Assert.Null(updated.AvatarPhotoKey);
        Assert.Equal(photo.Id, updated.AvatarPhotoId);
        Assert.Equal(0.2m, updated.AvatarCropX);
        Assert.Equal(0.3m, updated.AvatarCropY);
        Assert.Equal(1.4m, updated.AvatarCropScale);
    }

    [Fact]
    public void Chapter_WithCover_StoresCropAlongsideTheCoverPhotoKey()
    {
        var chapter = new Chapter(
            new ChapterId(Guid.NewGuid()), new BaulId(Guid.NewGuid()), "Vacaciones", 0, null,
            new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc));
        var photo = Photo.Create(
            new PhotoId(Guid.NewGuid()), chapter.Id, chapter.BaulId, "photos/cover.jpg", null,
            new UserId("user-1"), chapter.CreatedAt);
        var updatedAt = new DateTime(2026, 1, 2, 10, 0, 0, DateTimeKind.Utc);

        var updated = chapter.WithCover(photo, cropX: 0.2m, cropY: 0.3m, cropScale: 1.4m, updatedAt);

        Assert.Equal(photo.StorageKey, updated.CoverPhotoKey);
        Assert.Equal(0.2m, updated.CoverCropX);
        Assert.Equal(0.3m, updated.CoverCropY);
        Assert.Equal(1.4m, updated.CoverCropScale);
        Assert.Equal(updatedAt, updated.UpdatedAt);
    }

    [Fact]
    public void Baul_WithCover_StoresCropAlongsideTheCoverPhotoKey()
    {
        var baul = new Baul(
            new BaulId(Guid.NewGuid()), "Familia", null, new UserId("user-1"), 0,
            new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc));
        var photo = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, baul.Id, "photos/cover.jpg", null,
            new UserId("user-1"), baul.CreatedAt);
        var updatedAt = new DateTime(2026, 1, 2, 10, 0, 0, DateTimeKind.Utc);

        var updated = baul.WithCover(photo, cropX: 0.2m, cropY: 0.3m, cropScale: 1.4m, updatedAt);

        Assert.Equal(photo.StorageKey, updated.CoverPhotoKey);
        Assert.Equal(0.2m, updated.CoverCropX);
        Assert.Equal(0.3m, updated.CoverCropY);
        Assert.Equal(1.4m, updated.CoverCropScale);
        Assert.Equal(updatedAt, updated.UpdatedAt);
    }

    [Fact]
    public void SharedLinks_Revoke_StoresRevocationTimestamp()
    {
        var revokedAt = new DateTime(2026, 1, 2, 10, 0, 0, DateTimeKind.Utc);
        var sharedLink = new SharedLink(
            new SharedLinkId(Guid.NewGuid()), "shared-token", new BaulId(Guid.NewGuid()),
            SharedLinkContentType.Photo, new PhotoId(Guid.NewGuid()), null,
            new UserId("user-1"), new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc));
        var inviteLink = new BaulInviteLink(
            new BaulInviteLinkId(Guid.NewGuid()), "invite-token", new BaulId(Guid.NewGuid()),
            new UserId("user-1"), new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc));

        Assert.Equal(revokedAt, sharedLink.Revoke(revokedAt).RevokedAt);
        Assert.Equal(revokedAt, inviteLink.Revoke(revokedAt).RevokedAt);
    }

    [Fact]
    public void SentEmail_MarkSent_StoresProviderDetailsAndClearsStaleError()
    {
        var sentEmail = new SentEmail(
            Guid.NewGuid(),
            new UserId("user-1"),
            EmailType.Welcome,
            "Subject",
            "user@example.com",
            "v1",
            "es",
            EmailStatus.Failed,
            "welcome:user-1",
            new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc),
            ErrorMessage: "previous failure");
        var sentAt = new DateTime(2026, 1, 2, 10, 0, 0, DateTimeKind.Utc);

        var updated = sentEmail.MarkSent("Resend", "provider-1", sentAt);

        Assert.Equal(EmailStatus.Sent, updated.Status);
        Assert.Equal("Resend", updated.Provider);
        Assert.Equal("provider-1", updated.ProviderMessageId);
        Assert.Equal(sentAt, updated.SentAt);
        Assert.Null(updated.ErrorMessage);
    }
}
