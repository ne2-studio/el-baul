namespace ElBaul.Infra;

public class SmtpOptions
{
    public string Host { get; init; } = "";
    public int Port { get; init; } = 1025;
    public string FromAddress { get; init; } = "";
}
