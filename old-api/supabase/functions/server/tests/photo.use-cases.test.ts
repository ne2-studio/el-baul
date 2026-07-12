import { assertEquals } from "@std/assert";
import { PhotoUseCases } from "../use-cases/photo.use-cases.ts";
import { FakePhotoRepository } from "./fakes/fake-photo.repository.ts";
import { FakeAlbumRepository } from "./fakes/fake-album.repository.ts";
import { FakeBaulRepository } from "./fakes/fake-baul.repository.ts";
import { FakeActivityRepository } from "./fakes/fake-activity.repository.ts";
import { FakeFileStorage } from "./fakes/fake-file-storage.ts";
import { FakeRecuerdoRepository } from "./fakes/fake-recuerdo.repository.ts";
import { FakeUserRepository } from "./fakes/fake-user.repository.ts";

Deno.test("PhotoUseCases - addPhoto", async () => {
  const photoRepo = new FakePhotoRepository();
  const albumRepo = new FakeAlbumRepository();
  const baulRepo = new FakeBaulRepository();
  const activityRepo = new FakeActivityRepository();
  const fileStorage = new FakeFileStorage();
  const recuerdoRepo = new FakeRecuerdoRepository();
  const userRepo = new FakeUserRepository();
  const useCases = new PhotoUseCases(
    photoRepo,
    albumRepo,
    baulRepo,
    activityRepo,
    fileStorage,
    recuerdoRepo,
    userRepo,
  );

  const userId = "user-1";
  const baul = {
    id: "baul-1",
    name: "Baul 1",
    custodioId: userId,
    albumCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await baulRepo.create(baul);

  const album = {
    id: "album-1",
    baulId: baul.id,
    name: "Album 1",
    photoCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await albumRepo.create(album);

  const photo = await useCases.addPhoto(
    userId,
    album.id,
    "http://image.url",
    "Test Photo",
  );

  assertEquals(photo.caption, "Test Photo");
  assertEquals(photo.albumId, album.id);

  const savedPhoto = await photoRepo.getById(photo.id);
  assertEquals(savedPhoto?.url, "http://image.url");

  const updatedAlbum = await albumRepo.getById(album.id);
  assertEquals(updatedAlbum?.photoCount, 1);
  assertEquals(updatedAlbum?.coverPhotoUrl, "http://image.url");

  const activities = await activityRepo.getByBaulIds([baul.id]);
  assertEquals(activities.length, 1);
  assertEquals(activities[0].type, "new-photos");
});

Deno.test("PhotoUseCases - getPhotosByAlbumId with PUBLIC_STORAGE_URL", async () => {
  const photoRepo = new FakePhotoRepository();
  const albumRepo = new FakeAlbumRepository();
  const baulRepo = new FakeBaulRepository();
  const activityRepo = new FakeActivityRepository();

  const publicUrl = "http://127.0.0.1:54321/storage/v1/s3";
  Deno.env.set("PUBLIC_STORAGE_URL", publicUrl);

  const fileStorage = new FakeFileStorage();
  const recuerdoRepo = new FakeRecuerdoRepository();
  const userRepo = new FakeUserRepository();
  const useCases = new PhotoUseCases(
    photoRepo,
    albumRepo,
    baulRepo,
    activityRepo,
    fileStorage,
    recuerdoRepo,
    userRepo,
  );

  const userId = "user-1";
  const baulId = "baul-1";
  await baulRepo.create({
    id: baulId,
    name: "Baul 1",
    custodioId: userId,
    albumCount: 1,
    createdAt: "",
    updatedAt: "",
  });
  await albumRepo.create({
    id: "album-1",
    baulId,
    name: "Album 1",
    photoCount: 1,
    createdAt: "",
    updatedAt: "",
  });
  await photoRepo.create({
    id: "photo-1",
    albumId: "album-1",
    baulId,
    url: "photo.jpg",
    date: "",
    uploadedBy: userId,
    createdAt: "",
  });

  const photos = await useCases.getPhotosByAlbumId(userId, "album-1");

  assertEquals(photos.length, 1);
  assertEquals(
    photos[0].url,
    `http://127.0.0.1:54321/storage/v1/s3/storage/v1/object/sign/bucket/photo.jpg?token=abc`,
  );
});

Deno.test("PhotoUseCases - uploadPhoto", async () => {
  const photoRepo = new FakePhotoRepository();
  const albumRepo = new FakeAlbumRepository();
  const baulRepo = new FakeBaulRepository();
  const activityRepo = new FakeActivityRepository();

  const fileStorage = new FakeFileStorage();
  const recuerdoRepo = new FakeRecuerdoRepository();
  const userRepo = new FakeUserRepository();
  const useCases = new PhotoUseCases(
    photoRepo,
    albumRepo,
    baulRepo,
    activityRepo,
    fileStorage,
    recuerdoRepo,
    userRepo,
  );

  const userId = "user-1";
  const file = new Uint8Array([1, 2, 3]);
  const result = await useCases.uploadPhoto(
    userId,
    file,
    "test.jpg",
    "image/jpeg",
  );

  assertEquals(result.signedUrl.includes("/user-1/"), true);
  assertEquals(result.filePath.startsWith("user-1/"), true);
});

Deno.test("PhotoUseCases - recuerdos", async () => {
  const photoRepo = new FakePhotoRepository();
  const albumRepo = new FakeAlbumRepository();
  const baulRepo = new FakeBaulRepository();
  const activityRepo = new FakeActivityRepository();
  const fileStorage = new FakeFileStorage();
  const recuerdoRepo = new FakeRecuerdoRepository();
  const userRepo = new FakeUserRepository();
  const useCases = new PhotoUseCases(
    photoRepo,
    albumRepo,
    baulRepo,
    activityRepo,
    fileStorage,
    recuerdoRepo,
    userRepo,
  );

  const userId = "user-1";
  const baulId = "baul-1";
  const photoId = "photo-1";

  await baulRepo.create({
    id: baulId,
    name: "Baul 1",
    custodioId: userId,
    albumCount: 1,
    createdAt: "",
    updatedAt: "",
  });

  await photoRepo.create({
    id: photoId,
    albumId: "album-1",
    baulId,
    url: "photo.jpg",
    date: "",
    uploadedBy: userId,
    createdAt: "",
  });

  await userRepo.create({
    id: userId,
    email: "user1@test.com",
    name: "User 1",
    createdAt: "",
  });

  // Create recuerdo
  const recuerdo = await useCases.createRecuerdo(userId, photoId, "Un gran recuerdo");
  assertEquals(recuerdo.text, "Un gran recuerdo");
  assertEquals(recuerdo.photoId, photoId);
  assertEquals(recuerdo.userId, userId);
  assertEquals(recuerdo.userName, "User 1");
  assertEquals(recuerdo.isOwn, true);

  // Get recuerdos
  const recuerdos = await useCases.getRecuerdosByPhotoId(userId, photoId);
  assertEquals(recuerdos.length, 1);
  assertEquals(recuerdos[0].text, "Un gran recuerdo");
  assertEquals(recuerdos[0].userName, "User 1");
  assertEquals(recuerdos[0].isOwn, true);

  // Get recuerdos as another user
  const otherUserId = "user-2";
  await userRepo.create({
    id: otherUserId,
    email: "user2@test.com",
    name: "User 2",
    createdAt: "",
  });

  // Grant access to other user
  await baulRepo.addSharedUser({
    id: "access-1",
    baulId,
    userId: otherUserId,
    email: "user2@test.com",
    role: "miembro",
    status: "active",
    invitedDate: "",
  });

  const recuerdosOther = await useCases.getRecuerdosByPhotoId(otherUserId, photoId);
  assertEquals(recuerdosOther.length, 1);
  assertEquals(recuerdosOther[0].isOwn, false);
  assertEquals(recuerdosOther[0].userName, "User 1");

  // Deny access
  try {
    await useCases.getRecuerdosByPhotoId("other-user-no-access", photoId);
    throw new Error("Should have failed");
  } catch (error) {
    assertEquals(error.message, "Access denied");
  }
});
