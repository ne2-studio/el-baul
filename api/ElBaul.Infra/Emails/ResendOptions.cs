namespace ElBaul.Infra.Emails;

public class ResendOptions
{
    public string ApiKey { get; init; } = "";
    public string FromAddress { get; init; } = "";
    public string FromName { get; init; } = "El Baúl";

    // Empty means "same as FromAddress" — resolved at send time (see ResendEmailSender).
    public string ReplyToAddress { get; init; } = "";
    public string AdminTestRecipient { get; init; } = "";

    // Empty by default, like ApiKey — filled via secrets/env in staging/prod. Registration in
    // ServiceRegistration wires up the real ResendNewsletterSubscriber only when both this and
    // ApiKey are present.
    public string NewsletterAudienceId { get; init; } = "";
}
