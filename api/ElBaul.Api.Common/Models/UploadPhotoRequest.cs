using Microsoft.AspNetCore.Http;

using ElBaul.Domain;
namespace ElBaul.Api.Models;

public class UploadPhotoRequest
{
    public IFormFile? File { get; set; }
    public ClientUploadId? ClientUploadId { get; set; }
    // Shared by every photo picked in the same client upload action — unlike ClientUploadId
    // (a unique idempotency key per photo), several photos legitimately share this value.
    // Optional: absent for callers uploading a single photo with no batch context.
    public Guid? UploadBatchId { get; set; }
}
