using ElBaul.Api.Controllers;
using ElBaul.Domain;
using ElBaul.Core.Personas.InputPorts;
using ElBaul.Core.Sharing.InputPorts;
using Microsoft.AspNetCore.Mvc;
using Ne2Studio.Common;

namespace ElBaul.Api.Tests;

public class BaulInviteLinksControllerTests
{
    [Fact]
    public async Task Landing_ShouldRenderCoverAsOpenGraphImage()
    {
        var controller = new BaulInviteLinksController(new LandingInviteManager());

        var result = await controller.Landing("invite-token");

        var content = Assert.IsType<ContentResult>(result);
        Assert.Contains("""<meta property="og:image" content="https://imgproxy.test/BaulCover/cover-key" />""", content.Content);
        Assert.Contains("""<meta name="twitter:image" content="https://imgproxy.test/BaulCover/cover-key" />""", content.Content);
        Assert.Contains("""window.location.replace("https://app.el-baul.test/invitacion/baul/invite-token");""", content.Content);
    }

    private sealed class LandingInviteManager : IBaulInviteLinkManager
    {
        public Task<Result<BaulInviteLinkDto>> GetOrCreateAsync(BaulId baulId) =>
            throw new NotImplementedException();

        public Task<Result<BaulInviteLinkDto>> RegenerateAsync(BaulId baulId) =>
            throw new NotImplementedException();

        public Task<Result<BaulInviteLinkLandingDto>> GetLandingAsync(string token) =>
            Task.FromResult(Result.Success(new BaulInviteLinkLandingDto(
                "Invitación a Familia Pérez",
                "Te han invitado a unirte.",
                "https://imgproxy.test/BaulCover/cover-key",
                "https://app.el-baul.test/invitacion/baul/invite-token",
                "Familia Pérez")));

        public Task<Result<BaulInviteLinkPreviewDto>> GetPreviewAsync(string token) =>
            throw new NotImplementedException();

        public Task<Result<IEnumerable<ClaimablePersonaDto>>> GetClaimablePersonasAsync(string token) =>
            throw new NotImplementedException();

        public Task<Result<PersonaDto>> AcceptAsync(string token, PersonaId? personaId = null) =>
            throw new NotImplementedException();
    }
}
