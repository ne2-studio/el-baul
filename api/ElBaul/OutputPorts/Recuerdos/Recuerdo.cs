using ElBaul.OutputPorts.Shared;
using ElBaul.Domain;
namespace ElBaul.OutputPorts.Recuerdos;
public record Recuerdo
(
    RecuerdoId Id,
    PhotoId? PhotoId,
    ChapterId? ChapterId,
    BaulId BaulId,
    UserId UserId,
    string Text,
    DateTime CreatedAt
);
