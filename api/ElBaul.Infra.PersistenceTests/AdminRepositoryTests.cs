using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Chapters.OutputPorts;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Users.OutputPorts;
using ElBaul.Domain;
using ElBaul.Infra.Persistence;
using FluentAssertions;
namespace ElBaul.Infra.PersistenceTests;

/// <summary>
/// AdminRepository translates GroupBy/Join/Distinct/SumAsync into SQL server-side for the
/// backoffice's Dashboard/Usuarios/Baúles screens — two of its own comments already flag a real
/// translation gotcha ("Persona.IsClaimed can't be used here... EF can't translate a C#-only
/// computed property"). ElBaul.Tests' AdminManagerTests runs against InMemoryAdminRepository, a
/// plain settable property bag a test populates directly — it never executes a line of this
/// query logic, so it structurally cannot catch a regression here. See README.md.
/// </summary>
[Collection(PersistenceTestCollection.Name)]
public class AdminRepositoryTests(PostgresFixture fixture) : PersistenceTestBase(fixture)
{
    [Fact]
    public async Task GetAllUsersAsync_and_GetUserDetailAsync_count_distinct_baules_not_persona_rows()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var users = new UserRepository(dbContext);
        var baules = new BaulRepository(dbContext);
        var personas = new PersonaRepository(dbContext);
        var admin = new AdminRepository(dbContext);

        var custodio = NewUser("custodio-1");
        var guest = NewUser("guest-1");
        await users.UpsertAsync(custodio);
        await users.UpsertAsync(guest);

        var baulX = NewBaul(custodio.Id, "Baúl X");
        var baulY = NewBaul(custodio.Id, "Baúl Y");
        await baules.CreateAsync(baulX);
        await baules.CreateAsync(baulY);

        // The same user claims a Persona in each baúl — two Persona rows, one distinct user.
        await personas.AddPersonaAsync(NewPersona(baulX.Id, guest.Id, "Invitado X", BaulRole.Colaborador));
        var personaY = NewPersona(baulY.Id, guest.Id, "Invitado Y", BaulRole.Colaborador);
        await personas.AddPersonaAsync(personaY);

        var userRows = await admin.GetAllUsersAsync();
        userRows.Single(row => row.User.Id == guest.Id).BaulCount.Should().Be(2,
            "GetAllUsersAsync groups Personas by distinct BaulId per user, not by persona-row count");

        var detail = await admin.GetUserDetailAsync(guest.Id);
        detail!.Baules.Should().ContainSingle(b =>
            b.BaulId == baulY.Id && b.PersonId == personaY.Id && b.Role == BaulRole.Colaborador);
        detail.Baules.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetAllBaulesAsync_and_GetBaulDetailAsync_aggregate_counts_and_distinguish_claimed_personas()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var users = new UserRepository(dbContext);
        var baules = new BaulRepository(dbContext);
        var personas = new PersonaRepository(dbContext);
        var chapters = new ChapterRepository(dbContext);
        var photos = new PhotoRepository(dbContext);
        var admin = new AdminRepository(dbContext);

        var custodio = NewUser("custodio-2");
        var guest = NewUser("guest-2");
        await users.UpsertAsync(custodio);
        await users.UpsertAsync(guest);

        var baul = NewBaul(custodio.Id, "Baúl de agregación", chapterCount: 1);
        await baules.CreateAsync(baul);

        // Three Personas, only two claimed — the custodio, the guest (claimed), and one
        // pre-provisioned row nobody has claimed yet: the exact shape AdminRepository's own
        // comments warn about (Persona.IsClaimed can't be used in the server-side Where).
        await personas.AddPersonaAsync(NewPersona(baul.Id, custodio.Id, "Custodio", BaulRole.Administrador));
        var claimedGuest = NewPersona(baul.Id, guest.Id, "Invitado", BaulRole.Colaborador);
        await personas.AddPersonaAsync(claimedGuest);
        await personas.AddPersonaAsync(NewPersona(baul.Id, userId: null, "Sin reclamar", BaulRole.Colaborador));

        var chapter = NewChapter(baul.Id, "Capítulo de agregación");
        await chapters.CreateAsync(chapter);
        await photos.CreateAsync(NewPhoto(baul.Id, chapter.Id, custodio.Id, sizeBytes: 1234));

