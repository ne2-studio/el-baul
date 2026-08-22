using ElBaul.Api.Models;
using ElBaul.Core.Personas;
using ElBaul.Core.Photos;
using ElBaul.Core.Recuerdos;
using Ne2Studio.Common;

using ElBaul.Domain;
namespace ElBaul.Api.Scope;

// See BaulScopeAggregator's doc comment for why this lives here instead of in ElBaul.Core.
public class PersonaScopeAggregator(IPersonaManager personaManager, IPhotoReadManager photoReadManager, IRecuerdoManager recuerdoManager)
{
    public async Task<Result<PersonaScopeDto>> GetScopeAsync(BaulId baulId, PersonaId personaId)
    {
        var personasTask = personaManager.GetPersonasAsync(baulId);
        var photosTask = photoReadManager.GetByPersonaIdAsync(baulId, personaId);
        var recuerdosTask = recuerdoManager.GetRecuerdosAsync(baulId);
        await Task.WhenAll(personasTask, photosTask, recuerdosTask);

        if (personasTask.Result.IsFailure) return Result.Failure<PersonaScopeDto>(personasTask.Result.Error);
        if (photosTask.Result.IsFailure) return Result.Failure<PersonaScopeDto>(photosTask.Result.Error);
        if (recuerdosTask.Result.IsFailure) return Result.Failure<PersonaScopeDto>(recuerdosTask.Result.Error);

        return Result.Success(new PersonaScopeDto(personasTask.Result.Value, photosTask.Result.Value, recuerdosTask.Result.Value));
    }
}
