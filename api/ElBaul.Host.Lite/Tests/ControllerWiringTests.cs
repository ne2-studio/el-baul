using System.Reflection;
using ElBaul.Api.Controllers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;

namespace ElBaul.Host.Lite.Tests;

/// <summary>
/// Host.Lite composes the same application layer and HTTP surface as the real host
/// (AddElBaulCore, AddElBaulApi) but registers its own in-memory adapters for the output ports.
/// Every dependency a controller in ElBaul.Api declares, directly or through a manager, must
/// therefore resolve from this container, or the controller fails with a 500 the moment ASP.NET
/// Core tries to construct it. That only shows up on the specific route the missing port backs,
/// and a browser reports it as a misleading CORS error, so it is easy to miss by hand.
///
/// Reflection over every concrete controller rather than one test per controller: a new
/// controller, or a new constructor parameter on an existing one, is covered automatically.
/// </summary>
public sealed class ControllerWiringTests(HostLiteFactory factory) : IClassFixture<HostLiteFactory>
{
    public static TheoryData<Type> ControllerTypes() =>
        new(typeof(BaulesController).Assembly
            .GetTypes()
            .Where(t => t is { IsClass: true, IsAbstract: false } && typeof(ControllerBase).IsAssignableFrom(t)));

    [Theory]
    [MemberData(nameof(ControllerTypes))]
    public void EveryController_ResolvesFromHostLitesContainer(Type controllerType)
    {
        using var scope = factory.Services.CreateScope();

        var exception = Record.Exception(() => ActivatorUtilities.CreateInstance(scope.ServiceProvider, controllerType));

        Assert.True(
            exception is null,
            $"ElBaul.Host.Lite must register an in-memory adapter for every port {controllerType.Name} " +
            $"depends on, the same way it does for the controllers that already resolve: {exception?.Message}");
    }
}
