using ElBaul.Core.Photos.OutputPorts;

using ElBaul.Domain;
namespace ElBaul.Core.Photos.Application;
// Single definition of "can this user delete this photo" — shared by PhotoManager.DeleteAsync
// (authorization, enforced server-side no matter what the client sends) and PhotoDtoProjector
// (the CanDelete/CanRequestRemoval capability flags the frontend renders its menu from), so the
// two can never drift apart. A custodio/administrador can always delete; anyone else only within
// a short grace window after uploading their own photo — self-service undo for an accidental
// upload, without needing an admin to act. Past that window, or on someone else's photo, the
// only path is a removal request (see IRemovalRequestManager) — never both at once.
public static class PhotoDeletePolicy
{
    public static readonly TimeSpan OwnPhotoGracePeriod = TimeSpan.FromHours(1);

    public static bool CanDelete(Photo photo, UserId currentUserId, bool isAdmin, DateTime now) =>
        CanDelete(photo.UploadedBy, photo.CreatedAt, currentUserId, isAdmin, now);

    public static bool CanDelete(UserId uploadedBy, DateTime createdAt, UserId currentUserId, bool isAdmin, DateTime now) =>
        isAdmin || (uploadedBy == currentUserId && now - createdAt < OwnPhotoGracePeriod);
}
