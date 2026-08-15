using ElBaul.Core.Admin.Application;
using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Chapters.OutputPorts;
using ElBaul.Core.Chat.Application;
using ElBaul.Core.Moderation.OutputPorts;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Recuerdos.OutputPorts;
using ElBaul.Core.Sharing.OutputPorts;
using ElBaul.Core.Users.OutputPorts;
using ElBaul.Domain;
using ElBaul.Infra.PersistenceTests.Fakes;
using ElBaul.Infra.Persistence;

using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
namespace ElBaul.Infra.PersistenceTests;

/// <summary>
/// AdminBaulDeletionRepository hard-deletes a baúl with 8+ repository calls in a specific,
/// hand-maintained order to satisfy real Postgres Restrict foreign
/// keys — sharpest case: PhotoPersonaTag, which has a Restrict FK to *both* Photo and Persona
/// (see PhotoPersonaTagConfiguration). ElBaul.Tests covers this against ElBaul.Infra.Lite's
/// in-memory fakes, which enforce no referential integrity at all, so a reordering that would
/// raise a live FK violation (or silently orphan a row) passes there unnoticed — only a real
/// database can catch it. See README.md.
/// </summary>
[Collection(PersistenceTestCollection.Name)]
public class AdminManagerHardDeleteTests(PostgresFixture fixture) : PersistenceTestBase(fixture)
{
    [Fact]
    public async Task DeleteBaulAsync_deletes_every_child_entity_type_in_an_FK_safe_order()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var users = new UserRepository(dbContext);
        var baules = new BaulRepository(dbContext);
        var chapters = new ChapterRepository(dbContext);
        var photos = new PhotoRepository(dbContext);
        var recuerdos = new RecuerdoRepository(dbContext);
        var photoPersonaTags = new PhotoPersonaTagRepository(dbContext);
        var inviteLinks = new BaulInviteLinkRepository(dbContext);
        var removalRequests = new RemovalRequestRepository(dbContext);

        var deletion = new AdminBaulDeletionRepository(
            baules,
            chapters,
            photos,
            recuerdos,
            new SharedLinkRepository(dbContext),
            inviteLinks,
            new TvSessionRepository(dbContext),
            photoPersonaTags,
            removalRequests,
            new UnitOfWork(dbContext));

        var admin = new AdminManager(
            new AdminRepository(dbContext),
            deletion,
            new SentEmailRepository(dbContext),
            baules,
            new PushTokenRepository(dbContext),
            // Nothing in DeleteBaulAsync's storage cleanup depends on these two — they only
            // get exercised for real in ElBaul.Tests/AdminManagerTests.
            Substitute.For<IPhotoStorage>(),
            Substitute.For<IChatContextBuilder>(),
            new FixedClock(),
            NullLogger<AdminManager>.Instance);

        var custodioId = "custodio-hard-delete";
        await users.UpsertAsync(new User(new UserId(custodioId), "custodio-hard-delete@example.com", "Custodio", DateTime.UtcNow));

        var baul = new Baul(new BaulId(Guid.NewGuid()), "Baúl a borrar por completo", Description: null,
            new UserId(custodioId), ChapterCount: 0, DateTime.UtcNow, DateTime.UtcNow);
        await baules.CreateAsync(baul);

        // 1. Baúl, chapter, photo, recuerdo — the ordinary content chain.
        var chapter = new Chapter(new ChapterId(Guid.NewGuid()), baul.Id, "Capítulo a borrar",
            PhotoCount: 0, CoverPhotoKey: null, DateTime.UtcNow, DateTime.UtcNow);
        await chapters.CreateAsync(chapter);

        var photo = new Photo(new PhotoId(Guid.NewGuid()), chapter.Id, baul.Id, "photos/to-delete.jpg",
            DateYear: null, DateMonth: null, DateDay: null, new UserId(custodioId), DateTime.UtcNow);
        await photos.CreateAsync(photo);

