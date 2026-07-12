import { Album } from "../types.ts";

export interface IAlbumRepository {
  getById(id: string): Promise<Album | null>;
  getByBaulId(baulId: string): Promise<Album[]>;
  create(album: Album): Promise<void>;
  update(album: Album): Promise<void>;
  delete(id: string): Promise<void>;
}
