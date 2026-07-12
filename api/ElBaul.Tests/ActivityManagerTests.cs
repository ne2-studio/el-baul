using ElBaul.Application;
using ElBaul.Ports.Output;
using ElBaul.Tests.Fakes;

namespace ElBaul.Tests;

public class ActivityManagerTests
{
    private const string CustodioId = "custodio-1";

    private readonly InMemoryBaulRepository _baulRepository = new();
    private readonly InMemoryActivityRepository _activityRepository = new();
    private readonly StaticClock _clock = new();

    private ActivityManager CreateManager(string currentUserId) =>
        new(_activityRepository, _baulRepository, new StaticCurrentUserProvider(currentUserId));

    [Fact]
    public async Task GetForCurrentUserAsync_ShouldIncludeActivitiesFromOwnedAndSharedBaulesOnly()
    {
        var ownedBaulId = Guid.NewGuid();
        var sharedBaulId = Guid.NewGuid();
        var unrelatedBaulId = Guid.NewGuid();

        await _baulRepository.CreateAsync(new Baul(ownedBaulId, "Mio", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _baulRepository.CreateAsync(new Baul(sharedBaulId, "Compartido", null, "other-custodio", 0, _clock.UtcNow(), _clock.UtcNow()));
        await _baulRepository.CreateAsync(new Baul(unrelatedBaulId, "Ajeno", null, "other-custodio", 0, _clock.UtcNow(), _clock.UtcNow()));
        await _baulRepository.AddSharedUserAsync(new SharedUser(
            Guid.NewGuid(), sharedBaulId, CustodioId, "c@test.com", BaulRole.Miembro, SharedUserStatus.Active, _clock.UtcNow()));

        await _activityRepository.CreateAsync(new Activity(
            Guid.NewGuid(), ActivityType.NewPhotos, ownedBaulId, "Mio", _clock.UtcNow(), false, 1, null, null, null));
        await _activityRepository.CreateAsync(new Activity(
            Guid.NewGuid(), ActivityType.NewPhotos, sharedBaulId, "Compartido", _clock.UtcNow(), false, 1, null, null, null));
        await _activityRepository.CreateAsync(new Activity(
            Guid.NewGuid(), ActivityType.NewPhotos, unrelatedBaulId, "Ajeno", _clock.UtcNow(), false, 1, null, null, null));

        var manager = CreateManager(CustodioId);
        var result = await manager.GetForCurrentUserAsync();

        Assert.True(result.IsSuccess);
        var baulNames = result.Value.Select(a => a.BaulName).ToList();
        Assert.Contains("Mio", baulNames);
        Assert.Contains("Compartido", baulNames);
        Assert.DoesNotContain("Ajeno", baulNames);
    }

    [Fact]
    public async Task GetForCurrentUserAsync_ShouldOrderByTimestampDescending()
    {
        var baulId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));

        var older = _clock.UtcNow().AddDays(-1);
        var newer = _clock.UtcNow();

        await _activityRepository.CreateAsync(new Activity(
            Guid.NewGuid(), ActivityType.NewPhotos, baulId, "Familia", older, false, 1, null, null, null));
        await _activityRepository.CreateAsync(new Activity(
            Guid.NewGuid(), ActivityType.RoleChanged, baulId, "Familia", newer, false, null, null, null, null));

        var manager = CreateManager(CustodioId);
        var result = await manager.GetForCurrentUserAsync();

        Assert.True(result.IsSuccess);
        var ordered = result.Value.ToList();
        Assert.Equal("role-changed", ordered[0].Type);
        Assert.Equal("new-photos", ordered[1].Type);
    }
}
