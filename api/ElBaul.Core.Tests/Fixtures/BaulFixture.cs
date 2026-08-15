using ElBaul.Infra.Lite;
using ElBaul.Core.Bauls.Application;
using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Chapters.Application;
using ElBaul.Core.Chapters.OutputPorts;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Tests.Fakes;

using ElBaul.Domain;
namespace ElBaul.Tests.Fixtures;

// Builds common baúl/persona/chapter/photo graphs against the same in-memory repositories a
// manager test wires into its manager under test. Centralizes domain setup rules that would
// otherwise be duplicated per test class — e.g. every custodio needs a real Persona row
// (see BaulManager.CreateAsync) — so a rule change touches this file instead of every test
// that seeds a baúl directly.
public class BaulFixture
{
    public const string DefaultCustodioId = "custodio-1";

    public InMemoryPersonaRepository Personas { get; } = new();
    public InMemoryBaulRepository Baules { get; }
    public InMemoryChapterRepository Chapters { get; } = new();
    public InMemoryPhotoRepository Photos { get; } = new();
    public InMemoryPhotoPersonaTagRepository PhotoPersonaTags { get; } = new();
    public InMemoryRecuerdoRepository Recuerdos { get; } = new();
    public InMemoryUserRepository Users { get; } = new();
    public StaticClock Clock { get; } = new();

    // PhotoLifecycleService's ports — see ChapterPhotoCountListener/BaulPhotoCoverListener's own
    // doc comments — wrapping the same in-memory repositories every other property here exposes,
    // so a test wiring PhotoLifecycleService doesn't need to know it's built from two listeners.
    public IChapterPhotoCountListener ChapterPhotoCountListener { get; }
    public IBaulPhotoCoverListener BaulPhotoCoverListener { get; }

    public BaulFixture()
    {
        Baules = new InMemoryBaulRepository(Personas);
        ChapterPhotoCountListener = new ChapterPhotoCountListener(Chapters);
        BaulPhotoCoverListener = new BaulPhotoCoverListener(Baules);
    }

    // "Baúl with custodio": mirrors BaulManager.CreateAsync, which always gives the custodio
    // a real Persona row alongside the Baul row.
    public async Task<BaulId> CreateBaulAsync(
        string name = "Familia", string custodioId = DefaultCustodioId, string? description = null,
        Guid? id = null, DateTime? createdAt = null, int chapterCount = 0)
    {
        var baulId = new BaulId(id ?? Guid.NewGuid());
        var created = createdAt ?? Clock.UtcNow();
        await Baules.CreateAsync(new Baul(baulId, name, description, new UserId(custodioId), chapterCount, created, created));
        await Personas.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), baulId, new UserId(custodioId), "Custodio", BaulRole.Administrador, created));
        return baulId;
    }

    public async Task<(BaulId baulId, ChapterId chapterId)> CreateBaulWithChapterAsync(
        string custodioId = DefaultCustodioId, string baulName = "Familia", string chapterName = "Chapter")
    {
        var baulId = await CreateBaulAsync(baulName, custodioId);
        var chapterId = await AddChapterAsync(baulId, chapterName);
        return (baulId, chapterId);
    }

    public async Task<PersonaId> AddPersonaAsync(
        BaulId baulId, string? userId, string nickname, BaulRole role = BaulRole.Colaborador, Guid? id = null)
    {
        var personaId = new PersonaId(id ?? Guid.NewGuid());
        await Personas.AddPersonaAsync(new Persona(personaId, baulId, userId is null ? null : new UserId(userId), nickname, role, Clock.UtcNow()));
        return personaId;
    }

    public Task<PersonaId> AddColaboradorAsync(BaulId baulId, string userId, string nickname = "Colaborador") =>
        AddPersonaAsync(baulId, userId, nickname, BaulRole.Colaborador);

    public Task<PersonaId> AddAdministradorAsync(BaulId baulId, string userId, string nickname = "Administrador") =>
        AddPersonaAsync(baulId, userId, nickname, BaulRole.Administrador);

    // "Pending persona": invited but not yet claimed by a user account.
    public Task<PersonaId> AddPendingPersonaAsync(BaulId baulId, string nickname, BaulRole role = BaulRole.Colaborador) =>
        AddPersonaAsync(baulId, userId: null, nickname, role);

    public async Task<ChapterId> AddChapterAsync(
        BaulId baulId, string name = "Chapter", Guid? id = null, string? coverPhotoKey = null, int photoCount = 0)
    {
        var chapterId = new ChapterId(id ?? Guid.NewGuid());
        await Chapters.CreateAsync(new Chapter(chapterId, baulId, name, photoCount, coverPhotoKey, Clock.UtcNow(), Clock.UtcNow()));
        return chapterId;
    }

    // "Chapter with active photo": Photo.Create defaults to PhotoStatus.Active.
    public async Task<PhotoId> AddPhotoAsync(
        BaulId baulId, ChapterId? chapterId = null, string storageKey = "key", PhotoDate? date = null,
        string uploadedBy = DefaultCustodioId, Guid? id = null, Guid? clientUploadId = null, long sizeBytes = 0,
        Guid? uploadBatchId = null, DateTime? createdAt = null, string? originalContentHash = null)
    {
        var photoId = new PhotoId(id ?? Guid.NewGuid());
        await Photos.CreateAsync(Photo.Create(
            photoId, chapterId, baulId, storageKey, date, new UserId(uploadedBy), createdAt ?? Clock.UtcNow(), clientUploadId, sizeBytes,
            uploadBatchId, originalContentHash: originalContentHash));
        return photoId;
    }
}
