using ElBaul.Ports.Input;
using ElBaul.Ports.Output;

namespace ElBaul.Application;

public interface IPersonaDtoProjector
{
    Task<PersonaDto> ProjectAsync(Persona persona, User? user, bool canEdit);
}
