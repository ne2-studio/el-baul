using Microsoft.AspNetCore.Http;

namespace ElBaul.Api.Models;

public class UploadPersonaAvatarRequest
{
    public IFormFile? File { get; set; }
    public decimal CropX { get; set; } = 0.5m;
    public decimal CropY { get; set; } = 0.5m;
    public decimal CropScale { get; set; } = 1m;
    public string? ClientUploadId { get; set; }
}
