using System.Net.Mail;
using Ne2Studio.Common;
namespace ElBaul.Core.Notifications.Application;
// A syntactically valid email address, worth being a VO for the behavior (Create), not just
// the label: it's the single place "is this address well-formed enough to send to" is decided,
// replacing the copy-pasted IsValidEmail in WelcomeEmailManager/WeeklyDigestManager. Deliberately
// NOT used for User.Email/SentEmail.RecipientEmail/RemovalRequest.RequesterEmail — those are
// populated from external, unvalidated sources (OIDC UserInfo claims via UserSyncMiddleware) and
// forcing them through this constructor would turn a malformed upstream claim into a hard
// failure to materialize the User row, instead of the current "just don't send them mail" outcome.
internal readonly record struct EmailAddress
{
    public string Value { get; }

    private EmailAddress(string value) => Value = value;

    public static Result<EmailAddress> Create(string? value) =>
        !string.IsNullOrWhiteSpace(value) && MailAddress.TryCreate(value, out _)
            ? Result.Success(new EmailAddress(value))
            : Result.Failure<EmailAddress>(ApplicationError.Validation($"'{value}' is not a valid email address."));

    public static implicit operator string(EmailAddress email) => email.Value;

    public override string ToString() => Value;
}
