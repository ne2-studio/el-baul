using ElBaul.Core.Users.Domain;

namespace ElBaul.Core.Tests.Users;

public class PersonNameNormalizerTests
{
    [Fact]
    public void Split_ShouldReturnNombreOnly_ForASingleWord()
    {
        var (nombre, apellidos) = PersonNameNormalizer.Split("pedro");

        Assert.Equal("Pedro", nombre);
        Assert.Null(apellidos);
    }

    [Fact]
    public void Split_ShouldSplitOnFirstWord_ForTwoWords()
    {
        var (nombre, apellidos) = PersonNameNormalizer.Split("pedro pardal");

        Assert.Equal("Pedro", nombre);
        Assert.Equal("Pardal", apellidos);
    }

    [Fact]
    public void Split_ShouldJoinRemainingWords_ForMultipleMiddleNames()
    {
        var (nombre, apellidos) = PersonNameNormalizer.Split("pedro pardal jimena garcia");

        Assert.Equal("Pedro", nombre);
        Assert.Equal("Pardal Jimena Garcia", apellidos);
    }

    [Fact]
    public void Split_ShouldTrimAndCollapseExtraWhitespace()
    {
        var (nombre, apellidos) = PersonNameNormalizer.Split("   pedro    pardal   jimena  ");

        Assert.Equal("Pedro", nombre);
        Assert.Equal("Pardal Jimena", apellidos);
    }

    [Fact]
    public void Split_ShouldTitleCase_RegardlessOfInputCasing()
    {
        var (nombre, apellidos) = PersonNameNormalizer.Split("PEDRO pArDaL");

        Assert.Equal("Pedro", nombre);
        Assert.Equal("Pardal", apellidos);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Split_ShouldReturnNulls_ForNullOrBlankInput(string? input)
    {
        var (nombre, apellidos) = PersonNameNormalizer.Split(input);

        Assert.Null(nombre);
        Assert.Null(apellidos);
    }

    [Fact]
    public void Normalize_ShouldCapitalizeEachWord_AndCollapseWhitespace()
    {
        Assert.Equal("Pardal Jimena", PersonNameNormalizer.Normalize("  pardal   JIMENA "));
    }
}
