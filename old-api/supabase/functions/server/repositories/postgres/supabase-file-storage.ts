import { SupabaseClient } from "supabase";
import { IFileStorage } from "../file-storage.interface.ts";

export class SupabaseFileStorage implements IFileStorage {
  private bucketName = "el-baul-prod-photos";

  constructor(
    private supabaseClient: SupabaseClient,
  ) {}

  async getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    const { data, error } = await this.supabaseClient.storage
      .from(this.bucketName)
      .createSignedUrl(path, expiresIn);

    if (error || !data) {
      console.error("Error creating signed URL:", error);
      return path;
    }

    const publicStorageUrl = Deno.env.get("PUBLIC_STORAGE_URL");
    if (!publicStorageUrl) {
      throw new Error("Missing environment variable: PUBLIC_STORAGE_URL");
    }

    const internalUrl = new URL(data.signedUrl);
    const publicUrl = new URL(publicStorageUrl);

    internalUrl.protocol = publicUrl.protocol;
    internalUrl.host = publicUrl.host;

    return internalUrl.toString();
  }

  async uploadFile(
    path: string,
    file: Uint8Array,
    contentType: string,
  ): Promise<void> {
    const { error } = await this.supabaseClient.storage
      .from(this.bucketName)
      .upload(path, file, {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error("Upload error:", error);
      throw new Error("Failed to upload file");
    }
  }

  async listBuckets(): Promise<string[]> {
    const { data, error } = await this.supabaseClient.storage.listBuckets();
    if (error) {
      console.error("List buckets error:", error);
      return [];
    }
    return data?.map((b: { name: string }) => b.name) || [];
  }

  async createBucket(name: string): Promise<void> {
    const { error } = await this.supabaseClient.storage.createBucket(name, {
      public: false,
      fileSizeLimit: 10485760,
    });
    if (error) {
      console.error("Create bucket error:", error);
      throw new Error("Failed to create bucket");
    }
  }
}
