using ElBaul.Domain;
namespace ElBaul.Core.Recuerdos.OutputPorts;
public record RecuerdoEmbedding
(
    RecuerdoId RecuerdoId,
    BaulId BaulId,
    float[] Vector,
    string Model,
    DateTime CreatedAt
);
