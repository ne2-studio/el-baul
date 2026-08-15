using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Chapters.OutputPorts;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Recuerdos.OutputPorts;
using ElBaul.Core.Users.OutputPorts;
using ElBaul.Domain;
using ElBaul.Infra.Persistence;
using ElBaul.ReadModelContractTests;
namespace ElBaul.Infra.PersistenceTests;

[Collection(PersistenceTestCollection.Name)]
public class ListReadModelContractTests(PostgresFixture fixture) : PersistenceTestBase(fixture)
{
    [Fact]
    public async Task Photo_list_filters_orders_and_counts_recuerdos()
    {
        await using var dbContext = Fixture.CreateDbContext();
        await ListReadModelContractScenarios.Photo_list_filters_orders_and_counts_recuerdos(new EfStore(dbContext));
    }

    [Fact]
    public async Task Photo_list_scoped_methods_match_active_rows()
    {
        await using var dbContext = Fixture.CreateDbContext();
        await ListReadModelContractScenarios.Photo_list_scoped_methods_match_active_rows(new EfStore(dbContext));
    }

    [Fact]
    public async Task Photo_list_untagged_suggestion_excludes_tagged_confirmed_deleted_and_other_baul()
    {
        await using var dbContext = Fixture.CreateDbContext();
        await ListReadModelContractScenarios.Photo_list_untagged_suggestion_excludes_tagged_confirmed_deleted_and_other_baul(new EfStore(dbContext));
    }

    [Fact]
    public async Task Photo_list_memory_suggestion_excludes_photos_with_a_recuerdo_deleted_and_other_baul()
    {
        await using var dbContext = Fixture.CreateDbContext();
        await ListReadModelContractScenarios.Photo_list_memory_suggestion_excludes_photos_with_a_recuerdo_deleted_and_other_baul(new EfStore(dbContext));
    }

    [Fact]
    public async Task Chapter_list_aggregates_active_photos_recuerdos_latest_and_date_range()
    {
        await using var dbContext = Fixture.CreateDbContext();
        await ListReadModelContractScenarios.Chapter_list_aggregates_active_photos_recuerdos_latest_and_date_range(new EfStore(dbContext));
    }

    [Fact]
    public async Task Recuerdo_list_orders_and_resolves_photo_key_and_chapter_name()
    {
        await using var dbContext = Fixture.CreateDbContext();
        await ListReadModelContractScenarios.Recuerdo_list_orders_and_resolves_photo_key_and_chapter_name(new EfStore(dbContext));
    }

    [Fact]
    public async Task Photo_upload_batch_groups_active_photos_and_returns_chronological_batch_photos()
    {
        await using var dbContext = Fixture.CreateDbContext();
        await ListReadModelContractScenarios.Photo_upload_batch_groups_active_photos_and_returns_chronological_batch_photos(new EfStore(dbContext));
    }

    private sealed class EfStore : IListReadModelContractStore
    {
        private readonly ElBaulDbContext _dbContext;
        private readonly UserRepository _users;
        private readonly BaulRepository _baules;
        private readonly ChapterRepository _chapters;
        private readonly PhotoRepository _photos;
        private readonly RecuerdoRepository _recuerdos;
        private readonly PhotoPersonaTagRepository _photoPersonaTags;

        public EfStore(ElBaulDbContext dbContext)
        {
            _dbContext = dbContext;
            _users = new UserRepository(dbContext);
            _baules = new BaulRepository(dbContext);
            _chapters = new ChapterRepository(dbContext);
            _photos = new PhotoRepository(dbContext);
            _recuerdos = new RecuerdoRepository(dbContext);
            _photoPersonaTags = new PhotoPersonaTagRepository(dbContext);

            PhotoLists = new PhotoListReadModel(dbContext);
            ChapterLists = new ChapterListReadModel(dbContext);
            RecuerdoLists = new RecuerdoListReadModel(dbContext);
            PhotoUploadBatches = new PhotoUploadBatchReadModel(dbContext);
        }

        public IPhotoListReadModel PhotoLists { get; }
        public IChapterListReadModel ChapterLists { get; }
        public IRecuerdoListReadModel RecuerdoLists { get; }
        public IPhotoUploadBatchReadModel PhotoUploadBatches { get; }

        public async Task AddBaulAsync(Baul baul)
        {
            await _users.UpsertAsync(new User(baul.CustodioId, $"{baul.CustodioId.Value}@example.com", baul.CustodioId.Value, baul.CreatedAt));
            await _baules.CreateAsync(baul);
        }
        public Task AddChapterAsync(Chapter chapter) => _chapters.CreateAsync(chapter);
        public Task AddPhotoAsync(Photo photo) => _photos.CreateAsync(photo);
        public Task AddRecuerdoAsync(Recuerdo recuerdo) => _recuerdos.CreateAsync(recuerdo);
        public Task AddPersonaAsync(Persona persona) => _baules.AddPersonaAsync(persona);

        public async Task AddPhotoPersonaTagAsync(PhotoId photoId, PersonaId personaId, BaulId baulId, DateTime createdAt)
        {
            _dbContext.ChangeTracker.Clear();
            await _photoPersonaTags.SetTagsAsync(photoId, baulId, [personaId], createdAt);
        }
    }
}
