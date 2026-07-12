import { SupabaseClient } from "supabase";
import { AccessRequest, Baul, RemovalRequest, SharedUser } from "../../types.ts";
import { IBaulRepository } from "../baul.repository.ts";

export class BaulPostgresRepository implements IBaulRepository {
  constructor(private supabase: SupabaseClient) {}

  async getById(id: string): Promise<Baul | null> {
    const { data, error } = await this.supabase
      .from("baules")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    return this.mapToBaul(data);
  }

  async getAllForUser(userId: string): Promise<Baul[]> {
    // Obtenemos baúles donde es custodio
    const { data: ownedData, error: ownedError } = await this.supabase
      .from("baules")
      .select("*")
      .eq("custodio_id", userId);

    if (ownedError) throw ownedError;

    // Obtenemos baúles compartidos
    const { data: sharedData, error: sharedError } = await this.supabase
      .from("shared_users")
      .select("baul_id, role, baules(*)")
      .eq("user_id", userId);

    if (sharedError) throw sharedError;

    const ownedBaules = (ownedData || []).map((b) => ({
      ...this.mapToBaul(b),
      isCustodio: true,
      role: "custodio",
    }));

    const sharedBaules = (sharedData || []).map((s: { role: string; baules: unknown }) => ({
      ...this.mapToBaul(s.baules),
      isCustodio: false,
      role: s.role,
    }));

    return [...ownedBaules, ...sharedBaules];
  }

  async create(baul: Baul): Promise<void> {
    const { error } = await this.supabase
      .from("baules")
      .insert({
        id: baul.id,
        name: baul.name,
        description: baul.description,
        custodio_id: baul.custodioId,
        album_count: baul.albumCount,
        created_at: baul.createdAt,
        updated_at: baul.updatedAt,
      });

    if (error) throw error;
  }

  async update(baul: Baul): Promise<void> {
    const { error } = await this.supabase
      .from("baules")
      .update({
        name: baul.name,
        description: baul.description,
        album_count: baul.albumCount,
        updated_at: baul.updatedAt,
      })
      .eq("id", baul.id);

    if (error) throw error;
  }

  // Sharing
  async getSharedUsers(baulId: string): Promise<SharedUser[]> {
    const { data, error } = await this.supabase
      .from("shared_users")
      .select(`
        *,
        users (
          name
        )
      `)
      .eq("baul_id", baulId);

    if (error) throw error;
    return (data || []).map(this.mapToSharedUser);
  }

  async getSharedUserById(sharedUserId: string): Promise<SharedUser | null> {
    const { data, error } = await this.supabase
        .from("shared_users")
        .select(`
        *,
        users (
          name
        )
      `)
        .eq("id", sharedUserId)
        .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return this.mapToSharedUser(data);
  }

  async getSharedUser(baulId: string, userId: string): Promise<SharedUser | null> {
    const { data, error } = await this.supabase
      .from("shared_users")
      .select(`
        *,
        users (
          name
        )
      `)
      .eq("baul_id", baulId)
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return this.mapToSharedUser(data);
  }

  async addSharedUser(sharedUser: SharedUser): Promise<void> {
    const { error } = await this.supabase
      .from("shared_users")
      .insert({
        id: crypto.randomUUID(), // ID de la fila en shared_users
        baul_id: sharedUser.baulId,
        user_id: sharedUser.userId, // Puede ser null
        email: sharedUser.email,
        role: sharedUser.role,
        status: sharedUser.status,
        invited_date: sharedUser.invitedDate,
      });

    if (error) throw error;
  }

  async updateSharedUser(sharedUser: SharedUser): Promise<void> {
    const { error } = await this.supabase
      .from("shared_users")
      .update({
        role: sharedUser.role,
        status: sharedUser.status,
      })
      .eq("baul_id", sharedUser.baulId)
      .eq("email", sharedUser.email); // Usamos email porque userId puede ser null inicialmente

    if (error) throw error;
  }

  async removeSharedUser(baulId: string, email: string): Promise<void> {
    const { error } = await this.supabase
      .from("shared_users")
      .delete()
      .eq("baul_id", baulId)
      .eq("email", email);

    if (error) throw error;
  }

