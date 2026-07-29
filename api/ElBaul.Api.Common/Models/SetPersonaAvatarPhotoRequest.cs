namespace ElBaul.Api.Models;

public record SetPersonaAvatarPhotoRequest(string PhotoId, decimal CropX, decimal CropY, decimal CropScale);
