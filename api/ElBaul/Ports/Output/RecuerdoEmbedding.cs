namespace ElBaul.Ports.Output;

public record RecuerdoEmbedding
(
    RecuerdoId RecuerdoId,
    BaulId BaulId,
    float[] Vector,
    string Model,
    DateTime CreatedAt
);
