using ElBaul.Core.Bauls.OutputPorts;
namespace ElBaul.Core.Admin.OutputPorts;
/// <summary>A row in the backoffice Baúles list.</summary>
public record AdminBaulRow(Baul Baul, string CustodioName, int MemberCount, int LinkedUserCount, int PhotoCount, int ChapterCount);
