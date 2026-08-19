using ElBaul.Core.Moderation.Domain;
using ElBaul.Domain;
namespace ElBaul.Core.Moderation.OutputPorts;
/// <summary>
/// Removal requests are baul-scoped like Chapters/Personas, but the entity itself is a
/// Moderation concept, so its repository lives here rather than on Bauls.OutputPorts.IBaulRepository
/// — see that interface's own doc comment.
/// </summary>
public interface IRemovalRequestRepository
{
    Task<IEnumerable<RemovalRequest>> GetRemovalRequestsAsync(BaulId baulId);
    Task<RemovalRequest?> GetRemovalRequestAsync(BaulId baulId, RemovalRequestId requestId);
    Task CreateRemovalRequestAsync(RemovalRequest request);
    Task DeleteRemovalRequestAsync(BaulId baulId, RemovalRequestId requestId);
    Task DeleteByBaulIdAsync(BaulId baulId);
}
