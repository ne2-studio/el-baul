using ElBaul.Domain;
namespace ElBaul.Api.Models;

public record SetPersonaAvatarPhotoRequest(PhotoId PhotoId, decimal CropX, decimal CropY, decimal CropScale);
