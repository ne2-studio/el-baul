namespace ElBaul.Infra;

public class OpenAiOptions
{
    public string ApiKey { get; init; } = "";
    public string Model { get; init; } = "gpt-4o-mini";
    public string EmbeddingModel { get; init; } = "text-embedding-3-small";
    public string BaseUrl { get; init; } = "https://api.openai.com";
}
