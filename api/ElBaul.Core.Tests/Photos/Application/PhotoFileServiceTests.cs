using ElBaul.Core.Photos.Domain;
using System.Security.Cryptography;
using ElBaul.Core.Photos.Application;
using ElBaul.Infra.Lite;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Tests.Fakes;

using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;

using ElBaul.Domain;
namespace ElBaul.Tests.Application.Photos;

public class PhotoFileServiceTests
{
    private readonly FakePhotoStorage _photoStorage = new();
    private readonly FakePhotoDateExtractor _photoDateExtractor = new();
    private readonly IImageProcessor _imageProcessor = Substitute.For<IImageProcessor>();
    private readonly ImagePolicy _policy = new(MaxStoredLongEdge: 4096, MaxUploadBytes: 1000, MaxUploadMegapixels: 1);

    private PhotoFileService CreateService(ImagePolicy? policy = null) =>
        new(NullLogger<PhotoFileService>.Instance, _photoStorage, new StaticIdGenerator(Guid.NewGuid()), _photoDateExtractor,
            new FakePhotoImageNormalizer(), _imageProcessor, policy ?? _policy);

    [Fact]
    public async Task SaveForUploadAsync_RejectsFile_WhenItExceedsMaxUploadBytes()
    {
        var service = CreateService();
        using var content = new MemoryStream(new byte[1001]);

        var result = await service.SaveForUploadAsync(new UserId("user-1"), content);

        Assert.True(result.IsFailure);
        Assert.Equal(Ne2Studio.Common.ApplicationErrorCode.Validation, result.Error.Code);
        Assert.Empty(_photoStorage.SavedKeys);
        await _imageProcessor.DidNotReceive().IdentifyAsync(Arg.Any<Stream>());
    }

    [Fact]
    public async Task SaveForUploadAsync_RejectsFile_WhenItCannotBeIdentifiedAsAnImage()
    {
        _imageProcessor.IdentifyAsync(Arg.Any<Stream>()).Returns((ImageMetadata?)null);
        var service = CreateService();
        using var content = new MemoryStream([1, 2, 3]);

        var result = await service.SaveForUploadAsync(new UserId("user-1"), content);

        Assert.True(result.IsFailure);
        Assert.Equal(Ne2Studio.Common.ApplicationErrorCode.Validation, result.Error.Code);
        Assert.Empty(_photoStorage.SavedKeys);
    }

    [Fact]
    public async Task SaveForUploadAsync_RejectsFile_WhenItExceedsMaxUploadMegapixels()
    {
        // Policy caps at 1 MP; 2000x2000 = 4 MP.
        _imageProcessor.IdentifyAsync(Arg.Any<Stream>()).Returns(new ImageMetadata(2000, 2000, "image/jpeg"));
        var service = CreateService();
        using var content = new MemoryStream([1, 2, 3]);

        var result = await service.SaveForUploadAsync(new UserId("user-1"), content);

        Assert.True(result.IsFailure);
        Assert.Equal(Ne2Studio.Common.ApplicationErrorCode.Validation, result.Error.Code);
        Assert.Empty(_photoStorage.SavedKeys);
        await _imageProcessor.DidNotReceive().NormalizeAsync(Arg.Any<Stream>(), Arg.Any<int>());
    }

    [Fact]
    public async Task SaveForUploadAsync_StoresTheOriginalUnchanged_WhenAlreadyWithinPolicy()
    {
        _imageProcessor.IdentifyAsync(Arg.Any<Stream>()).Returns(new ImageMetadata(800, 600, "image/jpeg"));
        var service = CreateService(new ImagePolicy());
        var bytes = new byte[] { 1, 2, 3, 4, 5 };
        using var content = new MemoryStream(bytes);

        var result = await service.SaveForUploadAsync(new UserId("user-1"), content);

        Assert.True(result.IsSuccess);
        Assert.Equal(800, result.Value.Dimensions.Width);
        Assert.Equal(600, result.Value.Dimensions.Height);
        Assert.Equal(bytes.Length, result.Value.SizeBytes);
        Assert.Null(result.Value.OriginalDimensions);
        Assert.Null(result.Value.OriginalSizeBytes);
        await _imageProcessor.DidNotReceive().NormalizeAsync(Arg.Any<Stream>(), Arg.Any<int>());
        Assert.Single(_photoStorage.SavedKeys);
    }

