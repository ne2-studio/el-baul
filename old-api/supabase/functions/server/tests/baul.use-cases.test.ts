import { assert, assertEquals, assertRejects } from "@std/assert";
import { BaulUseCases } from "../use-cases/baul.use-cases.ts";
import { FakeBaulRepository } from "./fakes/fake-baul.repository.ts";
import { FakeUserRepository } from "./fakes/fake-user.repository.ts";
import { FakeActivityRepository } from "./fakes/fake-activity.repository.ts";
import { FakePhotoRepository } from "./fakes/fake-photo.repository.ts";
import { FakeAlbumRepository } from "./fakes/fake-album.repository.ts";
import { FakeFileStorage } from "./fakes/fake-file-storage.ts";

Deno.test("BaulUseCases - createBaul", async () => {
  const baulRepo = new FakeBaulRepository();
  const userRepo = new FakeUserRepository();
  const activityRepo = new FakeActivityRepository();
  const photoRepo = new FakePhotoRepository();
  const albumRepo = new FakeAlbumRepository();
  const fileStorage = new FakeFileStorage();
  const useCases = new BaulUseCases(
    baulRepo,
    userRepo,
    activityRepo,
    photoRepo,
    albumRepo,
    fileStorage,
  );

  const userId = "00000000-0000-0000-0000-000000000123";
  const baul = await useCases.createBaul(
    userId,
    "Mi Baul",
    "Descripcion",
  );

  assertEquals(baul.name, "Mi Baul");
  assertEquals(baul.custodioId, userId);

  const savedBaul = await baulRepo.getById(baul.id);
  assertEquals(savedBaul?.name, "Mi Baul");
});

Deno.test("BaulUseCases - getBaulById access denied", async () => {
  const baulRepo = new FakeBaulRepository();
  const userRepo = new FakeUserRepository();
  const activityRepo = new FakeActivityRepository();
  const photoRepo = new FakePhotoRepository();
  const albumRepo = new FakeAlbumRepository();
  const fileStorage = new FakeFileStorage();
  const useCases = new BaulUseCases(
    baulRepo,
    userRepo,
    activityRepo,
    photoRepo,
    albumRepo,
    fileStorage,
  );

  const ownerId = "00000000-0000-0000-0000-000000000001";
  const otherUserId = "00000000-0000-0000-0000-000000000002";

  const baul = await useCases.createBaul(
    ownerId,
    "Baul Privado",
  );

  await assertRejects(
    () => useCases.getBaulById(otherUserId, baul.id),
    Error,
    "Access denied",
  );
});

Deno.test("BaulUseCases - shareBaul", async () => {
  const baulRepo = new FakeBaulRepository();
  const userRepo = new FakeUserRepository();
  const activityRepo = new FakeActivityRepository();
  const photoRepo = new FakePhotoRepository();
  const albumRepo = new FakeAlbumRepository();
  const fileStorage = new FakeFileStorage();
  const useCases = new BaulUseCases(
    baulRepo,
    userRepo,
    activityRepo,
    photoRepo,
    albumRepo,
    fileStorage,
  );

  const ownerId = "owner-1";
  const ownerName = "Owner Name";
  const ownerEmail = "owner@test.com";

  await userRepo.create({
    id: ownerId,
    email: ownerEmail,
    name: ownerName,
    createdAt: new Date().toISOString(),
  });

  const baul = await useCases.createBaul(
    ownerId,
    "Baul Compartido",
  );

  const invitedEmail = "invited@test.com";
  await useCases.shareBaul(ownerId, baul.id, invitedEmail, "miembro");

  const sharedUsers = await useCases.getSharedUsers(ownerId, baul.id);

  // Should have 2 users: custodian and the invited guest
  assertEquals(sharedUsers.length, 2);

  const custodian = sharedUsers.find((u) => u.role === "custodio");
  assert(custodian, "Custodian should be in the list");
  assertEquals(custodian.userId, ownerId);
  assertEquals(custodian.name, ownerName);

  const guest = sharedUsers.find((u) => u.email === invitedEmail);
  assert(guest, "Guest should be in the list");
  assertEquals(guest.role, "miembro");
});

