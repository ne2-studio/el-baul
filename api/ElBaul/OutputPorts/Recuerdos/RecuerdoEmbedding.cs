using ElBaul.Shared;
namespace ElBaul.OutputPorts.Recuerdos;
public record RecuerdoEmbedding
(
    RecuerdoId RecuerdoId,
    BaulId BaulId,
    float[] Vector,
    string Model,
    DateTime CreatedAt
);
