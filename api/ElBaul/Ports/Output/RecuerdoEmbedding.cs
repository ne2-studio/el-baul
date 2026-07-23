namespace ElBaul.Ports.Output;

public record RecuerdoEmbedding
(
    Guid RecuerdoId,
    Guid BaulId,
    float[] Vector,
    string Model,
    DateTime CreatedAt
);
