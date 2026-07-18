using Microsoft.AspNetCore.Http;

namespace ElBaul.Api.Models;

public class UploadPhotoRequest
{
    public IFormFile? File { get; set; }
    public string? Caption { get; set; }
    public DateTime? Date { get; set; }
    public Guid? ClientUploadId { get; set; }
}
