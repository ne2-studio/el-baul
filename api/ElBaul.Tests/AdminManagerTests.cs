using ElBaul.Application.Admin;
using ElBaul.Application.Chat;
using ElBaul.OutputPorts.Admin;
using ElBaul.OutputPorts.Bauls;
using ElBaul.OutputPorts.Chapters;
using ElBaul.OutputPorts.Notifications;
using ElBaul.OutputPorts.Personas;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Recuerdos;
using ElBaul.OutputPorts.Shared;
using ElBaul.OutputPorts.Users;

using ElBaul.Infra.Lite;
using ElBaul.Tests.Fakes;
using Microsoft.Extensions.Logging.Abstractions;

using ElBaul.Domain;
namespace ElBaul.Tests;

public class AdminManagerTests
{
    private readonly InMemoryAdminRepository _adminRepository = new();
    private readonly InMemorySentEmailRepository _sentEmailRepository = new();
    private readonly InMemoryBaulRepository _baulRepository = new();
    private readonly InMemoryChapterRepository _chapterRepository = new();
    private readonly InMemoryPhotoRepository _photoRepository = new();
    private readonly InMemoryRecuerdoRepository _recuerdoRepository = new();
    private readonly InMemorySharedLinkRepository _sharedLinkRepository = new();
    private readonly InMemoryBaulInviteLinkRepository _baulInviteLinkRepository = new();
    private readonly InMemoryPhotoPersonaTagRepository _photoPersonaTagRepository = new();
    private readonly InMemoryPushTokenRepository _pushTokenRepository = new();
    private readonly FakePhotoStorage _photoStorage = new();
    private readonly FakeChatContextBuilder _chatContextBuilder = new();
    private readonly StaticClock _clock = new();

    private AdminManager CreateManager() => new(
        _adminRepository, _sentEmailRepository, _baulRepository, _chapterRepository, _photoRepository,
        _recuerdoRepository, _sharedLinkRepository, _baulInviteLinkRepository, _photoPersonaTagRepository, _pushTokenRepository,
        _photoStorage, _chatContextBuilder, _clock,
        NullLogger<AdminManager>.Instance);

    [Fact]
    public async Task GetDashboardCountsAsync_ShouldMapCountsAndUseTodaysDateAsBoundary()
    {
        _adminRepository.DashboardCounts = new AdminDashboardCounts(Users: 3, Baules: 2, Photos: 40, PhotosToday: 5);

        var result = await CreateManager().GetDashboardCountsAsync();

        Assert.True(result.IsSuccess);
        Assert.Equal(3, result.Value.RegisteredUsers);
        Assert.Equal(2, result.Value.TotalBaules);
        Assert.Equal(40, result.Value.TotalPhotos);
        Assert.Equal(5, result.Value.PhotosUploadedToday);
        Assert.Equal(_clock.UtcNow().Date, _adminRepository.LastRequestedTodayUtcStart);
    }

    [Fact]
    public async Task GetAllUsersAsync_ShouldMapEachRow()
    {
        var user = new User(new UserId("user-1"), "user@test.local", "Test User", _clock.UtcNow(), _clock.UtcNow());
        _adminRepository.Users.Add(new AdminUserRow(user, BaulCount: 2));

        var result = await CreateManager().GetAllUsersAsync();

        var dto = Assert.Single(result.Value);
        Assert.Equal("user-1", dto.Id);
        Assert.Equal("user@test.local", dto.Email);
        Assert.Equal(2, dto.BaulCount);
    }

    [Fact]
    public async Task GetUserDetailAsync_ShouldReturnFailure_WhenUserNotFound()
    {
        var result = await CreateManager().GetUserDetailAsync(new UserId("missing"));

        Assert.True(result.IsFailure);
        Assert.Equal("User not found", result.Error.Message);
    }

    [Fact]
    public async Task GetUserDetailAsync_ShouldMapBaulesWithPersonIdAndRole()
    {
        var user = new User(new UserId("user-1"), "user@test.local", "Test User", _clock.UtcNow());
        var baulId = Guid.NewGuid();
        var personId = Guid.NewGuid();
        _adminRepository.UserDetails[new UserId("user-1")] = new AdminUserDetailRow(
            user, [new AdminUserBaulRow(new BaulId(baulId), "Familia Pérez", BaulRole.Custodio, new PersonaId(personId))]);

        var result = await CreateManager().GetUserDetailAsync(new UserId("user-1"));

        var membership = Assert.Single(result.Value.Baules);
        Assert.Equal(baulId.ToString(), membership.BaulId);
        Assert.Equal("Familia Pérez", membership.BaulName);
        Assert.Equal("custodio", membership.Role);
        Assert.Equal(personId.ToString(), membership.PersonId);
        Assert.False(result.Value.HasPushToken);
    }