  async getUserSharedAccess(userId: string, baulId: string): Promise<SharedUser | null> {
    return await this.getSharedUser(baulId, userId);
  }

  // Access Requests
  async getAccessRequests(baulId: string): Promise<AccessRequest[]> {
    const { data, error } = await this.supabase
      .from("access_requests")
      .select("*")
      .eq("baul_id", baulId);

    if (error) throw error;
    return (data || []).map(this.mapToAccessRequest);
  }

  async getAccessRequest(baulId: string, requestId: string): Promise<AccessRequest | null> {
    const { data, error } = await this.supabase
      .from("access_requests")
      .select("*")
      .eq("baul_id", baulId)
      .eq("id", requestId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return this.mapToAccessRequest(data);
  }

  async createAccessRequest(request: AccessRequest): Promise<void> {
    const { error } = await this.supabase
      .from("access_requests")
      .insert({
        id: request.id,
        baul_id: request.baulId,
        email: request.email,
        name: request.name,
        message: request.message,
        request_date: request.requestDate,
        status: request.status,
      });

    if (error) throw error;
  }

  async deleteAccessRequest(baulId: string, requestId: string): Promise<void> {
    const { error } = await this.supabase
      .from("access_requests")
      .delete()
      .eq("baul_id", baulId)
      .eq("id", requestId);

    if (error) throw error;
  }

  // Removal Requests
  async getRemovalRequests(baulId: string): Promise<RemovalRequest[]> {
    const { data, error } = await this.supabase
      .from("removal_requests")
      .select("*")
      .eq("baul_id", baulId);

    if (error) throw error;
    return (data || []).map(this.mapToRemovalRequest);
  }

  async getRemovalRequest(baulId: string, requestId: string): Promise<RemovalRequest | null> {
    const { data, error } = await this.supabase
      .from("removal_requests")
      .select("*")
      .eq("baul_id", baulId)
      .eq("id", requestId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return this.mapToRemovalRequest(data);
  }

  async createRemovalRequest(request: RemovalRequest): Promise<void> {
    const { error } = await this.supabase
      .from("removal_requests")
      .insert({
        id: request.id,
        baul_id: request.baulId,
        photo_id: request.photoId,
        photo_url: request.photoUrl,
        photo_caption: request.photoCaption,
        requester_name: request.requesterName,
        requester_email: request.requesterEmail,
        reason: request.reason,
        request_date: request.requestDate,
        status: request.status,
      });

    if (error) throw error;
  }

  async deleteRemovalRequest(baulId: string, requestId: string): Promise<void> {
    const { error } = await this.supabase
      .from("removal_requests")
      .delete()
      .eq("baul_id", baulId)
      .eq("id", requestId);

    if (error) throw error;
  }

  // Mappers
  // deno-lint-ignore no-explicit-any
  private mapToBaul(data: any): Baul {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      custodioId: data.custodio_id,
      albumCount: data.album_count,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  // deno-lint-ignore no-explicit-any
  private mapToSharedUser(data: any): SharedUser {
    return {
      id: data.id,
      userId: data.user_id,
      email: data.email,
      name: data.users?.name,
      role: data.role,
      status: data.status,
      invitedDate: data.invited_date,
      baulId: data.baul_id,
    };
  }

  // deno-lint-ignore no-explicit-any
  private mapToAccessRequest(data: any): AccessRequest {
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      message: data.message,
      requestDate: data.request_date,
      status: data.status,
      baulId: data.baul_id,
    };
  }

  // deno-lint-ignore no-explicit-any
  private mapToRemovalRequest(data: any): RemovalRequest {
    return {
      id: data.id,
      photoId: data.photo_id,
      photoUrl: data.photo_url,
      photoCaption: data.photo_caption,
      requesterName: data.requester_name,
      requesterEmail: data.requester_email,
      reason: data.reason,
      requestDate: data.request_date,
      status: data.status,
      baulId: data.baul_id,
    };
  }
}
