namespace ElBaul.Infra;

public class StorageOptions
{
    public required string Endpoint { get; init; }
    public required string AccessKey { get; init; }
    public required string SecretKey { get; init; }
    public required string BucketName { get; init; }
}
