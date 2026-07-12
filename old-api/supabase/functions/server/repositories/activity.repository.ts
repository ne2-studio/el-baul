import { Activity } from "../types.ts";

export interface IActivityRepository {
  getById(id: string): Promise<Activity | null>;
  getByBaulIds(baulIds: string[]): Promise<Activity[]>;
  create(activity: Activity): Promise<void>;
}
