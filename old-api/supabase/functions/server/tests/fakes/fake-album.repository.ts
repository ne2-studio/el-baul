import { IAlbumRepository } from "../../repositories/album.repository.ts";
import { Album } from "../../types.ts";

export class FakeAlbumRepository implements IAlbumRepository {
  private albums: Map<string, Album> = new Map();

  getById(id: string): Promise<Album | null> {
    return Promise.resolve(this.albums.get(id) || null);
  }

  getByBaulId(baulId: string): Promise<Album[]> {
    return Promise.resolve(Array.from(this.albums.values()).filter((a) => a.baulId === baulId));
  }

  create(album: Album): Promise<void> {
    this.albums.set(album.id, album);
    return Promise.resolve();
  }

  update(album: Album): Promise<void> {
    this.albums.set(album.id, album);
    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    this.albums.delete(id);
    return Promise.resolve();
  }
}
