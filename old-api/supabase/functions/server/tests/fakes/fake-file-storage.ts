import { IFileStorage } from "../../repositories/file-storage.interface.ts";

export class FakeFileStorage implements IFileStorage {
  private buckets: string[] = ["el-baul-prod-photos"];

  getSignedUrl(path: string, _expiresIn?: number): Promise<string> {
    const publicStorageUrl = Deno.env.get("PUBLIC_STORAGE_URL");
    const baseUrl = publicStorageUrl || "http://kong:8000";

    // Simular el comportamiento de Supabase de añadir el path de almacenamiento
    const url = new URL(baseUrl);

    // Asegurarse de que el path termina en / si tiene contenido para concatenar
    let pathname = url.pathname;
    if (pathname !== "/" && !pathname.endsWith("/")) {
      pathname += "/";
    }

    // Supabase añade storage/v1/object/sign/...
    url.pathname = pathname + `storage/v1/object/sign/bucket/${path}`;
    url.searchParams.set("token", "abc");

    return Promise.resolve(url.toString());
  }

  uploadFile(
    _path: string,
    _file: Uint8Array,
    _contentType: string,
  ): Promise<void> {
    return Promise.resolve();
  }

  listBuckets(): Promise<string[]> {
    return Promise.resolve(this.buckets);
  }

  createBucket(name: string): Promise<void> {
    this.buckets.push(name);
    return Promise.resolve();
  }
}
