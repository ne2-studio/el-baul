using ElBaul.Core.Personas.Domain;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Domain;
using ElBaul.Core.Photos.Domain;
namespace ElBaul.Core.Personas.Application;
// A Persona's apodo/avatar for a baúl — always the display identity for recuerdo/chapter
// authorship, never the underlying account's OIDC-synced name (a nickname is what the
// family chose; the account name may be unset or unrelated). See docs/API-CONVENTIONS.md's
// "Display names" section.
public sealed record AuthorInfo(string Nickname, string? AvatarUrl, string? PersonaId);

// The single place that turns a (BaulId, UserId) into the AuthorInfo recuerdo/chapter/
// shared-link DTOs show as authorship — split out of BaulAccessService so authorization and
// author presentation stop sharing a class (see architecture-gap-scout initiative "Separar
// la identidad visible de autor en una proyección explícita").
//
// GetAsync is a point lookup for the single-author call sites (create/update one recuerdo,
// a chapter's latest author, a shared link's author) — same one-row-then-one-photo shape
// BaulAccessService.GetAuthorInfoAsync used to have. GetManyAsync is the batch-friendly
// counterpart for lists: one GetPersonasAsync for the whole baúl plus one batched avatar-photo
// lookup, instead of a lookup pair per recuerdo (the N+1 this class exists to remove).
public class AuthorInfoProjector(IPersonaRepository personaRepository, IPhotoRepository photoRepository, IPhotoStorage photoStorage)
{
    private static readonly AuthorInfo Fallback = new("Usuario", null, null);

    public async Task<AuthorInfo> GetAsync(BaulId baulId, UserId userId)
    {
        var persona = await personaRepository.GetPersonaByUserIdAsync(baulId, userId);
        if (persona is null) return Fallback;

        var avatarUrl = await PersonaAvatarUrlResolver.ResolveAsync(persona, photoRepository, photoStorage);
        return new AuthorInfo(persona.Nickname, avatarUrl, persona.Id.ToString());
    }

    public async Task<IReadOnlyDictionary<UserId, AuthorInfo>> GetManyAsync(BaulId baulId, IEnumerable<UserId> userIds)
    {
        var wanted = userIds.ToHashSet();
        var personas = (await personaRepository.GetPersonasAsync(baulId)).Where(p => p.UserId is not null && wanted.Contains(p.UserId.Value)).ToList();

        var avatarPhotoIds = personas.Where(p => p.AvatarPhotoId is not null).Select(p => p.AvatarPhotoId!.Value).Distinct().ToList();
        var photosById = avatarPhotoIds.Count == 0
            ? new Dictionary<PhotoId, Photo>()
            : (await photoRepository.GetByIdsAsync(avatarPhotoIds)).ToDictionary(p => p.Id);

        var result = new Dictionary<UserId, AuthorInfo>();
        foreach (var persona in personas)
        {
            var avatarPhoto = persona.AvatarPhotoId is { } photoId ? photosById.GetValueOrDefault(photoId) : null;
            var avatarUrl = await PersonaAvatarUrlResolver.ResolveAsync(persona, avatarPhoto, photoStorage);
            result[persona.UserId!.Value] = new AuthorInfo(persona.Nickname, avatarUrl, persona.Id.ToString());
        }

        return result;
    }

    // Looks up an already-batched author map, falling back to "Usuario" for a userId GetManyAsync
    // didn't resolve a Persona for — mirrors GetAsync's fallback so callers get the same
    // observable result regardless of which path they took to get there.
    public static AuthorInfo Resolve(IReadOnlyDictionary<UserId, AuthorInfo> authorsByUserId, UserId userId) =>
        authorsByUserId.GetValueOrDefault(userId, Fallback);
}
