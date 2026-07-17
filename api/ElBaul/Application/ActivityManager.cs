using CSharpFunctionalExtensions;
using ElBaul.Ports.Input;
using ElBaul.Ports.Output;

namespace ElBaul.Application;

public class ActivityManager(
    IActivityRepository activityRepository,
    IBaulRepository baulRepository,
    ICurrentUserProvider currentUserProvider) : IActivityManager
{
    public async Task<Result<IEnumerable<ActivityDto>>> GetForCurrentUserAsync()
    {
        var userId = currentUserProvider.GetUserId();

        var owned = await baulRepository.GetOwnedByUserIdAsync(userId);
        var shared = await baulRepository.GetSharedByUserIdAsync(userId);
        var baulIds = owned.Select(b => b.Id).Concat(shared.Select(a => a.Baul.Id)).Distinct();

        var activities = await activityRepository.GetByBaulIdsAsync(baulIds);
        var ordered = activities.OrderByDescending(a => a.Timestamp);

        return Result.Success(ordered.Select(ToDto));
    }

    private static ActivityDto ToDto(Activity activity) =>
        new(activity.Id.ToString(), activity.Type.ToApiString(), activity.BaulId.ToString(), activity.BaulName,
            activity.Timestamp, activity.IsActionable, activity.PhotoCount, activity.RequesterEmail,
            activity.RemovalRequestId?.ToString());
}
