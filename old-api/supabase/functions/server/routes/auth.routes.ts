import { Context, Hono } from "hono";
import { IUserRepository } from "../repositories/user.repository.ts";
import { createClient } from "supabase";

// Helper to create Supabase admin client
function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export const authRoutes = (
  userRepo: IUserRepository,
  verifyAuth: (
    c: Context,
  ) => Promise<{ userId: string; email: string } | null>,
) => {
  const router = new Hono();

  // Sign up endpoint (using Admin API for traditional email/password)
  router.post("/signup", async (c) => {
    try {
      const { email, password, name } = await c.req.json();

      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: { name },
        email_confirm: true,
      });

      if (error) {
        console.log("Sign up error:", error);
        return c.json({ error: error.message }, 400);
      }

      // NOTE: Profile is created automatically via DB Trigger on_auth_user_created

      return c.json({ user: data.user });
    } catch (error) {
      console.log("Sign up exception:", error);
      return c.json({ error: "Sign up failed" }, 500);
    }
  });

  // Get user profile
  router.get("/profile", async (c) => {
    const user = await verifyAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    try {
      const profile = await userRepo.getById(user.userId);
      return c.json({ profile });
    } catch (error) {
      console.log("Get profile error:", error);
      return c.json({ error: "Failed to get profile" }, 500);
    }
  });

  return router;
};
