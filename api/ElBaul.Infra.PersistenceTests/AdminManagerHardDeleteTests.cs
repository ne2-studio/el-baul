using ElBaul.Application.Admin;
using ElBaul.Application.Chat;
using ElBaul.OutputPorts.Bauls;
using ElBaul.OutputPorts.Chapters;
using ElBaul.OutputPorts.Personas;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Recuerdos;
using ElBaul.OutputPorts.Sharing;
using ElBaul.OutputPorts.Users;
using ElBaul.Shared;
using ElBaul.Infra.PersistenceTests.Fakes;
using ElBaul.Infra.Persistence;

using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;

namespace ElBaul.Infra.PersistenceTests;

/// <summary>
/// AdminManager.DeleteBaulAsync hard-deletes a baúl with 8+ repository calls in a specific,
/// hand-maintained order (see its own doc comment) to satisfy real Postgres Restrict foreign
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

        var admin = new AdminManager(
            new AdminRepository(dbContext),
            new SentEmailRepository(dbContext),
            baules,
            chapters,
            photos,
            recuerdos,
            new SharedLinkRepository(dbContext),
            inviteLinks,
            photoPersonaTags,
            new PushTokenRepository(dbContext),
            // Nothing in DeleteBaulAsync's FK-ordering logic depends on these two — they only
            // get exercised for real in ElBaul.Tests/AdminManagerTests.
            Substitute.For<IPhotoStorage>(),
            Substitute.For<IChatContextBuilder>(),
            new FixedClock(),
            NullLogger<AdminManager>.Instance);

        var custodioId = "custodio-hard-delete";
        await users.UpsertAsync(new User(custodioId, "custodio-hard-delete@example.com", "Custodio", DateTime.UtcNow));

        var baul = new Baul(new BaulId(Guid.NewGuid()), "Baúl a borrar por completo", Description: null,
            custodioId, ChapterCount: 0, DateTime.UtcNow, DateTime.UtcNow);
        await baules.CreateAsync(baul);

        // 1. Baúl, chapter, photo, recuerdo — the ordinary content chain.
        var chapter = new Chapter(new ChapterId(Guid.NewGuid()), baul.Id, "Capítulo a borrar",
            PhotoCount: 0, CoverPhotoKey: null, DateTime.UtcNow, DateTime.UtcNow);
        await chapters.CreateAsync(chapter);

        var photo = new Photo(new PhotoId(Guid.NewGuid()), chapter.Id, baul.Id, "photos/to-delete.jpg",
            DateYear: null, DateMonth: null, DateDay: null, custodioId, DateTime.UtcNow);
        await photos.CreateAsync(photo);

        await recuerdos.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), photo.Id, chapter.Id, baul.Id,
            custodioId, "Un recuerdo que también se borra", DateTime.UtcNow));

        // 2. A second, non-custodio persona tagged on the photo — the sharpest case:
        // PhotoPersonaTag has a Restrict FK to *both* Photo and Persona, so it's the one row
        // that must be gone before either of those two deletions can succeed. Getting
        // AdminManager's deletion order wrong around this specific entity is exactly the bug
        // class an in-memory fake can't catch.
        var persona = new Persona(new PersonaId(Guid.NewGuid()), baul.Id, UserId: null, "Tía a borrar",
            BaulRole.Colaborador, DateTime.UtcNow);
        await baules.AddPersonaAsync(persona);
        await photoPersonaTags.SetTagsAsync(photo.Id, baul.Id, [persona.Id], DateTime.UtcNow);

        // 3. A baúl invite link — a Restrict FK straight to Baul itself (like SharedLink,
        // deliberately not exercised here since AdminManager unconditionally calls
        // sharedLinkRepository.DeleteByBaulIdAsync regardless, it just has nothing to delete).
        await inviteLinks.CreateAsync(new BaulInviteLink(new BaulInviteLinkId(Guid.NewGuid()), "test-token",
            baul.Id, custodioId, DateTime.UtcNow));

        // 4. A pending removal request — Cascade at the DB level, but AdminManager deletes it
        // explicitly anyway (see its own doc comment) so behavior doesn't depend on which
        // backend is running; included so this test covers every entity type that comment
        // names, not just the two Restrict-FK cases above.
        await baules.CreateRemovalRequestAsync(new RemovalRequest(new RemovalRequestId(Guid.NewGuid()),
            baul.Id, photo.Id, photo.StorageKey, "Alguien", "alguien@example.com",
            "Solicitud pendiente en el baúl a borrar", DateTime.UtcNow, RequestStatus.Pending));

        // A fresh HTTP request would get its own scoped DbContext; this test reuses one across
        // setup and the act step below, so it clears the change tracker itself first — otherwise
        // AdminManager's own GetByIdAsync/GetAllByBaulIdAsync reads would just return the
        // instances setup already tracked, without truly exercising a query against Postgres.
        dbContext.ChangeTracker.Clear();

        // 5. Hard-delete the whole baúl. Success here — not an unhandled Postgres foreign-key
        // violation — is the direct proof that AdminManager's hand-maintained deletion order is
        // still correct against the real schema, for every child entity type it names.
        var result = await admin.DeleteBaulAsync(baul.Id);
        result.IsSuccess.Should().BeTrue(result.IsFailure ? result.Error.Message : string.Empty);

        // 6. The baúl itself is genuinely gone, not just reported as deleted.
        (await baules.GetByIdAsync(baul.Id)).Should().BeNull();
    }
}