Deno.test("BaulUseCases - getBaulPreview", async () => {
  const baulRepo = new FakeBaulRepository();
  const userRepo = new FakeUserRepository();
  const activityRepo = new FakeActivityRepository();
  const photoRepo = new FakePhotoRepository();
  const albumRepo = new FakeAlbumRepository();
  const fileStorage = new FakeFileStorage();
  const useCases = new BaulUseCases(
    baulRepo,
    userRepo,
    activityRepo,
    photoRepo,
    albumRepo,
    fileStorage,
  );

  const ownerId = "owner-1";
  const ownerName = "Owner Name";
  const ownerEmail = "owner@test.com";

  await userRepo.create({
    id: ownerId,
    email: ownerEmail,
    name: ownerName,
    createdAt: new Date().toISOString(),
  });

  const baul = await useCases.createBaul(
    ownerId,
    "Baul Preview",
    "Description",
  );

  await photoRepo.create({
    id: "p1",
    baulId: baul.id,
    albumId: "a1",
    url: "photo1.jpg",
    date: new Date().toISOString(),
    uploadedBy: ownerId,
    createdAt: new Date().toISOString(),
  });

  const preview = await useCases.getBaulPreview(baul.id);

  assertEquals(preview?.id, baul.id);
  assertEquals(preview?.name, "Baul Preview");
  assertEquals(preview?.description, "Description");
  assertEquals(preview?.previewPhotos.length, 1);
  assert(preview?.previewPhotos[0].includes("photo1.jpg"));
});

Deno.test("BaulUseCases - acceptInvite", async () => {
  const baulRepo = new FakeBaulRepository();
  const userRepo = new FakeUserRepository();
  const activityRepo = new FakeActivityRepository();
  const photoRepo = new FakePhotoRepository();
  const albumRepo = new FakeAlbumRepository();
  const fileStorage = new FakeFileStorage();
  const useCases = new BaulUseCases(
    baulRepo,
    userRepo,
    activityRepo,
    photoRepo,
    albumRepo,
    fileStorage,
  );

  const ownerId = "owner-1";
  const ownerName = "Owner Name";
  const ownerEmail = "owner@test.com";

  await userRepo.create({
    id: ownerId,
    email: ownerEmail,
    name: ownerName,
    createdAt: new Date().toISOString(),
  });

  const baul = await useCases.createBaul(
    ownerId,
    "Baul Invitado",
  );

  const guestId = "guest-1";
  const guestEmail = "guest@test.com";

  // Accept invite for the first time
  await useCases.acceptInvite(guestId, guestEmail, baul.id);

  const sharedUsers = await baulRepo.getSharedUsers(baul.id);
  assertEquals(sharedUsers.length, 1);
  assertEquals(sharedUsers[0].userId, guestId);
  assertEquals(sharedUsers[0].role, "miembro");
  assertEquals(sharedUsers[0].status, "active");

  // Accept invite again (should be idempotent)
  await useCases.acceptInvite(guestId, guestEmail, baul.id);
  const sharedUsersAfter = await baulRepo.getSharedUsers(baul.id);
  assertEquals(sharedUsersAfter.length, 1);

  // Accept invite for non-existent baul
  await assertRejects(
    () => useCases.acceptInvite(guestId, guestEmail, "non-existent"),
    Error,
    "Baul not found",
  );
});

Deno.test("BaulUseCases - getSharedUsers includes custodian", async () => {
  const baulRepo = new FakeBaulRepository();
  const userRepo = new FakeUserRepository();
  const activityRepo = new FakeActivityRepository();
  const photoRepo = new FakePhotoRepository();
  const albumRepo = new FakeAlbumRepository();
  const fileStorage = new FakeFileStorage();
  const useCases = new BaulUseCases(
    baulRepo,
    userRepo,
    activityRepo,
    photoRepo,
    albumRepo,
    fileStorage,
  );

  const ownerId = "owner-1";
  const ownerName = "Owner Name";
  const ownerEmail = "owner@test.com";

  await userRepo.create({
    id: ownerId,
    email: ownerEmail,
    name: ownerName,
    createdAt: new Date().toISOString(),
  });

  const baul = await useCases.createBaul(
    ownerId,
    "Baul para compartir",
  );

  const guestEmail = "guest@test.com";
  await useCases.shareBaul(ownerId, baul.id, guestEmail, "miembro");

  const sharedUsers = await useCases.getSharedUsers(ownerId, baul.id);

  // Should have 2 users: custodian and the invited guest
  assertEquals(sharedUsers.length, 2);

  const custodian = sharedUsers.find((u) => u.role === "custodio");
  assert(custodian, "Custodian should be in the list");
  assertEquals(custodian.userId, ownerId);
  assertEquals(custodian.name, ownerName);

  const guest = sharedUsers.find((u) => u.email === guestEmail);
  assert(guest, "Guest should be in the list");
  assertEquals(guest.role, "miembro");
});
