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

        var chaptersTask = chapterManager.GetByBaulIdAsync(baulId);
        var loosePhotosTask = photoReadManager.GetLooseByBaulIdAsync(baulId);
        var recuerdosTask = recuerdoManager.GetRecuerdosAsync(baulId);
        var personasTask = personaManager.GetPersonasAsync(baulId);
        var removalRequestsTask = removalRequestManager.GetRemovalRequestsAsync(baulId);

        // Checked here, once, instead of trusting the caller's includeBaulFeed alone — this is
        // exactly the read that used to happen in a second, separately-timed request on the
        // client (see the class doc comment above).
        var wantsFeed = includeBaulFeed && appConfiguration.BaulFeedEnabled;
        var baulFeedTask = wantsFeed ? baulFeedManager.GetFeedAsync(baulId, 0, 20) : null;

        await Task.WhenAll(new Task[] { chaptersTask, loosePhotosTask, recuerdosTask, personasTask, removalRequestsTask }
            .Concat(baulFeedTask is null ? [] : [baulFeedTask]));

        if (chaptersTask.Result.IsFailure) return Result.Failure<BaulScopeDto>(chaptersTask.Result.Error);
        if (loosePhotosTask.Result.IsFailure) return Result.Failure<BaulScopeDto>(loosePhotosTask.Result.Error);
        if (recuerdosTask.Result.IsFailure) return Result.Failure<BaulScopeDto>(recuerdosTask.Result.Error);
        if (personasTask.Result.IsFailure) return Result.Failure<BaulScopeDto>(personasTask.Result.Error);

        // A non-admin can't review removal requests — that's an expected "not applicable to this
        // user", not a reason to fail the whole scope. Any other failure (a genuine infra error)
        // is treated the same way: the removal-requests section is just omitted, since it's the
        // one piece of this response that's optional even when it was asked for.
        var removalRequests = removalRequestsTask.Result.IsSuccess ? removalRequestsTask.Result.Value : null;
        var baulFeed = baulFeedTask is not null && baulFeedTask.Result.IsSuccess ? baulFeedTask.Result.Value : null;

        return Result.Success(new BaulScopeDto(
            baulResult.Value,
            chaptersTask.Result.Value,
            loosePhotosTask.Result.Value,
            recuerdosTask.Result.Value,
            personasTask.Result.Value,
            removalRequests,
            baulFeed));
    }
}
