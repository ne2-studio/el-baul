using ElBaul.OutputPorts.Bauls;
namespace ElBaul.OutputPorts.Admin;
/// <summary>A row in the backoffice Baúles list.</summary>
public record AdminBaulRow(Baul Baul, string CustodioName, int MemberCount, int LinkedUserCount, int PhotoCount, int ChapterCount);
