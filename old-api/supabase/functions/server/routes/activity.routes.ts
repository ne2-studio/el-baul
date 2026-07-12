import { Context, Hono } from "hono";
import { ActivityUseCases } from "../use-cases/activity.use-cases.ts";

export const activityRoutes = (
  activityUseCases: ActivityUseCases,
  verifyAuth: (
    c: Context,
  ) => Promise<{ userId: string; email: string; name?: string } | null>,
) => {
  const router = new Hono();

  // Get activities for user
  router.get("/", async (c) => {
    const user = await verifyAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    try {
      const allActivities = await activityUseCases.getActivitiesForUser(
        user.userId,
      );
      return c.json({ activities: allActivities });
    } catch (error) {
      console.log("Get activities error:", error);
      return c.json({ error: "Failed to get activities" }, 500);
    }
  });

  return router;
};
