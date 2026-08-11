using Ne2Studio.Common;
namespace ElBaul.Tests;

// Bind/Map/Traverse are what let independent Result-returning steps (id parsing, value-object
// construction) compose without a manual IsFailure check after each one — see
// PhotosController.TagBatch and BaulesController.SetPersonaAvatarPhoto for real call sites.
public class ResultTests
{
    [Fact]
    public void Bind_OnSuccess_ShouldRunTheNextStep()
    {
        var result = Result.Success(2).Bind(x => Result.Success(x * 2));

        Assert.True(result.IsSuccess);
        Assert.Equal(4, result.Value);
    }

    [Fact]
    public void Bind_OnFailure_ShouldShortCircuit_WithoutRunningTheNextStep()
    {
        var ranNext = false;
        var result = Result.Failure<int>(ApplicationError.Validation("bad")).Bind(x =>
        {
            ranNext = true;
            return Result.Success(x * 2);
        });

        Assert.True(result.IsFailure);
        Assert.False(ranNext);
        Assert.Equal("bad", result.Error.Message);
    }

    [Fact]
    public void Map_OnSuccess_ShouldTransformTheValue()
    {
        var result = Result.Success(2).Map(x => x * 2);

        Assert.True(result.IsSuccess);
        Assert.Equal(4, result.Value);
    }

    [Fact]
    public void Map_OnFailure_ShouldPassTheFailureThrough_Unchanged()
    {
        var error = ApplicationError.Validation("bad");
        var result = Result.Failure<int>(error).Map(x => x * 2);

        Assert.True(result.IsFailure);
        Assert.Equal(error, result.Error);
    }

    [Fact]
    public void NonGenericResult_Bind_OnSuccess_ShouldRunTheNextStep()
    {
        var result = Result.Success().Bind(() => Result.Success(42));

        Assert.True(result.IsSuccess);
        Assert.Equal(42, result.Value);
    }

    [Fact]
    public void NonGenericResult_Bind_OnFailure_ShouldShortCircuit()
    {
        var error = ApplicationError.Forbidden("no");
        var result = Result.Failure(error).Bind(() => Result.Success(42));

        Assert.True(result.IsFailure);
        Assert.Equal(error, result.Error);
    }

    [Fact]
    public void Traverse_ShouldCollectEverySuccess_InOrder()
    {
        var result = Result.Traverse(["1", "2", "3"], s => Result.Success(int.Parse(s)));

        Assert.True(result.IsSuccess);
        Assert.Equal([1, 2, 3], result.Value);
    }

    [Fact]
    public void Traverse_ShouldShortCircuit_OnTheFirstFailure_AndNotParseWhatComesAfterIt()
    {
        var parsed = new List<string>();
        var result = Result.Traverse(["1", "bad", "3"], s =>
        {
            parsed.Add(s);
            return int.TryParse(s, out var n)
                ? Result.Success(n)
                : Result.Failure<int>(ApplicationError.Validation($"'{s}' is not a number"));
        });

        Assert.True(result.IsFailure);
        Assert.Equal(["1", "bad"], parsed);
    }
}
