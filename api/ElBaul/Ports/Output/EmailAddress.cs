using System.Net.Mail;

namespace ElBaul.Ports.Output;

// A syntactically valid email address, worth being a VO for the behavior (TryCreate), not just
// the label: it's the single place "is this address well-formed enough to send to" is decided,
// replacing the copy-pasted IsValidEmail in WelcomeEmailManager/WeeklyDigestManager. Deliberately
// NOT used for User.Email/SentEmail.RecipientEmail/RemovalRequest.RequesterEmail — those are
// populated from external, unvalidated sources (OIDC UserInfo claims via UserSyncMiddleware) and
// forcing them through this constructor would turn a malformed upstream claim into a hard
// failure to materialize the User row, instead of the current "just don't send them mail" outcome.
public readonly record struct EmailAddress
{
    public string Value { get; }

    private EmailAddress(string value) => Value = value;

    public static bool TryCreate(string? value, out EmailAddress email)
    {
        if (!string.IsNullOrWhiteSpace(value) && MailAddress.TryCreate(value, out _))
        {
            email = new EmailAddress(value);
            return true;
        }

        email = default;
        return false;
    }

    public static implicit operator string(EmailAddress email) => email.Value;

    public override string ToString() => Value;
}
