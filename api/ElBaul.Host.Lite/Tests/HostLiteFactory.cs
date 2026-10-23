using Microsoft.AspNetCore.Mvc.Testing;

namespace ElBaul.Host.Lite.Tests;

/// <summary>
/// Boots ElBaul.Host.Lite's real Program.cs in-process. No Postgres, no Docker and no live
/// fake-oidc: the defaults in the host's appsettings.json only need to satisfy startup, since
/// these tests never send a request through the JWT pipeline (see ControllerWiringTests, which
/// resolves controllers straight from the built container).
/// </summary>
public sealed class HostLiteFactory : WebApplicationFactory<Program>;
