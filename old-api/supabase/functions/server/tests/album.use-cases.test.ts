import { assertEquals, assertRejects } from "@std/assert";
import { AlbumUseCases } from "../use-cases/album.use-cases.ts";
import { FakeAlbumRepository } from "./fakes/fake-album.repository.ts";
import { FakeBaulRepository } from "./fakes/fake-baul.repository.ts";
import { FakeFileStorage } from "./fakes/fake-file-storage.ts";

Deno.test("AlbumUseCases - createAlbum", async () => {
  const albumRepo = new FakeAlbumRepository();
  const baulRepo = new FakeBaulRepository();
  const fileStorage = new FakeFileStorage();
  const useCases = new AlbumUseCases(albumRepo, baulRepo, fileStorage);

  const userId = "user-1";
  const baul = {
    id: "baul-1",
    name: "Baul 1",
    custodioId: userId,
    albumCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await baulRepo.create(baul);

  const album = await useCases.createAlbum(userId, baul.id, "Album 1", "Desc");

  assertEquals(album.name, "Album 1");
  assertEquals(album.baulId, baul.id);

  const savedAlbum = await albumRepo.getById(album.id);
  assertEquals(savedAlbum?.name, "Album 1");

  const updatedBaul = await baulRepo.getById(baul.id);
  assertEquals(updatedBaul?.albumCount, 1);
});

Deno.test("AlbumUseCases - getAlbumsByBaulId access denied", async () => {
  const albumRepo = new FakeAlbumRepository();
  const baulRepo = new FakeBaulRepository();
  const fileStorage = new FakeFileStorage();
  const useCases = new AlbumUseCases(albumRepo, baulRepo, fileStorage);

  const ownerId = "owner";
  const otherId = "other";
  const baul = {
    id: "baul-1",
    name: "Baul 1",
    custodioId: ownerId,
    albumCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await baulRepo.create(baul);

  await assertRejects(
    () => useCases.getAlbumsByBaulId(otherId, baul.id),
    Error,
    "Access denied",
  );
});
