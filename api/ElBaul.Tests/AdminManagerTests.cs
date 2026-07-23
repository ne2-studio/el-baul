using ElBaul.Application;
using ElBaul.Ports.Output;
using ElBaul.Tests.Fakes;

namespace ElBaul.Tests;

public class AdminManagerTests
{
    private readonly InMemoryAdminRepository _adminRepository = new();
    private readonly InMemorySentEmailRepository _sentEmailRepository = new();
    private readonly StaticClock _clock = new();

    private AdminManager CreateManager() => new(_adminRepository, _sentEmailRepository, _clock);

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
        var user = new User("user-1", "user@test.local", "Test User", _clock.UtcNow(), _clock.UtcNow());
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
        var result = await CreateManager().GetUserDetailAsync("missing");

        Assert.True(result.IsFailure);
        Assert.Equal("User not found", result.Error);
    }

    [Fact]
    public async Task GetUserDetailAsync_ShouldMapBaulesWithPersonIdAndRole()
    {
        var user = new User("user-1", "user@test.local", "Test User", _clock.UtcNow());
        var baulId = Guid.NewGuid();
        var personId = Guid.NewGuid();
        _adminRepository.UserDetails["user-1"] = new AdminUserDetailRow(
            user, [new AdminUserBaulRow(baulId, "Familia Pérez", BaulRole.Custodio, personId)]);

        var result = await CreateManager().GetUserDetailAsync("user-1");

        var membership = Assert.Single(result.Value.Baules);
        Assert.Equal(baulId.ToString(), membership.BaulId);
        Assert.Equal("Familia Pérez", membership.BaulName);
        Assert.Equal("custodio", membership.Role);
        Assert.Equal(personId.ToString(), membership.PersonId);
    }

    [Fact]
    public async Task GetAllBaulesAsync_ShouldMapEachRow()
    {
        var baul = new Baul(Guid.NewGuid(), "Familia Pérez", null, "custodio-1", AlbumCount: 1, _clock.UtcNow(), _clock.UtcNow());
        _adminRepository.Baules.Add(new AdminBaulRow(baul, "Custodio Uno", MemberCount: 3, LinkedUserCount: 2, PhotoCount: 10, AlbumCount: 1));

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
        var older = new SentEmail(Guid.NewGuid(), "user-1", EmailType.Welcome, "s", "user@example.com",
            "welcome-v1", "es-ES", EmailStatus.Sent, "welcome:user-1", _clock.UtcNow().AddDays(-1));
        var newer = new SentEmail(Guid.NewGuid(), "user-1", EmailType.WeeklyDigest, "s", "user@example.com",
            "weekly-digest-v1", "es-ES", EmailStatus.Sent, "weekly-digest:user-1:x", _clock.UtcNow());
        var otherUser = new SentEmail(Guid.NewGuid(), "user-2", EmailType.Welcome, "s", "other@example.com",
            "welcome-v1", "es-ES", EmailStatus.Sent, "welcome:user-2", _clock.UtcNow());
        await _sentEmailRepository.TryReserveAsync(older);
        await _sentEmailRepository.TryReserveAsync(newer);
        await _sentEmailRepository.TryReserveAsync(otherUser);

        var result = await CreateManager().GetUserSentEmailsAsync("user-1");

        Assert.True(result.IsSuccess);
        Assert.Equal(["WeeklyDigest", "Welcome"], result.Value.Select(e => e.Type));
    }

    [Fact]
    public async Task GetBaulDetailAsync_ShouldReturnFailure_WhenBaulNotFound()
    {
        var result = await CreateManager().GetBaulDetailAsync(Guid.NewGuid());

        Assert.True(result.IsFailure);
        Assert.Equal("Baul not found", result.Error);
    }

    [Fact]
    public async Task GetBaulDetailAsync_ShouldMergePersonasAndCapitulosAndStats()
    {
        var baulId = Guid.NewGuid();
        var baul = new Baul(baulId, "Familia Pérez", null, "custodio-1", AlbumCount: 1, _clock.UtcNow(), _clock.UtcNow());
        var linkedSharedUser = new SharedUser(Guid.NewGuid(), baulId, "user-1", "Abuela", BaulRole.Custodio, _clock.UtcNow());
        var unlinkedSharedUser = new SharedUser(Guid.NewGuid(), baulId, null, "Tío Pedro", BaulRole.Colaborador, _clock.UtcNow());
        var album = new Album(Guid.NewGuid(), baulId, "Verano 2020", 5, null, _clock.UtcNow(), _clock.UtcNow());

        _adminRepository.BaulDetails[baulId] = new AdminBaulDetailRow(
            baul,
            [linkedSharedUser, unlinkedSharedUser],
            new Dictionary<string, string> { ["user-1"] = "Abuela Real Name" },
            [album],
            PhotoCount: 5,
            RecuerdoCount: 8);

        var result = await CreateManager().GetBaulDetailAsync(baulId);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value.Personas.Count());
        Assert.Contains(result.Value.Personas, p => p.PersonId == linkedSharedUser.Id.ToString() && p.LinkedUserName == "Abuela Real Name");
        Assert.Contains(result.Value.Personas, p => p.PersonId == unlinkedSharedUser.Id.ToString() && p.LinkedUserName == null);
        var capitulo = Assert.Single(result.Value.Capitulos);
        Assert.Equal("Verano 2020", capitulo.Name);
        Assert.Equal(5, result.Value.Stats.Photos);
        Assert.Equal(8, result.Value.Stats.Recuerdos);
        Assert.Equal(2, result.Value.Stats.Personas);
        Assert.Equal(1, result.Value.Stats.Capitulos);
    }
}
