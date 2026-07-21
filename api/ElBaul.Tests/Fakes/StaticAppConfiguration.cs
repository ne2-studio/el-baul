using ElBaul.Ports.Output;

namespace ElBaul.Tests.Fakes;

public class StaticAppConfiguration(
    string publicUrl = "https://el-baul.test",
    string adminTestEmailRecipient = "admin@el-baul.test",
    string apiPublicUrl = "https://api.el-baul.test")
    : IAppConfiguration
{
    public string PublicUrl { get; } = publicUrl;
    public string ApiPublicUrl { get; } = apiPublicUrl;
    public string AdminTestEmailRecipient { get; } = adminTestEmailRecipient;
}
