import { Context, Hono } from "hono";
import { AlbumUseCases } from "../use-cases/album.use-cases.ts";

export const albumRoutes = (
  albumUseCases: AlbumUseCases,
  verifyAuth: (
    c: Context,
  ) => Promise<{ userId: string; email: string; name?: string } | null>,
) => {
  const router = new Hono();

  // Get albums for a baul
  router.get("/:baulId/albums", async (c) => {
    const user = await verifyAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    try {
      const baulId = c.req.param("baulId");
      const albums = await albumUseCases.getAlbumsByBaulId(user.userId, baulId);
      return c.json({ albums });
    } catch (error) {
      if (error.message === "Baul not found") {
        return c.json({ error: "Baul not found" }, 404);
      }
      if (error.message === "Access denied") {
        return c.json({ error: "Access denied" }, 403);
      }
      console.log("Get albums error:", error);
      return c.json({ error: "Failed to get albums" }, 500);
    }
  });

  // Create an album
  router.post("/:baulId/albums", async (c) => {
    const user = await verifyAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    try {
      const baulId = c.req.param("baulId");
      const { name, description } = await c.req.json();

      const album = await albumUseCases.createAlbum(
        user.userId,
        baulId,
        name,
        description,
      );

      return c.json({ album });
    } catch (error) {
      if (error.message === "Baul not found") {
        return c.json({ error: "Baul not found" }, 404);
      }
      if (error.message === "Access denied") {
        return c.json({ error: "Access denied" }, 403);
      }
      console.log("Create album error:", error);
      return c.json({ error: "Failed to create album" }, 500);
    }
  });

  return router;
};
