import { SupabaseClient } from "supabase";
import { Activity } from "../../types.ts";
import { IActivityRepository } from "../activity.repository.ts";

export class ActivityPostgresRepository implements IActivityRepository {
  constructor(private supabase: SupabaseClient) {}

  async getById(id: string): Promise<Activity | null> {
    const { data, error } = await this.supabase
      .from("activities")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    return this.mapToActivity(data);
  }

  async getByBaulIds(baulIds: string[]): Promise<Activity[]> {
    if (baulIds.length === 0) return [];

    const { data, error } = await this.supabase
      .from("activities")
      .select("*")
      .in("baul_id", baulIds);

    if (error) throw error;
    return (data || []).map(this.mapToActivity);
  }

  async create(activity: Activity): Promise<void> {
    const { error } = await this.supabase
      .from("activities")
      .insert({
        id: activity.id,
        type: activity.type,
        baul_id: activity.baulId,
        baul_name: activity.baulName,
        timestamp: activity.timestamp,
        is_actionable: activity.isActionable,
        photo_count: activity.photoCount,
        requester_email: activity.requesterEmail,
        access_request_id: activity.accessRequestId,
        removal_request_id: activity.removalRequestId,
      });

    if (error) throw error;
  }

  // deno-lint-ignore no-explicit-any
  private mapToActivity(data: any): Activity {
    return {
      id: data.id,
      type: data.type,
      baulId: data.baul_id,
      baulName: data.baul_name,
      timestamp: data.timestamp,
      isActionable: data.is_actionable,
      photoCount: data.photo_count,
      requesterEmail: data.requester_email,
      accessRequestId: data.access_request_id,
      removalRequestId: data.removal_request_id,
    };
  }
}
