import { SupabaseClient } from "supabase";
import { Album } from "../../types.ts";
import { IAlbumRepository } from "../album.repository.ts";

export class AlbumPostgresRepository implements IAlbumRepository {
  constructor(private supabase: SupabaseClient) {}

  async getById(id: string): Promise<Album | null> {
    const { data, error } = await this.supabase
      .from("albums")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    return this.mapToAlbum(data);
  }

  async getByBaulId(baulId: string): Promise<Album[]> {
    const { data, error } = await this.supabase
      .from("albums")
      .select("*")
      .eq("baul_id", baulId);

    if (error) throw error;
    return (data || []).map(this.mapToAlbum);
  }

  async create(album: Album): Promise<void> {
    const { error } = await this.supabase
      .from("albums")
      .insert({
        id: album.id,
        baul_id: album.baulId,
        name: album.name,
        description: album.description,
        photo_count: album.photoCount,
        cover_photo_url: album.coverPhotoUrl,
        created_at: album.createdAt,
        updated_at: album.updatedAt,
      });

    if (error) throw error;
  }

  async update(album: Album): Promise<void> {
    const { error } = await this.supabase
      .from("albums")
      .update({
        name: album.name,
        description: album.description,
        photo_count: album.photoCount,
        cover_photo_url: album.coverPhotoUrl,
        updated_at: album.updatedAt,
      })
      .eq("id", album.id);

    if (error) throw error;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("albums")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  // deno-lint-ignore no-explicit-any
  private mapToAlbum(data: any): Album {
    return {
      id: data.id,
      baulId: data.baul_id,
      name: data.name,
      description: data.description,
      photoCount: data.photo_count,
      coverPhotoUrl: data.cover_photo_url,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
