import { Context, Hono } from "hono";
import { PhotoUseCases } from "../use-cases/photo.use-cases.ts";

export const photoRoutes = (
  photoUseCases: PhotoUseCases,
  verifyAuth: (
    c: Context,
  ) => Promise<{ userId: string; email: string; name?: string } | null>,
) => {
  const router = new Hono();

  // Get photos for an album
  router.get("/albums/:albumId/photos", async (c) => {
    const user = await verifyAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    try {
      const albumId = c.req.param("albumId");
      const photos = await photoUseCases.getPhotosByAlbumId(
        user.userId,
        albumId,
      );
      return c.json({ photos });
    } catch (error) {
      if (error.message === "Album not found") {
        return c.json({ error: "Album not found" }, 404);
      }
      if (error.message === "Baul not found") {
        return c.json({ error: "Baul not found" }, 404);
      }
      if (error.message === "Access denied") {
        return c.json({ error: "Access denied" }, 403);
      }
      console.log("Get photos error:", error);
      return c.json({ error: "Failed to get photos" }, 500);
    }
  });

  // Upload photo metadata
  router.post("/albums/:albumId/photos", async (c) => {
    const user = await verifyAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    try {
      const albumId = c.req.param("albumId");
      const { caption, date, storageUrl } = await c.req.json();

      const photo = await photoUseCases.addPhoto(
        user.userId,
        albumId,
        storageUrl,
        caption,
        date,
      );

      return c.json({ photo });
    } catch (error) {
      if (error.message === "Album not found") {
        return c.json({ error: "Album not found" }, 404);
      }
      if (error.message === "Baul not found") {
        return c.json({ error: "Baul not found" }, 404);
      }
      if (error.message === "Access denied") {
        return c.json({ error: "Access denied" }, 403);
      }
      console.log("Upload photo error:", error);
      return c.json({ error: "Failed to upload photo" }, 500);
    }
  });

  // Get upload URL for a photo
  router.post("/photos/upload-url", async (c) => {
    const user = await verifyAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    try {
      const { fileName } = await c.req.json();
      const bucketName = "el-baul-prod-photos";
      const filePath = `${user.userId}/${crypto.randomUUID()}-${fileName}`;
      return c.json({ filePath, bucketName });
    } catch (error) {
      console.log("Generate upload URL error:", error);
      return c.json({ error: "Failed to generate upload URL" }, 500);
    }
  });

  // Upload photo file
  router.post("/photos/upload", async (c) => {
    const user = await verifyAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    try {
      const formData = await c.req.formData();
      const file = formData.get("file") as File;
      const fileName = formData.get("fileName") as string;

      if (!file) return c.json({ error: "No file provided" }, 400);

      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      const result = await photoUseCases.uploadPhoto(
        user.userId,
        uint8Array,
        fileName,
        file.type,
      );

      return c.json(result);
    } catch (error) {
      console.log("Upload photo file error:", error);
      return c.json({ error: error.message || "Failed to upload photo" }, 500);
    }
  });

  // Get signed URL for a photo
  router.post("/photos/signed-url", async (c) => {
    const user = await verifyAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    try {
      const { filePath } = await c.req.json();
      const signedUrl = await photoUseCases.getSignedUrl(filePath);
      return c.json({ signedUrl });
    } catch (error) {
      console.log("Get signed URL exception:", error);
      return c.json({ error: "Failed to get signed URL" }, 500);
    }
  });

  // Get recuerdos for a photo
  router.get("/photos/:photoId/recuerdos", async (c) => {
    const user = await verifyAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    try {
      const photoId = c.req.param("photoId");
      const recuerdos = await photoUseCases.getRecuerdosByPhotoId(
        user.userId,
        photoId,
      );
      return c.json({ recuerdos });
    } catch (error) {
      if (error.message === "Photo not found") {
        return c.json({ error: "Photo not found" }, 404);
      }
      if (error.message === "Baul not found") {
        return c.json({ error: "Baul not found" }, 404);
      }
      if (error.message === "Access denied") {
        return c.json({ error: "Access denied" }, 403);
      }
      console.log("Get recuerdos error:", error);
      return c.json({ error: "Failed to get recuerdos" }, 500);
    }
  });

  // Create a recuerdo for a photo
  router.post("/photos/:photoId/recuerdos", async (c) => {
    const user = await verifyAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    try {
      const photoId = c.req.param("photoId");
      const { text } = await c.req.json();

      if (!text) {
        return c.json({ error: "Text is required" }, 400);
      }

      const recuerdo = await photoUseCases.createRecuerdo(
        user.userId,
        photoId,
        text,
      );
      return c.json({ recuerdo });
    } catch (error) {
      if (error.message === "Photo not found") {
        return c.json({ error: "Photo not found" }, 404);
      }
      if (error.message === "Baul not found") {
        return c.json({ error: "Baul not found" }, 404);
      }
      if (error.message === "Access denied") {
        return c.json({ error: "Access denied" }, 403);
      }
      console.log("Create recuerdo error:", error);
      return c.json({ error: "Failed to create recuerdo" }, 500);
    }
  });

  return router;
};
