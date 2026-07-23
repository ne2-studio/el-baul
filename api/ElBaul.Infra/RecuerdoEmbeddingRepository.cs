using ElBaul.Ports.Output;
using Microsoft.EntityFrameworkCore;

namespace ElBaul.Infra;

public class RecuerdoEmbeddingRepository(ElBaulDbContext dbContext) : IRecuerdoEmbeddingRepository
{
    public async Task<IEnumerable<RecuerdoEmbedding>> GetByBaulIdAsync(Guid baulId) =>
        await dbContext.RecuerdoEmbeddings.AsNoTracking()
            .Where(e => e.BaulId == baulId)
            .ToListAsync();

    public async Task<IEnumerable<RecuerdoEmbedding>> GetAllAsync() =>
        await dbContext.RecuerdoEmbeddings.AsNoTracking().ToListAsync();

    public async Task CreateManyAsync(IEnumerable<RecuerdoEmbedding> embeddings)
    {
        // Upsert, not a plain insert: a recuerdo re-embedded after an EmbeddingModel change
        // already has a row under the same RecuerdoId primary key — AddRange would throw a
        // duplicate-key violation on that row instead of replacing it.
        foreach (var embedding in embeddings)
        {
            var existing = await dbContext.RecuerdoEmbeddings.FindAsync(embedding.RecuerdoId);
            if (existing is not null)
                dbContext.Entry(existing).CurrentValues.SetValues(embedding);
            else
                dbContext.RecuerdoEmbeddings.Add(embedding);
        }

        await dbContext.SaveChangesAsync();
    }
}