        await recuerdos.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), photo.Id, chapter.Id, baul.Id,
            new UserId(custodioId), "Un recuerdo que también se borra", DateTime.UtcNow));

        // 2. A second, non-custodio persona tagged on the photo — the sharpest case:
        // PhotoPersonaTag has a Restrict FK to *both* Photo and Persona, so it's the one row
        // that must be gone before either of those two deletions can succeed. Getting the
        // infrastructure deletion order wrong around this specific entity is exactly the bug
        // class an in-memory fake can't catch.
        var persona = new Persona(new PersonaId(Guid.NewGuid()), baul.Id, UserId: null, "Tía a borrar",
            BaulRole.Colaborador, DateTime.UtcNow);
        await baules.AddPersonaAsync(persona);
        await photoPersonaTags.SetTagsAsync(photo.Id, baul.Id, [persona.Id], DateTime.UtcNow);

        // 3. A baúl invite link — a Restrict FK straight to Baul itself (like SharedLink,
        // deliberately not exercised here since the deletion repository unconditionally calls
        // sharedLinkRepository.DeleteByBaulIdAsync regardless, it just has nothing to delete).
        await inviteLinks.CreateAsync(new BaulInviteLink(new BaulInviteLinkId(Guid.NewGuid()), "test-token",
            baul.Id, new UserId(custodioId), DateTime.UtcNow));

        // 4. A pending removal request — Cascade at the DB level, but the deletion repository deletes it
        // explicitly anyway (see its own doc comment) so behavior doesn't depend on which
        // backend is running; included so this test covers every entity type that comment
        // names, not just the two Restrict-FK cases above.
        await removalRequests.CreateRemovalRequestAsync(new RemovalRequest(new RemovalRequestId(Guid.NewGuid()),
            baul.Id, photo.Id, photo.StorageKey, "Alguien", "alguien@example.com",
            "Solicitud pendiente en el baúl a borrar", DateTime.UtcNow, RequestStatus.Pending));

        // A fresh HTTP request would get its own scoped DbContext; this test reuses one across
        // setup and the act step below, so it clears the change tracker itself first — otherwise
        // the deletion repository's own GetByIdAsync/GetAllByBaulIdAsync reads would just return the
        // instances setup already tracked, without truly exercising a query against Postgres.
        dbContext.ChangeTracker.Clear();

        // 5. Hard-delete the whole baúl. Success here — not an unhandled Postgres foreign-key
        // violation — is the direct proof that the infrastructure deletion order is
        // still correct against the real schema, for every child entity type it names.
        var result = await admin.DeleteBaulAsync(baul.Id);
        result.IsSuccess.Should().BeTrue(result.IsFailure ? result.Error.Message : string.Empty);

        // 6. The baúl itself is genuinely gone, not just reported as deleted.
        (await baules.GetByIdAsync(baul.Id)).Should().BeNull();
    }

    [Fact]
    public async Task DeleteBaulAsync_rollsBackEveryPriorDelete_WhenALaterStepFails()
    {
        // Only the deletion repository's ExecuteInTransactionAsync wrap makes this true — before it,
        // each ExecuteDeleteAsync call committed on its own, so a failure on the 6th of 9 calls
        // (chapters, here) left the first 5 permanently deleted. This is the regression this
        // test exists to catch: a real Postgres transaction, not ElBaul.Infra.Lite's in-memory
        // repositories (which have nothing to roll back — see IUnitOfWork's own doc comment).
        await using var dbContext = Fixture.CreateDbContext();
        var users = new UserRepository(dbContext);
        var baules = new BaulRepository(dbContext);
        var chapters = new ChapterRepository(dbContext);
        var photos = new PhotoRepository(dbContext);
        var recuerdos = new RecuerdoRepository(dbContext);
        var photoPersonaTags = new PhotoPersonaTagRepository(dbContext);

        var deletion = new AdminBaulDeletionRepository(
            baules,
            new ThrowingChapterRepository(chapters), // fails on step 6 (DeleteByBaulIdAsync)
            photos,
            recuerdos,
            new SharedLinkRepository(dbContext),
            new BaulInviteLinkRepository(dbContext),
            new TvSessionRepository(dbContext),
            photoPersonaTags,
            new RemovalRequestRepository(dbContext),
            new UnitOfWork(dbContext));

        var admin = new AdminManager(
            new AdminRepository(dbContext),
            deletion,
            new SentEmailRepository(dbContext),
            baules,
            new PushTokenRepository(dbContext),
            Substitute.For<IPhotoStorage>(),
            Substitute.For<IChatContextBuilder>(),
            new FixedClock(),
            NullLogger<AdminManager>.Instance);

        var custodioId = "custodio-hard-delete-rollback";
        await users.UpsertAsync(new User(new UserId(custodioId), "custodio-rollback@example.com", "Custodio", DateTime.UtcNow));

        var baul = new Baul(new BaulId(Guid.NewGuid()), "Baúl cuyo borrado falla a mitad", Description: null,
            new UserId(custodioId), ChapterCount: 0, DateTime.UtcNow, DateTime.UtcNow);
        await baules.CreateAsync(baul);

        var chapter = new Chapter(new ChapterId(Guid.NewGuid()), baul.Id, "Capítulo",
            PhotoCount: 0, CoverPhotoKey: null, DateTime.UtcNow, DateTime.UtcNow);
        await chapters.CreateAsync(chapter);

        var photo = new Photo(new PhotoId(Guid.NewGuid()), chapter.Id, baul.Id, "photos/rollback.jpg",
            DateYear: null, DateMonth: null, DateDay: null, new UserId(custodioId), DateTime.UtcNow);
        await photos.CreateAsync(photo);

        await recuerdos.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), photo.Id, chapter.Id, baul.Id,
            new UserId(custodioId), "Recuerdo que no debería sobrevivir en un estado a medias", DateTime.UtcNow));

        var persona = new Persona(new PersonaId(Guid.NewGuid()), baul.Id, UserId: null, "Persona",
            BaulRole.Colaborador, DateTime.UtcNow);
        await baules.AddPersonaAsync(persona);
        await photoPersonaTags.SetTagsAsync(photo.Id, baul.Id, [persona.Id], DateTime.UtcNow);

        dbContext.ChangeTracker.Clear();

        // Act — steps 1-5 (tags, shared links, invite links, recuerdos, photos) run and stage
        // their ExecuteDeleteAsync calls inside the still-open transaction before step 6 throws.
        await Assert.ThrowsAsync<InvalidOperationException>(() => admin.DeleteBaulAsync(baul.Id));

        // Assert — every row from steps 1-5, not just the chapter that actually failed, is
        // still there. A test that only checked the chapter wouldn't distinguish "the
        // transaction rolled back" from "the failure just happened before that call ran".
        (await photoPersonaTags.GetPersonaIdsByPhotoIdAsync(photo.Id)).Should().ContainSingle();
        (await recuerdos.GetByChapterIdAsync(chapter.Id)).Should().ContainSingle();
        (await photos.GetByIdAsync(photo.Id)).Should().NotBeNull();
        (await chapters.GetByIdAsync(chapter.Id)).Should().NotBeNull();
        (await baules.GetByIdAsync(baul.Id)).Should().NotBeNull();
    }
}
