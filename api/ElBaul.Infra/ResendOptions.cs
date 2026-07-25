namespace ElBaul.Infra;

public class ResendOptions
{
    public string ApiKey { get; init; } = "";
    public string FromAddress { get; init; } = "";
    public string FromName { get; init; } = "El Baúl";

    // Empty means "same as FromAddress" — resolved at send time (see ResendEmailSender).
    public string ReplyToAddress { get; init; } = "";
    public string AdminTestRecipient { get; init; } = "";
}
