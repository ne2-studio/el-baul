using ElBaul.OutputPorts.Shared;
namespace ElBaul.Api.Models;

public record SetPersonaAvatarPhotoRequest(PhotoId PhotoId, decimal CropX, decimal CropY, decimal CropScale);
