using Ne2Studio.Common;

using ElBaul.Domain;
namespace ElBaul.Core.Contributions;

/// <summary>
/// Decides what "help your family" contribution suggestion, if any, to offer when a member
/// opens a baúl — which type (tag people in a photo vs. write a memory), which photo, and
/// whether there's anything worth suggesting at all. The frontend never makes any of these
/// calls itself: it only asks once and paints whatever comes back (or nothing) — see
/// docs/PRODUCT.md and BaulRoute for how the client decides *when* to ask (cooldown, first
/// session, entry point), which stays client-side because it's navigation/device state, not
/// suggestion domain logic.
/// </summary>
public interface IContributionsManager
{
    Task<Result<ContributionSuggestionDto?>> GetSuggestionAsync(BaulId baulId);
}
