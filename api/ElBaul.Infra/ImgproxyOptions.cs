namespace ElBaul.Infra;

public class ImgproxyOptions
{
    public required string BaseUrl { get; init; }
    public required string Key { get; init; }
    public required string Salt { get; init; }
}
