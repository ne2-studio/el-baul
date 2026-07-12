export interface IFileStorage {
  getSignedUrl(path: string, expiresIn?: number): Promise<string>;
  uploadFile(
    path: string,
    file: Uint8Array,
    contentType: string,
  ): Promise<void>;
  listBuckets(): Promise<string[]>;
  createBucket(name: string): Promise<void>;
}
