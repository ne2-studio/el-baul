using ElBaul.Core.Bauls.Domain;
using ElBaul.Core.Chapters.Domain;
using ElBaul.Core.Photos.Domain;
using ElBaul.Core.Personas.Domain;
using ElBaul.Core.Sharing.Domain;
using ElBaul.Core.Notifications.Domain;
using ElBaul.Domain;
using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Chapters.OutputPorts;
using ElBaul.Core.Notifications.OutputPorts;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Sharing.OutputPorts;

namespace ElBaul.Tests;

public class DomainEntityUpdateTests
{
    [Fact]
    public void Entities_UseIdIdentity_RegardlessOfOtherState()
    {
        var id = new BaulId(Guid.NewGuid());
        var first = new Baul(id, "Familia", null, new UserId("owner"), 0, DateTime.UtcNow, DateTime.UtcNow);
        var second = new Baul(id, "Otra familia", "Descripción", new UserId("other"), 3, DateTime.UtcNow.AddDays(1), DateTime.UtcNow.AddDays(1));
        var different = new Baul(new BaulId(Guid.NewGuid()), first.Name, first.Description, first.CustodioId, first.ChapterCount, first.CreatedAt, first.UpdatedAt);

        Assert.Equal(first, second);
        Assert.True(first == second);
        Assert.True(first != different);
        Assert.Equal(first.GetHashCode(), second.GetHashCode());
        Assert.NotEqual(first, different);
    }

    [Fact]
    public void Photo_MarkDeleted_StoresDeletionStateAndReason()
    {
        var photo = PhotoMother.Create(
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
    public void Persona_WithAvatarPhoto_UsesThePhotoIdAndCrop()
    {
        var persona = new Persona(
            new PersonaId(Guid.NewGuid()),
            new BaulId(Guid.NewGuid()),
            new UserId("user-1"),
            "Tita",
            BaulRole.Colaborador,
            new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc));
        var photo = PhotoMother.Create(
            new PhotoId(Guid.NewGuid()),
            null,
            persona.BaulId,
            "photos/avatar.jpg",
            null,
            new UserId("user-1"),
            persona.InvitedDate);

        var updated = persona.WithAvatarPhoto(photo, new ImageCrop(0.2m, 0.3m, 1.4m));

        Assert.Equal(photo.Id, updated.AvatarPhotoId);
        Assert.Equal(0.2m, updated.AvatarCrop.X);
        Assert.Equal(0.3m, updated.AvatarCrop.Y);
        Assert.Equal(1.4m, updated.AvatarCrop.Scale);
    }

    [Fact]
    public void Chapter_WithCover_StoresCropAlongsideTheCoverPhotoId()
    {
        var chapter = new Chapter(
            new ChapterId(Guid.NewGuid()), new BaulId(Guid.NewGuid()), "Vacaciones", 0,
            new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc));
        var photo = PhotoMother.Create(
            new PhotoId(Guid.NewGuid()), chapter.Id, chapter.BaulId, "photos/cover.jpg", null,
            new UserId("user-1"), chapter.CreatedAt);
        var updatedAt = new DateTime(2026, 1, 2, 10, 0, 0, DateTimeKind.Utc);

        var updated = chapter.WithCover(photo, new ImageCrop(0.2m, 0.3m, 1.4m), updatedAt);

        Assert.Equal(photo.Id, updated.CoverPhotoId);
        Assert.Equal(0.2m, updated.CoverCrop.X);
        Assert.Equal(0.3m, updated.CoverCrop.Y);
        Assert.Equal(1.4m, updated.CoverCrop.Scale);
        Assert.Equal(updatedAt, updated.UpdatedAt);
    }

    [Fact]
    public void Baul_WithCover_StoresCropAlongsideTheCoverPhotoId()
    {
        var baul = new Baul(
            new BaulId(Guid.NewGuid()), "Familia", null, new UserId("user-1"), 0,
            new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc), new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc));
        var photo = PhotoMother.Create(
            new PhotoId(Guid.NewGuid()), null, baul.Id, "photos/cover.jpg", null,
            new UserId("user-1"), baul.CreatedAt);
        var updatedAt = new DateTime(2026, 1, 2, 10, 0, 0, DateTimeKind.Utc);

        var updated = baul.WithCover(photo, new ImageCrop(0.2m, 0.3m, 1.4m), updatedAt);

        Assert.Equal(photo.Id, updated.CoverPhotoId);
        Assert.Equal(0.2m, updated.CoverCrop.X);
        Assert.Equal(0.3m, updated.CoverCrop.Y);
        Assert.Equal(1.4m, updated.CoverCrop.Scale);
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
