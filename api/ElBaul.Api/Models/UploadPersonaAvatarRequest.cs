using Microsoft.AspNetCore.Http;

namespace ElBaul.Api.Models;

public class UploadPersonaAvatarRequest
{
    public IFormFile? File { get; set; }
}
