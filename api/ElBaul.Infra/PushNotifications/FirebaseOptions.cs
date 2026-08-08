namespace ElBaul.Infra.PushNotifications;

public class FirebaseOptions
{
    // Raw service-account JSON (the file you'd download from Firebase Console → Project
    // Settings → Service Accounts → Generate new private key), passed as a single config value
    // (env var in practice) rather than a checked-in file — see Resend:ApiKey for the same
    // shape of secret.
    public string ServiceAccountJson { get; init; } = "";
}
