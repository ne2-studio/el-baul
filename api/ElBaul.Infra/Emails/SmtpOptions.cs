namespace ElBaul.Infra.Emails;

public class SmtpOptions
{
    public string Host { get; init; } = "";
    public int Port { get; init; } = 1025;
    public string FromAddress { get; init; } = "";
    public string FromName { get; init; } = "El Baúl";

    // Empty means "same as FromAddress" — resolved at send time (see SmtpEmailSender).
    public string ReplyToAddress { get; init; } = "";
}
