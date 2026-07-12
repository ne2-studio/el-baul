import { IActivityRepository } from "../../repositories/activity.repository.ts";
import { Activity } from "../../types.ts";

export class FakeActivityRepository implements IActivityRepository {
  private activities: Map<string, Activity> = new Map();

  getById(id: string): Promise<Activity | null> {
    return Promise.resolve(this.activities.get(id) || null);
  }

  getByBaulIds(baulIds: string[]): Promise<Activity[]> {
    return Promise.resolve(
      Array.from(this.activities.values()).filter((a) =>
        baulIds.includes(a.baulId)
      ),
    );
  }

  create(activity: Activity): Promise<void> {
    this.activities.set(activity.id, activity);
    return Promise.resolve();
  }
}
