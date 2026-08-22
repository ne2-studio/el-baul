namespace ElBaul.Core.Analytics.OutputPorts;

public interface IUserSessionRepository
{
    Task RecordAsync(UserSessionOpen session);
}
