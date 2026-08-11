using ElBaul.OutputPorts.Shared;
using ElBaul.Domain;
namespace ElBaul.OutputPorts.Recuerdos;
public record RecuerdoEmbedding
(
    RecuerdoId RecuerdoId,
    BaulId BaulId,
    float[] Vector,
    string Model,
    DateTime CreatedAt
);
