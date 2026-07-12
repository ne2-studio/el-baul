import { SupabaseClient } from "supabase";
import { User } from "../../types.ts";
import { IUserRepository } from "../user.repository.ts";

export class UserPostgresRepository implements IUserRepository {
  constructor(private supabase: SupabaseClient) {}

  async getById(id: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }

    return this.mapToUser(data);
  }

  async getByEmail(email: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }

    return this.mapToUser(data);
  }

  async create(user: User): Promise<void> {
    const { error } = await this.supabase
      .from("users")
      .insert({
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.createdAt,
      });

    if (error) throw error;
  }

  // deno-lint-ignore no-explicit-any
  private mapToUser(data: any): User {
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      createdAt: data.created_at,
    };
  }
}
