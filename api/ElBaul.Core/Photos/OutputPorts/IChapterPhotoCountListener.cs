using ElBaul.Core.Photos.Domain;
using ElBaul.Domain;
namespace ElBaul.Core.Photos.OutputPorts;

/// <summary>
/// Photos calls this synchronously, inside the same transaction, whenever a photo enters or
/// leaves a chapter — lets Chapters maintain its own PhotoCount/CoverPhotoId without Photos
/// writing into Chapters.OutputPorts directly (the old shape: PhotoLifecycleService held an
/// IChapterRepository just to update the chapter it was handed). This is dependency inversion
/// for a write Photos triggers but Chapters owns, not a message bus — one implementation
/// (Chapters.Application.ChapterPhotoCountListener), wired in the composition root, called
/// in-process like any other constructor dependency.
/// </summary>
public interface IChapterPhotoCountListener
{
    Task OnPhotoAddedAsync(ChapterId chapterId, PhotoRef photo, DateTime now);
    Task OnPhotoRemovedAsync(ChapterId chapterId, PhotoRef photo, DateTime now);
}