        var baulRows = await admin.GetAllBaulesAsync();
        var baulRow = baulRows.Single(b => b.Baul.Id == baul.Id);
        baulRow.MemberCount.Should().Be(3, "custodio + guest colaborador + the unclaimed persona");
        baulRow.LinkedUserCount.Should().Be(2, "only the custodio and the guest are claimed");
        baulRow.PhotoCount.Should().Be(1);
        baulRow.ChapterCount.Should().Be(1, "the baúl list publishes Baul.ChapterCount instead of recomputing a second count from Chapters");

        var detail = await admin.GetBaulDetailAsync(baul.Id);
        detail!.Personas.Should().HaveCount(3);
        detail.PhotoCount.Should().Be(1);
        detail.LinkedUserNames.Should().HaveCount(2).And.ContainKey(guest.Id);
    }

    [Fact]
    public async Task Photo_counts_exclude_soft_deleted_photos_but_total_size_still_counts_them()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var users = new UserRepository(dbContext);
        var baules = new BaulRepository(dbContext);
        var personas = new PersonaRepository(dbContext);
        var chapters = new ChapterRepository(dbContext);
        var photos = new PhotoRepository(dbContext);
        var admin = new AdminRepository(dbContext);

        var custodio = NewUser("custodio-3");
        await users.UpsertAsync(custodio);
        var baul = NewBaul(custodio.Id, "Baúl de fotos borradas");
        await baules.CreateAsync(baul);
        var chapter = NewChapter(baul.Id, "Capítulo de fotos borradas");
        await chapters.CreateAsync(chapter);

        var kept = NewPhoto(baul.Id, chapter.Id, custodio.Id, sizeBytes: 100);
        var deleted = NewPhoto(baul.Id, chapter.Id, custodio.Id, sizeBytes: 200);
        await photos.CreateAsync(kept);
        await photos.CreateAsync(deleted);
        // A fresh HTTP request would get its own scoped DbContext; this test reuses one across
        // every step, so it must clear the change tracker itself before UpdateAsync attaches a
        // new `deleted with { ... }` instance under the same key CreateAsync just tracked.
        dbContext.ChangeTracker.Clear();
        // Soft-delete directly at the repository level — PhotoLifecycleService.SoftDeleteAsync
        // is exactly this UpdateAsync call plus chapter-cover bookkeeping this test doesn't need.
        await photos.UpdateAsync(deleted with { Status = PhotoStatus.Deleted, DeletedAt = DateTime.UtcNow });

        var dashboard = await admin.GetDashboardCountsAsync(DateTime.UtcNow.Date);
        dashboard.Photos.Should().Be(1, "the deleted photo's row survives the soft delete and must not still be counted");

        var baulRow = (await admin.GetAllBaulesAsync()).Single(b => b.Baul.Id == baul.Id);
        baulRow.PhotoCount.Should().Be(1, "only the kept photo is still active");

        var detail = await admin.GetBaulDetailAsync(baul.Id);
        detail!.PhotoCount.Should().Be(1);
        detail.TotalSizeBytes.Should().Be(300,
            "unlike PhotoCount, TotalSizeBytes counts the deleted photo too — its file is still in storage");
    }

    private static User NewUser(string id) => new(new UserId(id), $"{id}@example.com", id, DateTime.UtcNow);

    private static Baul NewBaul(string custodioId, string name, int chapterCount = 0) =>
        new(new BaulId(Guid.NewGuid()), name, Description: null, new UserId(custodioId), ChapterCount: chapterCount, DateTime.UtcNow, DateTime.UtcNow);

    private static Persona NewPersona(BaulId baulId, string? userId, string nickname, BaulRole role) =>
        new(new PersonaId(Guid.NewGuid()), baulId, userId is null ? null : new UserId(userId), nickname, role, DateTime.UtcNow);

    private static Chapter NewChapter(BaulId baulId, string name) =>
        new(new ChapterId(Guid.NewGuid()), baulId, name, PhotoCount: 0, CoverPhotoKey: null, DateTime.UtcNow, DateTime.UtcNow);

    private static Photo NewPhoto(BaulId baulId, ChapterId chapterId, string uploadedBy, long sizeBytes) =>
        new(new PhotoId(Guid.NewGuid()), chapterId, baulId, $"photos/{Guid.NewGuid()}.jpg",
            DateYear: null, DateMonth: null, DateDay: null, new UserId(uploadedBy), DateTime.UtcNow, SizeBytes: sizeBytes);
}
