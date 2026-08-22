using ElBaul.Api.Models;
using ElBaul.Core.Bauls;
using ElBaul.Core.Chapters;
using ElBaul.Core.Feed;
using ElBaul.Core.Moderation;
using ElBaul.Core.Personas;
using ElBaul.Core.Photos;
using ElBaul.Core.Recuerdos;
using ElBaul.Core.Shared.OutputPorts;
using Ne2Studio.Common;

using ElBaul.Domain;
namespace ElBaul.Api.Scope;

// Replaces the client having to make 5-6 separate requests (baúl, chapters, loose photos,
// recuerdos, personas, removal requests, feed) to paint /baules/:id — see
// app/src/hooks/useBaulScope.ts for the bug this was written to fix at the root: the client-side
// version of this needed a bounded retry loop because Features:BaulFeedEnabled could flip on
// between two of those separate requests. Doing the equivalent check once, server-side, inside a
// single request makes that race structurally impossible instead of retried around.
//
// Deliberately lives outside ElBaul.Core: "everything a baúl screen needs" isn't a domain concept
// any single feature owns, and a Core-level orchestrator would need edges to nearly every
// feature's Application layer (Bauls, Chapters, Photos, Recuerdos, Personas, Moderation, Feed),
// which DsmApprovalTests exists specifically to keep in check. This only calls each feature's
// already-public input port — no feature knows "baúl scope" exists.
public class BaulScopeAggregator(
    IBaulManager baulManager,
    IChapterManager chapterManager,
    IPhotoReadManager photoReadManager,
    IRecuerdoManager recuerdoManager,
    IPersonaManager personaManager,
    IRemovalRequestManager removalRequestManager,
    IBaulFeedManager baulFeedManager,
    IAppConfiguration appConfiguration)
{
    public async Task<Result<BaulScopeDto>> GetScopeAsync(BaulId baulId, bool includeBaulFeed)
    {
        var baulResult = await baulManager.GetByIdAsync(baulId);
        if (baulResult.IsFailure) return Result.Failure<BaulScopeDto>(baulResult.Error);

        // Awaited sequentially, not fanned out with Task.WhenAll: every manager here shares the
        // same request-scoped DbContext, and EF Core's DbContext isn't safe for concurrent use
        // by multiple in-flight operations (it throws InvalidOperationException when two do).
        var chaptersResult = await chapterManager.GetByBaulIdAsync(baulId);
        if (chaptersResult.IsFailure) return Result.Failure<BaulScopeDto>(chaptersResult.Error);

        var loosePhotosResult = await photoReadManager.GetLooseByBaulIdAsync(baulId);
        if (loosePhotosResult.IsFailure) return Result.Failure<BaulScopeDto>(loosePhotosResult.Error);

        var recuerdosResult = await recuerdoManager.GetRecuerdosAsync(baulId);
        if (recuerdosResult.IsFailure) return Result.Failure<BaulScopeDto>(recuerdosResult.Error);

        var personasResult = await personaManager.GetPersonasAsync(baulId);
        if (personasResult.IsFailure) return Result.Failure<BaulScopeDto>(personasResult.Error);

        // A non-admin can't review removal requests — that's an expected "not applicable to this
        // user", not a reason to fail the whole scope. Any other failure (a genuine infra error)
        // is treated the same way: the removal-requests section is just omitted, since it's the
        // one piece of this response that's optional even when it was asked for.
        var removalRequestsResult = await removalRequestManager.GetRemovalRequestsAsync(baulId);
        var removalRequests = removalRequestsResult.IsSuccess ? removalRequestsResult.Value : null;

        // Checked here, once, instead of trusting the caller's includeBaulFeed alone — this is
        // exactly the read that used to happen in a second, separately-timed request on the
        // client (see the class doc comment above).
        var wantsFeed = includeBaulFeed && appConfiguration.BaulFeedEnabled;
        var baulFeedResult = wantsFeed ? await baulFeedManager.GetFeedAsync(baulId, 0, 20) : null;
        var baulFeed = baulFeedResult is not null && baulFeedResult.IsSuccess ? baulFeedResult.Value : null;

        return Result.Success(new BaulScopeDto(
            baulResult.Value,
            chaptersResult.Value,
            loosePhotosResult.Value,
            recuerdosResult.Value,
            personasResult.Value,
            removalRequests,
            baulFeed));
    }
}
