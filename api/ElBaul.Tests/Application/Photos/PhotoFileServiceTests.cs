using ElBaul.Application.Photos;
using ElBaul.Infra.Lite;
using ElBaul.OutputPorts.Photos;
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

        var result = await service.SaveForUploadAsync(new UserId("user-1"), "big.jpg", "image/jpeg", content, null);

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

        var result = await service.SaveForUploadAsync(new UserId("user-1"), "corrupt.jpg", "image/jpeg", content, null);

        Assert.True(result.IsFailure);
        Assert.Equal(Ne2Studio.Common.ApplicationErrorCode.Validation, result.Error.Code);
        Assert.Empty(_photoStorage.SavedKeys);
    }

    [Fact]
    public async Task SaveForUploadAsync_RejectsFile_WhenItExceedsMaxUploadMegapixels()
    {
        // Policy caps at 1 MP; 2000x2000 = 4 MP.
        _imageProcessor.IdentifyAsync(Arg.Any<Stream>()).Returns(new ImageMetadata(2000, 2000));
        var service = CreateService();
        using var content = new MemoryStream([1, 2, 3]);

        var result = await service.SaveForUploadAsync(new UserId("user-1"), "huge.jpg", "image/jpeg", content, null);

        Assert.True(result.IsFailure);
        Assert.Equal(Ne2Studio.Common.ApplicationErrorCode.Validation, result.Error.Code);
        Assert.Empty(_photoStorage.SavedKeys);
        await _imageProcessor.DidNotReceive().NormalizeAsync(Arg.Any<Stream>(), Arg.Any<int>());
    }

    [Fact]
    public async Task SaveForUploadAsync_StoresTheOriginalUnchanged_WhenAlreadyWithinPolicy()
    {
        _imageProcessor.IdentifyAsync(Arg.Any<Stream>()).Returns(new ImageMetadata(800, 600));
        var service = CreateService(new ImagePolicy());
        var bytes = new byte[] { 1, 2, 3, 4, 5 };
        using var content = new MemoryStream(bytes);

        var result = await service.SaveForUploadAsync(new UserId("user-1"), "small.jpg", "image/jpeg", content, null);

        Assert.True(result.IsSuccess);
        Assert.Equal(800, result.Value.Width);
        Assert.Equal(600, result.Value.Height);
        Assert.Equal(bytes.Length, result.Value.SizeBytes);
        Assert.Null(result.Value.OriginalWidth);
        Assert.Null(result.Value.OriginalHeight);
        Assert.Null(result.Value.OriginalSizeBytes);
        await _imageProcessor.DidNotReceive().NormalizeAsync(Arg.Any<Stream>(), Arg.Any<int>());
        Assert.Single(_photoStorage.SavedKeys);
    }

    [Fact]
    public async Task SaveForUploadAsync_NormalizesAndRecordsOriginalMetadata_WhenOverTheStoredResolutionLimit()
    {
        var policy = new ImagePolicy(MaxStoredLongEdge: 4096, MaxUploadBytes: 50_000_000, MaxUploadMegapixels: 120);
        _imageProcessor.IdentifyAsync(Arg.Any<Stream>()).Returns(new ImageMetadata(12000, 9000));
        var normalizedBytes = new byte[] { 9, 9, 9 };
        _imageProcessor.NormalizeAsync(Arg.Any<Stream>(), 4096)
            .Returns(new NormalizedImage(new MemoryStream(normalizedBytes), "image/jpeg", 4096, 3072, normalizedBytes.Length));
        var service = CreateService(policy);
        var uploadedBytes = new byte[10_000];
        using var content = new MemoryStream(uploadedBytes);

        var result = await service.SaveForUploadAsync(new UserId("user-1"), "giant.jpg", "image/jpeg", content, null);

        Assert.True(result.IsSuccess);
        Assert.Equal(4096, result.Value.Width);
        Assert.Equal(3072, result.Value.Height);
        Assert.Equal(normalizedBytes.Length, result.Value.SizeBytes);
        Assert.Equal(12000, result.Value.OriginalWidth);
        Assert.Equal(9000, result.Value.OriginalHeight);
        Assert.Equal(uploadedBytes.Length, result.Value.OriginalSizeBytes);
    }
}
