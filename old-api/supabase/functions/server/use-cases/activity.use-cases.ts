import { Activity } from "../types.ts";
import { IActivityRepository } from "../repositories/activity.repository.ts";
import { IBaulRepository } from "../repositories/baul.repository.ts";

export class ActivityUseCases {
  constructor(
    private activityRepo: IActivityRepository,
    private baulRepo: IBaulRepository,
  ) {}

  async getActivitiesForUser(userId: string) {
    const baules = await this.baulRepo.getAllForUser(userId);
    const baulIds = baules.map((b) => b.id);

    const allActivities = await this.activityRepo.getByBaulIds(baulIds);

    // Sort by timestamp (most recent first)
    allActivities.sort((a: Activity, b: Activity) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return allActivities;
  }
}
