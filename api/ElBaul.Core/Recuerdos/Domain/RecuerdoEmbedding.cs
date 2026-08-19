using ElBaul.Domain;
namespace ElBaul.Core.Recuerdos.Domain;
public record RecuerdoEmbedding
(
    RecuerdoId RecuerdoId,
    BaulId BaulId,
    float[] Vector,
    string Model,
    DateTime CreatedAt
);
