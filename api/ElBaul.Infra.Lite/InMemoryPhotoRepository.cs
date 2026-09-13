using ElBaul.Core.Photos.Domain;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Domain;
namespace ElBaul.Infra.Lite;

// See InMemoryUserRepository.cs for why every method here locks and materializes query
// results before returning.
public class InMemoryPhotoRepository : IPhotoRepository
{
    private readonly Dictionary<PhotoId, Photo> _photos = new();
    private readonly Dictionary<PhotoAssetId, PhotoAsset> _assets = new();
    private readonly Dictionary<(UserId UserId, PhotoAssetId PhotoAssetId), (DateTime AddedAt, DateTime? DeletedAt)> _userPhotoAssets = new();
    private readonly Lock _lock = new();

    public Task<Photo?> GetByIdAsync(PhotoId id)
    {
        lock (_lock) return Task.FromResult(_photos.GetValueOrDefault(id));
    }

    public Task<IEnumerable<Photo>> GetByIdsAsync(IEnumerable<PhotoId> ids)
    {
        lock (_lock)
        {
            var idSet = ids.ToHashSet();
            return Task.FromResult(_photos.Values.Where(p => idSet.Contains(p.Id)).ToList().AsEnumerable());
        }
    }

    public Task<Photo?> GetByClientUploadIdAsync(Guid clientUploadId)
    {
        lock (_lock) return Task.FromResult(_photos.Values.FirstOrDefault(p => p.ClientUploadId == clientUploadId));
    }

    public Task<IEnumerable<Photo>> GetByChapterIdAsync(ChapterId chapterId)
    {
        lock (_lock) return Task.FromResult(_photos.Values.Where(p => p.ChapterId == chapterId && p.Status == PhotoStatus.Active).ToList().AsEnumerable());
    }

    public Task<IEnumerable<Photo>> GetAllByChapterIdAsync(ChapterId chapterId)
    {
        lock (_lock) return Task.FromResult(_photos.Values.Where(p => p.ChapterId == chapterId).ToList().AsEnumerable());
    }

    public Task<IEnumerable<Photo>> GetLooseByBaulIdAsync(BaulId baulId)
    {
        lock (_lock) return Task.FromResult(_photos.Values.Where(p => p.BaulId == baulId && p.ChapterId == null && p.Status == PhotoStatus.Active).ToList().AsEnumerable());
    }

    public Task<IEnumerable<Photo>> GetActiveByBaulIdAsync(BaulId baulId)
    {
        lock (_lock) return Task.FromResult(_photos.Values.Where(p => p.BaulId == baulId && p.Status == PhotoStatus.Active).ToList().AsEnumerable());
    }

    public Task<IEnumerable<Photo>> GetCreatedSinceByBaulIdAsync(BaulId baulId, DateTime since, UserId excludingUserId)
    {
        lock (_lock)
            return Task.FromResult(_photos.Values
                .Where(p => p.BaulId == baulId && p.Status == PhotoStatus.Active && p.CreatedAt >= since
                    && p.UploadedBy != excludingUserId)
                .ToList().AsEnumerable());
    }

    public Task<IEnumerable<Photo>> GetPreviewPhotosAsync(BaulId baulId, int limit)
    {
        lock (_lock) return Task.FromResult(_photos.Values.Where(p => p.BaulId == baulId && p.Status == PhotoStatus.Active).OrderByDescending(p => p.CreatedAt).Take(limit).ToList().AsEnumerable());
    }

    public Task<IEnumerable<Photo>> GetPageAsync(BaulId baulId, ChapterId? chapterId, int skip, int take)
    {
        lock (_lock)
        {
            var page = _photos.Values
                .Where(p => p.BaulId == baulId && p.Status == PhotoStatus.Active && (chapterId == null || p.ChapterId == chapterId))
                .OrderByChronology()
                .Skip(skip)
                .Take(take)
                .ToList();
            return Task.FromResult(page.AsEnumerable());
        }
    }

    public Task<IEnumerable<Photo>> GetActiveWithContentHashAsync()
    {
        lock (_lock)
            return Task.FromResult(_photos.Values
                .Where(p => p.Status == PhotoStatus.Active && p.OriginalContentHash != null)
                .ToList().AsEnumerable());
    }

    public Task<Photo?> GetActiveByAssetIdAsync(BaulId baulId, PhotoAssetId assetId)
    {
        lock (_lock)
            return Task.FromResult(_photos.Values.FirstOrDefault(p =>
                p.BaulId == baulId && p.PhotoAssetId == assetId && p.Status == PhotoStatus.Active));
    }

    public Task CreateAsync(Photo photo)
    {
        lock (_lock) { _photos[photo.Id] = photo; _assets[photo.PhotoAssetId] = photo.PhotoAsset; }
        return Task.CompletedTask;
    }

