using ElBaul.Core.Bauls.Domain;
using ElBaul.Core.Chapters.Domain;
using ElBaul.Core.Photos.Domain;
using ElBaul.Core.Personas.Domain;
using ElBaul.Core.Users.Domain;
using ElBaul.Core.Bauls.Application;
using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Chapters.Application;
using ElBaul.Core.Chapters.OutputPorts;
using ElBaul.Core.Personas.Application;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Core.Photos.Application;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using ElBaul.Core.Users.OutputPorts;
using ElBaul.Domain;
using ElBaul.Infra.PersistenceTests.Fakes;
using ElBaul.Infra.Persistence;

using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
namespace ElBaul.Infra.PersistenceTests;

/// <summary>
/// Regression coverage for a real-Postgres-only bug: Photo.ChapterId is a Cascade FK (see
/// PhotoConfiguration), so a soft-deleted photo left pointing at a chapter being deleted would
/// get cascade-deleted by Postgres itself instead of orphaned by ChapterManager — and, if that
/// photo had a persona tag, the cascade would then be rejected by the Restrict FK from
/// PhotoPersonaTags to Photo (see PhotoPersonaTagConfiguration). ElBaul.Tests covers
/// ChapterManager.DeleteAsync against ElBaul.Infra.Lite's in-memory repositories, which enforce
/// no referential integrity at all, so this specific ordering bug passed there unnoticed — only
/// a real database can catch it. See README.md.
/// </summary>
[Collection(PersistenceTestCollection.Name)]
public class ChapterManagerDeleteTests(PostgresFixture fixture) : PersistenceTestBase(fixture)
{
    [Fact]
    public async Task DeleteAsync_OrphansSoftDeletedTaggedPhotos_InsteadOfLettingPostgresCascadeDeleteThem()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var users = new UserRepository(dbContext);
        var baules = new BaulRepository(dbContext);
        var chapters = new ChapterRepository(dbContext);
        var photos = new PhotoRepository(dbContext);
        var recuerdos = new RecuerdoRepository(dbContext);
        var photoPersonaTags = new PhotoPersonaTagRepository(dbContext);
        var personas = new PersonaRepository(dbContext);

        var custodioId = "custodio-chapter-delete";
        await users.UpsertAsync(new User(new UserId(custodioId), "custodio-chapter-delete@example.com", "Custodio", DateTime.UtcNow));

        var baul = new Baul(new BaulId(Guid.NewGuid()), "Baúl con capítulo a borrar", Description: null,
            new UserId(custodioId), ChapterCount: 1, DateTime.UtcNow, DateTime.UtcNow);
        await baules.CreateAsync(baul);

        var chapter = new Chapter(new ChapterId(Guid.NewGuid()), baul.Id, "Capítulo a borrar",
            PhotoCount: 0, DateTime.UtcNow, DateTime.UtcNow);
        await chapters.CreateAsync(chapter);

        // A photo that was soft-deleted before the chapter delete — GetByChapterIdAsync (Active
        // only) would skip it, leaving it pointing at the chapter when Postgres executes the
        // cascade-delete FK.
        var photo = Photo.Create(new PhotoId(Guid.NewGuid()), chapter.Id, baul.Id, "photos/soft-deleted.jpg",
            null, new UserId(custodioId), DateTime.UtcNow);
        await photos.CreateAsync(photo);
        dbContext.ChangeTracker.Clear();
        await photos.UpdateAsync(photo.MarkDeleted("test", DateTime.UtcNow));

        // Tagging it is what turns "cascade-deletes an extra row" into an actual FK violation:
        // PhotoPersonaTag has a Restrict FK to Photo.
        var persona = new Persona(new PersonaId(Guid.NewGuid()), baul.Id, UserId: null, "Persona etiquetada",
            BaulRole.Colaborador, DateTime.UtcNow);
        await personas.AddPersonaAsync(persona);
        await photoPersonaTags.SetTagsAsync(photo.Id, baul.Id, [persona.Id], DateTime.UtcNow);

        dbContext.ChangeTracker.Clear();

        var manager = new ChapterManager(
            NullLogger<ChapterManager>.Instance,
            chapters,
            Substitute.For<IChapterListReadModel>(),
            baules,
            photos,
            recuerdos,
            new CoverUrlResolver(Substitute.For<IPhotoStorage>()),
            Substitute.For<IIdGenerator>(),
            new FixedClock(),
            new StaticCurrentUserProvider(custodioId),
            new BaulAccessService(baules, personas, NullLogger<BaulAccessService>.Instance),
            new AuthorInfoProjector(personas, photos, Substitute.For<IPhotoStorage>()),
            new UnitOfWork(dbContext));

        // Act — success here, not an unhandled Postgres foreign-key violation, is the direct
        // proof the soft-deleted, tagged photo got orphaned rather than left for Postgres to
        // cascade-delete.
        var result = await manager.DeleteAsync(chapter.Id);
        result.IsSuccess.Should().BeTrue(result.IsFailure ? result.Error.Message : string.Empty);

        (await chapters.GetByIdAsync(chapter.Id)).Should().BeNull();

        var survivingPhoto = await photos.GetByIdAsync(photo.Id);
        survivingPhoto.Should().NotBeNull();
        survivingPhoto!.ChapterId.Should().BeNull();
        (await photoPersonaTags.GetPersonaIdsByPhotoIdAsync(photo.Id)).Should().ContainSingle();
    }
}

file sealed class StaticCurrentUserProvider(string userId) : ICurrentUserProvider
{
    public UserId GetUserId() => new(userId);
}
