using ElBaul.Api.Middleware;
using ElBaul.Core.Shared.OutputPorts;
using Microsoft.AspNetCore.Http;
using NSubstitute;

namespace ElBaul.Api.Tests;

public class MaintenanceModeMiddlewareTests
{
    [Fact]
    public async Task InvokeAsync_ShouldReturn503_ForAnyRequest_WhenMaintenanceModeIsEnabled()
    {
        var appConfiguration = Substitute.For<IAppConfiguration>();
        appConfiguration.MaintenanceModeEnabled.Returns(true);
        var nextCalled = false;

        var middleware = new MaintenanceModeMiddleware(_ =>
        {
            nextCalled = true;
            return Task.CompletedTask;
        });

        var context = new DefaultHttpContext();
        context.Request.Path = "/api/baules";
        context.Response.Body = new MemoryStream();

        await middleware.InvokeAsync(context, appConfiguration);

        Assert.False(nextCalled);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, context.Response.StatusCode);
    }

    [Fact]
    public async Task InvokeAsync_ShouldLetAppConfigThrough_EvenWhenMaintenanceModeIsEnabled()
    {
        var appConfiguration = Substitute.For<IAppConfiguration>();
        appConfiguration.MaintenanceModeEnabled.Returns(true);
        var nextCalled = false;

        var middleware = new MaintenanceModeMiddleware(_ =>
        {
            nextCalled = true;
            return Task.CompletedTask;
        });

        var context = new DefaultHttpContext();
        context.Request.Path = "/api/app-config";
        context.Response.Body = new MemoryStream();

        await middleware.InvokeAsync(context, appConfiguration);

        Assert.True(nextCalled);
        Assert.Equal(StatusCodes.Status200OK, context.Response.StatusCode);
    }

    [Fact]
    public async Task InvokeAsync_ShouldLetEveryRequestThrough_WhenMaintenanceModeIsDisabled()
    {
        var appConfiguration = Substitute.For<IAppConfiguration>();
        appConfiguration.MaintenanceModeEnabled.Returns(false);
        var nextCalled = false;

        var middleware = new MaintenanceModeMiddleware(_ =>
        {
            nextCalled = true;
            return Task.CompletedTask;
        });

        var context = new DefaultHttpContext();
        context.Request.Path = "/api/baules";
        context.Response.Body = new MemoryStream();

        await middleware.InvokeAsync(context, appConfiguration);

        Assert.True(nextCalled);
        Assert.Equal(StatusCodes.Status200OK, context.Response.StatusCode);
    }
}