    [Fact]
    public async Task GetUserDetailAsync_ShouldReportHasPushToken_WhenUserHasARegisteredDevice()
    {
        var user = new User(new UserId("user-1"), "user@test.local", "Test User", _clock.UtcNow());
        _adminRepository.UserDetails[new UserId("user-1")] = new AdminUserDetailRow(user, []);
        await _pushTokenRepository.UpsertAsync(new PushToken(Guid.NewGuid(), new UserId("user-1"), "fcm-token", "android", _clock.UtcNow()));

        var result = await CreateManager().GetUserDetailAsync(new UserId("user-1"));

        Assert.True(result.Value.HasPushToken);
    }

    [Fact]
    public async Task GetAllBaulesAsync_ShouldMapEachRow()
    {
        var baul = new Baul(new BaulId(Guid.NewGuid()), "Familia Pérez", null, new UserId("custodio-1"), ChapterCount: 1, _clock.UtcNow(), _clock.UtcNow());
        _adminRepository.Baules.Add(new AdminBaulRow(baul, "Custodio Uno", MemberCount: 3, LinkedUserCount: 2, PhotoCount: 10, ChapterCount: 1));

        var result = await CreateManager().GetAllBaulesAsync();

        var dto = Assert.Single(result.Value);
        Assert.Equal(baul.Id.ToString(), dto.Id);
        Assert.Equal("Custodio Uno", dto.CustodioName);
        Assert.Equal(3, dto.MemberCount);
        Assert.Equal(2, dto.LinkedUserCount);
        Assert.Equal(10, dto.PhotoCount);
    }

    [Fact]
    public async Task GetUserSentEmailsAsync_ShouldReturnOnlyThatUsersEmails_MostRecentFirst()
    {
        var older = new SentEmail(Guid.NewGuid(), new UserId("user-1"), EmailType.Welcome, "s", "user@example.com",
            "welcome-v1", "es-ES", EmailStatus.Sent, "welcome:user-1", _clock.UtcNow().AddDays(-1));
        var newer = new SentEmail(Guid.NewGuid(), new UserId("user-1"), EmailType.WeeklyDigest, "s", "user@example.com",
            "weekly-digest-v1", "es-ES", EmailStatus.Sent, "weekly-digest:user-1:x", _clock.UtcNow());
        var otherUser = new SentEmail(Guid.NewGuid(), new UserId("user-2"), EmailType.Welcome, "s", "other@example.com",
            "welcome-v1", "es-ES", EmailStatus.Sent, "welcome:user-2", _clock.UtcNow());
        await _sentEmailRepository.TryReserveAsync(older);
        await _sentEmailRepository.TryReserveAsync(newer);
        await _sentEmailRepository.TryReserveAsync(otherUser);

        var result = await CreateManager().GetUserSentEmailsAsync(new UserId("user-1"));

        Assert.True(result.IsSuccess);
        Assert.Equal(["WeeklyDigest", "Welcome"], result.Value.Select(e => e.Type));
    }

    [Fact]
    public async Task DebugChatContextAsync_ShouldBuildContext_WhenUserBelongsToBaul()
    {
        var user = new User(new UserId("user-1"), "user@test.local", "Test User", _clock.UtcNow());
        var baulId = new BaulId(Guid.NewGuid());
        var baul = new Baul(baulId, "Familia Pérez", null, new UserId("custodio-1"), ChapterCount: 0, _clock.UtcNow(), _clock.UtcNow());
        await _baulRepository.CreateAsync(baul);
        _adminRepository.UserDetails[new UserId("user-1")] = new AdminUserDetailRow(
            user, [new AdminUserBaulRow(baulId, "Familia Pérez", BaulRole.Custodio, new PersonaId(Guid.NewGuid()))]);
        _chatContextBuilder.Context = "contexto debug";

        var result = await CreateManager().DebugChatContextAsync(new UserId("user-1"), baulId, "mensaje");

        Assert.True(result.IsSuccess);
        Assert.Equal(baulId.ToString(), result.Value.BaulId);
        Assert.Equal("mensaje", result.Value.Message);
        Assert.Equal("contexto debug", result.Value.Context);
        Assert.Equal(baul, _chatContextBuilder.LastBaul);
        Assert.Equal("mensaje", _chatContextBuilder.LastQuery);
    }

    [Fact]
    public async Task DebugChatContextAsync_ShouldFail_WhenBaulDoesNotBelongToUser()
    {
        var user = new User(new UserId("user-1"), "user@test.local", "Test User", _clock.UtcNow());
        _adminRepository.UserDetails[new UserId("user-1")] = new AdminUserDetailRow(user, []);

        var result = await CreateManager().DebugChatContextAsync(new UserId("user-1"), new BaulId(Guid.NewGuid()), "mensaje");

        Assert.True(result.IsFailure);
        Assert.Equal("Baul not found for user", result.Error.Message);
    }

    [Fact]
    public async Task GetBaulDetailAsync_ShouldReturnFailure_WhenBaulNotFound()
    {
        var result = await CreateManager().GetBaulDetailAsync(new BaulId(Guid.NewGuid()));

        Assert.True(result.IsFailure);
        Assert.Equal("Baul not found", result.Error.Message);
    }

