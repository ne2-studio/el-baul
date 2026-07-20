using Microsoft.AspNetCore.Http;

namespace ElBaul.Api.Models;

public class SubmitSupportRequest
{
    public string Category { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public IFormFile? Screenshot { get; set; }
}
