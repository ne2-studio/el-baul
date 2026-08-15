using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Chapters.OutputPorts;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Recuerdos.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using System.Text;
using ElBaul.Domain;
namespace ElBaul.Core.Chat.Application;
// Own seam so RAG-ranking bugs and prompt-shaping bugs don't have to share ChatManager's
// file (or its 12 other constructor dependencies) — see ChatManager.SendMessageAsync.
public interface IChatContextBuilder
{
    Task<string> BuildAsync(Baul baul, UserId userId, string query);

    // No query to rank recuerdos against yet (used for starter-question suggestions, before the
    // user has asked anything) — just the baúl/personas/chapters header, recuerdos omitted.
    // No personal memories either, for the same reason: nothing to rank them against.
    Task<string> BuildSummaryAsync(Baul baul);
}

public class ChatContextBuilder(
    IPersonaRepository personaRepository,
    IChapterRepository chapterRepository,
    IRecuerdoRepository recuerdoRepository,
    IPhotoRepository photoRepository,
    IRelevantRecuerdoSelector relevantRecuerdoSelector,
    IRelevantChatMemorySelector relevantChatMemorySelector,
    IAppConfiguration appConfiguration) : IChatContextBuilder
{
    // Volcado en texto plano del contenido del baúl relevante para la pregunta. Baúl, personas
    // y capítulos entran siempre (listas pequeñas, acotadas por el tamaño de la familia); los
    // recuerdos se acotan a los más similares a la pregunta en RelevantRecuerdoSelector.
    public async Task<string> BuildAsync(Baul baul, UserId userId, string query)
    {
        var chapters = (await chapterRepository.GetByBaulIdAsync(baul.Id)).ToList();
        var chapterNames = chapters.ToDictionary(a => a.Id, a => a.Name);
        var personas = (await personaRepository.GetPersonasAsync(baul.Id)).ToList();
        var nicknamesByUserId = personas
            .Where(s => s.IsClaimed)
            .ToDictionary(s => s.UserId!.Value, s => s.Nickname);
        var recuerdos = (await recuerdoRepository.GetByBaulIdAsync(baul.Id)).ToList();
        var relevantRecuerdos = await relevantRecuerdoSelector.SelectAsync(baul.Id, recuerdos, query);

        // A recuerdo's CreatedAt is when it was *written*, not when the moment it describes
        // happened — using it as the recuerdo's date confused the model into treating write
        // order as chronology and inventing timelines. The photo/chapter it's attached to (if
        // any) is what actually anchors it in time; with neither, or neither dated, it has no
        // date at all rather than a fabricated one.
        // One query for every active photo in the baúl instead of one GetByChapterIdAsync per
        // chapter (plus a separate GetLooseByBaulIdAsync) — grouped by chapter afterward.
        var activePhotos = (await photoRepository.GetActiveByBaulIdAsync(baul.Id)).ToList();
        var photosByChapter = activePhotos
            .Where(p => p.ChapterId is not null)
            .GroupBy(p => p.ChapterId!.Value)
            .ToDictionary(g => g.Key, g => g.ToList());
        var loosePhotos = activePhotos.Where(p => p.ChapterId is null).ToList();
        var photoById = activePhotos.ToDictionary(p => p.Id);
        var chapterDates = photosByChapter.ToDictionary(kv => kv.Key, kv => EarliestDate(kv.Value));

        var sb = new StringBuilder();

        // Kept in its own section, ranked and fetched independently from recuerdos below (see
        // RelevantChatMemorySelector) — a personal memory must never compete for a ranking slot
        // against baúl content, and must never appear here at all while the feature is off.
        if (appConfiguration.ChatMemoryEnabled)
        {
            var memories = await relevantChatMemorySelector.SelectAsync(baul.Id, userId, query);
            if (memories.Count > 0)
            {
                // Deliberately not called "recuerdos" here — that word is reserved for baúl
                // content (Recuerdo entries, formatted below) and reusing it for this section
                // would blur a distinction the model needs to keep straight.
                sb.AppendLine("Información personal aprendida en conversaciones anteriores con este usuario (uso interno, no es contenido del baúl):");
                foreach (var memory in memories)
                    sb.AppendLine($"- {memory.Content}");
                sb.AppendLine();
            }
        }

        AppendHeader(sb, baul, personas, chapters, photosByChapter);

        sb.AppendLine();
        if (relevantRecuerdos.Count < recuerdos.Count)
        {
            // Told explicitly, so the model doesn't confuse "not shown to me" with "doesn't
            // exist" and hallucinate a confident "no tenemos esa información".
            sb.AppendLine(
                $"Recuerdos más relevantes para esta pregunta ({relevantRecuerdos.Count} de {recuerdos.Count} " +
                "recuerdos en total en el baúl — puede haber más recuerdos no mostrados aquí por no ser tan " +
                "relevantes para esta pregunta en concreto):");
        }
        else
        {
            sb.AppendLine("Recuerdos (ordenados del más antiguo al más reciente):");
        }

        var ordered = relevantRecuerdos
            .Select(r => (Recuerdo: r, Date: EffectiveDate(r, photoById, chapterDates)))
            .OrderByDescending(x => x.Date is not null)
            .ThenBy(x => x.Date?.Year ?? 0)
            .ThenBy(x => x.Date?.Month ?? 1)
            .ThenBy(x => x.Date?.Day ?? 1)
            .ThenBy(x => x.Recuerdo.CreatedAt);

        foreach (var (recuerdo, date) in ordered)
        {
            var author = nicknamesByUserId.GetValueOrDefault(recuerdo.UserId, "Usuario");
            var chapterName = recuerdo.ChapterId is { } chapterId ? chapterNames.GetValueOrDefault(chapterId) : null;
            var location = chapterName is not null ? $", capítulo: {chapterName}" : "";
            var dateTag = date is not null ? $"[{FormatDate(date)}] " : "";
            sb.AppendLine($"- {dateTag}{author}: \"{recuerdo.Text}\"{location}");
        }

        return sb.ToString();
    }

    public async Task<string> BuildSummaryAsync(Baul baul)
    {
        var chapters = (await chapterRepository.GetByBaulIdAsync(baul.Id)).ToList();
        var personas = (await personaRepository.GetPersonasAsync(baul.Id)).ToList();
        var photosByChapter = (await photoRepository.GetActiveByBaulIdAsync(baul.Id))
            .Where(p => p.ChapterId is not null)
            .GroupBy(p => p.ChapterId!.Value)
            .ToDictionary(g => g.Key, g => g.ToList());

        var sb = new StringBuilder();
        AppendHeader(sb, baul, personas, chapters, photosByChapter);
        return sb.ToString();
    }

    private static void AppendHeader(
        StringBuilder sb, Baul baul, List<Persona> personas, List<Chapter> chapters,
        IReadOnlyDictionary<ChapterId, List<Photo>> photosByChapter)
    {
        sb.AppendLine($"Nombre del baúl: {baul.Name}");
        if (!string.IsNullOrWhiteSpace(baul.Description))
            sb.AppendLine($"Descripción del baúl: {baul.Description}");

        sb.AppendLine();
        sb.AppendLine("Personas de la familia en este baúl:");
        foreach (var persona in personas)
        {
            sb.AppendLine($"- {persona.Nickname}" + (persona.Name is { Length: > 0 } ? $" ({persona.Name})" : ""));
            if (persona.Biografia is { Length: > 0 })
                sb.AppendLine($"  Biografía: {persona.Biografia}");
        }

        sb.AppendLine();
        sb.AppendLine("Capítulos:");
        foreach (var chapter in chapters)
        {
            var photos = photosByChapter.GetValueOrDefault(chapter.Id, []);
            var dateRange = FormatDateRange(EarliestDate(photos), LatestDate(photos));
            var dateSuffix = dateRange is not null ? $", {dateRange}" : "";
            sb.AppendLine($"- {chapter.Name} ({chapter.PhotoCount} fotos{dateSuffix})");
        }
    }

    // The recuerdo's own photo wins when it has a date; failing that, the chapter it (or its
    // photo) belongs to — via its earliest dated photo — is the next best anchor. No fallback
    // to CreatedAt: an unresolvable date must render as no date, not a fabricated one.
    private static PhotoDate? EffectiveDate(
        Recuerdo recuerdo, IReadOnlyDictionary<PhotoId, Photo> photoById, IReadOnlyDictionary<ChapterId, PhotoDate?> chapterDates)
    {
        if (recuerdo.PhotoId is { } photoId && photoById.TryGetValue(photoId, out var photo) && photo.Date is { } photoDate)
            return photoDate;
        if (recuerdo.ChapterId is { } chapterId && chapterDates.TryGetValue(chapterId, out var chapterDate))
            return chapterDate;
        return null;
    }

    private static PhotoDate? EarliestDate(IReadOnlyCollection<Photo> photos) =>
        photos
            .Where(p => p.Date is not null)
            .OrderBy(p => p.Date!.Year).ThenBy(p => p.Date!.Month ?? 1).ThenBy(p => p.Date!.Day ?? 1)
            .Select(p => p.Date)
            .FirstOrDefault();

    private static PhotoDate? LatestDate(IReadOnlyCollection<Photo> photos) =>
        photos
            .Where(p => p.Date is not null)
            .OrderByDescending(p => p.Date!.Year).ThenByDescending(p => p.Date!.Month ?? 1).ThenByDescending(p => p.Date!.Day ?? 1)
            .Select(p => p.Date)
            .FirstOrDefault();

    // A chapter's own date is never stored (see the CreatedAt/UpdatedAt note above) — it's shown
    // as a span across its photos' dates so the model knows roughly when it happened, collapsing
    // to a single date when every dated photo agrees.
    private static string? FormatDateRange(PhotoDate? earliest, PhotoDate? latest) =>
        earliest switch
        {
            null => null,
            _ when latest is null || latest == earliest => FormatDate(earliest),
            _ => $"{FormatDate(earliest)} a {FormatDate(latest)}"
        };

    private static string FormatDate(PhotoDate date) => (date.Month, date.Day) switch
    {
        ({ } month, { } day) => $"{date.Year:D4}-{month:D2}-{day:D2}",
        ({ } month, null) => $"{date.Year:D4}-{month:D2}",
        _ => $"{date.Year:D4}"
    };
}
