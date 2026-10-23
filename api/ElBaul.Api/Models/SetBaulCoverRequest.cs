using ElBaul.Domain;
namespace ElBaul.Api.Models;

public record SetBaulCoverRequest(PhotoId PhotoId, decimal CropX, decimal CropY, decimal CropScale);
