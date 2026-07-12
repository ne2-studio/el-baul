import { Context, Hono } from "hono";
import { IBaulRepository } from "../repositories/baul.repository.ts";
import { BaulUseCases } from "../use-cases/baul.use-cases.ts";

export const baulRoutes = (
  baulUseCases: BaulUseCases,
  _baulRepo: IBaulRepository,
  verifyAuth: (
    c: Context,
  ) => Promise<{ userId: string; email: string; name?: string } | null>,
) => {
  const router = new Hono();

  // Get all baules for a user
  router.get("/", async (c) => {
    const user = await verifyAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    try {
      const baulesWithRole = await baulUseCases.getBaulesForUser(user.userId);
      return c.json({ baules: baulesWithRole });
    } catch (error) {
      console.log("Get baules error:", error);
      return c.json({ error: "Failed to get baules" }, 500);
    }
  });

  // Create a new baul
  router.post("/", async (c) => {
    const user = await verifyAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    try {
      const { name, description } = await c.req.json();
      const baul = await baulUseCases.createBaul(
        user.userId,
        name,
        user.name || "Usuario",
        description,
      );
      return c.json({ baul });
    } catch (error) {
      console.log("Create baul error:", error);
      return c.json({ error: "Failed to create baul" }, 500);
    }
  });

  // Get a specific baul
  router.get("/:id", async (c) => {
    const user = await verifyAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    try {
      const baulId = c.req.param("id");
      const baulWithRole = await baulUseCases.getBaulById(user.userId, baulId);

      if (!baulWithRole) return c.json({ error: "Baul not found" }, 404);

      return c.json({ baul: baulWithRole });
    } catch (error) {
      if (error.message === "Access denied") {
        return c.json({ error: "Access denied" }, 403);
      }
      console.log("Get baul error:", error);
      return c.json({ error: "Failed to get baul" }, 500);
    }
  });

  // ===== Sharing Routes =====

  // Get shared users for a baul
  router.get("/:baulId/shared-users", async (c) => {
    const user = await verifyAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    try {
      const baulId = c.req.param("baulId");
      const sharedUsers = await baulUseCases.getSharedUsers(
        user.userId,
        baulId,
      );
      return c.json({ sharedUsers });
    } catch (error) {
      if (error.message === "Baul not found") {
        return c.json({ error: "Baul not found" }, 404);
      }
      if (error.message === "Access denied") {
        return c.json({ error: "Access denied" }, 403);
      }
      console.log("Get shared users error:", error);
      return c.json({ error: "Failed to get shared users" }, 500);
    }
  });

  // Share baul with a user
  router.post("/:baulId/share", async (c) => {
    const user = await verifyAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    try {
      const baulId = c.req.param("baulId");
      const { email, role } = await c.req.json();
      const invitation = await baulUseCases.shareBaul(
        user.userId,
        baulId,
        email,
        role,
      );
      return c.json({ invitation });
    } catch (error) {
      if (error.message === "Baul not found") {
        return c.json({ error: "Baul not found" }, 404);
      }
      if (error.message === "Access denied") {
        return c.json({ error: "Access denied" }, 403);
      }
      console.log("Share baul error:", error);
      return c.json({ error: "Failed to share baul" }, 500);
    }
  });

  // Update user role
  router.put("/:baulId/shared-users/:userId/role", async (c) => {
    const user = await verifyAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    try {
      const baulId = c.req.param("baulId");
      const sharedUserId = c.req.param("userId");
      const { role } = await c.req.json();

      const sharedUser = await baulUseCases.updateSharedUserRole(
        user.userId,
        baulId,
        sharedUserId,
        role,
      );
      return c.json({ sharedUser });
    } catch (error) {
      if (error.message === "Baul not found") {
        return c.json({ error: "Baul not found" }, 404);
      }
      if (error.message === "Access denied") {
        return c.json({ error: "Access denied" }, 403);
      }
      if (error.message === "Shared user not found") {
        return c.json({ error: "Shared user not found" }, 404);
      }
      console.log("Update role error:", error);
      return c.json({ error: "Failed to update role" }, 500);
    }
  });

  // Revoke access
  router.delete("/:baulId/shared-users/:email", async (c) => {
    const user = await verifyAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    try {
      const baulId = c.req.param("baulId");
      const email = c.req.param("email");

      await baulUseCases.removeSharedUser(user.userId, baulId, email);
      return c.json({ success: true });
    } catch (error) {
      if (error.message === "Baul not found") {
        return c.json({ error: "Baul not found" }, 404);
      }
      if (error.message === "Access denied") {
        return c.json({ error: "Access denied" }, 403);
      }
      console.log("Revoke access error:", error);
      return c.json({ error: "Failed to revoke access" }, 500);
    }
  });

  // Accept invitation to a baul
  router.post("/:baulId/accept-invite", async (c) => {
    const user = await verifyAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    try {
      const baulId = c.req.param("baulId");
      await baulUseCases.acceptInvite(user.userId, user.email, baulId);
      return c.json({ success: true }, 200);
    } catch (error) {
      if (error.message === "Baul not found") {
        return c.json({ error: "Baul not found" }, 404);
      }
      console.log("Accept invite error:", error);
      return c.json({ error: "Failed to accept invite" }, 500);
    }
  });

  // ===== Access Requests Routes =====

  // Get access requests for a baul
  router.get("/:baulId/access-requests", async (c) => {
    const user = await verifyAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    try {
      const baulId = c.req.param("baulId");
      const requests = await baulUseCases.getAccessRequests(
        user.userId,
        baulId,
      );
      return c.json({ requests });
    } catch (error) {
      if (error.message === "Baul not found") {
        return c.json({ error: "Baul not found" }, 404);
      }
      if (error.message === "Access denied") {
        return c.json({ error: "Access denied" }, 403);
      }
      console.log("Get access requests error:", error);
      return c.json({ error: "Failed to get access requests" }, 500);
    }
  });

  // Submit access request
  router.post("/:baulId/access-requests", async (c) => {
    const user = await verifyAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    try {
      const baulId = c.req.param("baulId");
      const { message } = await c.req.json();

      const request = await baulUseCases.createAccessRequest(
        user.userId,
        user.email,
        baulId,
        message,
      );
      return c.json({ request });
    } catch (error) {
      if (error.message === "Baul not found") {
        return c.json({ error: "Baul not found" }, 404);
      }
      console.log("Submit access request error:", error);
      return c.json({ error: "Failed to submit access request" }, 500);
    }
  });

  // Approve access request
  router.post("/:baulId/access-requests/:requestId/approve", async (c) => {
    const user = await verifyAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    try {
      const baulId = c.req.param("baulId");
      const requestId = c.req.param("requestId");
      const { role } = await c.req.json().catch(() => ({ role: "miembro" }));

      const sharedUser = await baulUseCases.approveAccessRequest(
        user.userId,
        baulId,
        requestId,
        role || "miembro",
      );
      return c.json({ success: true, sharedUser });
    } catch (error) {
      if (error.message === "Baul not found") {
        return c.json({ error: "Baul not found" }, 404);
      }
      if (error.message === "Access denied") {
        return c.json({ error: "Access denied" }, 403);
      }
      if (error.message === "Request not found") {
        return c.json({ error: "Request not found" }, 404);
      }
      if (error.message === "User not found") {
        return c.json({ error: "User not found" }, 404);
      }
      console.log("Approve request error:", error);
      return c.json({ error: "Failed to approve request" }, 500);
    }
  });

  // Reject access request
  router.post("/:baulId/access-requests/:requestId/reject", async (c) => {
    const user = await verifyAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    try {
      const baulId = c.req.param("baulId");
      const requestId = c.req.param("requestId");

      await baulUseCases.rejectAccessRequest(user.userId, baulId, requestId);
      return c.json({ success: true });
    } catch (error) {
      if (error.message === "Baul not found") {
        return c.json({ error: "Baul not found" }, 404);
      }
      if (error.message === "Access denied") {
        return c.json({ error: "Access denied" }, 403);
      }
      console.log("Reject request error:", error);
      return c.json({ error: "Failed to reject request" }, 500);
    }
  });

  // ===== Removal Requests Routes =====

  // Get removal requests for a baul
  router.get("/:baulId/removal-requests", async (c) => {
    const user = await verifyAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    try {
      const baulId = c.req.param("baulId");
      const requests = await baulUseCases.getRemovalRequests(
        user.userId,
        baulId,
      );
      return c.json({ requests });
    } catch (error) {
      if (error.message === "Baul not found") {
        return c.json({ error: "Baul not found" }, 404);
      }
      if (error.message === "Access denied") {
        return c.json({ error: "Access denied" }, 403);
      }
      console.log("Get removal requests error:", error);
      return c.json({ error: "Failed to get removal requests" }, 500);
    }
  });

  // Submit removal request
  router.post("/:baulId/removal-requests", async (c) => {
    const user = await verifyAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    try {
      const baulId = c.req.param("baulId");
      const { photoId, reason } = await c.req.json();

      const request = await baulUseCases.createRemovalRequest(
        user.userId,
        baulId,
        photoId,
        reason,
      );
      return c.json({ request });
    } catch (error) {
      if (error.message === "Baul not found") {
        return c.json({ error: "Baul not found" }, 404);
      }
      if (error.message === "Photo not found") {
        return c.json({ error: "Photo not found" }, 404);
      }
      console.log("Submit removal request error:", error);
      return c.json({ error: "Failed to submit removal request" }, 500);
    }
  });

  // Approve removal request (remove photo)
  router.post("/:baulId/removal-requests/:requestId/approve", async (c) => {
    const user = await verifyAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    try {
      const baulId = c.req.param("baulId");
      const requestId = c.req.param("requestId");

      await baulUseCases.approveRemovalRequest(user.userId, baulId, requestId);
      return c.json({ success: true });
    } catch (error) {
      if (error.message === "Baul not found") {
        return c.json({ error: "Baul not found" }, 404);
      }
      if (error.message === "Access denied") {
        return c.json({ error: "Access denied" }, 403);
      }
      if (error.message === "Request not found") {
        return c.json({ error: "Request not found" }, 404);
      }
      console.log("Approve removal request error:", error);
      return c.json({ error: "Failed to approve removal request" }, 500);
    }
  });

  // Reject removal request (keep photo)
  router.post("/:baulId/removal-requests/:requestId/reject", async (c) => {
    const user = await verifyAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    try {
      const baulId = c.req.param("baulId");
      const requestId = c.req.param("requestId");

      await baulUseCases.rejectRemovalRequest(user.userId, baulId, requestId);
      return c.json({ success: true });
    } catch (error) {
      if (error.message === "Baul not found") {
        return c.json({ error: "Baul not found" }, 404);
      }
      if (error.message === "Access denied") {
        return c.json({ error: "Access denied" }, 403);
      }
      console.log("Reject removal request error:", error);
      return c.json({ error: "Failed to reject removal request" }, 500);
    }
  });

  // Public baul preview
  router.get("/:baulId/preview", async (c) => {
    try {
      const baulId = c.req.param("baulId");
      const preview = await baulUseCases.getBaulPreview(baulId);

      if (!preview) return c.json({ error: "Baul not found" }, 404);

      return c.json({ preview });
    } catch (error) {
      console.log("Get baul preview error:", error);
      return c.json({ error: "Failed to get baul preview" }, 500);
    }
  });

  return router;
};
