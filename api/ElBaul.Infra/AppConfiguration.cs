using ElBaul.Ports.Output;
using Microsoft.Extensions.Configuration;

namespace ElBaul.Infra;

public class AppConfiguration(IConfiguration configuration) : IAppConfiguration
{
    public string PublicUrl => configuration["App:PublicUrl"] ?? "";
    public string ApiPublicUrl => configuration["Api:PublicUrl"] ?? "";
    public string AdminTestEmailRecipient => configuration["Resend:AdminTestRecipient"] ?? "";
}
