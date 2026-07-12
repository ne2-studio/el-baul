using CSharpFunctionalExtensions;
using ElBaul.Ports.Input;
using ElBaul.Ports.Output;

namespace ElBaul.Application;

public class PhotoManager(
    IPhotoRepository photoRepository,
    IAlbumRepository albumRepository,
    IBaulRepository baulRepository,
    IActivityRepository activityRepository,
    IPhotoStorage photoStorage,
    IRecuerdoRepository recuerdoRepository,
    IUserRepository userRepository,
    IIdGenerator idGenerator,
    IClock clock,
    ICurrentUserProvider currentUserProvider) : IPhotoManager
{
    private static readonly TimeSpan SignedUrlLifetime = TimeSpan.FromHours(1);

    public async Task<Result<IEnumerable<PhotoDto>>> GetByAlbumIdAsync(Guid albumId)
    {
        var userId = currentUserProvider.GetUserId();
        var album = await albumRepository.GetByIdAsync(albumId);
        if (album is null) return Result.Failure<IEnumerable<PhotoDto>>("Album not found");

        var baul = await baulRepository.GetByIdAsync(album.BaulId);
        if (baul is null) return Result.Failure<IEnumerable<PhotoDto>>("Baul not found");

        var hasAccess = baul.CustodioId == userId
            || await baulRepository.GetSharedUserByUserIdAsync(album.BaulId, userId) is not null;
        if (!hasAccess) return Result.Failure<IEnumerable<PhotoDto>>("Access denied");

        var photos = await photoRepository.GetByAlbumIdAsync(albumId);
        var dtos = new List<PhotoDto>();
        foreach (var photo in photos)
        {
            var url = await photoStorage.GetSignedUrlAsync(photo.StorageKey, SignedUrlLifetime);
            dtos.Add(ToDto(photo, url));
        }

        return Result.Success<IEnumerable<PhotoDto>>(dtos);
    }

    public async Task<Result<PhotoDto>> UploadAsync(
        Guid albumId,
        Stream content,
        string fileName,
        string contentType,
        string? caption,
        DateTime? date)
    {
        var userId = currentUserProvider.GetUserId();
        var album = await albumRepository.GetByIdAsync(albumId);
        if (album is null) return Result.Failure<PhotoDto>("Album not found");

        var baul = await baulRepository.GetByIdAsync(album.BaulId);
        if (baul is null) return Result.Failure<PhotoDto>("Baul not found");

        var isCustodio = baul.CustodioId == userId;
        var sharedAccess = await baulRepository.GetSharedUserByUserIdAsync(album.BaulId, userId);
        var canEdit = isCustodio || sharedAccess?.Role == BaulRole.Colaborador;
        if (!canEdit) return Result.Failure<PhotoDto>("Access denied");

        var now = clock.UtcNow();
        var storageKey = $"{userId}/{idGenerator.NewId()}-{fileName}";
        await photoStorage.SaveAsync(storageKey, content, contentType);

        var photo = new Photo(idGenerator.NewId(), albumId, album.BaulId, storageKey, caption, date ?? now, userId, now);
        await photoRepository.CreateAsync(photo);

        var updatedAlbum = album with
        {
            PhotoCount = album.PhotoCount + 1,
            CoverPhotoKey = string.IsNullOrEmpty(album.CoverPhotoKey) ? storageKey : album.CoverPhotoKey,
            UpdatedAt = now
        };
        await albumRepository.UpdateAsync(updatedAlbum);
        await baulRepository.UpdateAsync(baul with { UpdatedAt = now });

        await activityRepository.CreateAsync(new Activity(
            idGenerator.NewId(), ActivityType.NewPhotos, album.BaulId, baul.Name, now,
            false, 1, null, null, null));

        var url = await photoStorage.GetSignedUrlAsync(storageKey, SignedUrlLifetime);
        return ToDto(photo, url);
    }

    public async Task<Result<IEnumerable<RecuerdoDto>>> GetRecuerdosAsync(Guid photoId)
    {
        var userId = currentUserProvider.GetUserId();
        var photo = await photoRepository.GetByIdAsync(photoId);
        if (photo is null) return Result.Failure<IEnumerable<RecuerdoDto>>("Photo not found");

        var baul = await baulRepository.GetByIdAsync(photo.BaulId);
        if (baul is null) return Result.Failure<IEnumerable<RecuerdoDto>>("Baul not found");

        var hasAccess = baul.CustodioId == userId
            || await baulRepository.GetSharedUserByUserIdAsync(photo.BaulId, userId) is not null;
        if (!hasAccess) return Result.Failure<IEnumerable<RecuerdoDto>>("Access denied");

        var recuerdos = await recuerdoRepository.GetByPhotoIdAsync(photoId);
        var dtos = new List<RecuerdoDto>();
        foreach (var recuerdo in recuerdos)
        {
            var user = await userRepository.GetByIdAsync(recuerdo.UserId);
            dtos.Add(ToDto(recuerdo, user?.Name ?? "Usuario desconocido", recuerdo.UserId == userId));
        }

        return Result.Success<IEnumerable<RecuerdoDto>>(dtos);
    }

    public async Task<Result<RecuerdoDto>> CreateRecuerdoAsync(Guid photoId, string text)
    {
        var userId = currentUserProvider.GetUserId();
        var photo = await photoRepository.GetByIdAsync(photoId);
        if (photo is null) return Result.Failure<RecuerdoDto>("Photo not found");

        var baul = await baulRepository.GetByIdAsync(photo.BaulId);
        if (baul is null) return Result.Failure<RecuerdoDto>("Baul not found");

        var hasAccess = baul.CustodioId == userId
            || await baulRepository.GetSharedUserByUserIdAsync(photo.BaulId, userId) is not null;
        if (!hasAccess) return Result.Failure<RecuerdoDto>("Access denied");

        var user = await userRepository.GetByIdAsync(userId);
        var recuerdo = new Recuerdo(idGenerator.NewId(), photoId, userId, text, clock.UtcNow());
        await recuerdoRepository.CreateAsync(recuerdo);

        return ToDto(recuerdo, user?.Name ?? "Usuario", isOwn: true);
    }

    private static PhotoDto ToDto(Photo photo, string url) =>
        new(photo.Id.ToString(), photo.AlbumId.ToString(), photo.BaulId.ToString(), url, photo.Caption,
            photo.Date, photo.UploadedBy, photo.CreatedAt);

    private static RecuerdoDto ToDto(Recuerdo recuerdo, string userName, bool isOwn) =>
        new(recuerdo.Id.ToString(), recuerdo.PhotoId.ToString(), recuerdo.UserId, recuerdo.Text, userName,
            recuerdo.CreatedAt, isOwn);
}