    [Fact]
    public async Task GetBaulDetailAsync_ShouldMergePersonasAndChaptersAndStats()
    {
        var baulId = Guid.NewGuid();
        var baul = new Baul(new BaulId(baulId), "Familia Pérez", null, new UserId("custodio-1"), ChapterCount: 1, _clock.UtcNow(), _clock.UtcNow());
        var linkedPersona = new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), new UserId("user-1"), "Abuela", BaulRole.Custodio, _clock.UtcNow());
        var unlinkedPersona = new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), null, "Tío Pedro", BaulRole.Colaborador, _clock.UtcNow());
        var chapter = new Chapter(new ChapterId(Guid.NewGuid()), new BaulId(baulId), "Verano 2020", 5, null, _clock.UtcNow(), _clock.UtcNow());

        _adminRepository.BaulDetails[new BaulId(baulId)] = new AdminBaulDetailRow(
            baul,
            [linkedPersona, unlinkedPersona],
            new Dictionary<UserId, string> { [new UserId("user-1")] = "Abuela Real Name" },
            [chapter],
            PhotoCount: 5,
            RecuerdoCount: 8,
            TotalSizeBytes: 12345);

        var result = await CreateManager().GetBaulDetailAsync(new BaulId(baulId));

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value.Personas.Count());
        Assert.Contains(result.Value.Personas, p => p.PersonId == linkedPersona.Id.ToString() && p.LinkedUserName == "Abuela Real Name");
        Assert.Contains(result.Value.Personas, p => p.PersonId == unlinkedPersona.Id.ToString() && p.LinkedUserName == null);
        var capitulo = Assert.Single(result.Value.Chapters);
        Assert.Equal("Verano 2020", capitulo.Name);
        Assert.Equal(5, result.Value.Stats.Photos);
        Assert.Equal(8, result.Value.Stats.Recuerdos);
        Assert.Equal(2, result.Value.Stats.Personas);
        Assert.Equal(1, result.Value.Stats.Chapters);
        Assert.Equal(12345, result.Value.Stats.TotalSizeBytes);
    }

    [Fact]
    public async Task DeleteBaulAsync_ShouldReturnFailure_WhenBaulNotFound()
    {
        var result = await CreateManager().DeleteBaulAsync(new BaulId(Guid.NewGuid()));

        Assert.True(result.IsFailure);
        Assert.Equal("Baul not found", result.Error.Message);
    }

    [Fact]
    public async Task DeleteBaulAsync_ShouldRemoveEverythingInTheBaulAndCleanUpStorage()
    {
        var baulId = new BaulId(Guid.NewGuid());
        var baul = new Baul(baulId, "Familia Pérez", null, new UserId("custodio-1"), ChapterCount: 1, _clock.UtcNow(), _clock.UtcNow());
        await _baulRepository.CreateAsync(baul);

        var chapter = new Chapter(new ChapterId(Guid.NewGuid()), baulId, "Verano 2020", 1, null, _clock.UtcNow(), _clock.UtcNow());
        await _chapterRepository.CreateAsync(chapter);

        var photo = Photo.Create(
            new PhotoId(Guid.NewGuid()), chapter.Id, baulId, "photos/one.jpg", null, new UserId("custodio-1"), _clock.UtcNow());
        await _photoRepository.CreateAsync(photo);

        var recuerdo = new Recuerdo(new RecuerdoId(Guid.NewGuid()), photo.Id, chapter.Id, baulId, new UserId("custodio-1"), "Qué buen día", _clock.UtcNow());
        await _recuerdoRepository.CreateAsync(recuerdo);

        var persona = new Persona(
            new PersonaId(Guid.NewGuid()), baulId, new UserId("custodio-1"), "Abuela", BaulRole.Custodio, _clock.UtcNow(), AvatarPhotoKey: "avatars/abuela.jpg");
        await _baulRepository.AddPersonaAsync(persona);

        await _photoPersonaTagRepository.SetTagsAsync(photo.Id, baulId, [persona.Id], _clock.UtcNow());

        var result = await CreateManager().DeleteBaulAsync(baulId);

        Assert.True(result.IsSuccess);
        Assert.Null(await _baulRepository.GetByIdAsync(baulId));
        Assert.Empty(await _chapterRepository.GetByBaulIdAsync(baulId));
        Assert.Empty(await _photoRepository.GetAllByBaulIdAsync(baulId));
        Assert.Empty(await _recuerdoRepository.GetByBaulIdAsync(baulId));
        Assert.Empty(await _baulRepository.GetPersonasAsync(baulId));
        Assert.Empty(await _photoPersonaTagRepository.GetPersonaIdsByPhotoIdAsync(photo.Id));
        Assert.Contains("photos/one.jpg", _photoStorage.DeletedKeys);
        Assert.Contains("avatars/abuela.jpg", _photoStorage.DeletedKeys);
    }

    private class FakeChatContextBuilder : IChatContextBuilder
    {
        public string Context { get; set; } = "";
        public Baul? LastBaul { get; private set; }
        public string? LastQuery { get; private set; }

        public Task<string> BuildAsync(Baul baul, string query)
        {
            LastBaul = baul;
            LastQuery = query;
            return Task.FromResult(Context);
        }

        public Task<string> BuildSummaryAsync(Baul baul) => Task.FromResult("");
    }
}
