import { SupabaseClient } from "supabase";
import { Photo } from "../../types.ts";
import { IPhotoRepository } from "../photo.repository.ts";

export class PhotoPostgresRepository implements IPhotoRepository {
  constructor(private supabase: SupabaseClient) {}

  async getById(id: string): Promise<Photo | null> {
    const { data, error } = await this.supabase
      .from("photos")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    return this.mapToPhoto(data);
  }

  async getByAlbumId(albumId: string): Promise<Photo[]> {
    const { data, error } = await this.supabase
      .from("photos")
      .select("*")
      .eq("album_id", albumId);

    if (error) throw error;
    return (data || []).map(this.mapToPhoto);
  }

  async getPreviewPhotos(baulId: string, limit: number): Promise<Photo[]> {
    const { data, error } = await this.supabase
      .from("photos")
      .select("*")
      .eq("baul_id", baulId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(this.mapToPhoto);
  }

  async create(photo: Photo): Promise<void> {
    const { error } = await this.supabase
      .from("photos")
      .insert({
        id: photo.id,
        album_id: photo.albumId,
        baul_id: photo.baulId,
        url: photo.url,
        caption: photo.caption,
        date: photo.date,
        uploaded_by: photo.uploadedBy,
        created_at: photo.createdAt,
      });

    if (error) throw error;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("photos")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  // deno-lint-ignore no-explicit-any
  private mapToPhoto(data: any): Photo {
    return {
      id: data.id,
      albumId: data.album_id,
      baulId: data.baul_id,
      url: data.url,
      caption: data.caption,
      date: data.date,
      uploadedBy: data.uploaded_by,
      createdAt: data.created_at,
    };
  }
}
