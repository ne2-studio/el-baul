using ElBaul.Infra.Lite;
using ElBaul.OutputPorts.Bauls;
using ElBaul.OutputPorts.Chapters;
using ElBaul.OutputPorts.Personas;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Recuerdos;
using ElBaul.ReadModelContractTests;

using ElBaul.Domain;
namespace ElBaul.Tests;

public class ListReadModelContractTests
{
    [Fact]
    public Task Photo_list_filters_orders_and_counts_recuerdos() =>
        ListReadModelContractScenarios.Photo_list_filters_orders_and_counts_recuerdos(new LiteStore());

    [Fact]
    public Task Photo_list_scoped_methods_match_active_rows() =>
        ListReadModelContractScenarios.Photo_list_scoped_methods_match_active_rows(new LiteStore());

    [Fact]
    public Task Photo_list_untagged_suggestion_excludes_tagged_confirmed_deleted_and_other_baul() =>
        ListReadModelContractScenarios.Photo_list_untagged_suggestion_excludes_tagged_confirmed_deleted_and_other_baul(new LiteStore());

    [Fact]
    public Task Chapter_list_aggregates_active_photos_recuerdos_latest_and_date_range() =>
        ListReadModelContractScenarios.Chapter_list_aggregates_active_photos_recuerdos_latest_and_date_range(new LiteStore());

    [Fact]
    public Task Recuerdo_list_orders_and_resolves_photo_key_and_chapter_name() =>
        ListReadModelContractScenarios.Recuerdo_list_orders_and_resolves_photo_key_and_chapter_name(new LiteStore());

    [Fact]
    public Task Photo_upload_batch_groups_active_photos_and_returns_chronological_batch_photos() =>
        ListReadModelContractScenarios.Photo_upload_batch_groups_active_photos_and_returns_chronological_batch_photos(new LiteStore());

    private sealed class LiteStore : IListReadModelContractStore
    {
        private readonly InMemoryBaulRepository _baules = new();
        private readonly InMemoryChapterRepository _chapters = new();
        private readonly InMemoryPhotoRepository _photos = new();
        private readonly InMemoryRecuerdoRepository _recuerdos = new();
        private readonly InMemoryPhotoPersonaTagRepository _photoPersonaTags = new();

        public LiteStore()
        {
            PhotoLists = new InMemoryPhotoListReadModel(_photos, _recuerdos, _photoPersonaTags);
            ChapterLists = new InMemoryChapterListReadModel(_chapters, _photos, _recuerdos);
            RecuerdoLists = new InMemoryRecuerdoListReadModel(_recuerdos, _photos, _chapters);
            PhotoUploadBatches = new InMemoryPhotoUploadBatchReadModel(_photos, _recuerdos, _chapters);
        }

        public IPhotoListReadModel PhotoLists { get; }
        public IChapterListReadModel ChapterLists { get; }
        public IRecuerdoListReadModel RecuerdoLists { get; }
        public IPhotoUploadBatchReadModel PhotoUploadBatches { get; }

        public Task AddBaulAsync(Baul baul) => _baules.CreateAsync(baul);
        public Task AddChapterAsync(Chapter chapter) => _chapters.CreateAsync(chapter);
        public Task AddPhotoAsync(Photo photo) => _photos.CreateAsync(photo);
        public Task AddRecuerdoAsync(Recuerdo recuerdo) => _recuerdos.CreateAsync(recuerdo);
        public Task AddPersonaAsync(Persona persona) => _baules.AddPersonaAsync(persona);

        public Task AddPhotoPersonaTagAsync(PhotoId photoId, PersonaId personaId, BaulId baulId, DateTime createdAt) =>
            _photoPersonaTags.SetTagsAsync(photoId, baulId, [personaId], createdAt);
    }
}
