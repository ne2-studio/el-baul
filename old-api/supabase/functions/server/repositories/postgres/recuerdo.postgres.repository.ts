import { SupabaseClient } from "supabase";
import { Recuerdo } from "../../types.ts";
import { IRecuerdoRepository } from "../recuerdo.repository.ts";

export class RecuerdoPostgresRepository implements IRecuerdoRepository {
  constructor(private supabase: SupabaseClient) {}

  async getByPhotoId(photoId: string): Promise<Recuerdo[]> {
    const { data, error } = await this.supabase
      .from("recuerdos")
      .select(`
        *,
        user:users (
          name
        )
      `)
      .eq("photo_id", photoId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data || []).map(this.mapToRecuerdo);
  }

  async create(recuerdo: Recuerdo): Promise<void> {
    const { error } = await this.supabase
      .from("recuerdos")
      .insert({
        id: recuerdo.id,
        photo_id: recuerdo.photoId,
        user_id: recuerdo.userId,
        text: recuerdo.text,
        created_at: recuerdo.createdAt,
      });

    if (error) throw error;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("recuerdos")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  // deno-lint-ignore no-explicit-any
  private mapToRecuerdo(data: any): Recuerdo {
    return {
      id: data.id,
      photoId: data.photo_id,
      userId: data.user_id,
      text: data.text,
      userName: data.user?.name || "Usuario desconocido",
      userAvatar: undefined, // No existe en BD actualmente
      createdAt: data.created_at,
    };
  }
}
