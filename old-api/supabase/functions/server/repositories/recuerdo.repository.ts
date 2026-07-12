import { Recuerdo } from "../types.ts";

export interface IRecuerdoRepository {
  getByPhotoId(photoId: string): Promise<Recuerdo[]>;
  create(recuerdo: Recuerdo): Promise<void>;
  delete(id: string): Promise<void>;
}
