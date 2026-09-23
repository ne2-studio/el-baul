using ElBaul.Api.Logging;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Serilog;
using Serilog.Events;

namespace ElBaul.Api.Tests;

public class RouteIdLogContextMiddlewareTests
{
    [Fact]
    public async Task InvokeAsync_ShouldPushEveryRouteIdValue_AsAPascalCasedProperty_VisibleToLogsEmittedDownstream()
    {
        var events = new List<LogEvent>();
        var logger = new LoggerConfiguration()
            .Enrich.FromLogContext()
            .WriteTo.Sink(new CollectingSink(events))
            .CreateLogger();

        var context = new DefaultHttpContext();
        context.Request.RouteValues = new RouteValueDictionary
        {
            ["baulId"] = Guid.Parse("11111111-1111-1111-1111-111111111111"),
            ["chapterId"] = Guid.Parse("22222222-2222-2222-2222-222222222222"),
            ["nonIdValue"] = "should not be pushed"
        };

        var middleware = new RouteIdLogContextMiddleware(_ =>
        {
            logger.Information("downstream log line");
            return Task.CompletedTask;
        });

        await middleware.InvokeAsync(context);

        var captured = Assert.Single(events);
        Assert.True(captured.Properties.TryGetValue("BaulId", out var baulId));
        Assert.Equal("11111111-1111-1111-1111-111111111111", baulId!.ToString());
        Assert.True(captured.Properties.TryGetValue("ChapterId", out var chapterId));
        Assert.Equal("22222222-2222-2222-2222-222222222222", chapterId!.ToString());
        Assert.False(captured.Properties.ContainsKey("NonIdValue"));
    }

    [Fact]
    public async Task InvokeAsync_ShouldNotPushARouteUserId_ToAvoidConflatingItWithTheCallers_UserId()
    {
        var events = new List<LogEvent>();
        var logger = new LoggerConfiguration()
            .Enrich.FromLogContext()
            .WriteTo.Sink(new CollectingSink(events))
            .CreateLogger();

        var context = new DefaultHttpContext();
        context.Request.RouteValues = new RouteValueDictionary { ["userId"] = "some-oidc-sub" };

        var middleware = new RouteIdLogContextMiddleware(_ =>
        {
            logger.Information("downstream log line");
            return Task.CompletedTask;
        });

        await middleware.InvokeAsync(context);

        var captured = Assert.Single(events);
        Assert.False(captured.Properties.ContainsKey("UserId"));
    }

    [Fact]
    public async Task InvokeAsync_ShouldPopEveryPushedProperty_OnceTheRequestFinishes()
    {
        var events = new List<LogEvent>();
        var logger = new LoggerConfiguration()
            .Enrich.FromLogContext()
            .WriteTo.Sink(new CollectingSink(events))
            .CreateLogger();

        var context = new DefaultHttpContext();
        context.Request.RouteValues = new RouteValueDictionary { ["baulId"] = Guid.NewGuid() };

        var middleware = new RouteIdLogContextMiddleware(_ => Task.CompletedTask);
        await middleware.InvokeAsync(context);

        logger.Information("logged after the middleware's own using block disposed");

        var captured = Assert.Single(events);
        Assert.False(captured.Properties.ContainsKey("BaulId"));
    }

    private sealed class CollectingSink(List<LogEvent> events) : Serilog.Core.ILogEventSink
    {
        public void Emit(LogEvent logEvent) => events.Add(logEvent);
    }
}