    // Mirrors the real PhotoRepository's ON CONFLICT DO NOTHING semantics without a real unique
    // index to enforce it — see IX_Photos_BaulId_PhotoAssetId_Active.
    public Task<bool> TryAddExistingAssetAsync(Photo photo)
    {
        lock (_lock)
        {
            if (_photos.Values.Any(p =>
                    p.BaulId == photo.BaulId && p.PhotoAssetId == photo.PhotoAssetId && p.Status == PhotoStatus.Active))
            {
                return Task.FromResult(false);
            }

            _photos[photo.Id] = photo;
            _assets[photo.PhotoAssetId] = photo.PhotoAsset;
            return Task.FromResult(true);
        }
    }

    public Task UpdateAsync(Photo photo)
    {
        lock (_lock) _photos[photo.Id] = photo;
        return Task.CompletedTask;
    }

    public Task<IEnumerable<Photo>> GetAllByBaulIdAsync(BaulId baulId)
    {
        lock (_lock) return Task.FromResult(_photos.Values.Where(p => p.BaulId == baulId).ToList().AsEnumerable());
    }

    public Task DeleteAsync(PhotoId id)
    {
        lock (_lock) _photos.Remove(id);
        return Task.CompletedTask;
    }

    public Task DeleteByBaulIdAsync(BaulId baulId)
    {
        lock (_lock)
        {
            var ids = _photos.Values.Where(p => p.BaulId == baulId).Select(p => p.Id).ToList();
            foreach (var id in ids) _photos.Remove(id);
        }
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<PhotoAsset>> GetByContributorAsync(UserId userId)
    {
        lock (_lock)
            return Task.FromResult<IReadOnlyList<PhotoAsset>>(_userPhotoAssets
                .Where(kv => kv.Key.UserId == userId && kv.Value.DeletedAt == null)
                .Select(kv => _assets[kv.Key.PhotoAssetId])
                .ToList());
    }

    public Task<IReadOnlyList<Photo>> GetActiveByAssetIdsAsync(IEnumerable<PhotoAssetId> assetIds)
    {
        lock (_lock)
        {
            var idSet = assetIds.ToHashSet();
            return Task.FromResult<IReadOnlyList<Photo>>(_photos.Values
                .Where(p => idSet.Contains(p.PhotoAssetId) && p.Status == PhotoStatus.Active)
                .ToList());
        }
    }

    public Task<PhotoAsset?> GetAssetByIdAsync(PhotoAssetId id)
    {
        lock (_lock)
            return Task.FromResult(_assets.GetValueOrDefault(id));
    }

    public Task<PhotoAsset?> GetAssetByContentHashAsync(string originalContentHash)
    {
        lock (_lock)
            return Task.FromResult(_assets.Values.FirstOrDefault(a => a.OriginalContentHash == originalContentHash));
    }

    // Mirrors the real PhotoRepository's ON CONFLICT DO NOTHING semantics without a real unique
    // index to enforce it — see IX_PhotoAssets_OriginalContentHash.
    public Task<bool> TryCreateAssetAsync(PhotoAsset asset)
    {
        lock (_lock)
        {
            if (asset.OriginalContentHash is { } hash && _assets.Values.Any(a => a.OriginalContentHash == hash))
            {
                return Task.FromResult(false);
            }

            _assets[asset.Id] = asset;
            return Task.FromResult(true);
        }
    }

    public Task<bool> HasUserPhotoAssetAsync(UserId userId, PhotoAssetId assetId)
    {
        lock (_lock)
            return Task.FromResult(
                _userPhotoAssets.TryGetValue((userId, assetId), out var relation) && relation.DeletedAt == null);
    }

    // Mirrors the real PhotoRepository's ON CONFLICT DO UPDATE ... WHERE semantics without a
    // real unique index to enforce it — see IX_UserPhotoAssets_UserId_PhotoAssetId.
    public Task<bool> EnsureUserPhotoAssetActiveAsync(UserId userId, PhotoAssetId assetId, DateTime addedAt)
    {
        lock (_lock)
        {
            var key = (userId, assetId);
            if (_userPhotoAssets.TryGetValue(key, out var existing))
            {
                if (existing.DeletedAt is null) return Task.FromResult(false); // already active — no-op
                _userPhotoAssets[key] = (existing.AddedAt, null); // reactivate, AddedAt untouched
                return Task.FromResult(true);
            }

            _userPhotoAssets[key] = (addedAt, null);
            return Task.FromResult(true);
        }
    }

    public Task SoftDeleteUserPhotoAssetAsync(UserId userId, PhotoAssetId assetId, DateTime deletedAt)
    {
        lock (_lock)
        {
            var key = (userId, assetId);
            if (_userPhotoAssets.TryGetValue(key, out var existing) && existing.DeletedAt is null)
                _userPhotoAssets[key] = (existing.AddedAt, deletedAt);
        }
        return Task.CompletedTask;
    }

    public Task SoftDeleteUserPhotoAssetsAsync(UserId userId, IEnumerable<PhotoAssetId> assetIds, DateTime deletedAt)
    {
        lock (_lock)
        {
            foreach (var assetId in assetIds)
            {
                var key = (userId, assetId);
                if (_userPhotoAssets.TryGetValue(key, out var existing) && existing.DeletedAt is null)
                    _userPhotoAssets[key] = (existing.AddedAt, deletedAt);
            }
        }
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<PhotoAsset>> GetOrphanedAssetsAsync(DateTime olderThan)
    {
        lock (_lock)
        {
            var referencedAssetIds = _photos.Values.Select(p => p.PhotoAssetId)
                .Concat(_userPhotoAssets.Keys.Select(r => r.PhotoAssetId))
                .ToHashSet();
            IReadOnlyList<PhotoAsset> orphaned = _assets.Values
                .Where(a => a.CreatedAt < olderThan && !referencedAssetIds.Contains(a.Id))
                .ToList();
            return Task.FromResult(orphaned);
        }
    }

    public Task DeleteAssetAsync(PhotoAssetId id)
    {
        lock (_lock)
        {
            _assets.Remove(id);
            return Task.CompletedTask;
        }
    }

    public Task<IReadOnlyList<PhotoAsset>> GetAllAssetsAsync()
    {
        lock (_lock) return Task.FromResult<IReadOnlyList<PhotoAsset>>(_assets.Values.ToList());
    }

    public Task<IReadOnlyList<Photo>> GetAllByAssetIdsAsync(IEnumerable<PhotoAssetId> assetIds)
    {
        lock (_lock)
        {
            var idSet = assetIds.ToHashSet();
            return Task.FromResult<IReadOnlyList<Photo>>(_photos.Values.Where(p => idSet.Contains(p.PhotoAssetId)).ToList());
        }
    }

    public Task<IReadOnlyList<UserPhotoAsset>> GetUserPhotoAssetsByAssetIdsAsync(IEnumerable<PhotoAssetId> assetIds)
    {
        lock (_lock)
        {
            var idSet = assetIds.ToHashSet();
            return Task.FromResult<IReadOnlyList<UserPhotoAsset>>(_userPhotoAssets
                .Where(kv => idSet.Contains(kv.Key.PhotoAssetId))
                .Select(kv => new UserPhotoAsset(kv.Key.UserId, kv.Key.PhotoAssetId, kv.Value.AddedAt, kv.Value.DeletedAt))
                .ToList());
        }
    }

    public Task RepointPhotoAssetIdAsync(IEnumerable<PhotoId> photoIds, PhotoAssetId newAssetId, string? newOriginalContentHash)
    {
        lock (_lock)
        {
            foreach (var photoId in photoIds)
            {
                if (!_photos.TryGetValue(photoId, out var photo)) continue;
                var newAsset = _assets[newAssetId];
                var repointed = new Photo(
                    photo.Id, photo.ChapterId, photo.BaulId, newAsset, photo.TakenAt, photo.UploadedBy,
                    photo.CreatedAt, photo.ClientUploadId, photo.Status, photo.DeletedAt, photo.DeletionReason,
                    photo.UploadBatchId, photo.ConfirmedNoPersonas);
                _photos[photoId] = repointed.WithOriginalContentHash(newOriginalContentHash);
            }
        }
        return Task.CompletedTask;
    }

    // Mirrors the real PhotoRepository's ON CONFLICT DO UPDATE semantics — see
    // RedirectUserPhotoAssetAsync's own doc comment on IPhotoRepository.
    public Task RedirectUserPhotoAssetAsync(UserId userId, PhotoAssetId newAssetId, DateTime addedAt)
    {
        lock (_lock)
        {
            var key = (userId, newAssetId);
            _userPhotoAssets[key] = _userPhotoAssets.TryGetValue(key, out var existing)
                ? (existing.AddedAt < addedAt ? existing.AddedAt : addedAt, existing.DeletedAt)
                : (addedAt, null);
        }
        return Task.CompletedTask;
    }

    public Task DeleteUserPhotoAssetAsync(UserId userId, PhotoAssetId assetId)
    {
        lock (_lock) _userPhotoAssets.Remove((userId, assetId));
        return Task.CompletedTask;
    }

    public Task SetAssetContentHashAsync(PhotoAssetId id, string originalContentHash)
    {
        lock (_lock)
        {
            if (_assets.TryGetValue(id, out var asset))
                _assets[id] = asset.WithOriginalContentHash(originalContentHash);
        }
        return Task.CompletedTask;
    }
}
