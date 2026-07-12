import { assertEquals } from "@std/assert";
import { ActivityUseCases } from "../use-cases/activity.use-cases.ts";
import { FakeActivityRepository } from "./fakes/fake-activity.repository.ts";
import { FakeBaulRepository } from "./fakes/fake-baul.repository.ts";

Deno.test("ActivityUseCases - getActivitiesForUser", async () => {
  const activityRepo = new FakeActivityRepository();
  const baulRepo = new FakeBaulRepository();
  const useCases = new ActivityUseCases(activityRepo, baulRepo);

  const userId = "user-1";

  const baul1 = {
    id: "baul-1",
    name: "Baul 1",
    custodioId: userId,
    albumCount: 0,
    createdAt: "",
    updatedAt: "",
  };
  const baul2 = {
    id: "baul-2",
    name: "Baul 2",
    custodioId: userId,
    albumCount: 0,
    createdAt: "",
    updatedAt: "",
  };
  await baulRepo.create(baul1);
  await baulRepo.create(baul2);

  const act1 = {
    id: "1",
    type: "new-photos" as const,
    baulId: "baul-1",
    baulName: "B1",
    timestamp: "2024-01-01T10:00:00Z",
    isActionable: false,
  };
  const act2 = {
    id: "2",
    type: "new-photos" as const,
    baulId: "baul-2",
    baulName: "B2",
    timestamp: "2024-01-01T12:00:00Z",
    isActionable: false,
  };

  await activityRepo.create(act1);
  await activityRepo.create(act2);

  const activities = await useCases.getActivitiesForUser(userId);

  assertEquals(activities.length, 2);
  assertEquals(activities[0].id, "2"); // Sorted by timestamp desc
  assertEquals(activities[1].id, "1");
});
