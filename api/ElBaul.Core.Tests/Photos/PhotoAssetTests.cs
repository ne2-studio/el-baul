using ElBaul.Core.Photos.Domain;

using ElBaul.Domain;
namespace ElBaul.Tests.Photos;

// Slice 1 of the multi-vault photo groundwork (docs/.backlog issue #62): pins the domain-level
// split between Photo (vault-context) and PhotoAsset (the stored file) — see PhotoAssetTests in
// ElBaul.Infra.PersistenceTests for the persistence-level equivalent.
public class PhotoAssetTests
{
    [Fact]
    public void Create_BuildsAPhoto_WithItsOwnPhotoAsset_SplittingContextFromAssetFields()
    {
        var photoId = new PhotoId(Guid.NewGuid());
        var chapterId = new ChapterId(Guid.NewGuid());
        var baulId = new BaulId(Guid.NewGuid());
        var uploadedBy = new UserId("user-1");
        var createdAt = DateTime.UtcNow;

        var photo = Photo.Create(
            photoId, chapterId, baulId, "vault/key.jpg", PhotoDate.Parse(2020, 5, 1).Value,
            uploadedBy, createdAt, new ImageDimensions(1920, 1080),
            sizeBytes: 999, originalDimensions: new ImageDimensions(4000, 3000),
            originalSizeBytes: 5000, originalContentHash: "hash-1");

        // Contextual fields live directly on Photo.
        Assert.Equal(chapterId, photo.ChapterId);
        Assert.Equal(baulId, photo.BaulId);
        Assert.Equal(uploadedBy, photo.UploadedBy);
        Assert.Equal(createdAt, photo.CreatedAt);

        // Asset-intrinsic fields are owned by the linked PhotoAsset...
        Assert.Equal(photo.PhotoAssetId, photo.PhotoAsset.Id);
        Assert.Equal(uploadedBy, photo.PhotoAsset.UploadedBy);
        Assert.Equal("vault/key.jpg", photo.PhotoAsset.StorageKey);
        Assert.Equal(999, photo.PhotoAsset.SizeBytes);
        Assert.Equal(new ImageDimensions(1920, 1080), photo.PhotoAsset.Dimensions);
        Assert.Equal(new ImageDimensions(4000, 3000), photo.PhotoAsset.OriginalDimensions);
        Assert.Equal(5000, photo.PhotoAsset.OriginalSizeBytes);
        Assert.Equal("hash-1", photo.PhotoAsset.OriginalContentHash);

        // ...but Photo's own passthrough accessors resolve through it transparently, so every
        // existing read call site keeps working unchanged.
        Assert.Equal(photo.PhotoAsset.StorageKey, photo.StorageKey);
        Assert.Equal(photo.PhotoAsset.SizeBytes, photo.SizeBytes);
        Assert.Equal(photo.PhotoAsset.Dimensions, photo.Dimensions);
        Assert.Equal(photo.PhotoAsset.OriginalDimensions, photo.OriginalDimensions);
        Assert.Equal(photo.PhotoAsset.OriginalSizeBytes, photo.OriginalSizeBytes);
    }

    [Fact]
    public void Create_GivesTheNewPhotoAsset_ItsOwnId_DistinctFromNothingElse()
    {
        // For this slice every Photo.Create call builds a brand-new PhotoAsset — see the
        // constructor's doc comment for why its id deliberately reuses the Photo's own Guid.
        var photo = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, new BaulId(Guid.NewGuid()), "key.jpg", null,
            new UserId("user-1"), DateTime.UtcNow, new ImageDimensions(1, 1));

        Assert.Equal(photo.Id.Value, photo.PhotoAssetId.Value);
    }

    [Fact]
    public void TwoPhotosCanBeConstructed_SharingTheSamePhotoAsset()
    {
        // Nothing in the domain model prevents this — see Photo's public constructor, which
        // takes a PhotoAsset directly rather than only ever building a new one (that's
        // Photo.Create's job). No current application workflow does this yet (Slice 2+).
        var originalUploader = new UserId("user-1");
        var sharedAsset = PhotoAsset.Create(
            new PhotoAssetId(Guid.NewGuid()), "shared.jpg", new ImageDimensions(10, 10), DateTime.UtcNow, originalUploader);
        var baulId = new BaulId(Guid.NewGuid());

        var photoA = new Photo(new PhotoId(Guid.NewGuid()), null, baulId, sharedAsset, null, originalUploader, DateTime.UtcNow);
        var photoB = new Photo(new PhotoId(Guid.NewGuid()), null, baulId, sharedAsset, null, new UserId("user-2"), DateTime.UtcNow);

        Assert.Equal(photoA.PhotoAssetId, photoB.PhotoAssetId);
        Assert.Equal("shared.jpg", photoA.StorageKey);
        Assert.Equal("shared.jpg", photoB.StorageKey);
        // The asset's own UploadedBy stays pinned to whoever originally created it (user-1),
        // regardless of which Photo/UploadedBy is asking to read it — photoB's own UploadedBy
        // (user-2, "added it to this baúl") never leaks onto the shared asset.
        Assert.Equal(originalUploader, photoA.PhotoAsset.UploadedBy);
        Assert.Equal(originalUploader, photoB.PhotoAsset.UploadedBy);
    }
}