    [Fact]
    public async Task SaveForUploadAsync_NormalizesAndRecordsOriginalMetadata_WhenOverTheStoredResolutionLimit()
    {
        var policy = new ImagePolicy(MaxStoredLongEdge: 4096, MaxUploadBytes: 50_000_000, MaxUploadMegapixels: 120);
        _imageProcessor.IdentifyAsync(Arg.Any<Stream>()).Returns(new ImageMetadata(12000, 9000, "image/jpeg"));
        var normalizedBytes = new byte[] { 9, 9, 9 };
        _imageProcessor.NormalizeAsync(Arg.Any<Stream>(), 4096)
            .Returns(new NormalizedImage(new MemoryStream(normalizedBytes), "image/jpeg", 4096, 3072, normalizedBytes.Length));
        var service = CreateService(policy);
        var uploadedBytes = new byte[10_000];
        using var content = new MemoryStream(uploadedBytes);

        var result = await service.SaveForUploadAsync(new UserId("user-1"), content);

        Assert.True(result.IsSuccess);
        Assert.Equal(4096, result.Value.Dimensions.Width);
        Assert.Equal(3072, result.Value.Dimensions.Height);
        Assert.Equal(normalizedBytes.Length, result.Value.SizeBytes);
        Assert.Equal(12000, result.Value.OriginalDimensions!.Width);
        Assert.Equal(9000, result.Value.OriginalDimensions.Height);
        Assert.Equal(uploadedBytes.Length, result.Value.OriginalSizeBytes);
    }

    [Fact]
    public async Task SaveForUploadAsync_ComputesTheSameOriginalContentHash_ForIdenticalBytes()
    {
        _imageProcessor.IdentifyAsync(Arg.Any<Stream>()).Returns(new ImageMetadata(800, 600, "image/jpeg"));
        var service = CreateService(new ImagePolicy());
        var bytes = new byte[] { 1, 2, 3, 4, 5 };

        var first = await service.SaveForUploadAsync(new UserId("user-1"), new MemoryStream(bytes));
        var second = await service.SaveForUploadAsync(new UserId("user-1"), new MemoryStream(bytes));

        Assert.True(first.IsSuccess);
        Assert.True(second.IsSuccess);
        Assert.Equal(first.Value.OriginalContentHash, second.Value.OriginalContentHash);
        Assert.Equal(Convert.ToHexStringLower(SHA256.HashData(bytes)), first.Value.OriginalContentHash);
    }

    [Fact]
    public async Task SaveForUploadAsync_ComputesDifferentOriginalContentHashes_ForDifferentBytes()
    {
        _imageProcessor.IdentifyAsync(Arg.Any<Stream>()).Returns(new ImageMetadata(800, 600, "image/jpeg"));
        var service = CreateService(new ImagePolicy());

        var first = await service.SaveForUploadAsync(new UserId("user-1"), new MemoryStream([1, 2, 3]));
        var second = await service.SaveForUploadAsync(new UserId("user-1"), new MemoryStream([4, 5, 6]));

        Assert.True(first.IsSuccess);
        Assert.True(second.IsSuccess);
        Assert.NotEqual(first.Value.OriginalContentHash, second.Value.OriginalContentHash);
    }

    [Fact]
    public async Task SaveForUploadAsync_ComputesTheHash_FromThePreNormalizationBytes()
    {
        // Simulates HEIC-to-JPEG conversion (IPhotoImageNormalizer) actually transforming the
        // bytes — the hash must still reflect what the server received, not what normalization
        // produced (see Photo.OriginalContentHash's doc comment).
        var originalBytes = new byte[] { 1, 2, 3 };
        var normalizedBytes = new byte[] { 9, 8, 7, 6 };
        var normalizer = Substitute.For<IPhotoImageNormalizer>();
        normalizer.NormalizeAsync(Arg.Any<Stream>()).Returns(new NormalizedPhoto(new MemoryStream(normalizedBytes)));
        _imageProcessor.IdentifyAsync(Arg.Any<Stream>()).Returns(new ImageMetadata(800, 600, "image/jpeg"));
        var service = new PhotoFileService(
            NullLogger<PhotoFileService>.Instance, _photoStorage, new StaticIdGenerator(Guid.NewGuid()), _photoDateExtractor,
            normalizer, _imageProcessor, new ImagePolicy());

        var result = await service.SaveForUploadAsync(new UserId("user-1"), new MemoryStream(originalBytes));

        Assert.True(result.IsSuccess);
        Assert.Equal(Convert.ToHexStringLower(SHA256.HashData(originalBytes)), result.Value.OriginalContentHash);
    }

    [Fact]
    public async Task SaveForUploadAsync_DerivesTheStorageKeyFromTheDetectedFormat_NeverFromAnyClientInput()
    {
        _imageProcessor.IdentifyAsync(Arg.Any<Stream>()).Returns(new ImageMetadata(800, 600, "image/png"));
        var service = CreateService(new ImagePolicy());
        using var content = new MemoryStream([1, 2, 3, 4, 5]);

        var result = await service.SaveForUploadAsync(new UserId("user-1"), content);

        Assert.True(result.IsSuccess);
        Assert.EndsWith(".png", result.Value.StorageKey);
    }
}
