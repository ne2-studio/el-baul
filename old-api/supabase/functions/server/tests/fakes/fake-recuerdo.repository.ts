import { Recuerdo } from "../../types.ts";
import { IRecuerdoRepository } from "../../repositories/recuerdo.repository.ts";

export class FakeRecuerdoRepository implements IRecuerdoRepository {
  private recuerdos: Recuerdo[] = [];

  async getByPhotoId(photoId: string): Promise<Recuerdo[]> {
    return this.recuerdos.filter((r) => r.photoId === photoId);
  }

  async create(recuerdo: Recuerdo): Promise<void> {
    this.recuerdos.push(recuerdo);
  }

  async delete(id: string): Promise<void> {
    this.recuerdos = this.recuerdos.filter((r) => r.id !== id);
  }
}
