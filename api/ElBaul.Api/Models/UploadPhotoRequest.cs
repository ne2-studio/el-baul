using Microsoft.AspNetCore.Http;

namespace ElBaul.Api.Models;

public class UploadPhotoRequest
{
    public IFormFile? File { get; set; }
    public string? Caption { get; set; }
    public int? DateYear { get; set; }
    public int? DateMonth { get; set; }
    public int? DateDay { get; set; }
    public Guid? ClientUploadId { get; set; }
}
