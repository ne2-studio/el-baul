using ElBaul.Ports.Output;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace ElBaul.Infra.EntityConfigurations;

// One converter per strongly-typed id, reused across every EntityTypeConfiguration that has an
// Id or foreign-key column of that type. EF Core auto-wraps these for nullable FK properties
// (e.g. Photo.ChapterId is ChapterId?), so a single non-nullable converter per type is enough.
internal static class IdValueConverters
{
    public static readonly ValueConverter<BaulId, Guid> BaulId = new(id => id.Value, v => new BaulId(v));
    public static readonly ValueConverter<ChapterId, Guid> ChapterId = new(id => id.Value, v => new ChapterId(v));
    public static readonly ValueConverter<PhotoId, Guid> PhotoId = new(id => id.Value, v => new PhotoId(v));
    public static readonly ValueConverter<PersonaId, Guid> PersonaId = new(id => id.Value, v => new PersonaId(v));
    public static readonly ValueConverter<RecuerdoId, Guid> RecuerdoId = new(id => id.Value, v => new RecuerdoId(v));
    public static readonly ValueConverter<RemovalRequestId, Guid> RemovalRequestId = new(id => id.Value, v => new RemovalRequestId(v));
}
