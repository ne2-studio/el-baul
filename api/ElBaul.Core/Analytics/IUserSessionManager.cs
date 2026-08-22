using Ne2Studio.Common;

namespace ElBaul.Core.Analytics;

public interface IUserSessionManager
{
    Task<Result> RecordSessionOpenAsync(string platform, string entrySource);
}
