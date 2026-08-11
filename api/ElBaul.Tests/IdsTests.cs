using ElBaul.Shared;

namespace ElBaul.Tests;

// Parse is the single "is this string a valid <id>?" rule every controller used to hand-roll as
// its own Guid.TryParse + BadRequest — see PhotosController.Move, BaulesController.SetCover, etc.
public class IdsTests
{
    [Fact]
    public void Parse_ShouldSucceed_ForAValidGuidString()
    {
        var guid = Guid.NewGuid();

        var result = PhotoId.Parse(guid.ToString());

        Assert.True(result.IsSuccess);
        Assert.Equal(guid, result.Value.Value);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("not-a-guid")]
    public void Parse_ShouldFail_ForAMissingOrInvalidGuidString(string? raw)
    {
        var result = PhotoId.Parse(raw);

        Assert.True(result.IsFailure);
        Assert.Equal(ApplicationErrorCode.Validation, result.Error.Code);
        Assert.Contains("photo id", result.Error.Message);
    }

    [Fact]
    public void Parse_ShouldNameTheRightTypeInTheErrorMessage_ForEachIdType()
    {
        Assert.Contains("baúl id", BaulId.Parse("bad").Error.Message);
        Assert.Contains("chapter id", ChapterId.Parse("bad").Error.Message);
        Assert.Contains("persona id", PersonaId.Parse("bad").Error.Message);
        Assert.Contains("recuerdo id", RecuerdoId.Parse("bad").Error.Message);
        Assert.Contains("shared link id", SharedLinkId.Parse("bad").Error.Message);
        Assert.Contains("baúl invite link id", BaulInviteLinkId.Parse("bad").Error.Message);
        Assert.Contains("removal request id", RemovalRequestId.Parse("bad").Error.Message);
        Assert.Contains("client upload id", ClientUploadId.Parse("bad").Error.Message);
    }
}
